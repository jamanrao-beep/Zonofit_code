import { create } from "zustand";
import { apiFetch } from "@/lib/api";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  targetCount: number;
  rewardCredits: number;
  deadline?: string;
  type: string;
}

export interface UserChallenge {
  id: string;
  challengeId: string;
  currentCount: number;
  completed: boolean;
  challenge: Challenge;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
  unlockedAt?: number;
  isSpecial: boolean;
}

export interface UserBadge {
  id: string;
  badgeId: string;
  badge: Badge;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  emoji: string;
  targetCount: number;
  rewardCredits: number;
}

interface JourneyState {
  progress: {
    streak: number;
    totalWorkouts: number;
    trainingHours: number;
    identityStage: string;
  };
  badges: Badge[];
  userBadges: UserBadge[];
  milestones: Milestone[];
  challenges: Challenge[];
  userChallenges: UserChallenge[];
  loading: boolean;
  
  fetchJourneyData: (token: string) => Promise<void>;
  incrementChallenge: (id: string) => void;
}

export const useJourneyStore = create<JourneyState>((set) => ({
  progress: {
    streak: 0,
    totalWorkouts: 0,
    trainingHours: 0,
    identityStage: "Starter",
  },
  badges: [],
  userBadges: [],
  milestones: [],
  challenges: [],
  userChallenges: [],
  loading: false,

  fetchJourneyData: async (token) => {
    set({ loading: true });
    try {
      const data = await apiFetch("/api/journey", { token });
      set({
        progress: data.progress,
        badges: data.badges,
        userBadges: data.userBadges,
        milestones: data.milestones,
        challenges: data.challenges,
        userChallenges: data.userChallenges,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to fetch journey data:", err);
      set({ loading: false });
    }
  },

  incrementChallenge: (id: string) => {
    // For MVP frontend optimistic update only. Backend update required in Phase 2.
    set((state) => ({
      userChallenges: state.userChallenges.map((uc) =>
        uc.challengeId === id 
          ? { ...uc, currentCount: Math.min(uc.currentCount + 1, uc.challenge.targetCount) } 
          : uc
      ),
    }));
  },
}));
