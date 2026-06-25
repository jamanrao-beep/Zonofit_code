/**
 * Membership Plan Definitions
 * Used by the Membership Management screen.
 */

export interface MembershipPlan {
  id: string;
  name: string;
  emoji: string;
  pricePerMonth: number; // INR
  creditsPerMonth: number;
  visitsPerMonth: number;
  networkAccess: string;
  features: string[];
  isPopular?: boolean;
  color: string;
}

export const membershipPlans: MembershipPlan[] = [
  {
    id: "basic",
    name: "Basic",
    emoji: "🌱",
    pricePerMonth: 999,
    creditsPerMonth: 100,
    visitsPerMonth: 8,
    networkAccess: "Local Network (5 KM radius)",
    features: [
      "100 Credits per month",
      "Up to 8 gym visits",
      "Access to 20+ partner gyms",
      "Booking via app",
      "QR check-in pass",
    ],
    color: "#6BCB77",
  },
  {
    id: "standard",
    name: "Standard",
    emoji: "⚡",
    pricePerMonth: 1499,
    creditsPerMonth: 200,
    visitsPerMonth: 15,
    networkAccess: "City Network (20 KM radius)",
    features: [
      "200 Credits per month",
      "Up to 15 gym visits",
      "Access to 50+ partner gyms",
      "Priority booking slots",
      "QR check-in pass",
      "Fitness journey tracking",
      "Achievement badges",
    ],
    isPopular: true,
    color: "#2563EB",
  },
  {
    id: "premium",
    name: "Premium",
    emoji: "👑",
    pricePerMonth: 2499,
    creditsPerMonth: 420,
    visitsPerMonth: 30,
    networkAccess: "Pan-City Network (Unlimited radius)",
    features: [
      "420 Credits per month",
      "Unlimited gym visits (credits permitting)",
      "Access to 100+ partner gyms",
      "Premium & luxury gym access",
      "Priority + advance booking",
      "QR check-in pass",
      "Fitness journey + challenges",
      "Achievement badges",
      "Dedicated support",
    ],
    color: "#7C3AED",
  },
];

export const getPlanById = (id: string): MembershipPlan | undefined => {
  return membershipPlans.find((p) => p.id === id);
};
