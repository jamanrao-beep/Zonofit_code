/** Drops rate-limit rows whose window has already ended, so one row is not kept per phone or email forever. */
export declare function purgeExpiredRateLimits(): Promise<void>;
/**
 * Counts attempts in MySQL so a second API process cannot reset the window.
 * Returns false when the caller is over the limit.
 */
export declare function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean>;
//# sourceMappingURL=rateLimit.d.ts.map