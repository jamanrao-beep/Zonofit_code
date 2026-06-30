export const otpStore = new Map<string, { code: string; expiresAt: number }>();

/**
 * Save an OTP to the in-memory store for a phone number.
 * Defaults to 5 minutes expiration.
 */
export function setOTP(phone: string, code: string, ttlMinutes = 5) {
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  otpStore.set(phone, { code, expiresAt });
}

/**
 * Verify if the OTP matches and is not expired.
 * Deletes the OTP if valid.
 */
export function verifyOTP(phone: string, code: string): boolean {
  const record = otpStore.get(phone);
  if (!record) return false;

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return false;
  }

  if (record.code === code) {
    otpStore.delete(phone);
    return true;
  }

  return false;
}
