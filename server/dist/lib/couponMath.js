"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingDiscountCredits = bookingDiscountCredits;
exports.marketplaceDiscountPaise = marketplaceDiscountPaise;
exports.isCancellationTooLate = isCancellationTooLate;
/** Gym-visit coupon value, in credits. Null means this coupon type cannot be used here. */
function bookingDiscountCredits(discountType, discountValue, creditCost) {
    if (discountType === "PERCENTAGE")
        return Math.floor(creditCost * (discountValue / 100));
    if (discountType === "CREDITS")
        return discountValue;
    if (discountType === "FIXED_AMOUNT" || discountType === "RUPEES")
        return Math.floor(discountValue / 10);
    return null;
}
/**
 * Marketplace coupon value, in paise.
 * "credits-only" and "unsupported" are rejected by the route with different messages.
 */
function marketplaceDiscountPaise(discountType, discountValue, totalPaise) {
    if (discountType === "CREDITS")
        return "credits-only";
    if (discountType === "PERCENTAGE")
        return Math.floor(totalPaise * (discountValue / 100));
    if (discountType === "FIXED_AMOUNT" || discountType === "RUPEES")
        return discountValue * 100;
    return "unsupported";
}
/** True when the visit is under 2 hours away. Exactly 2 hours is still cancellable. */
function isCancellationTooLate(workoutTime, now) {
    const timeUntilWorkoutHours = (workoutTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return timeUntilWorkoutHours < 2;
}
//# sourceMappingURL=couponMath.js.map