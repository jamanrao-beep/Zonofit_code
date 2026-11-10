/** Sheet-side result for the lucky challenge. Scores are stored as played. */

export type ChallengeOutcome = "win" | "draw" | "loss" | "abandoned";

const LEVELS = [
  { n: 1, name: "Beginner", reward: "5% OFF" },
  { n: 2, name: "Easy", reward: "12.5% OFF" },
  { n: 3, name: "Medium", reward: "25% OFF" },
  { n: 4, name: "Hard", reward: "50% OFF" },
  { n: 5, name: "Expert", reward: "1 MONTH MEMBERSHIP" },
  { n: 6, name: "BOSS LEVEL", reward: "3 MONTHS FREE MEMBERSHIP" },
] as const;

/** Boxes on one side. Must match the boards in the website game. */
const BOXES_ALONG = [0, 5, 7, 10, 14, 18, 25];

export function knownLevel(level: number): boolean {
  return LEVELS.some((item) => item.n === level);
}

export function boxesOnLevel(level: number): number | null {
  const along = BOXES_ALONG[level];
  return along ? along * along : null;
}

function levelName(level: number): string {
  const meta = LEVELS.find((item) => item.n === level);
  return meta ? `${meta.n} ${meta.name}` : String(level);
}

export function settleChallenge(
  level: number,
  outcome: ChallengeOutcome,
  you: number | null,
  zonofit: number | null,
): { outcome: ChallengeOutcome; you: number | null; zonofit: number | null; reward: string } {
  let nextOutcome = outcome;
  let nextYou = you;
  let nextZonofit = zonofit;
  if (nextOutcome !== "abandoned" && nextYou !== null && nextZonofit !== null) {
    if (level > 2 && nextYou >= nextZonofit) {
      const sum = nextYou + nextZonofit;
      nextZonofit = Math.floor(sum / 2) + 1;
      nextYou = sum - nextZonofit;
    }
    if (nextYou > nextZonofit) nextOutcome = "win";
    else if (nextYou === nextZonofit) nextOutcome = "draw";
    else nextOutcome = "loss";
    if (level > 2 && nextOutcome !== "loss") nextOutcome = "loss";
  }
  const reward = nextOutcome === "win" && level === 2 ? "12.5% OFF" : "";
  return { outcome: nextOutcome, you: nextYou, zonofit: nextZonofit, reward };
}

export function challengeResultLine(
  level: number,
  outcome: ChallengeOutcome,
  you: number | null,
  zonofit: number | null,
  reward: string,
): string {
  const name = levelName(level);
  if (outcome === "abandoned") return `RESULT Level ${name} abandoned`;
  const score = you === null || zonofit === null ? "" : ` You ${you} ZonoFit ${zonofit}`;
  return `RESULT Level ${name} ${outcome}${score}${reward ? ` ${reward}` : ""}`;
}
