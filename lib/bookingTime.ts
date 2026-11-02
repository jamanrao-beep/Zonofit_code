/**
 * Utilities for checking whether a gym visit time slot has already passed.
 */

export function isBookingSlotPast(
  visitDate: Date | string | null | undefined,
  timeSlot?: string | null
): boolean {
  if (!visitDate) return false;
  try {
    const vDate = new Date(visitDate);
    if (isNaN(vDate.getTime())) return false;
    const now = new Date();

    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    const visitYear = vDate.getFullYear();
    const visitMonth = vDate.getMonth();
    const visitDay = vDate.getDate();

    const startOfToday = new Date(todayYear, todayMonth, todayDate, 0, 0, 0, 0);
    const startOfVisit = new Date(visitYear, visitMonth, visitDay, 0, 0, 0, 0);

    // If visit date was strictly before today, it has passed
    if (startOfVisit.getTime() < startOfToday.getTime()) {
      return true;
    }
    // If visit date is strictly after today, it is upcoming
    if (startOfVisit.getTime() > startOfToday.getTime()) {
      return false;
    }

    // It is today. Parse time slot end time
    if (!timeSlot || typeof timeSlot !== "string") {
      const endOfDay = new Date(todayYear, todayMonth, todayDate, 23, 59, 59, 999);
      return now.getTime() > endOfDay.getTime();
    }

    const parts = timeSlot.split(/[-–—]/);
    const endStr = (parts.length > 1 ? parts[1] : parts[0]).trim();
    const match = endStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const ampm = match[3]?.toUpperCase();

      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      // If only single start time given, e.g. "6:00 AM", slot duration is 1 hour
      if (parts.length === 1) {
        hours += 1;
      }

      const slotEndTime = new Date(todayYear, todayMonth, todayDate, hours, minutes, 0, 0);
      return now.getTime() > slotEndTime.getTime();
    }

    // Fallback: 2 hours after visitDate start
    return false;
  } catch {
    return false;
  }
}
