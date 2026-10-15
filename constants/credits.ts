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
  /** M = Gym monthly membership reference price */
  membershipTotal: number;
  gymMonthlyPrice: number;
  /** Cycle number (1 to 12) */
  cycleNumber: number;
  /** D = Mandatory-day count (10 for cycles 1–4, 15 for cycle 5+) */
  mandatoryVisitsCount: number;
  mandatoryDays: number;
  /** U = User-facing price per visit: U = M / 25 */
  mandatoryVisitPerUnit: number;
  userVisitRate: number;
  /** G = Gym payout per eligible visit: G = (M / 30) × 80% */
  gymPayoutPerVisit: number;
  /** S = ZonoFit gross spread per visit: S = U - G */
  zonoFitSpreadPerVisit: number;
  /** User Mandatory Allocation = U × D */
  mandatoryVisitsCost: number;
  userMandatoryAllocation: number;
  /** Gym Mandatory Payout = G × D (payable within 48h of purchase) */
  gymMandatoryPayout: number;
  /** ZonoFit Mandatory Gross Spread = (U - G) × D */
  zonoFitMandatoryGrossSpread: number;
  /** Remaining Wallet Allocation = M - User Mandatory Allocation */
  walletCreditsValue: number;
  remainingWalletAllocation: number;
  /** Wallet Credits Count = Remaining Wallet Allocation / 10 */
  walletCreditsCount: number;
  walletCredits: number;
}

/**
 * ZonoFit Automated Pricing & Revenue Engine (PRD v2.0)
 *
 * Formulas:
 * - U = M / 25 (User-facing visit rate)
 * - G = (M / 30) × 80% (Gym payout per visit)
 * - S = U - G (ZonoFit gross spread per visit)
 * - D = 10 for cycles 1–4, 15 for cycle 5+ (Mandatory days)
 * - User Mandatory Allocation = U × D
 * - Gym Mandatory Payout = G × D (due within 48 hours)
 * - ZonoFit Mandatory Gross Spread = (U - G) × D
 * - Remaining Wallet Allocation = M - (U × D)
 * - Wallet Credits = Remaining Wallet Allocation / 10 (1 Credit = ₹10 nominal)
 */
export function calculateMembershipBreakdown(
  membershipPrice: number = 3000,
  cycleNumber: number = 1
): MembershipPricingBreakdown {
  const M = Math.max(0, Math.round(membershipPrice));
  const cycle = Math.max(1, cycleNumber);
  const D = cycle >= 5 ? 15 : 10;

  // U = M / 25
  const U = Math.round((M / 25) * 100) / 100;

  // G = (M / 30) * 0.8
  const G = (M / 30) * 0.8;

  // S = U - G
  const S = U - G;

  // Mandatory allocations
  const userMandatoryAllocation = Math.round(U * D * 100) / 100;
  const gymMandatoryPayout = Math.round(G * D * 100) / 100;
  const zonoFitMandatoryGrossSpread = Math.round(S * D * 100) / 100;

  // Remaining wallet allocation
  const remainingWalletAllocation = Math.max(0, Math.round((M - userMandatoryAllocation) * 100) / 100);
  const walletCredits = Math.round(remainingWalletAllocation / CREDIT_FITNESS_VALUE);

  return {
    membershipTotal: M,
    gymMonthlyPrice: M,
    cycleNumber: cycle,
    mandatoryVisitsCount: D,
    mandatoryDays: D,
    mandatoryVisitPerUnit: U,
    userVisitRate: U,
    gymPayoutPerVisit: Math.round(G * 10000) / 10000, // preserve precision
    zonoFitSpreadPerVisit: Math.round(S * 10000) / 10000,
    mandatoryVisitsCost: userMandatoryAllocation,
    userMandatoryAllocation,
    gymMandatoryPayout,
    zonoFitMandatoryGrossSpread,
    walletCreditsValue: remainingWalletAllocation,
    remainingWalletAllocation,
    walletCreditsCount: walletCredits,
    walletCredits,
  };
}

/**
 * Calculate extra visits payout & gross spread (PRD v2.0 §8)
 *
 * Formulas:
 * - E = MAX(0, Eligible Completed Visits - Mandatory Visits Counted)
 * - Extra Gym Payout = E × G
 * - Extra ZonoFit Gross Spread = E × (U - G)
 */
export function calculateExtraVisitsBreakdown(
  membershipPrice: number = 3000,
  eligibleCompletedVisits: number = 0,
  cycleNumber: number = 1
) {
  const breakdown = calculateMembershipBreakdown(membershipPrice, cycleNumber);
  const mandatoryCount = breakdown.mandatoryDays;
  const E = Math.max(0, eligibleCompletedVisits - mandatoryCount);
  const G = breakdown.gymPayoutPerVisit;
  const S = breakdown.zonoFitSpreadPerVisit;

  const extraGymPayout = Math.round(E * G * 100) / 100;
  const extraZonoFitGrossSpread = Math.round(E * S * 100) / 100;
  const totalGymEarnings = Math.round((breakdown.gymMandatoryPayout + extraGymPayout) * 100) / 100;
  const totalZonoFitGrossSpread = Math.round((breakdown.zonoFitMandatoryGrossSpread + extraZonoFitGrossSpread) * 100) / 100;

  return {
    mandatoryVisits: mandatoryCount,
    completedVisits: eligibleCompletedVisits,
    extraVisits: E,
    gymPayoutPerVisit: G,
    zonoFitSpreadPerVisit: S,
    mandatoryGymPayout: breakdown.gymMandatoryPayout,
    extraGymPayout,
    totalGymEarnings,
    mandatoryZonoFitSpread: breakdown.zonoFitMandatoryGrossSpread,
    extraZonoFitSpread: extraZonoFitGrossSpread,
    totalZonoFitGrossSpread,
  };
}

/**
 * Calculate Marketplace Credit Haircut (PRD v2.0 §10)
 *
 * Formulas:
 * - V = Nominal INR value of redeemed credits (Credits × ₹10)
 * - Marketplace Partner Share = V × 80%
 * - ZonoFit Marketplace Gross Share = V × 20%
 */
export function calculateMarketplaceHaircut(creditsRedeemed: number) {
  const credits = Math.max(0, Math.floor(creditsRedeemed));
  const V = credits * CREDIT_FITNESS_VALUE; // ₹10 nominal
  const partnerShare = Math.round(V * 0.8 * 100) / 100;
  const zonoFitShare = Math.round(V * 0.2 * 100) / 100;

  return {
    creditsRedeemed: credits,
    nominalValueINR: V,
    partnerShareINR: partnerShare,
    zonoFitShareINR: zonoFitShare,
  };
}
