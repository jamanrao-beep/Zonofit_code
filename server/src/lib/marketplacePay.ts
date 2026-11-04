/** 1 shop credit = ₹8. Same rule as CREDIT_CASH_VALUE in constants/credits.ts. */
export const MARKETPLACE_CREDIT_INR = 8;
export const MARKETPLACE_CREDIT_PAISE = MARKETPLACE_CREDIT_INR * 100;

/** Whole credits needed to cover a shop total. Rounds up so the order is fully paid in credits. */
export function creditsForMarketplacePaise(totalPaise: number): number {
  if (!Number.isFinite(totalPaise) || totalPaise <= 0) return 0;
  return Math.ceil(totalPaise / MARKETPLACE_CREDIT_PAISE);
}
