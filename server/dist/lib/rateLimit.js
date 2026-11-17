"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeExpiredRateLimits = purgeExpiredRateLimits;
exports.rateLimit = rateLimit;
const prisma_1 = __importDefault(require("./prisma"));
function withTimeout(promise, ms = 2000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB_TIMEOUT")), ms)),
    ]);
}
const memoryRateLimits = new Map();
/** Drops rate-limit rows whose window has already ended, so one row is not kept per phone or email forever. */
async function purgeExpiredRateLimits() {
    const now = Date.now();
    for (const [key, item] of memoryRateLimits.entries()) {
        if (item.resetAt < now) {
            memoryRateLimits.delete(key);
        }
    }
    try {
        const cutoff = new Date();
        await withTimeout(prisma_1.default.$executeRaw `
        DELETE FROM rate_limits WHERE resetAt < ${cutoff}
      `, 1500);
    }
    catch (err) {
        // Non-blocking
    }
}
/**
 * Counts attempts in MySQL with in-memory fallback so callers are never blocked by DB connection delays.
 * Returns false when the caller is over the limit. Fails open on DB glitch.
 */
async function rateLimit(key, limit, windowMs) {
    const now = Date.now();
    const mem = memoryRateLimits.get(key);
    if (mem) {
        if (mem.resetAt <= now) {
            mem.count = 1;
            mem.resetAt = now + windowMs;
        }
        else {
            mem.count += 1;
        }
        if (mem.count > limit) {
            return false;
        }
    }
    else {
        memoryRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    }
    try {
        const resetAt = new Date(now + windowMs);
        await withTimeout(prisma_1.default.$executeRaw `
        INSERT INTO rate_limits (id, count, resetAt)
        VALUES (${key}, 1, ${resetAt})
        ON DUPLICATE KEY UPDATE
          count = IF(resetAt <= NOW(3), 1, count + 1),
          resetAt = IF(resetAt <= NOW(3), ${resetAt}, resetAt)
      `, 2000);
        const rows = await withTimeout(prisma_1.default.$queryRaw `
        SELECT count FROM rate_limits WHERE id = ${key} LIMIT 1
      `, 2000);
        return Number(rows[0]?.count ?? 1) <= limit;
    }
    catch (err) {
        console.warn("[RateLimit] Rate limit query error, failing open with memory guard:", err);
        return (memoryRateLimits.get(key)?.count ?? 1) <= limit;
    }
}
//# sourceMappingURL=rateLimit.js.map