/**
 * Journey Milestone Definitions
 * Stage names, month thresholds, and milestone workout counts.
 * Used by the Journey screen and the Home fitness journey section.
 */

export interface JourneyStage {
  month: number;
  stageName: string;
  stageEmoji: string;
  description: string;
  milestoneWorkouts: number; // workouts needed to unlock this stage
  color: string;
}

export const journeyStages: JourneyStage[] = [
  {
    month: 1,
    stageName: "Starter",
    stageEmoji: "🌱",
    description: "You've taken the first step. That's the hardest one.",
    milestoneWorkouts: 1,
    color: "#6BCB77",
  },
  {
    month: 2,
    stageName: "Beginner",
    stageEmoji: "🔥",
    description: "Building the foundation. Consistency is starting to form.",
    milestoneWorkouts: 8,
    color: "#84CC16",
  },
  {
    month: 3,
    stageName: "Consistent",
    stageEmoji: "💪",
    description: "Three months in — you're part of the 20% who stick with it.",
    milestoneWorkouts: 20,
    color: "#22C55E",
  },
  {
    month: 4,
    stageName: "Explorer",
    stageEmoji: "🧭",
    description: "You've tried multiple gyms. Fitness is becoming your lifestyle.",
    milestoneWorkouts: 35,
    color: "#10B981",
  },
  {
    month: 5,
    stageName: "Committed",
    stageEmoji: "🎯",
    description: "Commitment is undeniable. You show up even when it's hard.",
    milestoneWorkouts: 50,
    color: "#059669",
  },
  {
    month: 6,
    stageName: "Half-Year Pro",
    stageEmoji: "🏅",
    description: "Six months. You've built something most people never will.",
    milestoneWorkouts: 65,
    color: "#0D9488",
  },
  {
    month: 7,
    stageName: "Warrior",
    stageEmoji: "⚔️",
    description: "Challenges don't stop you — they define you.",
    milestoneWorkouts: 80,
    color: "#0891B2",
  },
  {
    month: 8,
    stageName: "Athlete",
    stageEmoji: "🏋️",
    description: "You train like an athlete. You think like one too.",
    milestoneWorkouts: 95,
    color: "#2563EB",
  },
  {
    month: 9,
    stageName: "Veteran",
    stageEmoji: "🛡️",
    description: "Nine months of proof that you are who you say you are.",
    milestoneWorkouts: 110,
    color: "#7C3AED",
  },
  {
    month: 10,
    stageName: "Elite",
    stageEmoji: "⭐",
    description: "You've crossed into territory most people dream about.",
    milestoneWorkouts: 125,
    color: "#9333EA",
  },
  {
    month: 11,
    stageName: "Champion",
    stageEmoji: "🏆",
    description: "Almost a year. Champions don't quit this close to the finish.",
    milestoneWorkouts: 140,
    color: "#C026D3",
  },
  {
    month: 12,
    stageName: "Legend",
    stageEmoji: "👑",
    description: "12 months. You are proof that consistency beats everything.",
    milestoneWorkouts: 155,
    color: "#DB2777",
  },
];

export const getStageForWorkoutCount = (workouts: number): JourneyStage => {
  return (
    [...journeyStages].reverse().find((s) => workouts >= s.milestoneWorkouts) ??
    journeyStages[0]
  );
};
