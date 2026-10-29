/** Email codes stay usable for 10 minutes. */
export declare const EMAIL_OTP_TTL_MINUTES = 10;
/** A new email code cannot be sent until 5 minutes after the previous one. */
export declare const EMAIL_OTP_RESEND_SECONDS: number;
/** Seconds left before the same inbox can be sent another email code. */
export declare function emailResendWaitSeconds(key: string): Promise<number>;
export declare function deleteOTP(key: string): Promise<void>;
/**
 * Removes codes 10 minutes after they expire.
 * A 10-minute code is deleted 20 minutes after it was sent, even if nobody submits it.
 */
export declare function purgeStaleOtps(): Promise<void>;
/** Saves a one-time code in MySQL so every API process sees the same code. */
export declare function setOTP(phone: string, code: string, ttlMinutes?: number): Promise<void>;
/** Checks a code, locks it after 5 misses, and deletes it when it matches. */
export declare function verifyOTP(phone: string, code: string): Promise<boolean>;
//# sourceMappingURL=otpStore.d.ts.map