import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";

const TOKEN_KEY = "zonofit_auth_token";
const SESSION_KEY = "zonofit_user_session";

export interface User {
  id: string;
  username: string;
  phone: string;
  authMethod: "phone" | "google";
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  loading: boolean;
  error: string | null;
  pendingVerification: boolean;
  verificationPhone: string;
  verificationUsername: string;
  isSignInFlow: boolean;

  // Actions
  initialize: () => Promise<void>;
  signUp: (username: string, phone: string) => Promise<void>;
  signIn: (phone: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<boolean>;
  googleSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setError: (msg: string | null) => void;
  setPendingVerification: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoaded: false,
  isSignedIn: false,
  loading: false,
  error: null,
  pendingVerification: false,
  verificationPhone: "",
  verificationUsername: "",
  isSignInFlow: false,

  setError: (msg) => set({ error: msg }),
  setPendingVerification: (val) => set({ pendingVerification: val }),

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const sessionStr = await SecureStore.getItemAsync(SESSION_KEY);
      
      if (token && sessionStr) {
        const cachedUser = JSON.parse(sessionStr) as User;
        set({ user: cachedUser, token, isSignedIn: true, isLoaded: true });
        
        // Asynchronously refresh and verify the user profile from the database
        try {
          const freshData = await apiFetch("/api/users/me", { token });
          const freshUser: User = {
            id: freshData.id,
            username: freshData.name,
            phone: freshData.phone || "",
            authMethod: cachedUser.authMethod,
          };
          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(freshUser));
          set({ user: freshUser, isSignedIn: true });
        } catch (err: any) {
          console.warn("[AuthInit] Failed to refresh user profile from server:", err.message);
          // If unauthorized (e.g. token expired), sign out
          if (err.message && err.message.toLowerCase().includes("unauthorized")) {
            await get().signOut();
          }
        }
      } else {
        set({ user: null, token: null, isSignedIn: false, isLoaded: true });
      }
    } catch (err) {
      console.error("[AuthInit] SecureStore error:", err);
      set({ isLoaded: true });
    }
  },

  signUp: async (username, phone) => {
    set({ loading: true, error: null });
    
    if (!username.trim()) {
      set({ loading: false, error: "Username is required." });
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      set({ loading: false, error: "Please enter a valid phone number." });
      return;
    }

    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username, phone }),
      });

      set({
        loading: false,
        pendingVerification: true,
        verificationPhone: phone,
        verificationUsername: username,
        isSignInFlow: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Failed to sign up." });
    }
  },

  signIn: async (phone) => {
    set({ loading: true, error: null });

    if (!phone.trim() || phone.trim().length < 10) {
      set({ loading: false, error: "Please enter a valid phone number." });
      return;
    }

    try {
      await apiFetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });

      set({
        loading: false,
        pendingVerification: true,
        verificationPhone: phone,
        verificationUsername: "ZonoFit Member",
        isSignInFlow: true,
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Failed to sign in." });
    }
  },

  verifyOTP: async (code) => {
    set({ loading: true, error: null });
    const { verificationUsername, verificationPhone, isSignInFlow } = get();

    try {
      const response = await apiFetch("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          phone: verificationPhone,
          username: verificationUsername,
          code,
          isSignIn: isSignInFlow,
        }),
      });

      const { token, user: serverUser } = response;
      const loggedUser: User = {
        id: serverUser.id,
        username: serverUser.username,
        phone: serverUser.phone || "",
        authMethod: "phone",
      };

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(loggedUser));

      set({
        user: loggedUser,
        token,
        isSignedIn: true,
        loading: false,
        pendingVerification: false,
      });
      return true;
    } catch (err: any) {
      set({ loading: false, error: err.message || "Verification failed." });
      return false;
    }
  },

  googleSignIn: async () => {
    set({ loading: true, error: null });

    try {
      const response = await apiFetch("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const { token, user: serverUser } = response;
      const loggedUser: User = {
        id: serverUser.id,
        username: serverUser.username,
        phone: serverUser.phone || "",
        authMethod: "google",
      };

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(loggedUser));

      set({
        user: loggedUser,
        token,
        isSignedIn: true,
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Google sign-in failed." });
    }
  },

  signOut: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch (err) {
      console.error("Failed to delete auth session:", err);
    }
    set({
      user: null,
      token: null,
      isSignedIn: false,
      pendingVerification: false,
      verificationPhone: "",
      verificationUsername: "",
    });
  },
}));


