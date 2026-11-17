import prisma from "./prisma";

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("DB_TIMEOUT")), ms)),
  ]);
}

const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();

/** Drops rate-limit rows whose window has already ended, so one row is not kept per phone or email forever. */
export async function purgeExpiredRateLimits(): Promise<void> {
  const now = Date.now();
  for (const [key, item] of memoryRateLimits.entries()) {
    if (item.resetAt < now) {
      memoryRateLimits.delete(key);
    }
  }

  try {
    const cutoff = new Date();
    await withTimeout(
      prisma.$executeRaw`
        DELETE FROM rate_limits WHERE resetAt < ${cutoff}
      `,
      1500
    );
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Counts attempts in MySQL with in-memory fallback so callers are never blocked by DB connection delays.
 * Returns false when the caller is over the limit. Fails open on DB glitch.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const mem = memoryRateLimits.get(key);
  if (mem) {
    if (mem.resetAt <= now) {
      mem.count = 1;
      mem.resetAt = now + windowMs;
    } else {
      mem.count += 1;
    }
    if (mem.count > limit) {
      return false;
    }
  } else {
    memoryRateLimits.set(key, { count: 1, resetAt: now + windowMs });
  }

  try {
    const resetAt = new Date(now + windowMs);
    await withTimeout(
      prisma.$executeRaw`
        INSERT INTO rate_limits (id, count, resetAt)
        VALUES (${key}, 1, ${resetAt})
        ON DUPLICATE KEY UPDATE
          count = IF(resetAt <= NOW(3), 1, count + 1),
          resetAt = IF(resetAt <= NOW(3), ${resetAt}, resetAt)
      `,
      2000
    );
    const rows = await withTimeout(
      prisma.$queryRaw<Array<{ count: number | bigint }>>`
        SELECT count FROM rate_limits WHERE id = ${key} LIMIT 1
      `,
      2000
    );
    return Number(rows[0]?.count ?? 1) <= limit;
  } catch (err) {
    console.warn("[RateLimit] Rate limit query error, failing open with memory guard:", err);
    return (memoryRateLimits.get(key)?.count ?? 1) <= limit;
  }
}
