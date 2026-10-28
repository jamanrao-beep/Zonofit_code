export declare const otpStore: Map<string, {
    code: string;
    expiresAt: number;
}>;
/**
 * Save an OTP to the in-memory store for a phone number.
 * Defaults to 5 minutes expiration.
 */
export declare function setOTP(phone: string, code: string, ttlMinutes?: number): void;
/**
 * Verify if the OTP matches and is not expired.
 * Deletes the OTP if valid.
 */
export declare function verifyOTP(phone: string, code: string): boolean;
//# sourceMappingURL=otpStore.d.ts.map