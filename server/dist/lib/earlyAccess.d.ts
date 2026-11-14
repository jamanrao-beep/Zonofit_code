/** Early-access interest for features that are still locked. Keep the copy in sync with app/tools/[tool].tsx. */
export declare const IDEA_MAX = 500;
export type EarlyFeature = {
    key: string;
    aliases: string[];
    tab: string;
    title: string;
    options: string[];
};
export declare const EARLY_FEATURES: EarlyFeature[];
export type StoredVote = {
    choices: string[];
    idea: string;
};
export type FeedbackRow = {
    userId: string;
    featureName: string;
    comment: string;
    createdAt: Date | string;
};
export type MemberEntry = {
    featureKey: string;
    spot: number;
    choices: string[];
    idea: string;
    ideasShared: number;
    submittedAt: string | null;
};
export declare function canonicalFeature(name: string): string | null;
export declare function featureByKey(key: string): EarlyFeature | undefined;
export declare function featureLabel(name: string): string;
export declare function parseVote(comment: string | null | undefined): StoredVote;
export declare function ideasShared(choices: string[], idea: string): number;
/** 1-based place of this user's first vote among distinct people. */
export declare function spotForUser(rows: {
    userId: string;
    createdAt: Date | string;
}[], userId: string): number | null;
export declare function memberEntries(rows: FeedbackRow[], userId: string): MemberEntry[];
export type NormalizedVote = {
    featureKey: string;
    storedName: string;
    choices: string[];
    idea: string;
    comment: string;
};
export declare function normalizeVote(body: unknown): {
    ok: true;
    vote: NormalizedVote;
} | {
    ok: false;
    message: string;
};
//# sourceMappingURL=earlyAccess.d.ts.map