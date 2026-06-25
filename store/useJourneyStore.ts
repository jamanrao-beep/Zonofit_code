import { create } from "zustand";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  targetCount: number;
  currentCount: number;
  rewardCredits: number;
  deadline: string;
  type: "visits" | "streak" | "gyms";
}

interface JourneyState {
  // Active challenges
  activeChallenges: Challenge[];

  // Actions
  incrementChallenge: (id: string) => void;
}

const defaultChallenges: Challenge[] = [
  {
    id: "ch-1",
    title: "Week Warrior",
    description: "Complete 4 gym visits this week.",
    emoji: "⚡",
    targetCount: 4,
    currentCount: 3,
    rewardCredits: 20,
    deadline: "Ends Sunday",
    type: "visits",
  },
  {
    id: "ch-2",
    title: "Gym Explorer",
    description: "Visit 3 different partner gyms this month.",
    emoji: "🧭",
    targetCount: 3,
    currentCount: 1,
    rewardCredits: 30,
    deadline: "Ends Jul 31",
    type: "gyms",
  },
  {
    id: "ch-3",
    title: "Consistency Champion",
    description: "Maintain a 7-day workout streak.",
    emoji: "🔥",
    targetCount: 7,
    currentCount: 5,
    rewardCredits: 50,
    deadline: "Ongoing",
    type: "streak",
  },
];

export const useJourneyStore = create<JourneyState>((set) => ({
  activeChallenges: defaultChallenges,

  incrementChallenge: (id: string) =>
    set((state) => ({
      activeChallenges: state.activeChallenges.map((c) =>
        c.id === id ? { ...c, currentCount: Math.min(c.currentCount + 1, c.targetCount) } : c
      ),
    })),
}));
