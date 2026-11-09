/**
 * Membership tax previews from the 8 Nov 2026 GST guide.
 * Live invoices stay off. The customer still pays the inclusive price.
 */

import {
  FITNESS_MEMBERSHIP_SAC,
  INDEPENDENT_FEE_GST_PERCENT,
  MEMBERSHIP_GST_PERCENT,
  type InclusiveGst,
  assertPaise,
  extractInclusiveGst,
  percentOfPaise,
} from "./gst";

export const LIVE_TAX_INVOICES_ENABLED = false;
export const SUPPLIER_MODE = "UNCONFIRMED" as const;

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

function blockedReason(): string {
  return "Not a tax invoice. The supplier, GSTIN, and fee category are not confirmed.";
}

function fromGst(tax: InclusiveGst, supplierMode: SupplierMode, document: TaxPreview["document"]): TaxPreview {
  return {
    document,
    issuable: false,
    supplierMode,
    gstCharged: tax.taxPaise > 0,
    customerPaysPaise: tax.grossPaise,
    sac: FITNESS_MEMBERSHIP_SAC,
    grossPaise: tax.grossPaise,
    taxablePaise: tax.taxablePaise,
    taxPaise: tax.taxPaise,
    cgstPaise: tax.cgstPaise,
    sgstPaise: tax.sgstPaise,
    igstPaise: tax.igstPaise,
    ratePercent: tax.ratePercent,
    placeOfSupplyConfirmed: false,
    reason: blockedReason(),
  };
}

function noGst(grossPaise: number, supplierMode: SupplierMode, reason: string): TaxPreview {
  const gross = assertPaise(grossPaise);
  return {
    document: supplierMode === "UNCONFIRMED" ? "BLOCKED" : "COMMERCIAL_RECEIPT",
    issuable: false,
    supplierMode,
    gstCharged: false,
    customerPaysPaise: gross,
    sac: FITNESS_MEMBERSHIP_SAC,
    grossPaise: gross,
    taxablePaise: gross,
    taxPaise: 0,
    cgstPaise: 0,
    sgstPaise: 0,
    igstPaise: 0,
    ratePercent: null,
    placeOfSupplyConfirmed: false,
    reason,
  };
}

/** One legal outcome. Unconfirmed mode does not pick a supplier. */
export function membershipDocumentPreview(input: {
  grossPaise: number;
  supplierMode?: SupplierMode;
  gymGstRegistered?: boolean | null;
  ratePercent?: number;
  intraState?: boolean;
}): TaxPreview {
  const mode = input.supplierMode ?? SUPPLIER_MODE;
  const grossPaise = assertPaise(input.grossPaise);
  const rate = input.ratePercent ?? MEMBERSHIP_GST_PERCENT;

  if (mode === "UNCONFIRMED") {
    return noGst(grossPaise, mode, blockedReason());
  }

  if (mode === "GYM_SUPPLIES" && input.gymGstRegistered !== true) {
    return noGst(
      grossPaise,
      mode,
      "Unregistered gym supplier. The full price is the gym's consideration. No GST is charged.",
    );
  }

  return fromGst(
    extractInclusiveGst(grossPaise, rate, input.intraState !== false),
    mode,
    "TAX_INVOICE_PREVIEW",
  );
}

/**
 * What a membership payment may show before a CA confirms the supplier.
 * The charged amount is always the inclusive gross.
 */
export function membershipTaxBranches(input: {
  grossPaise: number;
  gymGstRegistered?: boolean | null;
  ratePercent?: number;
}) {
  const grossPaise = assertPaise(input.grossPaise);
  const ratePercent = input.ratePercent ?? MEMBERSHIP_GST_PERCENT;
  return {
    supplierMode: SUPPLIER_MODE,
    issuable: false as const,
    liveInvoicesEnabled: LIVE_TAX_INVOICES_ENABLED,
    customerPaysPaise: grossPaise,
    sac: FITNESS_MEMBERSHIP_SAC,
    ratePercent,
    gymGstRegistered: input.gymGstRegistered === true,
    registeredGymSupplies: membershipDocumentPreview({
      grossPaise,
      supplierMode: "GYM_SUPPLIES",
      gymGstRegistered: true,
      ratePercent,
    }),
    unregisteredGymSupplies: membershipDocumentPreview({
      grossPaise,
      supplierMode: "GYM_SUPPLIES",
      gymGstRegistered: false,
      ratePercent,
    }),
    zonoFitSupplies: membershipDocumentPreview({
      grossPaise,
      supplierMode: "ZONOFIT_SUPPLIES",
      gymGstRegistered: input.gymGstRegistered,
      ratePercent,
    }),
  };
}

/** Case D. Credits pay part of a new supply. GST stays on the full price. */
export function freshSupplyAllocation(grossPaise: number, creditPaise: number, cashPaise: number, ratePercent = MEMBERSHIP_GST_PERCENT) {
  const gross = assertPaise(grossPaise, "Supply");
  const credits = assertPaise(creditPaise, "Credits");
  const cash = assertPaise(cashPaise, "Cash");
  if (credits + cash !== gross) {
    throw new Error("Credit and cash allocations must add up to the full membership price.");
  }
  const supply = extractInclusiveGst(gross, ratePercent, true);
  return {
    kind: "FRESH_SUPPLY" as const,
    supply,
    creditPaise: credits,
    cashPaise: cash,
    taxPaise: supply.taxPaise,
    taxFollowsCashOnly: false,
  };
}

/** Case E. Only a verified same-supplier advance is already taxed. New tax is the remainder. */
export function verifiedAdvanceAllocation(
  grossPaise: number,
  advancePaise: number,
  cashPaise: number,
  ratePercent = MEMBERSHIP_GST_PERCENT,
) {
  const gross = assertPaise(grossPaise, "Supply");
  const advanceGross = assertPaise(advancePaise, "Advance");
  const cash = assertPaise(cashPaise, "Cash");
  if (advanceGross + cash !== gross) {
    throw new Error("The advance and the cash due must add up to the full membership price.");
  }
  const supply = extractInclusiveGst(gross, ratePercent, true);
  const advance = extractInclusiveGst(advanceGross, ratePercent, true);
  const incremental = {
    grossPaise: cash,
    taxablePaise: supply.taxablePaise - advance.taxablePaise,
    taxPaise: supply.taxPaise - advance.taxPaise,
    cgstPaise: supply.cgstPaise - advance.cgstPaise,
    sgstPaise: supply.sgstPaise - advance.sgstPaise,
    igstPaise: supply.igstPaise - advance.igstPaise,
  };
  if (
    incremental.taxablePaise < 0 ||
    incremental.taxPaise < 0 ||
    incremental.cgstPaise < 0 ||
    incremental.sgstPaise < 0 ||
    incremental.taxablePaise + incremental.taxPaise !== cash
  ) {
    throw new Error("The advance tax does not fit inside the supply tax.");
  }
  return {
    kind: "VERIFIED_ADVANCE" as const,
    supply,
    advanceAlreadyTaxed: advance,
    incremental,
    totalTaxPaise: supply.taxPaise,
  };
}

/** Case F. The 2 credits are stored. Rupees and GST stay unposted until a rate is approved. */
export function cancellationChargePreview(creditsRetained: number) {
  if (!Number.isInteger(creditsRetained) || creditsRetained < 0) {
    throw new Error("Retained credits must be a whole number.");
  }
  return {
    kind: "CANCELLATION_PREVIEW" as const,
    creditsRetained,
    rupeeValueConfirmed: false,
    taxStatus: "PENDING_CLASSIFICATION" as const,
    posted: false,
    issuable: false as const,
  };
}

/** Worked illustration only. ₹20 at 5% or 18% is not the live credit rate. */
export function illustrateInclusiveCharge(grossPaise: number, ratePercent: number) {
  return {
    ...extractInclusiveGst(grossPaise, ratePercent, true),
    posted: false as const,
    issuable: false as const,
  };
}

/** Case G. Carry 80% forward. Do not post GST on the 20% until it is classified. */
export function membershipEndHaircutPreview(unusedPaise: number, haircutPercent = 20) {
  const unused = assertPaise(unusedPaise, "Unused credits");
  const haircutPaise = percentOfPaise(unused, haircutPercent);
  const carriedForwardPaise = unused - haircutPaise;
  return {
    kind: "HAIRCUT_PREVIEW" as const,
    unusedPaise: unused,
    haircutPercent,
    haircutPaise,
    carriedForwardPaise,
    haircutApplied: false,
    stacked: false,
    taxStatus: "PENDING_CLASSIFICATION" as const,
    posted: false,
    issuable: false as const,
    ifIndependentFee: illustrateInclusiveCharge(haircutPaise, INDEPENDENT_FEE_GST_PERCENT),
    ifAncillaryToMembership: illustrateInclusiveCharge(haircutPaise, MEMBERSHIP_GST_PERCENT),
  };
}

/** Case H. The gym is paid the contract gross. GST, when the gym is registered, sits inside it. */
export function inclusiveGymPayout(grossPaise: number, gymGstRegistered: boolean, ratePercent = MEMBERSHIP_GST_PERCENT) {
  const gross = assertPaise(grossPaise, "Payout");
  if (!gymGstRegistered) {
    return {
      kind: "PAYOUT_STATEMENT" as const,
      gstCharged: false,
      grossPaise: gross,
      payablePaise: gross,
      taxablePaise: null,
      taxPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      customerInvoice: false as const,
    };
  }
  const tax = extractInclusiveGst(gross, ratePercent, true);
  return {
    kind: "PAYOUT_STATEMENT" as const,
    gstCharged: true,
    payablePaise: gross,
    customerInvoice: false as const,
    ...tax,
  };
}

/**
 * Membership expiry keeps unused credits in the wallet.
 * Cash conversion and the 20% haircut are not posted until they are approved.
 */
export function membershipExpiryCreditPolicy() {
  return {
    convertToCash: false as const,
    postHaircut: false as const,
    reason: "Outside-gym conversion and the membership-end haircut stay off until they are approved. Unused credits remain in the wallet.",
  };
}

export function issueLiveTaxInvoice(): never {
  const error = new Error("Live tax invoices are blocked until the supplier, GSTIN, and fee categories are confirmed.");
  (error as Error & { code: string; statusCode: number }).code = "TaxInvoicesBlocked";
  (error as Error & { statusCode: number }).statusCode = 403;
  throw error;
}
