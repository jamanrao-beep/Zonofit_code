declare const router: import("express-serve-static-core").Router;
/**
 * Create a new gym visit booking.
 * This is a TRUST BOUNDARY — credits are deducted atomically in a DB transaction.
 * The client must never deduct credits locally.
 *
 * Flow:
 * 1. Validate request
 * 2. Check membership is active
 * 3. Check credit balance ≥ gym's creditCost
 * 4. Check slot availability for that date
 * 5. Atomically: deduct credits + create booking + create check-in pass + log transaction
 * 6. Return booking with passCode for QR display
 */
export declare function getGymPrefix(gymName?: string | null): string;
export default router;
//# sourceMappingURL=bookings.d.ts.map