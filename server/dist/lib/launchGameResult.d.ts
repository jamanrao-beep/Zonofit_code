/** Sheet-side result for the lucky challenge. Scores are stored as played. */
export type ChallengeOutcome = "win" | "draw" | "loss" | "abandoned";
export declare function knownLevel(level: number): boolean;
export declare function boxesOnLevel(level: number): number | null;
export declare function settleChallenge(level: number, outcome: ChallengeOutcome, you: number | null, zonofit: number | null): {
    outcome: ChallengeOutcome;
    you: number | null;
    zonofit: number | null;
    reward: string;
};
/** Ladder labels. Stage 0 is 1%. The last two stages are free time, not a percent. */
export declare const TILE_LADDER: readonly ["1%", "2%", "4%", "8%", "16%", "32%", "64%", "1 month free", "3 months free"];
export declare function tileRewardLabel(stage: number): string | null;
/**
 * 1%, 2%, 4%, and 8% are kept as wins.
 * 16% can be kept. A miss there, and every stage from 32% up, is the 12.5% gift.
 */
export declare function settleTileRun(stage: number, outcome: ChallengeOutcome): {
    outcome: ChallengeOutcome;
    stage: number;
    reward: string;
} | null;
export declare function tileResultLine(stage: number, outcome: ChallengeOutcome, reward: string, code: string): string;
export declare function challengeResultLine(level: number, outcome: ChallengeOutcome, you: number | null, zonofit: number | null, reward: string): string;
//# sourceMappingURL=launchGameResult.d.ts.map