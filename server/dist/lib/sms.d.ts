/**
 * Utility to send SMS using Fast2SMS API.
 * Fast2SMS is a popular and cost-effective SMS gateway in India.
 */
export interface SMSResult {
    success: boolean;
    message?: string;
    fast2smsResponse?: any;
}
export declare function sendOTP(phone: string, code: string): Promise<SMSResult>;
//# sourceMappingURL=sms.d.ts.map