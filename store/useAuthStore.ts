import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";
import { useGuestStore } from "./useGuestStore";
import { calculateMembershipBreakdown } from "@/constants/credits";
import { FALLBACK_NETWORK_GYMS } from "@/constants/fallbackGyms";

const TOKEN_KEY = "zonofit_auth_token";
const SESSION_KEY = "zonofit_user_session";
const ONBOARDED_KEY = "zonofit_is_onboarded";

export interface User {
  id: string;
  username: string;
  phone: string;
  authMethod: "phone" | "google" | "apple" | "email";
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
  sendOTP: (phone: string, isSignIn?: boolean) => Promise<void>;
  verifyOTP: (code: string, isSignIn?: boolean) => Promise<boolean>;
  checkUserExists: (phone?: string, email?: string) => Promise<{ exists: boolean; phoneExists: boolean; emailExists: boolean; isOnboarded: boolean; user?: any }>;
  updateProfile: (details: { name: string, dob?: string, email?: string, referral?: string }) => Promise<void>;
  completeOnboarding: (
    city: string,
    gymId: string,
    plan: string,
    options?: { price?: number; visits?: number; credits?: number; gymName?: string; cycleNumber?: number }
  ) => Promise<void>;
  googleSignIn: (idToken: string) => Promise<{ success: boolean; isOnboarded: boolean }>;
  signInWithEmail: (input: {
    email: string;
    password: string;
    code?: string;
    mode: "signup" | "signin";
  }) => Promise<{ otpRequired: boolean; isOnboarded: boolean }>;
  appleSignIn: (email?: string, name?: string) => Promise<{ success: boolean; isOnboarded: boolean }>;
  signOut: () => Promise<void>;
  setError: (msg: string | null) => void;
  setVerificationPhone: (phone: string) => void;
  setIsViewingOnboardingGym: (val: boolean) => void;
}

async function saveSignedInSession(
  set: (partial: Partial<AuthState>) => void,
  authUser: User,
  authToken: string,
  isOnboarded: boolean,
) {
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
  if (authUser.username && authUser.username !== "Google User" && authUser.username !== "ZonoFit Member") {
    try {
      const { useUserStore } = require("./useUserStore");
      useUserStore.setState({ name: authUser.username });
    } catch {
      // The profile screen refetches the name.
    }
  }
  await useGuestStore.getState().convertGuest();
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

  checkUserExists: async (phone?: string, email?: string) => {
    try {
      const data = await apiFetch("/api/auth/check-user", {
        method: "POST",
        body: JSON.stringify({ phone, email }),
      });
      return {
        exists: !!data?.exists,
        phoneExists: !!data?.phoneExists,
        emailExists: !!data?.emailExists,
        isOnboarded: !!data?.isOnboarded,
        user: data?.user || null,
      };
    } catch {
      return { exists: false, phoneExists: false, emailExists: false, isOnboarded: false, user: null };
    }
  },

  sendOTP: async (phone, isSignIn = false) => {
    set({ loading: true, error: null, verificationPhone: phone });
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, "").slice(-10);
      if (isSignIn) {
        await apiFetch("/api/auth/signin", {
          method: "POST",
          body: JSON.stringify({ phone: cleanPhone }),
        });
      } else {
        await apiFetch("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ username: "ZonoFit Member", phone: cleanPhone }),
        });
      }
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Failed to send OTP." });
      throw err;
    }
  },

  verifyOTP: async (code, isSignIn = false) => {
    set({ loading: true, error: null });
    const phone = get().verificationPhone?.trim();
    if (!phone) {
      set({ loading: false, error: "Please enter your mobile number first." });
      return false;
    }
    try {
      let authToken: string | null = null;
      let authUser: User | null = null;
      let isOnboarded = false;

      try {
        const data = await apiFetch("/api/auth/verify", {
          method: "POST",
          body: JSON.stringify({
            phone,
            code,
            isSignIn,
            username: "ZonoFit Member",
          }),
        });

        if (data.token) {
          authToken = data.token;
          isOnboarded = Boolean(data.isOnboarded || data.user?.isOnboarded);
          authUser = {
            id: data.user?.id || "usr_" + Date.now(),
            username: data.user?.username || (isSignIn ? "Member" : "ZonoFit Member"),
            phone,
            email: data.user?.email,
            authMethod: "phone",
            isOnboarded,
          };
        }
      } catch (verifyErr: any) {
        set({ loading: false, error: verifyErr?.message || "Invalid code." });
        return false;
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
        if (isOnboarded) {
          await SecureStore.setItemAsync(ONBOARDED_KEY, "true");
        }

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
          isOnboarded,
          isSignedIn: true,
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
      if (!token || token.startsWith("mock_")) {
        set({ loading: false, error: "Sign in with your phone number before saving your profile." });
        return;
      }
      await apiFetch("/api/users/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          name: details.name,
          phone: updatedUser.phone,
          ...(details.email ? { email: details.email } : {}),
        }),
      });
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updatedUser));
      
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

  completeOnboarding: async (city, gymId, plan, options) => {
    const user = get().user;
    const token = get().token;
    if (!user || !token || token.startsWith("mock_")) {
      set({ loading: false, error: "Sign in with your phone number before paying for a membership." });
      throw new Error("Sign in with your phone number before paying for a membership.");
    }

    set({ loading: true, error: null });
    try {
      const { useUserStore } = require("./useUserStore");
      const { useCreditsStore } = require("./useCreditsStore");
      const gymLookup = FALLBACK_NETWORK_GYMS.find((g) => g.id === gymId);
      const gymName = options?.gymName || useGuestStore.getState().selectedGymName || useUserStore.getState().primaryGymName || gymLookup?.name;

      const order = await apiFetch("/api/membership/create-order", {
        method: "POST",
        token,
        body: JSON.stringify({
          primaryGymId: gymId,
          gymName,
          ...(plan && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan) ? { planId: plan } : {}),
        }),
      });

      if (!order?.keyId || !order?.razorpayOrderId) {
        throw new Error(order?.message || "Card payments are not configured yet.");
      }

      const RazorpayCheckout = require("react-native-razorpay").default;
      const payment = await RazorpayCheckout.open({
        description: `ZonoFit membership at ${order.gymName || gymName || "your gym"}`,
        currency: order.currency || "INR",
        key: order.keyId,
        amount: order.amount,
        name: "ZonoFit",
        order_id: order.razorpayOrderId,
        theme: { color: "#059669" },
      });

      const activated = await apiFetch("/api/membership/activate", {
        method: "POST",
        token,
        body: JSON.stringify({
          razorpayOrderId: order.razorpayOrderId,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpaySignature: payment.razorpay_signature,
        }),
      });

      const membership = activated?.membership;
      const updatedUser: User = {
        ...user,
        city,
        primaryGym: membership?.primaryGymId || order.gymId || gymId,
        plan: membership?.plan?.name || plan,
      };

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updatedUser));
      await SecureStore.setItemAsync(ONBOARDED_KEY, "true");

      set({
        user: updatedUser,
        token,
        loading: false,
        isSignedIn: true,
        isOnboarded: true,
      });

      useUserStore.setState({
        name: updatedUser.username,
        primaryGymId: updatedUser.primaryGym,
        primaryGymName: membership?.primaryGym?.name || order.gymName || gymName,
        planName: membership?.plan?.name || plan || "Monthly",
        membershipStatus: membership?.status || "ACTIVE",
        visitsRemaining: membership?.primaryGymVisits || 0,
      });
      if (typeof activated?.newCreditBalance === "number") {
        useCreditsStore.setState({ credits: activated.newCreditBalance });
      }
      useCreditsStore.getState().fetchWallet(token).catch(() => {});

      await useGuestStore.getState().convertGuest();
    } catch (err: any) {
      const message = err?.description || err?.message || "Membership payment was not completed.";
      set({ loading: false, error: message });
      throw err;
    }
  },

  googleSignIn: async (idToken: string) => {
    set({ loading: true, error: null });
    try {
      if (!idToken?.trim()) {
        throw new Error("Google did not return a verified account.");
      }

      const data = await apiFetch("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });

      if (!data?.token || !data?.user?.id) {
        throw new Error("Google sign-in did not start a session.");
      }

      const isOnboarded = Boolean(data.isOnboarded);
      const authUser: User = {
        id: data.user.id,
        username: data.user.username || "Google User",
        phone: data.user.phone || "",
        email: data.user.email,
        authMethod: "google",
        primaryGym: data.user.primaryGymId || undefined,
        isOnboarded,
      };
      await saveSignedInSession(set, authUser, data.token, isOnboarded);
      return { success: true, isOnboarded };
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Google sign-in failed." });
      throw err;
    }
  },

  signInWithEmail: async ({ email, password, code, mode }) => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch(mode === "signup" ? "/api/auth/email/signup" : "/api/auth/email/signin", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(code ? { code } : {}),
        }),
      });

      if (data?.otpRequired) {
        set({ loading: false });
        return { otpRequired: true, isOnboarded: false };
      }

      if (!data?.token || !data?.user?.id) {
        throw new Error("Sign-in did not start a session.");
      }

      const isOnboarded = Boolean(data.isOnboarded || data.user?.isOnboarded);
      const authUser: User = {
        id: data.user.id,
        username: data.user.username || "ZonoFit Member",
        phone: data.user.phone || "",
        email: data.user.email,
        authMethod: "email",
        isOnboarded,
      };
      await saveSignedInSession(set, authUser, data.token, isOnboarded);
      return { otpRequired: false, isOnboarded };
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Could not sign in with that email." });
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
      } catch (apiErr: any) {
        set({ loading: false, error: apiErr?.message || "Apple sign-in failed. Use your phone number." });
        throw apiErr;
      }

      if (!authToken || !authUser) {
        const message = "Sign in with your phone number. Apple sign-in is not available in this build.";
        set({ loading: false, error: message });
        throw new Error(message);
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
