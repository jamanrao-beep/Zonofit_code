/**
 * Utility to send OTP via APITxT (supports SMS and WhatsApp without requiring custom DLT registration).
 */
export interface SMSResult {
    success: boolean;
    message?: string;
    response?: any;
}
export declare function sendOTP(phone: string, code: string): Promise<SMSResult>;
//# sourceMappingURL=sms.d.ts.map