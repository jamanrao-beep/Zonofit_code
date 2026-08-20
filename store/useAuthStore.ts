import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "@/lib/api";

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

  // Actions
  initialize: () => Promise<void>;
  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<boolean>;
  updateProfile: (details: { name: string, dob?: string, referral?: string }) => Promise<void>;
  completeOnboarding: (city: string, gymId: string, plan: string) => Promise<void>;
  googleSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setError: (msg: string | null) => void;
  setVerificationPhone: (phone: string) => void;
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

  setError: (msg) => set({ error: msg }),
  setVerificationPhone: (phone) => set({ verificationPhone: phone }),

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const sessionStr = await SecureStore.getItemAsync(SESSION_KEY);
      
      if (token && sessionStr) {
        const cachedUser = JSON.parse(sessionStr) as User;
        set({ user: cachedUser, token, isSignedIn: true, isOnboarded: true, isLoaded: true });
        
        try {
          const freshData = await apiFetch("/api/users/me", { token });
          const freshUser: User = {
            ...cachedUser,
            id: freshData.id,
            username: freshData.name || cachedUser.username,
            phone: freshData.phone || cachedUser.phone,
          };
          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(freshUser));
          set({ user: freshUser, isSignedIn: true });
        } catch (err: any) {
          if (token !== "mock_jwt_token_123") {
            if (err.status === 401 || (err.message && err.message.toLowerCase().includes("unauthorized"))) {
              await get().signOut();
            }
          } else {
            console.warn("Using mock token, skipping auto-logout on /api/users/me failure.");
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
      // Mocking OTP send for the new flow since backend expects username for signup
      await new Promise(resolve => setTimeout(resolve, 800));
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Failed to send OTP." });
    }
  },

  verifyOTP: async (code) => {
    set({ loading: true, error: null });
    try {
      // Mocking OTP verification to proceed to profile step
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (code !== "1234") {
        set({ loading: false, error: "Invalid OTP code (use 1234)" });
        return false;
      }
      
      set({ loading: false, hasVerifiedOTP: true });
      return true;
    } catch (err: any) {
      set({ loading: false, error: err.message || "Verification failed." });
      return false;
    }
  },

  updateProfile: async (details) => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // We will formally "log in" the user in the mock flow now
      const mockUser: User = {
        id: "usr_123",
        username: details.name,
        phone: get().verificationPhone,
        authMethod: "phone",
        dob: details.dob,
      };
      
      set({ 
        user: mockUser, 
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Failed to update profile." });
    }
  },

  completeOnboarding: async (city, gymId, plan) => {
    const user = get().user;
    if (!user) return;
    
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedUser = { ...user, city, primaryGym: gymId, plan };
      const mockToken = "mock_jwt_token_123";
      
      await SecureStore.setItemAsync(TOKEN_KEY, mockToken);
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updatedUser));
      
      set({ 
        user: updatedUser,
        token: mockToken,
        loading: false,
        isSignedIn: true,
        isOnboarded: true 
      });
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  googleSignIn: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const loggedUser: User = {
        id: "usr_google",
        username: "Google User",
        phone: "",
        authMethod: "google",
      };

      set({
        user: loggedUser,
        loading: false,
        hasVerifiedOTP: true, // skip OTP
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Google sign-in failed." });
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
