/** Google shows the app password as 16 letters, sometimes with spaces. */
export declare function normalizeAppPassword(value: string | undefined): string | null;
/** Stable otp_codes key for an email. The address itself is not stored. */
export declare function emailOtpKey(email: string): string;
/** Emails a one-time code from the ZonoFit Gmail account. Never logs the code. */
export declare function sendEmailOTP(to: string, code: string): Promise<boolean>;
//# sourceMappingURL=mail.d.ts.map