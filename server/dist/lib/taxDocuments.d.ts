/**
 * Membership tax previews from the 8 Nov 2026 GST guide.
 * Live invoices stay off. The customer still pays the inclusive price.
 */
import { type InclusiveGst } from "./gst";
export declare const LIVE_TAX_INVOICES_ENABLED = false;
export declare const SUPPLIER_MODE: "UNCONFIRMED";
export type SupplierMode = "UNCONFIRMED" | "GYM_SUPPLIES" | "ZONOFIT_SUPPLIES";
export interface TaxPreview {
    document: "TAX_INVOICE_PREVIEW" | "COMMERCIAL_RECEIPT" | "BLOCKED";
    issuable: false;
    supplierMode: SupplierMode;
    gstCharged: boolean;
    customerPaysPaise: number;
    sac: string;
    grossPaise: number;
    taxablePaise: number;
    taxPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    ratePercent: number | null;
    placeOfSupplyConfirmed: false;
    reason: string;
}
/** One legal outcome. Unconfirmed mode does not pick a supplier. */
export declare function membershipDocumentPreview(input: {
    grossPaise: number;
    supplierMode?: SupplierMode;
    gymGstRegistered?: boolean | null;
    ratePercent?: number;
    intraState?: boolean;
}): TaxPreview;
/**
 * What a membership payment may show before a CA confirms the supplier.
 * The charged amount is always the inclusive gross.
 */
export declare function membershipTaxBranches(input: {
    grossPaise: number;
    gymGstRegistered?: boolean | null;
    ratePercent?: number;
}): {
    supplierMode: "UNCONFIRMED";
    issuable: false;
    liveInvoicesEnabled: boolean;
    customerPaysPaise: number;
    sac: string;
    ratePercent: number;
    gymGstRegistered: boolean;
    registeredGymSupplies: TaxPreview;
    unregisteredGymSupplies: TaxPreview;
    zonoFitSupplies: TaxPreview;
};
/** Case D. Credits pay part of a new supply. GST stays on the full price. */
export declare function freshSupplyAllocation(grossPaise: number, creditPaise: number, cashPaise: number, ratePercent?: number): {
    kind: "FRESH_SUPPLY";
    supply: InclusiveGst;
    creditPaise: number;
    cashPaise: number;
    taxPaise: number;
    taxFollowsCashOnly: boolean;
};
/** Case E. Only a verified same-supplier advance is already taxed. New tax is the remainder. */
export declare function verifiedAdvanceAllocation(grossPaise: number, advancePaise: number, cashPaise: number, ratePercent?: number): {
    kind: "VERIFIED_ADVANCE";
    supply: InclusiveGst;
    advanceAlreadyTaxed: InclusiveGst;
    incremental: {
        grossPaise: number;
        taxablePaise: number;
        taxPaise: number;
        cgstPaise: number;
        sgstPaise: number;
        igstPaise: number;
    };
    totalTaxPaise: number;
};
/** Case F. The 2 credits are stored. Rupees and GST stay unposted until a rate is approved. */
export declare function cancellationChargePreview(creditsRetained: number): {
    kind: "CANCELLATION_PREVIEW";
    creditsRetained: number;
    rupeeValueConfirmed: boolean;
    taxStatus: "PENDING_CLASSIFICATION";
    posted: boolean;
    issuable: false;
};
/** Worked illustration only. ₹20 at 5% or 18% is not the live credit rate. */
export declare function illustrateInclusiveCharge(grossPaise: number, ratePercent: number): {
    posted: false;
    issuable: false;
    grossPaise: number;
    taxablePaise: number;
    taxPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    ratePercent: number;
    rateBps: number;
    intraState: boolean;
};
/** Case G. Carry 80% forward. Do not post GST on the 20% until it is classified. */
export declare function membershipEndHaircutPreview(unusedPaise: number, haircutPercent?: number): {
    kind: "HAIRCUT_PREVIEW";
    unusedPaise: number;
    haircutPercent: number;
    haircutPaise: number;
    carriedForwardPaise: number;
    haircutApplied: boolean;
    stacked: boolean;
    taxStatus: "PENDING_CLASSIFICATION";
    posted: boolean;
    issuable: false;
    ifIndependentFee: {
        posted: false;
        issuable: false;
        grossPaise: number;
        taxablePaise: number;
        taxPaise: number;
        cgstPaise: number;
        sgstPaise: number;
        igstPaise: number;
        ratePercent: number;
        rateBps: number;
        intraState: boolean;
    };
    ifAncillaryToMembership: {
        posted: false;
        issuable: false;
        grossPaise: number;
        taxablePaise: number;
        taxPaise: number;
        cgstPaise: number;
        sgstPaise: number;
        igstPaise: number;
        ratePercent: number;
        rateBps: number;
        intraState: boolean;
    };
};
/** Case H. The gym is paid the contract gross. GST, when the gym is registered, sits inside it. */
export declare function inclusiveGymPayout(grossPaise: number, gymGstRegistered: boolean, ratePercent?: number): {
    kind: "PAYOUT_STATEMENT";
    gstCharged: boolean;
    grossPaise: number;
    payablePaise: number;
    taxablePaise: null;
    taxPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    customerInvoice: false;
} | {
    grossPaise: number;
    taxablePaise: number;
    taxPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    ratePercent: number;
    rateBps: number;
    intraState: boolean;
    kind: "PAYOUT_STATEMENT";
    gstCharged: boolean;
    payablePaise: number;
    customerInvoice: false;
};
/**
 * Membership expiry keeps unused credits in the wallet.
 * Cash conversion and the 20% haircut are not posted until they are approved.
 */
export declare function membershipExpiryCreditPolicy(): {
    convertToCash: false;
    postHaircut: false;
    reason: string;
};
export declare function issueLiveTaxInvoice(): never;
//# sourceMappingURL=taxDocuments.d.ts.map