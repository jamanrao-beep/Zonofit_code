type PayoutGym = {
    payoutModel?: string | null;
    payoutCommissionRate?: number | null;
    payoutFixedPerVisit?: number | null;
    monthlyPrice?: number | null;
    creditCost?: number | null;
};
/** Rupees the partner gym earns for one verified visit. Commission % and fixed ₹ never apply together. */
export declare function visitPayoutInr(gym: PayoutGym): number;
export type StoredSlot = {
    slotId: string;
    startTime: string;
    endTime: string;
    capacity: number | null;
    isEnabled: boolean;
};
/** Compare "06:00 AM", "6:00AM", and "6:00 AM - 7:00 AM" as the same start. */
export declare function slotKey(value: string): string;
export declare function bookingMatchesSlot(timeSlot: string, slot: {
    startTime: string;
    endTime: string;
}): boolean;
export declare function readStoredSlots(slotsJson: string | null | undefined): StoredSlot[];
export declare function publicBookingSlots(slotsJson: string | null | undefined): {
    startTime: string;
    endTime: string;
}[];
export declare function normalizeSlotList(input: unknown): {
    ok: true;
    slots: StoredSlot[];
} | {
    ok: false;
    message: string;
};
/** Turn a create/update payload into stored JSON. Undefined keeps the caller on its own fallback. */
export declare function slotsPayloadToJson(slots: unknown): {
    ok: true;
    slotsJson: string;
} | {
    ok: false;
    message: string;
};
export {};
//# sourceMappingURL=gymCommercial.d.ts.map