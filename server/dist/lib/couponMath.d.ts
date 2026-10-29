/** Gym-visit coupon value, in credits. Null means this coupon type cannot be used here. */
export declare function bookingDiscountCredits(discountType: string, discountValue: number, creditCost: number): number | null;
/**
 * Marketplace coupon value, in paise.
 * "credits-only" and "unsupported" are rejected by the route with different messages.
 */
export declare function marketplaceDiscountPaise(discountType: string, discountValue: number, totalPaise: number): number | "credits-only" | "unsupported";
/** True when the visit is under 2 hours away. Exactly 2 hours is still cancellable. */
export declare function isCancellationTooLate(workoutTime: Date, now: Date): boolean;
//# sourceMappingURL=couponMath.d.ts.map