"use strict";
/**
 * Inclusive GST in integer paise.
 *
 * A shown price is the final amount. Tax is backed out of it.
 * taxable = round(gross × 10000 / (10000 + rate basis points)), half up.
 * tax = gross − taxable. CGST and SGST split that tax; an odd paisa goes to CGST.
 * Do not round 2.5% twice — that drops a paisa (₹80 becomes ₹3.80 of tax instead of ₹3.81).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FITNESS_MEMBERSHIP_SAC = exports.INDEPENDENT_FEE_GST_PERCENT = exports.MEMBERSHIP_GST_PERCENT = void 0;
exports.assertPaise = assertPaise;
exports.percentToBasisPoints = percentToBasisPoints;
exports.extractInclusiveGst = extractInclusiveGst;
exports.percentOfPaise = percentOfPaise;
const RATE_SCALE = 10000n;
const MAX_PAISE = 100_000_000_00;
exports.MEMBERSHIP_GST_PERCENT = 5;
exports.INDEPENDENT_FEE_GST_PERCENT = 18;
exports.FITNESS_MEMBERSHIP_SAC = "999723";
function assertPaise(value, label = "Amount") {
    if (!Number.isInteger(value) || value < 0 || value > MAX_PAISE) {
        throw new Error(`${label} must be a whole number of paise.`);
    }
    return value;
}
/** 5 → 500, 18 → 1800, 2.5 → 250. Rejects anything finer than 0.01%. */
function percentToBasisPoints(ratePercent) {
    if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
        throw new Error("GST rate must be between 0 and 100 percent.");
    }
    const scaled = ratePercent * 100;
    const bps = Math.round(scaled);
    if (Math.abs(scaled - bps) > 1e-8) {
        throw new Error("GST rate must be in steps of 0.01 percent.");
    }
    return bps;
}
function divRoundHalfUp(numerator, denominator) {
    if (denominator <= 0n)
        throw new Error("Invalid GST rate.");
    return (numerator + denominator / 2n) / denominator;
}
function extractInclusiveGst(grossPaise, ratePercent, intraState = true) {
    const gross = assertPaise(grossPaise);
    const rateBps = percentToBasisPoints(ratePercent);
    const taxable = Number(divRoundHalfUp(BigInt(gross) * RATE_SCALE, RATE_SCALE + BigInt(rateBps)));
    const tax = gross - taxable;
    if (taxable < 0 || tax < 0 || taxable + tax !== gross) {
        throw new Error("GST split does not add back to the price.");
    }
    if (!intraState) {
        return {
            grossPaise: gross,
            taxablePaise: taxable,
            taxPaise: tax,
            cgstPaise: 0,
            sgstPaise: 0,
            igstPaise: tax,
            ratePercent,
            rateBps,
            intraState: false,
        };
    }
    const sgstPaise = Math.floor(tax / 2);
    const cgstPaise = tax - sgstPaise;
    return {
        grossPaise: gross,
        taxablePaise: taxable,
        taxPaise: tax,
        cgstPaise,
        sgstPaise,
        igstPaise: 0,
        ratePercent,
        rateBps,
        intraState: true,
    };
}
/** Whole-percent cut of an inclusive rupee amount. 20% of ₹1,000 is ₹200. */
function percentOfPaise(grossPaise, percent) {
    const gross = assertPaise(grossPaise);
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
        throw new Error("Percent must be a whole number from 0 to 100.");
    }
    return Number(divRoundHalfUp(BigInt(gross) * BigInt(percent), 100n));
}
//# sourceMappingURL=gst.js.map