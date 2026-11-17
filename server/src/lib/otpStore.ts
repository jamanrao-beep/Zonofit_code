import { createHash, timingSafeEqual } from "crypto";
import prisma from "./prisma";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function hashesMatch(actual: string, expected: string): boolean {
  const actualBuf = Buffer.from(actual);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}

/** In-memory fallback cache so OTPs work reliably even if the database has connection blips. */
interface MemoryOtp {
  codeHash: string;
  expiresAt: number;
  attempts: number;
}
const memoryOtpStore = new Map<string, MemoryOtp>();

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("DB_TIMEOUT")), ms)),
  ]);
}

/** Email codes stay usable for 10 minutes. */
export const EMAIL_OTP_TTL_MINUTES = 10;
/** A new email code cannot be sent until 5 minutes after the previous one. */
export const EMAIL_OTP_RESEND_SECONDS = 5 * 60;

/** Seconds left before the same inbox can be sent another email code. */
export async function emailResendWaitSeconds(key: string): Promise<number> {
  try {
    const rows = await withTimeout(
      prisma.$queryRaw<Array<{ expiresAt: Date }>>`
        SELECT expiresAt FROM otp_codes WHERE phone = ${key} LIMIT 1
      `,
      2000
    );
    const record = rows[0];
    if (record) {
      const sentAt = new Date(record.expiresAt).getTime() - EMAIL_OTP_TTL_MINUTES * 60 * 1000;
      const waitMs = EMAIL_OTP_RESEND_SECONDS * 1000 - (Date.now() - sentAt);
      if (waitMs > 0) return Math.ceil(waitMs / 1000);
    }
  } catch (err) {
    // Fall back to memory check
  }

  const mem = memoryOtpStore.get(key);
  if (mem) {
    const sentAt = mem.expiresAt - EMAIL_OTP_TTL_MINUTES * 60 * 1000;
    const waitMs = EMAIL_OTP_RESEND_SECONDS * 1000 - (Date.now() - sentAt);
    if (waitMs > 0) return Math.ceil(waitMs / 1000);
  }
  return 0;
}

export async function deleteOTP(key: string): Promise<void> {
  memoryOtpStore.delete(key);
  try {
    await withTimeout(prisma.$executeRaw`DELETE FROM otp_codes WHERE phone = ${key}`, 2000);
  } catch {
    // Non-blocking
  }
}

/**
 * Removes codes 10 minutes after they expire.
 * A 10-minute code is deleted 20 minutes after it was sent, even if nobody submits it.
 */
export async function purgeStaleOtps(): Promise<void> {
  // Purge in-memory store
  const now = Date.now();
  for (const [phone, item] of memoryOtpStore.entries()) {
    if (item.expiresAt < now) {
      memoryOtpStore.delete(phone);
    }
  }

  // Purge MySQL table
  try {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    await withTimeout(
      prisma.$executeRaw`
        DELETE FROM otp_codes
        WHERE expiresAt < ${cutoff}
      `,
      2000
    );
  } catch {
    // Non-blocking
  }
}

/** Saves a one-time code in memory and MySQL so OTP delivery is never blocked by database glitches. */
export async function setOTP(phone: string, code: string, ttlMinutes = 5): Promise<void> {
  const codeHash = hashCode(code);
  const expiresAtMs = Date.now() + ttlMinutes * 60 * 1000;

  // Always write to fast in-memory store first
  memoryOtpStore.set(phone, {
    codeHash,
    expiresAt: expiresAtMs,
    attempts: 0,
  });

  // Attempt database sync non-blocking
  try {
    await purgeStaleOtps();
    const expiresAt = new Date(expiresAtMs);
    await withTimeout(
      prisma.$executeRaw`
        INSERT INTO otp_codes (phone, codeHash, expiresAt, attempts)
        VALUES (${phone}, ${codeHash}, ${expiresAt}, 0)
        ON DUPLICATE KEY UPDATE codeHash = ${codeHash}, expiresAt = ${expiresAt}, attempts = 0
      `,
      2500
    );
  } catch (err) {
    console.warn("[OTPStore] Database write failed, saved in memory fallback:", err);
  }
}

/** Checks a code, locks it after 5 misses, and deletes it when it matches. */
export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const submittedHash = hashCode(code);
  const now = Date.now();

  // 1. Check in-memory store first
  const mem = memoryOtpStore.get(phone);
  if (mem) {
    if (mem.expiresAt <= now || mem.attempts >= 5) {
      memoryOtpStore.delete(phone);
      void deleteOTP(phone);
      return false;
    }
    if (hashesMatch(submittedHash, mem.codeHash)) {
      memoryOtpStore.delete(phone);
      void deleteOTP(phone);
      return true;
    }
    mem.attempts += 1;
  }

  // 2. Check MySQL store
  try {
    await purgeStaleOtps();
    const rows = await withTimeout(
      prisma.$queryRaw<Array<{ codeHash: string; expiresAt: Date; attempts: number | bigint }>>`
        SELECT codeHash, expiresAt, attempts FROM otp_codes WHERE phone = ${phone} LIMIT 1
      `,
      2500
    );
    const record = rows[0];
    if (!record) return false;

    const expired = new Date(record.expiresAt).getTime() <= now;
    if (expired || Number(record.attempts) >= 5) {
      void prisma.$executeRaw`DELETE FROM otp_codes WHERE phone = ${phone}`.catch(() => {});
      return false;
    }

    if (hashesMatch(submittedHash, record.codeHash)) {
      void prisma.$executeRaw`DELETE FROM otp_codes WHERE phone = ${phone}`.catch(() => {});
      return true;
    }

    void prisma.$executeRaw`UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ${phone}`.catch(() => {});
    return false;
  } catch (err) {
    console.warn("[OTPStore] Database verify query failed:", err);
    return false;
  }
}

/** Validates a code without deleting it so subsequent registration can still verify it. */
export async function checkOTP(phone: string, code: string): Promise<boolean> {
  const submittedHash = hashCode(code);
  const now = Date.now();

  const mem = memoryOtpStore.get(phone);
  if (mem) {
    if (mem.expiresAt <= now || mem.attempts >= 5) return false;
    if (hashesMatch(submittedHash, mem.codeHash)) return true;
  }

  try {
    await purgeStaleOtps();
    const rows = await withTimeout(
      prisma.$queryRaw<Array<{ codeHash: string; expiresAt: Date; attempts: number | bigint }>>`
        SELECT codeHash, expiresAt, attempts FROM otp_codes WHERE phone = ${phone} LIMIT 1
      `,
      2500
    );
    const record = rows[0];
    if (!record) return false;

    const expired = new Date(record.expiresAt).getTime() <= now;
    if (expired || Number(record.attempts) >= 5) return false;
    if (hashesMatch(submittedHash, record.codeHash)) return true;

    void prisma.$executeRaw`UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ${phone}`.catch(() => {});
    return false;
  } catch (err) {
    console.warn("[OTPStore] Database check query failed:", err);
    return false;
  }
}
