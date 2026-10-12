import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { useGuestStore } from "./useGuestStore";

const TOKEN_KEY = "zonofit_auth_token";
const SESSION_KEY = "zonofit_user_session";
const ONBOARDED_KEY = "zonofit_is_onboarded";

export interface User {
  id: string;
  username: string;
  phone: string;
  authMethod: "phone" | "google" | "apple";
  email?: string;
  dob?: string;
  city?: string;
  primaryGym?: string;
  plan?: string;
  isOnboarded?: boolean;
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
  updateProfile: (details: { name: string, dob?: string, email?: string, referral?: string }) => Promise<void>;
  completeOnboarding: (city: string, gymId: string, plan: string) => Promise<void>;
  googleSignIn: (email?: string, name?: string) => Promise<{ success: boolean; isOnboarded: boolean }>;
  appleSignIn: (email?: string, name?: string) => Promise<{ success: boolean; isOnboarded: boolean }>;
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
      const storedOnboardedFlag = await SecureStore.getItemAsync(ONBOARDED_KEY);
      
      if (token && sessionStr) {
        let cachedUser: User;
        try {
          cachedUser = JSON.parse(sessionStr) as User;
        } catch {
          await get().signOut();
          set({ isLoaded: true });
          return;
        }

        const isDefaultName = (n?: string) => !n || n === "Google User" || n === "ZonoFit Member";

        try {
          const freshData = await apiFetch("/api/users/me", { token });
          
          // Never overwrite a customized user name with default fallback
          const resolvedUsername = !isDefaultName(freshData.name)
            ? freshData.name
            : (!isDefaultName(cachedUser.username) ? cachedUser.username : (freshData.name || cachedUser.username));

          const resolvedPrimaryGym = freshData.primaryGymId || 
            freshData.membership?.primaryGymId || 
            freshData.membership?.gymId || 
            cachedUser.primaryGym;

          const freshUser: User = {
            ...cachedUser,
            id: freshData.id,
            username: resolvedUsername,
            phone: freshData.phone || cachedUser.phone,
            city: freshData.city || cachedUser.city,
            primaryGym: resolvedPrimaryGym,
            plan: freshData.membership?.plan || freshData.membership?.planName || cachedUser.plan,
          };

          const userIsOnboarded = storedOnboardedFlag === "true" || !!(
            freshUser.primaryGym &&
            freshUser.username &&
            !isDefaultName(freshUser.username)
          );

          if (userIsOnboarded) {
            await SecureStore.setItemAsync(ONBOARDED_KEY, "true");
          }

          // If cachedUser had real name but server had default name, sync to server in background
          if (!isDefaultName(cachedUser.username) && isDefaultName(freshData.name)) {
            apiFetch("/api/users/me", {
              method: "PATCH",
              token,
              body: JSON.stringify({ name: cachedUser.username }),
            }).catch(() => {});
          }

          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(freshUser));
          set({ user: freshUser, token, isSignedIn: true, isOnboarded: userIsOnboarded, isLoaded: true });
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
            const cachedIsOnboarded = storedOnboardedFlag === "true" || !!(
              cachedUser.primaryGym &&
              cachedUser.username &&
              !isDefaultName(cachedUser.username)
            );
            set({ user: cachedUser, token, isSignedIn: true, isOnboarded: cachedIsOnboarded, isLoaded: true });
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
        const currentUser = get().user;
        if (currentUser && currentUser.username && currentUser.username !== "ZonoFit Member" && currentUser.username !== "Google User") {
          authUser.username = currentUser.username;
        }
        if (currentUser?.city) authUser.city = currentUser.city;
        if (currentUser?.primaryGym) authUser.primaryGym = currentUser.primaryGym;
        if (currentUser?.plan) authUser.plan = currentUser.plan;

        await SecureStore.setItemAsync(TOKEN_KEY, authToken);
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(authUser));

        // Sync verified phone to backend
        try {
          await apiFetch("/api/users/me", {
            method: "PATCH",
            token: authToken,
            body: JSON.stringify({ phone }),
          });
        } catch {}

        set({
          user: authUser,
          token: authToken,
          loading: false,
          hasVerifiedOTP: true,
          verificationPhone: phone,
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
        email: details.email || existingUser?.email,
        authMethod: existingUser?.authMethod || "phone",
        dob: details.dob,
        city: existingUser?.city,
        primaryGym: existingUser?.primaryGym,
        plan: existingUser?.plan,
      };

      const token = get().token;
      if (token) {
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updatedUser));
        try {
          await apiFetch("/api/users/me", {
            method: "PATCH",
            token,
            body: JSON.stringify({ name: details.name, phone: updatedUser.phone }),
          });
        } catch (apiErr) {
          console.warn("[Auth] Failed to sync updated profile to backend:", apiErr);
        }
      }
      
      set({ 
        user: updatedUser, 
        loading: false,
      });

      if (details.name) {
        try {
          const { useUserStore } = require("./useUserStore");
          useUserStore.setState({ name: details.name });
        } catch {}
      }
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
        try {
          if (updatedUser.username && updatedUser.username !== "ZonoFit Member" && updatedUser.username !== "Google User") {
            await apiFetch("/api/users/me", {
              method: "PATCH",
              token,
              body: JSON.stringify({ name: updatedUser.username, phone: updatedUser.phone }),
            });
          }
        } catch {}
      }
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updatedUser));
      await SecureStore.setItemAsync(ONBOARDED_KEY, "true");
      
      set({ 
        user: updatedUser,
        token,
        loading: false,
        isSignedIn: true,
        isOnboarded: true 
      });

      // Sync with useUserStore & useCreditsStore
      try {
        const { useUserStore } = require("./useUserStore");
        const { useCreditsStore } = require("./useCreditsStore");
        const gymName = useGuestStore.getState().selectedGymName || useUserStore.getState().primaryGymName || "Being Fitness";
        
        useUserStore.setState({
          name: updatedUser.username,
          primaryGymId: gymId,
          primaryGymName: gymName,
          planName: plan || "Monthly",
          membershipStatus: "Active",
          visitsRemaining: 10,
        });

        // Grant rest credits for the active membership
        const restCredits = 80;
        const currentCredits = useCreditsStore.getState().credits;
        useCreditsStore.setState({
          credits: Math.max(currentCredits, restCredits),
          membershipInfo: {
            status: "ACTIVE",
            isExpired: false,
            isExpiringSoon: false,
            tier: "STARTER",
            planName: plan || "Monthly",
            gymName: gymName,
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            daysRemaining: 30,
            cycleNumber: 1,
            maxCycles: 12,
            cyclesRemaining: 11,
            mandatoryVisits: 10,
            completedVisits: 0,
            mandatoryVisitsRemaining: 10,
            canRepurchase: false,
            canBuyAdditionalCredits: true,
          },
        });
        useCreditsStore.getState().addTransaction("credit", restCredits, "credits", "Monthly Membership Activation - Rest Credits");
      } catch {}

      // Convert guest session if active per PRD Section 14
      await useGuestStore.getState().convertGuest();
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  googleSignIn: async (customEmail?: string, customName?: string) => {
    set({ loading: true, error: null });
    try {
      if (!customEmail || !customEmail.trim()) {
        throw new Error("Email address is required for Google Sign-In.");
      }

      let authToken: string | null = null;
      let authUser: User | null = null;
      let isOnboarded = false;

      const email = customEmail.trim().toLowerCase();
      const name = customName?.trim() || email.split("@")[0] || "";

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
          const storedOnboardedFlag = await SecureStore.getItemAsync(ONBOARDED_KEY);
          isOnboarded = data.isOnboarded || storedOnboardedFlag === "true" || false;
          authUser = {
            id: data.user?.id || "usr_" + Date.now(),
            username: data.user?.username || name,
            phone: data.user?.phone || "",
            email: email,
            authMethod: "google",
            city: data.user?.city,
            primaryGym: data.user?.primaryGymId,
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
          email: email,
          authMethod: "google",
        };
        const storedOnboardedFlag = await SecureStore.getItemAsync(ONBOARDED_KEY);
        isOnboarded = storedOnboardedFlag === "true" || false;
      }

      if (isOnboarded) {
        await SecureStore.setItemAsync(ONBOARDED_KEY, "true");
      }

      await SecureStore.setItemAsync(TOKEN_KEY, authToken);
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(authUser));

      set({
        user: authUser,
        token: authToken,
        loading: false,
        isSignedIn: true,
        isOnboarded,
        hasVerifiedOTP: true,
      });

      // Sync username to useUserStore if real name provided
      if (authUser.username && authUser.username !== "Google User") {
        try {
          const { useUserStore } = require("./useUserStore");
          useUserStore.setState({ name: authUser.username });
        } catch {}
      }

      // Also convert guest session if active per PRD Section 14
      await useGuestStore.getState().convertGuest();
      return { success: true, isOnboarded };
    } catch (err: any) {
      set({ loading: false, error: err.message || "Google sign-in failed." });
      throw err;
    }
  },

  appleSignIn: async (customEmail?: string, customName?: string) => {
    set({ loading: true, error: null });
    try {
      const email = customEmail?.trim().toLowerCase() || `apple_user_${Date.now()}@privaterelay.appleid.com`;
      const name = customName?.trim() || "Apple User";

      let authToken: string | null = null;
      let authUser: User | null = null;
      let isOnboarded = false;

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
          const storedOnboardedFlag = await SecureStore.getItemAsync(ONBOARDED_KEY);
          isOnboarded = data.isOnboarded || storedOnboardedFlag === "true" || false;
          authUser = {
            id: data.user?.id || "usr_" + Date.now(),
            username: data.user?.username || name,
            phone: data.user?.phone || "",
            authMethod: "apple",
            city: data.user?.city,
            primaryGym: data.user?.primaryGymId,
          };
        }
      } catch (apiErr) {
        console.warn("[Auth] Apple signin warning, falling back to local session:", apiErr);
      }

      if (!authToken || !authUser) {
        authToken = "mock_jwt_apple_" + Date.now();
        authUser = {
          id: "usr_" + Date.now(),
          username: name,
          phone: "",
          authMethod: "apple",
        };
        const storedOnboardedFlag = await SecureStore.getItemAsync(ONBOARDED_KEY);
        isOnboarded = storedOnboardedFlag === "true" || false;
      }

      if (isOnboarded) {
        await SecureStore.setItemAsync(ONBOARDED_KEY, "true");
      }

      await SecureStore.setItemAsync(TOKEN_KEY, authToken);
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(authUser));

      set({
        user: authUser,
        token: authToken,
        loading: false,
        isSignedIn: true,
        isOnboarded,
        hasVerifiedOTP: true,
      });

      if (authUser.username && authUser.username !== "Apple User") {
        try {
          const { useUserStore } = require("./useUserStore");
          useUserStore.setState({ name: authUser.username });
        } catch {}
      }

      await useGuestStore.getState().convertGuest();
      return { success: true, isOnboarded };
    } catch (err: any) {
      set({ loading: false, error: err.message || "Apple sign-in failed." });
      throw err;
    }
  },

  signOut: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {}
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {}
    try {
      await SecureStore.deleteItemAsync(ONBOARDED_KEY);
    } catch {}
    try {
      await SecureStore.deleteItemAsync("zonofit_guest_session");
    } catch {}
    try {
      useGuestStore.getState().endGuestSession();
    } catch {}
    try {
      // Lazy load to prevent circular dependencies
      const { useUserStore } = require("./useUserStore");
      useUserStore.getState().reset?.();
    } catch {}
    try {
      const { useCreditsStore } = require("./useCreditsStore");
      useCreditsStore.getState().reset?.();
    } catch {}
    set({
      user: null,
      token: null,
      isSignedIn: false,
      isOnboarded: false,
      verificationPhone: "",
      hasVerifiedOTP: false,
      error: null,
    });
  },
}));
