/** Sheet-side result for the lucky challenge. Levels above 2 cannot finish ahead. */
export type ChallengeOutcome = "win" | "draw" | "loss" | "abandoned";
export declare function knownLevel(level: number): boolean;
export declare function settleChallenge(level: number, outcome: ChallengeOutcome, you: number | null, zonofit: number | null): {
    outcome: ChallengeOutcome;
    you: number | null;
    zonofit: number | null;
    reward: string;
};
export declare function challengeResultLine(level: number, outcome: ChallengeOutcome, you: number | null, zonofit: number | null, reward: string): string;
//# sourceMappingURL=launchGameResult.d.ts.map