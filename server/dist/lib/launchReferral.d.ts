export declare function rewardPercentTenths(reward: string): number | null;
export declare function percentFromTenths(tenths: number): number;
export declare function normalizeReferralCode(value: string): string;
/** Notes the code the challenge showed, and the percent that goes with it. */
export declare function noteLaunchReferralCode(input: {
    code: string;
    phone: string;
    percentTenths: number;
    reward: string;
}): Promise<void>;
/** One percent for this code. Mixed percents are ignored. */
export declare function findLaunchPercentTenths(code: string): Promise<number | null>;
export declare function launchReferralTaken(code: string): Promise<boolean>;
export type ResolvedReferral = {
    kind: "friend";
    userId: string;
} | {
    kind: "launch";
    code: string;
    percentTenths: number;
    percent: number;
} | {
    kind: "none";
};
/** A member code wins when both exist. A challenge code is the percent noted for that code. */
export declare function resolveReferral(raw: string): Promise<ResolvedReferral>;
export declare function launchReferralForUser(userId: string): Promise<{
    code: string;
    percent: number;
} | null>;
/** One challenge code per member. A second insert does not replace the first. */
export declare function noteLaunchReferralUse(userId: string, code: string, percentTenths: number): Promise<"ok" | "already">;
//# sourceMappingURL=launchReferral.d.ts.map