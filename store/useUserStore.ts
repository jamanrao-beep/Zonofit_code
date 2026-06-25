import { create } from "zustand";

interface UserState {
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
  
  // Actions
  decrementVisits: () => void;
  incrementStreak: () => void;
  recordWorkout: (hours: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
  visitsRemaining: 12,
  membershipStatus: "Active Membership",
  planName: "Premium Plan",
  membershipExpiry: "28 Jul 2026",
  currentMonth: 4,
  totalMonths: 12,
  identityStage: "Explorer Stage",
  progressPercentage: 67,
  nextMilestone: "50 Workouts",
  streak: 12,
  totalWorkouts: 48,
  trainingHours: 320,

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
}));
