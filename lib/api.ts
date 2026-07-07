import { Platform } from "react-native";
import * as FileSystem from 'expo-file-system/legacy';

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  return envUrl || "https://api.zonofit.com";
};

export const API_URL = getBaseUrl();

if (__DEV__) {
  // Visible in Metro logs — helps confirm what host the device is actually targeting
  console.log(`[API] Base URL resolved to: ${API_URL} (platform: ${Platform.OS})`);
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  timeoutMs?: number;
}

/**
 * apiFetch — A wrapper around fetch that adds Content-Type,
 * parses JSON, appends Bearer tokens, and raises friendly errors.
 */
export async function apiFetch(path: string, options: RequestOptions = {}) {
  const url = `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});

  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const { timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    let data;
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
      throw new Error(errorMessage);
    }

    return data;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error(`[API Error] Request to ${url} timed out after ${timeoutMs}ms`);
      throw new Error(
        `Request timed out. Is your backend reachable at ${API_URL}? On an Android emulator this must be ` +
        `10.0.2.2, not localhost — check EXPO_PUBLIC_API_URL in your .env.`
      );
    }
    console.error(`[API Error] Request to ${url} failed:`, err);
    throw new Error(
      err.message ||
      `Network request failed while calling ${url}. Please check if the backend server is running and reachable from this device/emulator.`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * apiPost — A convenience wrapper for POST requests.
 */
export async function apiPost(path: string, body: any, options: RequestOptions = {}) {
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
  
  try {
    const response = await FileSystem.uploadAsync(url, imageUri, {
      httpMethod: 'POST',
      uploadType: 1, // FileSystemUploadType.MULTIPART
      fieldName: 'avatar',
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