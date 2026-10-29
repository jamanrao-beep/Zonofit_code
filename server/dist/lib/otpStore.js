"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_OTP_RESEND_SECONDS = exports.EMAIL_OTP_TTL_MINUTES = void 0;
exports.emailResendWaitSeconds = emailResendWaitSeconds;
exports.deleteOTP = deleteOTP;
exports.purgeStaleOtps = purgeStaleOtps;
exports.setOTP = setOTP;
exports.verifyOTP = verifyOTP;
const crypto_1 = require("crypto");
const prisma_1 = __importDefault(require("./prisma"));
function hashCode(code) {
    return (0, crypto_1.createHash)("sha256").update(code).digest("hex");
}
function hashesMatch(actual, expected) {
    const actualBuf = Buffer.from(actual);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(actualBuf, expectedBuf);
}
/** Email codes stay usable for 10 minutes. */
exports.EMAIL_OTP_TTL_MINUTES = 10;
/** A new email code cannot be sent until 5 minutes after the previous one. */
exports.EMAIL_OTP_RESEND_SECONDS = 5 * 60;
/** Seconds left before the same inbox can be sent another email code. */
async function emailResendWaitSeconds(key) {
    const rows = await prisma_1.default.$queryRaw `
    SELECT expiresAt FROM otp_codes WHERE phone = ${key} LIMIT 1
  `;
    const record = rows[0];
    if (!record)
        return 0;
    const sentAt = new Date(record.expiresAt).getTime() - exports.EMAIL_OTP_TTL_MINUTES * 60 * 1000;
    const waitMs = exports.EMAIL_OTP_RESEND_SECONDS * 1000 - (Date.now() - sentAt);
    if (waitMs <= 0)
        return 0;
    return Math.ceil(waitMs / 1000);
}
async function deleteOTP(key) {
    await prisma_1.default.$executeRaw `DELETE FROM otp_codes WHERE phone = ${key}`;
}
/**
 * Removes codes 10 minutes after they expire.
 * A 10-minute code is deleted 20 minutes after it was sent, even if nobody submits it.
 */
async function purgeStaleOtps() {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    await prisma_1.default.$executeRaw `
    DELETE FROM otp_codes
    WHERE expiresAt < ${cutoff}
  `;
}
/** Saves a one-time code in MySQL so every API process sees the same code. */
async function setOTP(phone, code, ttlMinutes = 5) {
    await purgeStaleOtps();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await prisma_1.default.$executeRaw `
    INSERT INTO otp_codes (phone, codeHash, expiresAt, attempts)
    VALUES (${phone}, ${codeHash}, ${expiresAt}, 0)
    ON DUPLICATE KEY UPDATE codeHash = ${codeHash}, expiresAt = ${expiresAt}, attempts = 0
  `;
}
/** Checks a code, locks it after 5 misses, and deletes it when it matches. */
async function verifyOTP(phone, code) {
    await purgeStaleOtps();
    const rows = await prisma_1.default.$queryRaw `
    SELECT codeHash, expiresAt, attempts FROM otp_codes WHERE phone = ${phone} LIMIT 1
  `;
    const record = rows[0];
    if (!record)
        return false;
    const expired = new Date(record.expiresAt).getTime() <= Date.now();
    if (expired || Number(record.attempts) >= 5) {
        await prisma_1.default.$executeRaw `DELETE FROM otp_codes WHERE phone = ${phone}`;
        return false;
    }
    if (hashesMatch(hashCode(code), record.codeHash)) {
        await prisma_1.default.$executeRaw `DELETE FROM otp_codes WHERE phone = ${phone}`;
        return true;
    }
    await prisma_1.default.$executeRaw `UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ${phone}`;
    return false;
}
//# sourceMappingURL=otpStore.js.map