/**
 * ZonoFit Credit Value Constants
 *
 * Keep all ₹-per-credit constants here and import from this file everywhere.
 * Never duplicate these values across components or screens.
 *
 * See AGENTS.md §3 for the credit economy rules.
 */

/** 1 Credit = ₹10 when spent in-network to book gym visits */
export const CREDIT_FITNESS_VALUE = 10;

/** 1 Credit = ₹8 when converted/cashed out outside the gym network */
export const CREDIT_CASH_VALUE = 8;

export interface MembershipPricingBreakdown {
  membershipTotal: number;
  cycleNumber: number;
  mandatoryVisitsCount: number;
  mandatoryVisitPerUnit: number;
  mandatoryVisitsCost: number;
  walletCreditsValue: number;
  walletCreditsCount: number;
}

/**
 * Universal Dynamic Membership Breakdown:
 * - Months 1 to 4: 10 mandatory visits
 * - Months 5 to 12: 15 mandatory visits
 * - Mandatory per-visit value = 4% of total membership price
 * - Wallet credits value = Total membership price - Total mandatory visits cost
 * - 1 credit = ₹10 => Wallet credits count = Wallet credits value / 10
 * - Total Membership Value (Mandatory visits cost + Wallet credits value) ALWAYS = Membership Total
 */
export function calculateMembershipBreakdown(
  membershipPrice: number = 3000,
  cycleNumber: number = 1
): MembershipPricingBreakdown {
  const price = Math.max(0, Math.round(membershipPrice));
  const cycle = Math.max(1, cycleNumber);
  const mandatoryVisitsCount = cycle >= 5 ? 15 : 10;
  const mandatoryVisitPerUnit = Math.round(price * 0.04);
  const mandatoryVisitsCost = mandatoryVisitsCount * mandatoryVisitPerUnit;
  const walletCreditsValue = Math.max(0, price - mandatoryVisitsCost);
  const walletCreditsCount = Math.round(walletCreditsValue / CREDIT_FITNESS_VALUE);

  return {
    membershipTotal: price,
    cycleNumber: cycle,
    mandatoryVisitsCount,
    mandatoryVisitPerUnit,
    mandatoryVisitsCost,
    walletCreditsValue,
    walletCreditsCount,
  };
}
