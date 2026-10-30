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

export type StoredSlot = {
  slotId: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  isEnabled: boolean;
};

/** Compare "06:00 AM", "6:00AM", and "6:00 AM - 7:00 AM" as the same start. */
export function slotKey(value: string): string {
  const compact = value.trim().toLowerCase().replace(/\s+/g, "");
  return compact.replace(/^0(\d:\d{2})/, "$1");
}

export function bookingMatchesSlot(
  timeSlot: string,
  slot: { startTime: string; endTime: string },
): boolean {
  const booked = slotKey(timeSlot);
  const start = slotKey(slot.startTime);
  if (!booked || !start) return false;
  if (booked === start || booked.startsWith(`${start}-`) || booked.startsWith(`${start}to`) || booked.startsWith(`${start}–`)) {
    return true;
  }
  const end = slot.endTime ? slotKey(slot.endTime) : "";
  if (!end) return false;
  return booked === `${start}-${end}` || booked === `${start}to${end}` || booked === `${start}–${end}`;
}

export function readStoredSlots(slotsJson: string | null | undefined): StoredSlot[] {
  if (!slotsJson) return [];
  try {
    const parsed = JSON.parse(slotsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    const slots: StoredSlot[] = [];
    parsed.forEach((row, index) => {
      if (!row || typeof row !== "object") return;
      const slot = row as { slotId?: unknown; startTime?: unknown; endTime?: unknown; capacity?: unknown; isEnabled?: unknown };
      if (typeof slot.startTime !== "string" || !slot.startTime.trim()) return;
      const capacity = typeof slot.capacity === "number" && Number.isFinite(slot.capacity) && slot.capacity > 0
        ? Math.round(slot.capacity)
        : null;
      const slotId = typeof slot.slotId === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(slot.slotId)
        ? slot.slotId
        : `slot-${index + 1}`;
      slots.push({
        slotId,
        startTime: slot.startTime.trim(),
        endTime: typeof slot.endTime === "string" ? slot.endTime.trim() : "",
        capacity,
        isEnabled: slot.isEnabled !== false,
      });
    });
    return slots;
  } catch {
    return [];
  }
}

export function publicBookingSlots(slotsJson: string | null | undefined): { startTime: string; endTime: string }[] {
  return readStoredSlots(slotsJson)
    .filter((slot) => slot.isEnabled)
    .map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime }));
}

export function normalizeSlotList(input: unknown): { ok: true; slots: StoredSlot[] } | { ok: false; message: string } {
  if (!Array.isArray(input)) return { ok: false, message: "Slots must be a list." };
  if (input.length > 48) return { ok: false, message: "A gym can have at most 48 slots." };
  const slots: StoredSlot[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < input.length; index += 1) {
    const row = input[index];
    if (!row || typeof row !== "object") return { ok: false, message: "Each slot needs a start time." };
    const slot = row as { slotId?: unknown; startTime?: unknown; endTime?: unknown; capacity?: unknown; isEnabled?: unknown };
    const startTime = typeof slot.startTime === "string" ? slot.startTime.trim() : "";
    const endTime = typeof slot.endTime === "string" ? slot.endTime.trim() : "";
    if (!startTime || startTime.length > 32 || endTime.length > 32) {
      return { ok: false, message: "Each slot needs a start time, such as 6:00 AM." };
    }
    const key = slotKey(startTime);
    if (seen.has(key)) return { ok: false, message: `Two slots start at ${startTime}. Use one row per time.` };
    seen.add(key);
    let capacity: number | null = null;
    if (slot.capacity !== undefined && slot.capacity !== null && slot.capacity !== "") {
      const parsed = typeof slot.capacity === "number" ? slot.capacity : parseInt(String(slot.capacity), 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
        return { ok: false, message: "Slot capacity must be between 1 and 500." };
      }
      capacity = Math.round(parsed);
    }
    const slotId = typeof slot.slotId === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(slot.slotId)
      ? slot.slotId
      : `slot-${index + 1}`;
    slots.push({
      slotId,
      startTime,
      endTime,
      capacity,
      isEnabled: slot.isEnabled !== false,
    });
  }
  return { ok: true, slots };
}

/** Turn a create/update payload into stored JSON. Undefined keeps the caller on its own fallback. */
export function slotsPayloadToJson(slots: unknown): { ok: true; slotsJson: string } | { ok: false; message: string } {
  let raw = slots;
  if (typeof slots === "string") {
    try {
      raw = JSON.parse(slots);
    } catch {
      return { ok: false, message: "Slots must be a list." };
    }
  }
  const parsed = normalizeSlotList(raw);
  if (!parsed.ok) return parsed;
  return { ok: true, slotsJson: JSON.stringify(parsed.slots) };
}
