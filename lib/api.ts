import { Platform } from "react-native";

// Auto-detect backend URL in development
const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    // IMPORTANT: "localhost" / "127.0.0.1" means something different on an
    // Android emulator than it does on the machine running Metro.
    // On Android, the emulator's own loopback is the emulator itself, not
    // your laptop — so a localhost URL set in .env (which works fine on
    // iOS Simulator / web) will silently fail to connect on Android.
    // We rewrite it to the emulator's special host alias (10.0.2.2) so the
    // same .env value works everywhere.
    if (__DEV__ && Platform.OS === "android") {
      const rewritten = envUrl
        .replace("localhost", "10.0.2.2")
        .replace("127.0.0.1", "10.0.2.2");
      if (rewritten !== envUrl && __DEV__) {
        console.log(`[API] Rewriting ${envUrl} -> ${rewritten} for Android emulator`);
      }
      return rewritten;
    }
    return envUrl;
  }

  // Fallbacks for localhost testing when no env var is set
  if (__DEV__) {
    // If Android emulator, localhost is mapped to 10.0.2.2
    if (Platform.OS === "android") {
      return "http://10.0.2.2:8000";
    }
    return "http://localhost:8000";
  }

  return "https://api.zonofit.com"; // Production URL fallback
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
 * Upload a profile picture using FormData.
 */
export async function uploadProfilePicture(imageUri: string, token: string) {
  const url = `${API_URL}/api/users/avatar`;
  
  const formData = new FormData();
  // We have to cast to any here because React Native's fetch/FormData handles file URIs specifically
  // even though standard TS typings don't expect it.
  const filename = imageUri.split('/').pop() || 'avatar.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  
  formData.append('avatar', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        // Do NOT set Content-Type here, let fetch generate the boundary
      },
      body: formData,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text };
    }

    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err: any) {
    console.error(`[API Error] Request to ${url} failed:`, err);
    throw new Error(err.message || "Failed to upload profile picture.");
  }
}