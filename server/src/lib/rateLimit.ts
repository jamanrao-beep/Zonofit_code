import prisma from "./prisma";

/** Drops rate-limit rows whose window has already ended, so one row is not kept per phone or email forever. */
export async function purgeExpiredRateLimits(): Promise<void> {
  const cutoff = new Date();
  await prisma.$executeRaw`
    DELETE FROM rate_limits WHERE resetAt < ${cutoff}
  `;
}

/**
 * Counts attempts in MySQL so a second API process cannot reset the window.
 * Returns false when the caller is over the limit.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const resetAt = new Date(Date.now() + windowMs);
  await prisma.$executeRaw`
    INSERT INTO rate_limits (id, count, resetAt)
    VALUES (${key}, 1, ${resetAt})
    ON DUPLICATE KEY UPDATE
      count = IF(resetAt <= NOW(3), 1, count + 1),
      resetAt = IF(resetAt <= NOW(3), ${resetAt}, resetAt)
  `;
  const rows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
    SELECT count FROM rate_limits WHERE id = ${key} LIMIT 1
  `;
  return Number(rows[0]?.count ?? 1) <= limit;
}
