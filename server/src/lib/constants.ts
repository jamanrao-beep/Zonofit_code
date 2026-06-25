/**
 * ZonoFit Credit Constants
 * ─────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all credit↔INR math.
 * Import from here. Never hardcode these values elsewhere.
 *
 * From AGENTS.md §3:
 *   1 Credit = ₹10 (fitness value / display)
 *   1 Credit = ₹8  when converted to withdrawable INR cash
 *   The asymmetry is intentional — it's the platform margin.
 */

export const CREDIT_CONSTANTS = {
  /** Display value: 1 credit = ₹10 fitness purchasing power */
  INR_PER_CREDIT_DISPLAY: 10,

  /** Conversion value: 1 credit = ₹8 when converted to withdrawable cash */
  INR_PER_CREDIT_CONVERSION: 8,

  /**
   * Credits expire this many days after membership expiry.
   * After this window, credits cannot be recovered.
   */
  CREDITS_EXPIRE_DAYS_AFTER_MEMBERSHIP: 15,

  /** Minimum credits required to trigger a conversion to cash */
  MIN_CREDITS_FOR_CONVERSION: 50,
} as const;

/**
 * Convert credits to their display (fitness) INR value.
 * Use this for showing "≈ ₹X" labels in the UI response payload.
 * This is informational only — not a withdrawable amount.
 */
export function creditsToDisplayINR(credits: number): number {
  return credits * CREDIT_CONSTANTS.INR_PER_CREDIT_DISPLAY;
}

/**
 * Convert credits to withdrawable INR (cash conversion).
 * Only call this server-side when actually processing a conversion.
 */
export function creditsToCashINR(credits: number): number {
  return credits * CREDIT_CONSTANTS.INR_PER_CREDIT_CONVERSION;
}

/**
 * Convert INR price to credits required for a purchase.
 * Uses the display rate (₹10/credit).
 */
export function inrToCredits(inrAmount: number): number {
  return Math.ceil(inrAmount / CREDIT_CONSTANTS.INR_PER_CREDIT_DISPLAY);
}
