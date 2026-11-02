/**
 * Helper functions for booking times, slot expirations, and desk codes.
 */
/**
 * Returns formatted desk code ZF-XXXXXX from the booking ID.
 */
export declare function deskCodeFromBookingId(id: string): string;
/**
 * Normalizes user-typed desk code (e.g. "zf4f2a9c" or "4F2A9C" -> "ZF-4F2A9C").
 */
export declare function typedDeskCode(value: string): string | null;
/**
 * Extracts a human-readable end time for a timeSlot string (e.g. "06:00 AM – 07:00 AM" -> "7:00 AM").
 */
export declare function getSlotEndTimeString(timeSlot?: string | null): string;
/**
 * Checks whether a booking slot has ended based on India Standard Time (Asia/Kolkata).
 * If visitDate was in the past (yesterday or earlier), returns true.
 * If visitDate is today, returns true once the current clock time passes the slot's end time.
 * If visitDate is in the future, returns false.
 */
export declare function isBookingSlotPast(visitDate: Date | string, timeSlot?: string | null): boolean;
export interface SlotTimeRange {
    startMinutes: number | null;
    endMinutes: number | null;
    startTimeStr: string;
    endTimeStr: string;
}
export declare function parseSlotTimeRange(timeSlot?: string | null): SlotTimeRange;
export interface CheckInEligibilityResult {
    eligible: boolean;
    code?: string;
    message?: string;
    isExpired?: boolean;
}
/**
 * Validates whether a booking is eligible for front desk check-in right now in Asia/Kolkata timezone.
 * Rejects bookings on future dates (e.g. tomorrow).
 * Rejects bookings on past dates.
 * On the same day, enforces slot start window (opens 30 min before slot start) and slot end window.
 */
export declare function checkBookingCheckInEligibility(visitDate: Date | string, timeSlot?: string | null): CheckInEligibilityResult;
//# sourceMappingURL=bookingTime.d.ts.map