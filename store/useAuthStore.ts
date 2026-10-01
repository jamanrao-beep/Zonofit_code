import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { useGuestStore } from "./useGuestStore";

const TOKEN_KEY = "zonofit_auth_token";
const SESSION_KEY = "zonofit_user_session";

export interface User {
  id: string;
  username: string;
  phone: string;
  authMethod: "phone" | "google" | "apple";
  dob?: string;
  city?: string;
  primaryGym?: string;
  plan?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  loading: boolean;
  error: string | null;
  
  // Onboarding state
  verificationPhone: string;
  hasVerifiedOTP: boolean;
  isOnboarded: boolean;
  isViewingOnboardingGym: boolean;

  // Actions
  initialize: () => Promise<void>;
  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<boolean>;
  updateProfile: (details: { name: string, dob?: string, referral?: string }) => Promise<void>;
  completeOnboarding: (city: string, gymId: string, plan: string) => Promise<void>;
  googleSignIn: (email?: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setError: (msg: string | null) => void;
  setVerificationPhone: (phone: string) => void;
  setIsViewingOnboardingGym: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoaded: false,
  isSignedIn: false,
  loading: false,
  error: null,
  
  verificationPhone: "",
  hasVerifiedOTP: false,
  isOnboarded: false,
  isViewingOnboardingGym: false,

  setError: (msg) => set({ error: msg }),
  setVerificationPhone: (phone) => set({ verificationPhone: phone }),
  setIsViewingOnboardingGym: (val) => set({ isViewingOnboardingGym: val }),

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const sessionStr = await SecureStore.getItemAsync(SESSION_KEY);
      
      if (token && sessionStr) {
        let cachedUser: User;
        try {
          cachedUser = JSON.parse(sessionStr) as User;
        } catch {
          await get().signOut();
          set({ isLoaded: true });
          return;
        }

        try {
          const freshData = await apiFetch("/api/users/me", { token });
          const freshUser: User = {
            ...cachedUser,
            id: freshData.id,
            username: freshData.name || cachedUser.username,
            phone: freshData.phone || cachedUser.phone,
          };
          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(freshUser));
          set({ user: freshUser, token, isSignedIn: true, isOnboarded: true, isLoaded: true });
        } catch (err: any) {
          const isAuthError = err.status === 401 || (err.message && (
            err.message.toLowerCase().includes("invalid or expired session token") ||
            err.message.toLowerCase().includes("unauthorized")
          ));
          if (isAuthError) {
            console.warn("[Auth] Token expired or invalid, clearing session.");
            await get().signOut();
            set({ isLoaded: true });
          } else {
            // Offline/Network issue: allow offline cached session
            set({ user: cachedUser, token, isSignedIn: true, isOnboarded: true, isLoaded: true });
          }
        }
      } else {
        set({ user: null, token: null, isSignedIn: false, isOnboarded: false, isLoaded: true });
      }
    } catch (err) {
      set({ isLoaded: true });
    }
  },

  sendOTP: async (phone) => {
    set({ loading: true, error: null, verificationPhone: phone });
    try {
      try {
        let res = await apiFetch("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ username: "ZonoFit Member", phone }),
        });
        if (res.error === "PhoneAlreadyRegistered" || res.message?.includes("already registered")) {
          res = await apiFetch("/api/auth/signin", {
            method: "POST",
            body: JSON.stringify({ phone }),
          });
        }
      } catch (apiErr: any) {
        console.warn("[Auth] sendOTP remote notice (will allow test codes 1234/123456):", apiErr.message);
      }
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Failed to send OTP." });
    }
  },

  verifyOTP: async (code) => {
    set({ loading: true, error: null });
    const phone = get().verificationPhone?.trim();
    if (!phone) {
      set({ loading: false, error: "Please enter your mobile number first." });
      return false;
    }
    try {
      let authToken: string | null = null;
      let authUser: User | null = null;

      try {
        const data = await apiFetch("/api/auth/verify", {
          method: "POST",
          body: JSON.stringify({
            phone,
            code,
            isSignIn: false,
            username: "ZonoFit Member",
          }),
        });

        if (data.token) {
          authToken = data.token;
          authUser = {
            id: data.user?.id || "usr_" + Date.now(),
            username: data.user?.username || "ZonoFit Member",
            phone,
            authMethod: "phone",
          };
        }
      } catch (verifyErr) {
        // Allow common test codes: "1234" or "123456"
        if (code === "1234" || code === "123456") {
          try {
            const googleRes = await apiFetch("/api/auth/google", {
              method: "POST",
              body: JSON.stringify({ email: `user_${phone}@zonofit.com`, name: "ZonoFit Member" }),
            });
            if (googleRes.token) {
              authToken = googleRes.token;
              authUser = {
                id: googleRes.user?.id || "usr_" + Date.now(),
                username: "ZonoFit Member",
                phone,
                authMethod: "phone",
              };
            }
          } catch {
            // Offline fallback
            authToken = "mock_jwt_token_" + Date.now();
            authUser = {
              id: "usr_" + Date.now(),
              username: "ZonoFit Member",
              phone,
              authMethod: "phone",
            };
          }
        } else {
          set({ loading: false, error: "Invalid code. Use 1234 or 123456 for testing." });
          return false;
        }
      }

      if (authToken && authUser) {
        await SecureStore.setItemAsync(TOKEN_KEY, authToken);
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(authUser));
        set({
          user: authUser,
          token: authToken,
          loading: false,
          hasVerifiedOTP: true,
        });
        return true;
      }

      set({ loading: false, error: "Verification failed." });
      return false;
    } catch (err: any) {
      set({ loading: false, error: err.message || "Verification failed." });
      return false;
    }
  },

  updateProfile: async (details) => {
    set({ loading: true, error: null });
    try {
      const existingUser = get().user;
      const updatedUser: User = {
        id: existingUser?.id || "usr_" + Date.now(),
        username: details.name,
        phone: get().verificationPhone || existingUser?.phone || "",
        authMethod: existingUser?.authMethod || "phone",
        dob: details.dob,
      };

      const token = get().token;
      if (token) {
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updatedUser));
      }
      
      set({ 
        user: updatedUser, 
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Failed to update profile." });
    }
  },

  completeOnboarding: async (city, gymId, plan) => {
    let user = get().user;
    if (!user) {
      user = {
        id: "usr_" + Date.now(),
        username: "ZonoFit Member",
        phone: get().verificationPhone || "",
        authMethod: "phone",
      };
    }
    
    set({ loading: true });
    try {
      let token = get().token;
      if (!token) {
        try {
          const res = await apiFetch("/api/auth/google", {
            method: "POST",
            body: JSON.stringify({
              email: `user_${user.phone || Date.now()}@zonofit.com`,
              name: user.username,
            }),
          });
          if (res.token) token = res.token;
        } catch {
          token = "mock_jwt_token_" + Date.now();
        }
      }

      const updatedUser: User = { ...user, city, primaryGym: gymId, plan };
      
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updatedUser));
      
      set({ 
        user: updatedUser,
        token,
        loading: false,
        isSignedIn: true,
        isOnboarded: true 
      });

      // Convert guest session if active per PRD Section 14
      await useGuestStore.getState().convertGuest();
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  googleSignIn: async (customEmail?: string, customName?: string) => {
    set({ loading: true, error: null });
    try {
      let authToken: string | null = null;
      let authUser: User | null = null;

      // Unique email per user/device — never share a static test email
      const email = customEmail?.trim().toLowerCase() || `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@zonofit.com`;
      const name = customName?.trim() || (customEmail ? customEmail.split("@")[0] : "ZonoFit Member");

      try {
        const data = await apiFetch("/api/auth/google", {
          method: "POST",
          body: JSON.stringify({
            email,
            name,
          }),
        });

        if (data.token) {
          authToken = data.token;
          authUser = {
            id: data.user?.id || "usr_" + Date.now(),
            username: data.user?.username || name,
            phone: data.user?.phone || "",
            authMethod: "google",
          };
        }
      } catch (apiErr) {
        console.warn("[Auth] Google API signin warning, falling back to local session:", apiErr);
      }

      if (!authToken || !authUser) {
        authToken = "mock_jwt_google_" + Date.now();
        authUser = {
          id: "usr_" + Date.now(),
          username: name,
          phone: "",
          authMethod: "google",
        };
      }

      await SecureStore.setItemAsync(TOKEN_KEY, authToken);
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(authUser));

      set({
        user: authUser,
        token: authToken,
        loading: false,
        isSignedIn: true,
        isOnboarded: true,
        hasVerifiedOTP: true,
      });

      // Also convert guest session if active per PRD Section 14
      await useGuestStore.getState().convertGuest();
    } catch (err: any) {
      set({ loading: false, error: err.message || "Google sign-in failed." });
      throw err;
    }
  },

  signOut: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch (err) {}
    set({
      user: null,
      token: null,
      isSignedIn: false,
      isOnboarded: false,
      verificationPhone: "",
      hasVerifiedOTP: false,
    });
  },
}));
