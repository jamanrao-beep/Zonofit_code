type PayoutGym = {
  payoutModel?: string | null;
  payoutCommissionRate?: number | null;
  payoutFixedPerVisit?: number | null;
  monthlyPrice?: number | null;
  creditCost?: number | null;
};

/** Rupees the partner gym earns for one verified visit. Commission % and fixed ₹ never apply together. */
export function visitPayoutInr(gym: PayoutGym): number {
  if (gym.payoutModel === "FIXED_PER_VISIT") {
    const fixed = Number(gym.payoutFixedPerVisit);
    return Number.isFinite(fixed) && fixed > 0 ? fixed : 0;
  }
  const rawRate = Number(gym.payoutCommissionRate);
  const commission = Number.isFinite(rawRate) ? Math.min(100, Math.max(0, rawRate)) : 20;
  const monthly = Number(gym.monthlyPrice);
  const creditCost = Number(gym.creditCost);
  const monthValue = Number.isFinite(monthly) && monthly > 0
    ? monthly
    : (Number.isFinite(creditCost) && creditCost > 0 ? (creditCost * 10 * 30) / 8 : 3000);
  return (monthValue / 30) * ((100 - commission) / 100);
}

export function publicBookingSlots(slotsJson: string | null | undefined): { startTime: string; endTime: string }[] {
  if (!slotsJson) return [];
  try {
    const parsed = JSON.parse(slotsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    const slots: { startTime: string; endTime: string }[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const slot = row as { startTime?: unknown; endTime?: unknown; isEnabled?: unknown };
      if (slot.isEnabled === false) continue;
      if (typeof slot.startTime !== "string" || !slot.startTime.trim()) continue;
      slots.push({
        startTime: slot.startTime.trim(),
        endTime: typeof slot.endTime === "string" ? slot.endTime.trim() : "",
      });
    }
    return slots;
  } catch {
    return [];
  }
}
