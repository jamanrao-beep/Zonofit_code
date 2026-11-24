import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { apiFetch, uploadProfilePicture, invalidateApiCache } from "@/lib/api";
import { useCreditsStore } from "./useCreditsStore";
import { useAuthStore } from "./useAuthStore";

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (e) {
      console.warn("SecureStore setItem failed:", e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (e) {
      console.warn("SecureStore deleteItem failed:", e);
    }
  },
};

let profileEpoch = 0;
let profileFlight: Promise<void> | null = null;
let profileFetchedAt = 0;
const PROFILE_FRESH_MS = 8000;

function noteProfileMutation() {
  profileEpoch += 1;
  profileFetchedAt = Date.now();
  invalidateApiCache("/api/users");
}

interface UserState {
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  visitsRemaining: number;
  membershipStatus: string;
  planName: string;
  primaryGymId: string | null;
  primaryGymName: string | null;
  membershipExpiry: string;
  currentMonth: number;
  totalMonths: number;
  identityStage: string;
  progressPercentage: number;
  nextMilestone: string;
  streak: number;
  totalWorkouts: number;
  trainingHours: number;
  loading: boolean;
  memberSince: string;
  
  // Actions
  fetchProfile: (token: string) => Promise<void>;
  setPrimaryGym: (gymId: string, gymName: string) => void;
  decrementVisits: () => void;
  holdProfileSnapshot: () => void;
  incrementStreak: () => void;
  recordWorkout: (hours: number) => void;
  updatePlan: (planId: string, amountPaidPaise: number, primaryGymId?: string) => Promise<{ success: boolean; message?: string }>;
  purchaseGymPlan: (gymPlanId: string, amountPaidPaise: number) => Promise<{ success: boolean; message?: string }>;
  uploadAvatar: (uri: string) => Promise<{ success: boolean; message?: string }>;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
  name: "Member",
  email: "",
  phone: null,
  avatarUrl: null,
  visitsRemaining: 10,
  membershipStatus: "No Active Membership",
  planName: "Monthly Membership",
  primaryGymId: "gym-being-fit",
  primaryGymName: "Being Fitness",
  membershipExpiry: "N/A",
  currentMonth: 1,
  totalMonths: 12,
  identityStage: "New Member",
  progressPercentage: 0,
  nextMilestone: "First Visit",
  streak: 0,
  totalWorkouts: 0,
  trainingHours: 0,
  loading: false,
  memberSince: "Recently",

  setPrimaryGym: (gymId: string, gymName: string) => {
    const current = get();
    if (current.primaryGymId === gymId && current.primaryGymName === gymName) {
      return;
    }
    noteProfileMutation();
    set({ primaryGymId: gymId, primaryGymName: gymName });
    try {
      const { useCreditsStore } = require("./useCreditsStore");
      const currentMem = useCreditsStore.getState().membershipInfo;
      if (currentMem && currentMem.gymName !== gymName) {
        useCreditsStore.setState({
          membershipInfo: { ...currentMem, gymName }
        });
      }
    } catch {}
  },

  reset: () => set({
    name: "Member",
    email: "",
    phone: null,
    avatarUrl: null,
    visitsRemaining: 10,
    membershipStatus: "No Active Membership",
    planName: "Monthly Membership",
    primaryGymId: "gym-being-fit",
    primaryGymName: "Being Fitness",
    membershipExpiry: "N/A",
    currentMonth: 1,
    totalMonths: 12,
    identityStage: "New Member",
    progressPercentage: 0,
    nextMilestone: "First Visit",
    streak: 0,
    totalWorkouts: 0,
    trainingHours: 0,
    loading: false,
    memberSince: "Recently",
  }),

  fetchProfile: async (token) => {
    if (!token) return;
    if (profileFlight) return profileFlight;
    if (profileFetchedAt && Date.now() - profileFetchedAt < PROFILE_FRESH_MS) return;

    const epoch = profileEpoch;
    const run = (async () => {
    let succeeded = false;
    try {
      const data = await apiFetch("/api/users/me", { token });
      if (epoch !== profileEpoch) return;
      
      const membership = data.membership;
      const plan = membership?.plan;
      
      let finalAvatarUrl = data.avatarUrl || null;
      if (finalAvatarUrl && (finalAvatarUrl.includes('dicebear.com') || finalAvatarUrl.includes('ui-avatars.com'))) {
        finalAvatarUrl = null;
      }
      
      const fetchedGymName = membership?.gymName || membership?.primaryGym?.name || data.primaryGym?.name || data.primaryGymName;
      const fetchedGymId = membership?.primaryGymId || membership?.primaryGym?.id || data.primaryGymId;

      set((state) => {
        if (epoch !== profileEpoch) return state;
        const resolvedName = (fetchedGymName && fetchedGymName !== "FitZone Pro") 
          ? fetchedGymName 
          : (state.primaryGymName && state.primaryGymName !== "FitZone Pro" ? state.primaryGymName : "Being Fitness");
        const resolvedId = (fetchedGymId && fetchedGymId !== "83431d3a-313a-450c-b78e-62732160b6ef")
          ? fetchedGymId
          : (state.primaryGymId || "gym-being-fit");

        const now = Date.now();
        const startTimestamp = membership?.startDate 
          ? new Date(membership.startDate).getTime() 
          : (data.createdAt ? new Date(data.createdAt).getTime() : now);
        const daysSinceJoin = Math.max(0, Math.floor((now - startTimestamp) / (24 * 60 * 60 * 1000)));
        const calculatedCycle = Math.min(12, Math.max(1, Math.floor(daysSinceJoin / 30) + 1));
        const activeCycle = Math.max(membership?.cycleNumber || 1, calculatedCycle);

        const next = {
          name: data.name || "Member",
          email: data.email || "",
          phone: data.phone || null,
          avatarUrl: finalAvatarUrl,
          visitsRemaining: typeof membership?.primaryGymVisits === "number"
            ? membership.primaryGymVisits
            : (typeof plan?.visitsPerMonth === "number" ? plan.visitsPerMonth : (membership ? 10 : state.visitsRemaining)),
          membershipStatus: membership ? membership.status : "No Active Membership",
          planName: plan?.name || (membership ? "Monthly Membership" : state.planName),
          primaryGymId: resolvedId,
          primaryGymName: resolvedName,
          membershipExpiry: membership ? new Date(membership.endDate).toLocaleDateString() : "N/A",
          currentMonth: activeCycle,
          totalMonths: membership?.maxCycles ?? 12,
          streak: Math.max(state.streak, data.progress?.streak ?? 0),
          totalWorkouts: Math.max(state.totalWorkouts, data.progress?.totalWorkouts ?? 0),
          trainingHours: Math.max(state.trainingHours, data.progress?.trainingHours ?? 0),
          identityStage: data.progress?.identityStage || state.identityStage || "Starter",
          memberSince: membership?.startDate 
            ? new Date(membership.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) 
            : (data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Recently"),
          loading: false,
        };
        if (
          state.name === next.name &&
          state.email === next.email &&
          state.phone === next.phone &&
          state.avatarUrl === next.avatarUrl &&
          state.visitsRemaining === next.visitsRemaining &&
          state.membershipStatus === next.membershipStatus &&
          state.planName === next.planName &&
          state.primaryGymId === next.primaryGymId &&
          state.primaryGymName === next.primaryGymName &&
          state.membershipExpiry === next.membershipExpiry &&
          state.currentMonth === next.currentMonth &&
          state.totalMonths === next.totalMonths &&
          state.streak === next.streak &&
          state.totalWorkouts === next.totalWorkouts &&
          state.trainingHours === next.trainingHours &&
          state.identityStage === next.identityStage &&
          state.memberSince === next.memberSince &&
          state.loading === next.loading
        ) {
          return state;
        }
        return next;
      });
      succeeded = true;
    } catch (err: any) {
      console.warn("Failed to fetch user profile:", err?.message || err);
    } finally {
      if (succeeded && epoch === profileEpoch) profileFetchedAt = Date.now();
    }
    })();

    profileFlight = run;
    run.finally(() => {
      if (profileFlight === run) profileFlight = null;
    });
    return run;
  },

  decrementVisits: () => {
    noteProfileMutation();
    set((state) => ({
      visitsRemaining: Math.max(0, state.visitsRemaining - 1),
    }));
  },

  holdProfileSnapshot: () => {
    noteProfileMutation();
  },

  incrementStreak: () => set((state) => ({
    streak: state.streak + 1,
  })),

  recordWorkout: (hours: number) => set((state) => ({
    totalWorkouts: state.totalWorkouts + 1,
    trainingHours: state.trainingHours + hours,
    streak: state.streak + 1,
    // recalculate progress slightly
    progressPercentage: Math.min(100, Math.round(((state.totalWorkouts + 1) / 75) * 100)),
  })),

  updatePlan: async () => ({
    success: false,
    message: "Pay for membership from checkout. Pine Labs confirms the payment before access starts.",
  }),

  purchaseGymPlan: async () => ({
    success: false,
    message: "Pay for membership from checkout. Pine Labs confirms the payment before access starts.",
  }),

  uploadAvatar: async (uri: string) => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error("Not authenticated");
      
      const data = await uploadProfilePicture(uri, token);
      noteProfileMutation();
      set({ avatarUrl: data.avatarUrl });
      return { success: true };
    } catch (err: any) {
      console.error("Failed to upload avatar:", err);
      return { success: false, message: err.message || "Upload failed" };
    }
  },
}),
    {
      name: "zonofit_user_state",
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        name: state.name,
        email: state.email,
        phone: state.phone,
        avatarUrl: state.avatarUrl,
        visitsRemaining: state.visitsRemaining,
        membershipStatus: state.membershipStatus,
        planName: state.planName,
        primaryGymId: state.primaryGymId,
        primaryGymName: state.primaryGymName,
        membershipExpiry: state.membershipExpiry,
        currentMonth: state.currentMonth,
        totalMonths: state.totalMonths,
        identityStage: state.identityStage,
        progressPercentage: state.progressPercentage,
        nextMilestone: state.nextMilestone,
        streak: state.streak,
        totalWorkouts: state.totalWorkouts,
        trainingHours: state.trainingHours,
        memberSince: state.memberSince,
      }),
    }
  )
);
