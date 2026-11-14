import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!envUrl || envUrl.includes("100.31.236.208") || envUrl.includes("amazonaws")) {
    return "https://api.zonofit.com";
  }
  return envUrl;
};

export const API_URL = getBaseUrl();

if (__DEV__) {
  console.log(`[API] Base URL resolved to: ${API_URL} (platform: ${Platform.OS})`);
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  timeoutMs?: number;
  silent?: boolean;
  retries?: number;
  cacheTtlMs?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

// In-flight request deduplication map (prevents duplicate simultaneous network calls)
const inFlightRequests = new Map<string, Promise<any>>();

// Fast in-memory cache for read-only GET requests
const responseCache = new Map<string, CacheEntry>();

/**
 * Invalidate in-memory cached responses (called on mutations like bookings, wallet changes)
 */
export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      responseCache.delete(key);
    }
  }
}

let hasWarmedUp = false;

/**
 * Pre-warms the TCP connection and TLS handshake with the backend edge.
 * Calling this at app launch eliminates cold-start connection latency on mobile devices.
 */
export function warmUpApiConnection() {
  if (hasWarmedUp) return;
  hasWarmedUp = true;
  fetch(`${API_URL}/health`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Connection: "keep-alive",
    },
  }).catch(() => {
    // Non-blocking pre-warm; failures are silently ignored
  });
}

/**
 * apiFetch — A high-performance wrapper around fetch that:
 * - Adds Content-Type, Accept, and keep-alive headers
 * - Automatically injects Bearer auth tokens
 * - Coalesces in-flight GET requests to prevent redundant network traffic
 * - Supports lightweight in-memory caching for instant tab transitions
 * - Automatically retries transient network drops on idempotent GET requests
 * - Handles Android/iOS timeout and connection aborts cleanly
 */
export async function apiFetch(path: string, options: RequestOptions = {}): Promise<any> {
  const method = (options.method || "GET").toUpperCase();
  const url = `${API_URL}${path}`;

  // Cache key based on path, method, and auth token
  const cacheKey = method === "GET" ? `${path}::${options.token || ""}` : null;

  // 1. Check in-memory cache if TTL is configured
  if (cacheKey && options.cacheTtlMs && options.cacheTtlMs > 0) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < options.cacheTtlMs) {
      return cached.data;
    }
  }

  // 2. Coalesce in-flight GET requests so identical concurrent calls share a single network round-trip
  if (cacheKey && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const runRequest = async (attempt: number = 0): Promise<any> => {
    const headers = new Headers(options.headers || {});
    // A JSON content type with no body makes the API wait until the client
    // aborts. Only declare JSON when a body is actually sent.
    const hasBody = options.body != null && options.body !== "";
    if (hasBody) {
      headers.set("Content-Type", "application/json");
    } else {
      headers.delete("Content-Type");
    }
    headers.set("Accept", "application/json");
    headers.set("Connection", "keep-alive");

    if (options.token) {
      headers.set("Authorization", `Bearer ${options.token}`);
    }

    const { timeoutMs = 30000 } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const text = await response.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { error: text };
      }

      if (!response.ok) {
        let errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`;
        if (data?.error === "ValidationError" && Array.isArray(data?.details) && data.details.length > 0) {
          errorMessage = data.details[0].msg || errorMessage;
        }

        if (response.status === 401 || errorMessage.toLowerCase().includes("invalid or expired session token")) {
          try {
            if (options.token && typeof options.token === "string" && options.token.length > 20 && !options.token.startsWith("mock_")) {
              const { useAuthStore } = require("@/store/useAuthStore");
              if (useAuthStore.getState().isSignedIn) {
                console.warn("[API] Session token expired on protected request. Signing out.");
                useAuthStore.getState().signOut();
              }
            }
          } catch (e) {
            console.warn("Failed to auto sign-out on 401:", e);
          }
        }

        const error = new Error(errorMessage) as Error & { status?: number; retryAfterSeconds?: number };
        error.status = response.status;
        if (typeof data?.retryAfterSeconds === "number") {
          error.retryAfterSeconds = data.retryAfterSeconds;
        }
        throw error;
      }

      // Populate in-memory cache if TTL is set
      if (cacheKey && options.cacheTtlMs && options.cacheTtlMs > 0) {
        responseCache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (err: any) {
      const isTimeout = err.name === "AbortError" || 
        (typeof err?.message === "string" && (
          err.message.includes("canceled") || 
          err.message.includes("cancelled") || 
          err.message.includes("timed out")
        ));

      // Retry once on transient network drops for idempotent GET requests
      const maxRetries = options.retries ?? (method === "GET" && !isTimeout && !err.status ? 1 : 0);
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 250));
        return runRequest(attempt + 1);
      }

      if (isTimeout) {
        if (!options.silent) {
          console.warn(`[API] Request to ${url} timed out or was cancelled after ${timeoutMs}ms`);
        }
        throw new Error(`Request timed out after ${timeoutMs}ms.`);
      }

      if (err.status) {
        if (err.status !== 401) {
          if (!options.silent) {
            console.warn(`[API Error] Request to ${url} failed:`, err.message);
          }
          throw err;
        } else {
          throw { message: err.message, status: err.status };
        }
      }

      if (!options.silent) {
        console.warn(`[API Error] Request to ${url} failed:`, err);
      }
      throw new Error(
        err.message ||
        `Network request failed while calling ${url}. Please check if the backend server is running and reachable from this device/emulator.`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Coalesce concurrent GET calls to the same path
  if (cacheKey) {
    const flight = runRequest().finally(() => {
      inFlightRequests.delete(cacheKey);
    });
    inFlightRequests.set(cacheKey, flight);
    return flight;
  }

  return runRequest();
}

/**
 * apiPost — A convenience wrapper for POST requests.
 */
export async function apiPost(path: string, body: any, options: RequestOptions = {}) {
  // Invalidate read caches that may be affected by mutations
  invalidateApiCache(path);
  return apiFetch(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Upload a profile picture using expo-file-system to avoid React Native FormData bugs.
 */
export async function uploadProfilePicture(imageUri: string, token: string) {
  const url = `${API_URL}/api/users/avatar`;
  invalidateApiCache("/api/users");
  
  try {
    const response = await FileSystem.uploadAsync(url, imageUri, {
      httpMethod: "POST",
      uploadType: 1, // FileSystemUploadType.MULTIPART
      fieldName: "avatar",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = response.body;
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text };
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(data?.message || data?.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err: any) {
    console.error(`[API Error] Request to ${url} failed:`, err);
    throw new Error(err.message || "Failed to upload profile picture.");
  }
}
