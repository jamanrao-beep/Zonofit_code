"use strict";
/**
 * Membership tax previews from the 8 Nov 2026 GST guide.
 * Live invoices stay off. The customer still pays the inclusive price.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPLIER_MODE = exports.LIVE_TAX_INVOICES_ENABLED = void 0;
exports.membershipDocumentPreview = membershipDocumentPreview;
exports.membershipTaxBranches = membershipTaxBranches;
exports.freshSupplyAllocation = freshSupplyAllocation;
exports.verifiedAdvanceAllocation = verifiedAdvanceAllocation;
exports.cancellationChargePreview = cancellationChargePreview;
exports.illustrateInclusiveCharge = illustrateInclusiveCharge;
exports.membershipEndHaircutPreview = membershipEndHaircutPreview;
exports.inclusiveGymPayout = inclusiveGymPayout;
exports.membershipExpiryCreditPolicy = membershipExpiryCreditPolicy;
exports.issueLiveTaxInvoice = issueLiveTaxInvoice;
const gst_1 = require("./gst");
exports.LIVE_TAX_INVOICES_ENABLED = false;
exports.SUPPLIER_MODE = "UNCONFIRMED";
function blockedReason() {
    return "Not a tax invoice. The supplier, GSTIN, and fee category are not confirmed.";
}
function fromGst(tax, supplierMode, document) {
    return {
        document,
        issuable: false,
        supplierMode,
        gstCharged: tax.taxPaise > 0,
        customerPaysPaise: tax.grossPaise,
        sac: gst_1.FITNESS_MEMBERSHIP_SAC,
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
function noGst(grossPaise, supplierMode, reason) {
    const gross = (0, gst_1.assertPaise)(grossPaise);
    return {
        document: supplierMode === "UNCONFIRMED" ? "BLOCKED" : "COMMERCIAL_RECEIPT",
        issuable: false,
        supplierMode,
        gstCharged: false,
        customerPaysPaise: gross,
        sac: gst_1.FITNESS_MEMBERSHIP_SAC,
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
function membershipDocumentPreview(input) {
    const mode = input.supplierMode ?? exports.SUPPLIER_MODE;
    const grossPaise = (0, gst_1.assertPaise)(input.grossPaise);
    const rate = input.ratePercent ?? gst_1.MEMBERSHIP_GST_PERCENT;
    if (mode === "UNCONFIRMED") {
        return noGst(grossPaise, mode, blockedReason());
    }
    if (mode === "GYM_SUPPLIES" && input.gymGstRegistered !== true) {
        return noGst(grossPaise, mode, "Unregistered gym supplier. The full price is the gym's consideration. No GST is charged.");
    }
    return fromGst((0, gst_1.extractInclusiveGst)(grossPaise, rate, input.intraState !== false), mode, "TAX_INVOICE_PREVIEW");
}
/**
 * What a membership payment may show before a CA confirms the supplier.
 * The charged amount is always the inclusive gross.
 */
function membershipTaxBranches(input) {
    const grossPaise = (0, gst_1.assertPaise)(input.grossPaise);
    const ratePercent = input.ratePercent ?? gst_1.MEMBERSHIP_GST_PERCENT;
    return {
        supplierMode: exports.SUPPLIER_MODE,
        issuable: false,
        liveInvoicesEnabled: exports.LIVE_TAX_INVOICES_ENABLED,
        customerPaysPaise: grossPaise,
        sac: gst_1.FITNESS_MEMBERSHIP_SAC,
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
function freshSupplyAllocation(grossPaise, creditPaise, cashPaise, ratePercent = gst_1.MEMBERSHIP_GST_PERCENT) {
    const gross = (0, gst_1.assertPaise)(grossPaise, "Supply");
    const credits = (0, gst_1.assertPaise)(creditPaise, "Credits");
    const cash = (0, gst_1.assertPaise)(cashPaise, "Cash");
    if (credits + cash !== gross) {
        throw new Error("Credit and cash allocations must add up to the full membership price.");
    }
    const supply = (0, gst_1.extractInclusiveGst)(gross, ratePercent, true);
    return {
        kind: "FRESH_SUPPLY",
        supply,
        creditPaise: credits,
        cashPaise: cash,
        taxPaise: supply.taxPaise,
        taxFollowsCashOnly: false,
    };
}
/** Case E. Only a verified same-supplier advance is already taxed. New tax is the remainder. */
function verifiedAdvanceAllocation(grossPaise, advancePaise, cashPaise, ratePercent = gst_1.MEMBERSHIP_GST_PERCENT) {
    const gross = (0, gst_1.assertPaise)(grossPaise, "Supply");
    const advanceGross = (0, gst_1.assertPaise)(advancePaise, "Advance");
    const cash = (0, gst_1.assertPaise)(cashPaise, "Cash");
    if (advanceGross + cash !== gross) {
        throw new Error("The advance and the cash due must add up to the full membership price.");
    }
    const supply = (0, gst_1.extractInclusiveGst)(gross, ratePercent, true);
    const advance = (0, gst_1.extractInclusiveGst)(advanceGross, ratePercent, true);
    const incremental = {
        grossPaise: cash,
        taxablePaise: supply.taxablePaise - advance.taxablePaise,
        taxPaise: supply.taxPaise - advance.taxPaise,
        cgstPaise: supply.cgstPaise - advance.cgstPaise,
        sgstPaise: supply.sgstPaise - advance.sgstPaise,
        igstPaise: supply.igstPaise - advance.igstPaise,
    };
    if (incremental.taxablePaise < 0 ||
        incremental.taxPaise < 0 ||
        incremental.cgstPaise < 0 ||
        incremental.sgstPaise < 0 ||
        incremental.taxablePaise + incremental.taxPaise !== cash) {
        throw new Error("The advance tax does not fit inside the supply tax.");
    }
    return {
        kind: "VERIFIED_ADVANCE",
        supply,
        advanceAlreadyTaxed: advance,
        incremental,
        totalTaxPaise: supply.taxPaise,
    };
}
/** Case F. The 2 credits are stored. Rupees and GST stay unposted until a rate is approved. */
function cancellationChargePreview(creditsRetained) {
    if (!Number.isInteger(creditsRetained) || creditsRetained < 0) {
        throw new Error("Retained credits must be a whole number.");
    }
    return {
        kind: "CANCELLATION_PREVIEW",
        creditsRetained,
        rupeeValueConfirmed: false,
        taxStatus: "PENDING_CLASSIFICATION",
        posted: false,
        issuable: false,
    };
}
/** Worked illustration only. ₹20 at 5% or 18% is not the live credit rate. */
function illustrateInclusiveCharge(grossPaise, ratePercent) {
    return {
        ...(0, gst_1.extractInclusiveGst)(grossPaise, ratePercent, true),
        posted: false,
        issuable: false,
    };
}
/** Case G. Carry 80% forward. Do not post GST on the 20% until it is classified. */
function membershipEndHaircutPreview(unusedPaise, haircutPercent = 20) {
    const unused = (0, gst_1.assertPaise)(unusedPaise, "Unused credits");
    const haircutPaise = (0, gst_1.percentOfPaise)(unused, haircutPercent);
    const carriedForwardPaise = unused - haircutPaise;
    return {
        kind: "HAIRCUT_PREVIEW",
        unusedPaise: unused,
        haircutPercent,
        haircutPaise,
        carriedForwardPaise,
        haircutApplied: false,
        stacked: false,
        taxStatus: "PENDING_CLASSIFICATION",
        posted: false,
        issuable: false,
        ifIndependentFee: illustrateInclusiveCharge(haircutPaise, gst_1.INDEPENDENT_FEE_GST_PERCENT),
        ifAncillaryToMembership: illustrateInclusiveCharge(haircutPaise, gst_1.MEMBERSHIP_GST_PERCENT),
    };
}
/** Case H. The gym is paid the contract gross. GST, when the gym is registered, sits inside it. */
function inclusiveGymPayout(grossPaise, gymGstRegistered, ratePercent = gst_1.MEMBERSHIP_GST_PERCENT) {
    const gross = (0, gst_1.assertPaise)(grossPaise, "Payout");
    if (!gymGstRegistered) {
        return {
            kind: "PAYOUT_STATEMENT",
            gstCharged: false,
            grossPaise: gross,
            payablePaise: gross,
            taxablePaise: null,
            taxPaise: 0,
            cgstPaise: 0,
            sgstPaise: 0,
            igstPaise: 0,
            customerInvoice: false,
        };
    }
    const tax = (0, gst_1.extractInclusiveGst)(gross, ratePercent, true);
    return {
        kind: "PAYOUT_STATEMENT",
        gstCharged: true,
        payablePaise: gross,
        customerInvoice: false,
        ...tax,
    };
}
/**
 * Membership expiry keeps unused credits in the wallet.
 * Cash conversion and the 20% haircut are not posted until they are approved.
 */
function membershipExpiryCreditPolicy() {
    return {
        convertToCash: false,
        postHaircut: false,
        reason: "Outside-gym conversion and the membership-end haircut stay off until they are approved. Unused credits remain in the wallet.",
    };
}
function issueLiveTaxInvoice() {
    const error = new Error("Live tax invoices are blocked until the supplier, GSTIN, and fee categories are confirmed.");
    error.code = "TaxInvoicesBlocked";
    error.statusCode = 403;
    throw error;
}
//# sourceMappingURL=taxDocuments.js.map