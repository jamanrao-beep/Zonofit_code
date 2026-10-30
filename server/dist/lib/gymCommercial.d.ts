type PayoutGym = {
    payoutModel?: string | null;
    payoutCommissionRate?: number | null;
    payoutFixedPerVisit?: number | null;
    monthlyPrice?: number | null;
    creditCost?: number | null;
};
/** Rupees the partner gym earns for one verified visit. Commission % and fixed ₹ never apply together. */
export declare function visitPayoutInr(gym: PayoutGym): number;
export declare function publicBookingSlots(slotsJson: string | null | undefined): {
    startTime: string;
    endTime: string;
}[];
export {};
//# sourceMappingURL=gymCommercial.d.ts.map