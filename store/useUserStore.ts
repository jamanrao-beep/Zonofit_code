import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { apiFetch, uploadProfilePicture } from "@/lib/api";
import { useCreditsStore } from "./useCreditsStore";
import { useAuthStore } from "./useAuthStore";
import { calculateMembershipBreakdown } from "@/constants/credits";

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
          visitsRemaining: membership?.primaryGymVisits || plan?.visitsPerMonth || (membership ? 10 : state.visitsRemaining),
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

  updatePlan: async (planId: string, amountPaidPaise: number, primaryGymId?: string) => {
    // Single common monthly membership
    const planName = "Monthly Membership";
    const currentCycle = get().currentMonth || 1;
    const resolvedPrice = (typeof amountPaidPaise === "number" && amountPaidPaise > 0) ? Math.round(amountPaidPaise / 100) : 3000;
    const breakdown = calculateMembershipBreakdown(resolvedPrice, currentCycle);
    const visits = breakdown.mandatoryVisitsCount;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId || "");
    const resolvedPlanId = isUuid ? planId : "755fb72b-6174-44a9-9456-e4747dc46095";
    const resolvedGymId = primaryGymId || "83431d3a-313a-450c-b78e-62732160b6ef";

    const resolvedAmount = (typeof amountPaidPaise === "number" && amountPaidPaise > 0)
      ? amountPaidPaise
      : 199900;

    try {
      const token = useAuthStore.getState().token;
      const data = await apiFetch("/api/membership/activate", {
        method: "POST",
        token,
        body: JSON.stringify({
          directAccept: true,
          planId: resolvedPlanId,
          primaryGymId: resolvedGymId,
          referenceId: "pay_" + Date.now().toString(),
          amountPaidPaise: resolvedAmount,
        }),
      });

      const returnedPlan = data.membership?.plan;
      const finalPlanName = returnedPlan?.name || planName;
      const finalVisits = data.membership?.primaryGymVisits || returnedPlan?.visitsPerMonth || visits;
      const finalStatus = data.membership?.status || "ACTIVE";
      const finalExpiry = data.membership?.endDate
        ? new Date(data.membership.endDate).toLocaleDateString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

      const gymName = data.membership?.primaryGym?.name || data.membership?.gymName || "FitZone Pro";

      noteProfileMutation();
      set({
        planName: finalPlanName,
        visitsRemaining: finalVisits,
        primaryGymId: resolvedGymId,
        primaryGymName: gymName,
        membershipStatus: finalStatus,
        membershipExpiry: finalExpiry,
      });

      // Update credits store
      if (typeof data.newCreditBalance === "number") {
        useCreditsStore.getState().noteLocalWalletChange();
        useCreditsStore.setState({ credits: data.newCreditBalance });
      }

      if (token) {
        useCreditsStore.getState().fetchWallet(token, { force: true });
      }

      return { success: true, message: data.message || `Upgraded to ${finalPlanName} plan!` };
    } catch (err: any) {
      return { success: false, message: err?.message || "Membership payment was not confirmed." };
    }
  },

  purchaseGymPlan: async (gymPlanId: string, amountPaidPaise: number) => {
    try {
      const token = useAuthStore.getState().token;
      const data = await apiFetch("/api/membership/activate", {
        method: "POST",
        token,
        body: JSON.stringify({
          directAccept: true,
          gymPlanId,
          referenceId: "pay_" + Date.now().toString(),
          amountPaidPaise,
        }),
      });

      noteProfileMutation();
      set({
        planName: data.membership?.gymPlan?.name || data.membership?.plan?.name || "Plan",
        visitsRemaining: data.membership?.primaryGymVisits || 10,
        membershipStatus: data.membership?.status || "ACTIVE",
        membershipExpiry: data.membership?.endDate ? new Date(data.membership.endDate).toLocaleDateString() : "N/A",
      });

      const walletData = await apiFetch("/api/credits/balance", { token });
      if (walletData && walletData.balance !== undefined) {
        useCreditsStore.getState().noteLocalWalletChange();
        useCreditsStore.setState({ credits: walletData.balance });
      }
      return { success: true, message: "Gym plan purchased successfully." };
    } catch (err: any) {
      return { success: false, message: err?.message || "Gym plan payment was not confirmed." };
    }
  },

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
