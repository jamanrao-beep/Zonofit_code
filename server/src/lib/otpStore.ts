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

/** Email codes stay usable for 10 minutes. */
export const EMAIL_OTP_TTL_MINUTES = 10;
/** A new email code cannot be sent until 5 minutes after the previous one. */
export const EMAIL_OTP_RESEND_SECONDS = 5 * 60;

/** Seconds left before the same inbox can be sent another email code. */
export async function emailResendWaitSeconds(key: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ expiresAt: Date }>>`
    SELECT expiresAt FROM otp_codes WHERE phone = ${key} LIMIT 1
  `;
  const record = rows[0];
  if (!record) return 0;
  const sentAt = new Date(record.expiresAt).getTime() - EMAIL_OTP_TTL_MINUTES * 60 * 1000;
  const waitMs = EMAIL_OTP_RESEND_SECONDS * 1000 - (Date.now() - sentAt);
  if (waitMs <= 0) return 0;
  return Math.ceil(waitMs / 1000);
}

export async function deleteOTP(key: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM otp_codes WHERE phone = ${key}`;
}

/**
 * Removes codes 10 minutes after they expire.
 * A 10-minute code is deleted 20 minutes after it was sent, even if nobody submits it.
 */
export async function purgeStaleOtps(): Promise<void> {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.$executeRaw`
    DELETE FROM otp_codes
    WHERE expiresAt < ${cutoff}
  `;
}

/** Saves a one-time code in MySQL so every API process sees the same code. */
export async function setOTP(phone: string, code: string, ttlMinutes = 5): Promise<void> {
  await purgeStaleOtps();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await prisma.$executeRaw`
    INSERT INTO otp_codes (phone, codeHash, expiresAt, attempts)
    VALUES (${phone}, ${codeHash}, ${expiresAt}, 0)
    ON DUPLICATE KEY UPDATE codeHash = ${codeHash}, expiresAt = ${expiresAt}, attempts = 0
  `;
}

/** Checks a code, locks it after 5 misses, and deletes it when it matches. */
export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  await purgeStaleOtps();
  const rows = await prisma.$queryRaw<Array<{ codeHash: string; expiresAt: Date; attempts: number | bigint }>>`
    SELECT codeHash, expiresAt, attempts FROM otp_codes WHERE phone = ${phone} LIMIT 1
  `;
  const record = rows[0];
  if (!record) return false;

  const expired = new Date(record.expiresAt).getTime() <= Date.now();
  if (expired || Number(record.attempts) >= 5) {
    await prisma.$executeRaw`DELETE FROM otp_codes WHERE phone = ${phone}`;
    return false;
  }

  if (hashesMatch(hashCode(code), record.codeHash)) {
    await prisma.$executeRaw`DELETE FROM otp_codes WHERE phone = ${phone}`;
    return true;
  }

  await prisma.$executeRaw`UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ${phone}`;
  return false;
}
