export interface PaymentMeta {
    planId?: string | null;
    gymPlanId?: string | null;
    primaryGymId?: string;
    gymName?: string | null;
    freeMonthId?: string | null;
    waiverPaise?: number;
}
/**
 * Applies a confirmed Pine Labs order once.
 * `paidPaise` must match the order when the gateway reports an amount.
 */
export declare function fulfillPaymentOrder(input: {
    gatewayOrderId: string;
    referenceId: string;
    paidPaise?: number;
    userId?: string;
}): Promise<any>;
//# sourceMappingURL=payments.d.ts.map