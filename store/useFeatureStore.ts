import { create } from 'zustand';

export const featureBaseData: Record<string, number> = {
  "recovery": 8250,
  "nutrition": 6900,
  "sports-booking": 5400,
  "ai-coach": 14200,
  "workout-generator": 9800,
  "personal-trainer": 7600,
  "travel-fitness": 3200,
  "corporate-wellness": 2800,
  "smart-wearables": 2100
};

interface FeatureState {
  votes: Record<string, boolean>; // featureId -> hasVoted
  notifications: Record<string, boolean>; // featureId -> hasNotified
  toggleVote: (featureId: string) => void;
  toggleNotify: (featureId: string) => void;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  votes: {},
  notifications: {},
  toggleVote: (featureId) => set((state) => ({
    votes: {
      ...state.votes,
      [featureId]: !state.votes[featureId]
    }
  })),
  toggleNotify: (featureId) => set((state) => ({
    notifications: {
      ...state.notifications,
      [featureId]: !state.notifications[featureId]
    }
  }))
}));
