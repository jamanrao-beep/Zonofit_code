"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeExpiredRateLimits = purgeExpiredRateLimits;
exports.rateLimit = rateLimit;
const prisma_1 = __importDefault(require("./prisma"));
/** Drops rate-limit rows whose window has already ended, so one row is not kept per phone or email forever. */
async function purgeExpiredRateLimits() {
    const cutoff = new Date();
    await prisma_1.default.$executeRaw `
    DELETE FROM rate_limits WHERE resetAt < ${cutoff}
  `;
}
/**
 * Counts attempts in MySQL so a second API process cannot reset the window.
 * Returns false when the caller is over the limit.
 */
async function rateLimit(key, limit, windowMs) {
    const resetAt = new Date(Date.now() + windowMs);
    await prisma_1.default.$executeRaw `
    INSERT INTO rate_limits (id, count, resetAt)
    VALUES (${key}, 1, ${resetAt})
    ON DUPLICATE KEY UPDATE
      count = IF(resetAt <= NOW(3), 1, count + 1),
      resetAt = IF(resetAt <= NOW(3), ${resetAt}, resetAt)
  `;
    const rows = await prisma_1.default.$queryRaw `
    SELECT count FROM rate_limits WHERE id = ${key} LIMIT 1
  `;
    return Number(rows[0]?.count ?? 1) <= limit;
}
//# sourceMappingURL=rateLimit.js.map