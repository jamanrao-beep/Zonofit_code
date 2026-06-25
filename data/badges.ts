/**
 * Achievement Badge Definitions
 * Used by the Journey screen's Achievements section.
 */

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
  unlockedAt?: number; // totalWorkouts threshold to unlock
  isSpecial?: boolean; // special conditions (e.g., streak-based)
}

export const mockBadges: Badge[] = [
  {
    id: "first-visit",
    name: "First Visit",
    emoji: "🎉",
    description: "Completed your very first gym visit through ZonoFit.",
    requirement: "Complete 1 gym visit",
    unlockedAt: 1,
  },
  {
    id: "five-visits",
    name: "Getting Started",
    emoji: "🔥",
    description: "Five workouts done. You're building a real habit.",
    requirement: "Complete 5 gym visits",
    unlockedAt: 5,
  },
  {
    id: "ten-visits",
    name: "10 Strong",
    emoji: "💪",
    description: "Double digits. Most people stop here — you didn't.",
    requirement: "Complete 10 gym visits",
    unlockedAt: 10,
  },
  {
    id: "twenty-five-visits",
    name: "Quarter Century",
    emoji: "🥈",
    description: "25 visits. Consistency is becoming your identity.",
    requirement: "Complete 25 gym visits",
    unlockedAt: 25,
  },
  {
    id: "fifty-visits",
    name: "50 Workouts",
    emoji: "🏅",
    description: "50 completed visits. You've earned elite status.",
    requirement: "Complete 50 gym visits",
    unlockedAt: 50,
  },
  {
    id: "hundred-visits",
    name: "Century Club",
    emoji: "🏆",
    description: "100 workouts. You are in the top 1%.",
    requirement: "Complete 100 gym visits",
    unlockedAt: 100,
  },
  {
    id: "gym-explorer",
    name: "Gym Explorer",
    emoji: "🧭",
    description: "Visited 3 different partner gyms.",
    requirement: "Visit 3 different gyms",
    isSpecial: true,
  },
  {
    id: "streak-7",
    name: "Weekly Warrior",
    emoji: "📅",
    description: "7-day workout streak. Habits are forming.",
    requirement: "Maintain a 7-day streak",
    isSpecial: true,
  },
  {
    id: "streak-30",
    name: "Iron Will",
    emoji: "⚡",
    description: "30-day workout streak. Truly remarkable.",
    requirement: "Maintain a 30-day streak",
    isSpecial: true,
  },
  {
    id: "credit-saver",
    name: "Credit Saver",
    emoji: "💰",
    description: "Saved ₹5,000+ compared to pay-per-visit pricing.",
    requirement: "Save ₹5,000 in credit value",
    isSpecial: true,
  },
  {
    id: "early-bird",
    name: "Early Bird",
    emoji: "🌅",
    description: "Booked a morning session before 8 AM.",
    requirement: "Book a session before 8 AM",
    isSpecial: true,
  },
  {
    id: "legend",
    name: "ZonoFit Legend",
    emoji: "👑",
    description: "Completed the full 12-month ZonoFit journey.",
    requirement: "Complete Month 12 of the journey",
    unlockedAt: 155,
  },
];

/** Returns badges unlocked based on total workout count */
export const getUnlockedBadges = (totalWorkouts: number): Badge[] => {
  return mockBadges.filter(
    (b) => !b.isSpecial && b.unlockedAt !== undefined && totalWorkouts >= b.unlockedAt
  );
};

/** Returns workout-count-based badges still locked */
export const getLockedBadges = (totalWorkouts: number): Badge[] => {
  return mockBadges.filter(
    (b) => !b.isSpecial && b.unlockedAt !== undefined && totalWorkouts < b.unlockedAt
  );
};
