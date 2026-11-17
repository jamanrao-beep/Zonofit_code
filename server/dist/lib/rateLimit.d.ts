/** Drops rate-limit rows whose window has already ended, so one row is not kept per phone or email forever. */
export declare function purgeExpiredRateLimits(): Promise<void>;
/**
 * Counts attempts in MySQL with in-memory fallback so callers are never blocked by DB connection delays.
 * Returns false when the caller is over the limit. Fails open on DB glitch.
 */
export declare function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean>;
//# sourceMappingURL=rateLimit.d.ts.map