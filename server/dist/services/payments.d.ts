import Razorpay from "razorpay";
export interface PaymentMeta {
    planId?: string | null;
    gymPlanId?: string | null;
    primaryGymId?: string;
    gymName?: string | null;
}
export declare function getRazorpayConfig(): {
    keyId: string;
    keySecret: string;
};
export declare function getRazorpay(): Razorpay;
export declare function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean;
export declare function verifyWebhookSignature(rawBody: Buffer, header: string | undefined): boolean;
/**
 * Marks a Razorpay order paid and applies credits, cash, or membership once.
 * `paidPaise` must match the order when the gateway reports an amount.
 */
export declare function fulfillPaymentOrder(input: {
    razorpayOrderId: string;
    referenceId: string;
    paidPaise?: number;
    userId?: string;
}): Promise<any>;
//# sourceMappingURL=payments.d.ts.map