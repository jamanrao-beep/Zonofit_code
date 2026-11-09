/**
 * Inclusive GST in integer paise.
 *
 * A shown price is the final amount. Tax is backed out of it.
 * taxable = round(gross × 10000 / (10000 + rate basis points)), half up.
 * tax = gross − taxable. CGST and SGST split that tax; an odd paisa goes to CGST.
 * Do not round 2.5% twice — that drops a paisa (₹80 becomes ₹3.80 of tax instead of ₹3.81).
 */

const RATE_SCALE = 10000n;
const MAX_PAISE = 100_000_000_00;

export const MEMBERSHIP_GST_PERCENT = 5;
export const INDEPENDENT_FEE_GST_PERCENT = 18;
export const FITNESS_MEMBERSHIP_SAC = "999723";

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

export function assertPaise(value: number, label = "Amount"): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_PAISE) {
    throw new Error(`${label} must be a whole number of paise.`);
  }
  return value;
}

/** 5 → 500, 18 → 1800, 2.5 → 250. Rejects anything finer than 0.01%. */
export function percentToBasisPoints(ratePercent: number): number {
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

function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error("Invalid GST rate.");
  return (numerator + denominator / 2n) / denominator;
}

export function extractInclusiveGst(
  grossPaise: number,
  ratePercent: number,
  intraState = true,
): InclusiveGst {
  const gross = assertPaise(grossPaise);
  const rateBps = percentToBasisPoints(ratePercent);
  const taxable = Number(
    divRoundHalfUp(BigInt(gross) * RATE_SCALE, RATE_SCALE + BigInt(rateBps)),
  );
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
export function percentOfPaise(grossPaise: number, percent: number): number {
  const gross = assertPaise(grossPaise);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error("Percent must be a whole number from 0 to 100.");
  }
  return Number(divRoundHalfUp(BigInt(gross) * BigInt(percent), 100n));
}
