/** 1 shop credit = ₹8. Same rule as CREDIT_CASH_VALUE in constants/credits.ts. */
export declare const MARKETPLACE_CREDIT_INR = 8;
export declare const MARKETPLACE_CREDIT_PAISE: number;
/** Whole credits needed to cover a shop total. Rounds up so the order is fully paid in credits. */
export declare function creditsForMarketplacePaise(totalPaise: number): number;
//# sourceMappingURL=marketplacePay.d.ts.map