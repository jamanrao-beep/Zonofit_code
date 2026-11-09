/**
 * Inclusive GST in integer paise.
 *
 * A shown price is the final amount. Tax is backed out of it.
 * taxable = round(gross × 10000 / (10000 + rate basis points)), half up.
 * tax = gross − taxable. CGST and SGST split that tax; an odd paisa goes to CGST.
 * Do not round 2.5% twice — that drops a paisa (₹80 becomes ₹3.80 of tax instead of ₹3.81).
 */
export declare const MEMBERSHIP_GST_PERCENT = 5;
export declare const INDEPENDENT_FEE_GST_PERCENT = 18;
export declare const FITNESS_MEMBERSHIP_SAC = "999723";
export interface InclusiveGst {
    grossPaise: number;
    taxablePaise: number;
    taxPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    ratePercent: number;
    rateBps: number;
    intraState: boolean;
}
export declare function assertPaise(value: number, label?: string): number;
/** 5 → 500, 18 → 1800, 2.5 → 250. Rejects anything finer than 0.01%. */
export declare function percentToBasisPoints(ratePercent: number): number;
export declare function extractInclusiveGst(grossPaise: number, ratePercent: number, intraState?: boolean): InclusiveGst;
/** Whole-percent cut of an inclusive rupee amount. 20% of ₹1,000 is ₹200. */
export declare function percentOfPaise(grossPaise: number, percent: number): number;
//# sourceMappingURL=gst.d.ts.map