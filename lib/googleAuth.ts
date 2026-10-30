import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

function makeNonce(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

/**
 * Opens Google's account chooser. The accounts are the Gmail accounts already
 * on this device or browser. Selecting one returns a Google ID token.
 * The API checks that token. This does not accept an email typed by hand.
 */
export async function requestGoogleIdToken(): Promise<string> {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("Google sign-in is not set up yet. Use your email and password, or your phone number.");
  }

  const redirectUri = "https://api.zonofit.com/oauth/google";
  const appReturnUri = Linking.createURL("oauth/google");
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&response_type=id_token" +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&nonce=${encodeURIComponent(makeNonce())}` +
    "&prompt=select_account";

  const result = await WebBrowser.openAuthSessionAsync(authUrl, appReturnUri);
  if (result.type !== "success" || !result.url) {
    throw new Error("Google sign-in was closed before an account was chosen.");
  }

  const hashIndex = result.url.indexOf("#");
  const paramsString = hashIndex !== -1 ? result.url.slice(hashIndex + 1) : result.url.split("?")[1] || "";
  const params = new URLSearchParams(paramsString);
  const idToken = params.get("id_token");
  if (!idToken) {
    throw new Error("Google did not return a verified account.");
  }
  return idToken;
}
