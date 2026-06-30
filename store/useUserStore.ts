import { create } from "zustand";
import { apiFetch, uploadProfilePicture } from "@/lib/api";
import { useCreditsStore } from "./useCreditsStore";
import { useAuthStore } from "./useAuthStore";

interface UserState {
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  visitsRemaining: number;
  membershipStatus: string;
  planName: string;
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
  
  // Actions
  fetchProfile: (token: string) => Promise<void>;
  decrementVisits: () => void;
  incrementStreak: () => void;
  recordWorkout: (hours: number) => void;
  updatePlan: (planId: string, amountPaidPaise: number) => Promise<{ success: boolean; message?: string }>;
  uploadAvatar: (uri: string) => Promise<{ success: boolean; message?: string }>;
}

export const useUserStore = create<UserState>((set) => ({
  name: "Member",
  email: "",
  phone: null,
  avatarUrl: null,
  visitsRemaining: 12,
  membershipStatus: "Active Membership",
  planName: "Premium Plan",
  membershipExpiry: "28 Jul 2026",
  currentMonth: 1,
  totalMonths: 1,
  identityStage: "New Member",
  progressPercentage: 0,
  nextMilestone: "First Visit",
  streak: 0,
  totalWorkouts: 0,
  trainingHours: 0,
  loading: false,

  fetchProfile: async (token) => {
    set({ loading: true });
    try {
      const data = await apiFetch("/api/users/me", { token });
      
      const membership = data.membership;
      const plan = membership?.plan;
      
      let finalAvatarUrl = data.avatarUrl || null;
      if (finalAvatarUrl && (finalAvatarUrl.includes('dicebear.com') || finalAvatarUrl.includes('ui-avatars.com'))) {
        finalAvatarUrl = null;
      }
      
      set({
        name: data.name || "Member",
        email: data.email || "",
        phone: data.phone || null,
        avatarUrl: finalAvatarUrl,
        visitsRemaining: plan ? plan.visitsPerMonth : 0,
        membershipStatus: membership ? membership.status : "No Active Membership",
        planName: plan ? plan.name : "None",
        membershipExpiry: membership ? new Date(membership.endDate).toLocaleDateString() : "N/A",
        // Stats from backend
        streak: data.progress?.streak ?? 0,
        totalWorkouts: data.progress?.totalWorkouts ?? 0,
        trainingHours: data.progress?.trainingHours ?? 0,
        identityStage: data.progress?.identityStage ?? "Starter",
        loading: false
      });
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      set({ loading: false });
    }
  },

  decrementVisits: () => set((state) => ({
    visitsRemaining: Math.max(0, state.visitsRemaining - 1),
  })),

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

  updatePlan: async (planId: string, amountPaidPaise: number) => {
    try {
      const token = useAuthStore.getState().token;
      const data = await apiFetch("/api/membership/activate", {
        method: "POST",
        token,
        body: JSON.stringify({
          planId,
          referenceId: "pay_" + Date.now().toString(), // dummy reference
          amountPaidPaise,
        }),
      });

      set({
        planName: data.membership.plan.name,
        visitsRemaining: data.membership.plan.visitsPerMonth,
        membershipStatus: data.membership.status,
        membershipExpiry: new Date(data.membership.endDate).toLocaleDateString(),
      });

      // Update credits store since credits were granted
      useCreditsStore.setState({ credits: data.newCreditBalance });
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error("Failed to upgrade plan:", err);
      return { success: false, message: err.message || "Upgrade failed" };
    }
  },

  uploadAvatar: async (uri: string) => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error("Not authenticated");
      
      const data = await uploadProfilePicture(uri, token);
      set({ avatarUrl: data.avatarUrl });
      return { success: true };
    } catch (err: any) {
      console.error("Failed to upload avatar:", err);
      return { success: false, message: err.message || "Upload failed" };
    }
  },
}));
