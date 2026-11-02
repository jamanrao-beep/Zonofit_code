"use strict";
/**
 * Helper functions for booking times, slot expirations, and desk codes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deskCodeFromBookingId = deskCodeFromBookingId;
exports.typedDeskCode = typedDeskCode;
exports.getSlotEndTimeString = getSlotEndTimeString;
exports.isBookingSlotPast = isBookingSlotPast;
exports.parseSlotTimeRange = parseSlotTimeRange;
exports.checkBookingCheckInEligibility = checkBookingCheckInEligibility;
/**
 * Returns formatted desk code ZF-XXXXXX from the booking ID.
 */
function deskCodeFromBookingId(id) {
    if (!id)
        return "";
    const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
    return tail.length === 6 ? `ZF-${tail}` : "";
}
/**
 * Normalizes user-typed desk code (e.g. "zf4f2a9c" or "4F2A9C" -> "ZF-4F2A9C").
 */
function typedDeskCode(value) {
    if (!value)
        return null;
    const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const withPrefix = compact.match(/^ZF([A-Z0-9]{6})$/);
    if (withPrefix)
        return `ZF-${withPrefix[1]}`;
    if (/^[A-Z0-9]{6}$/.test(compact))
        return `ZF-${compact}`;
    return null;
}
/**
 * Extracts a human-readable end time for a timeSlot string (e.g. "06:00 AM – 07:00 AM" -> "7:00 AM").
 */
function getSlotEndTimeString(timeSlot) {
    if (!timeSlot || typeof timeSlot !== "string")
        return "";
    const parts = timeSlot.split(/[-–—]/);
    if (parts.length > 1) {
        return parts[1].trim();
    }
    const match = parts[0].trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const ampm = match[3]?.toUpperCase();
        if (ampm === "PM" && hours < 12)
            hours += 12;
        if (ampm === "AM" && hours === 12)
            hours = 0;
        hours = (hours + 1) % 24;
        const finalAmPm = hours >= 12 ? "PM" : "AM";
        const displayHour = hours % 12 === 0 ? 12 : hours % 12;
        const displayMin = minutes > 0 ? `:${String(minutes).padStart(2, "0")}` : ":00";
        return `${displayHour}${displayMin} ${finalAmPm}`;
    }
    return timeSlot;
}
/**
 * Checks whether a booking slot has ended based on India Standard Time (Asia/Kolkata).
 * If visitDate was in the past (yesterday or earlier), returns true.
 * If visitDate is today, returns true once the current clock time passes the slot's end time.
 * If visitDate is in the future, returns false.
 */
function isBookingSlotPast(visitDate, timeSlot) {
    if (!visitDate)
        return false;
    try {
        const vDate = new Date(visitDate);
        if (isNaN(vDate.getTime()))
            return false;
        const now = new Date();
        const kolkataFormatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        const partsNow = kolkataFormatter.formatToParts(now);
        const getPart = (parts, type) => {
            const p = parts.find((x) => x.type === type);
            return p ? parseInt(p.value, 10) : 0;
        };
        const nowYear = getPart(partsNow, "year");
        const nowMonth = getPart(partsNow, "month") - 1;
        const nowDay = getPart(partsNow, "day");
        const nowHours = getPart(partsNow, "hour");
        const nowMinutes = getPart(partsNow, "minute");
        const partsVisit = kolkataFormatter.formatToParts(vDate);
        const visitYear = getPart(partsVisit, "year");
        const visitMonth = getPart(partsVisit, "month") - 1;
        const visitDay = getPart(partsVisit, "day");
        const nowDateVal = nowYear * 10000 + (nowMonth + 1) * 100 + nowDay;
        const visitDateVal = visitYear * 10000 + (visitMonth + 1) * 100 + visitDay;
        if (visitDateVal < nowDateVal) {
            return true;
        }
        if (visitDateVal > nowDateVal) {
            return false;
        }
        // Same day: check slot end time
        if (!timeSlot || typeof timeSlot !== "string") {
            return false;
        }
        const parts = timeSlot.split(/[-–—]/);
        const endStr = (parts.length > 1 ? parts[1] : parts[0]).trim();
        const match = endStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (match) {
            let hours = parseInt(match[1], 10);
            const minutes = match[2] ? parseInt(match[2], 10) : 0;
            const ampm = match[3]?.toUpperCase();
            if (ampm === "PM" && hours < 12)
                hours += 12;
            if (ampm === "AM" && hours === 12)
                hours = 0;
            // If single time provided, default end time to 1 hour after start
            if (parts.length === 1) {
                hours += 1;
            }
            const nowTotalMin = nowHours * 60 + nowMinutes;
            const slotEndTotalMin = hours * 60 + minutes;
            return nowTotalMin > slotEndTotalMin;
        }
        return false;
    }
    catch {
        return false;
    }
}
function parseSlotTimeRange(timeSlot) {
    if (!timeSlot || typeof timeSlot !== "string") {
        return { startMinutes: null, endMinutes: null, startTimeStr: "", endTimeStr: "" };
    }
    const parts = timeSlot.split(/[-–—]/);
    const parsePart = (str) => {
        const match = str.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (!match)
            return null;
        let hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const ampm = match[3]?.toUpperCase();
        if (ampm === "PM" && hours < 12)
            hours += 12;
        if (ampm === "AM" && hours === 12)
            hours = 0;
        return hours * 60 + minutes;
    };
    const startMinutes = parsePart(parts[0]);
    let endMinutes = parts.length > 1 ? parsePart(parts[1]) : null;
    if (startMinutes !== null && endMinutes === null) {
        endMinutes = (startMinutes + 60) % 1440;
    }
    const formatMinutes = (totalMin) => {
        const h24 = Math.floor(totalMin / 60) % 24;
        const m = totalMin % 60;
        const ampm = h24 >= 12 ? "PM" : "AM";
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    };
    return {
        startMinutes,
        endMinutes,
        startTimeStr: startMinutes !== null ? formatMinutes(startMinutes) : parts[0]?.trim() || "",
        endTimeStr: endMinutes !== null ? formatMinutes(endMinutes) : (parts[1]?.trim() || ""),
    };
}
/**
 * Validates whether a booking is eligible for front desk check-in right now in Asia/Kolkata timezone.
 * Rejects bookings on future dates (e.g. tomorrow).
 * Rejects bookings on past dates.
 * On the same day, enforces slot start window (opens 30 min before slot start) and slot end window.
 */
function checkBookingCheckInEligibility(visitDate, timeSlot) {
    if (!visitDate) {
        return { eligible: false, code: "InvalidDate", message: "Invalid visit date." };
    }
    const vDate = new Date(visitDate);
    if (isNaN(vDate.getTime())) {
        return { eligible: false, code: "InvalidDate", message: "Invalid visit date." };
    }
    const now = new Date();
    const kolkataFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    const partsNow = kolkataFormatter.formatToParts(now);
    const getPart = (parts, type) => {
        const p = parts.find((x) => x.type === type);
        return p ? parseInt(p.value, 10) : 0;
    };
    const nowYear = getPart(partsNow, "year");
    const nowMonth = getPart(partsNow, "month") - 1;
    const nowDay = getPart(partsNow, "day");
    const nowHours = getPart(partsNow, "hour");
    const nowMinutes = getPart(partsNow, "minute");
    const partsVisit = kolkataFormatter.formatToParts(vDate);
    const visitYear = getPart(partsVisit, "year");
    const visitMonth = getPart(partsVisit, "month") - 1;
    const visitDay = getPart(partsVisit, "day");
    const nowDateVal = nowYear * 10000 + (nowMonth + 1) * 100 + nowDay;
    const visitDateVal = visitYear * 10000 + (visitMonth + 1) * 100 + visitDay;
    const formattedVisitDate = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(vDate);
    // 1. Future Date Check (e.g. booked for tomorrow or later)
    if (visitDateVal > nowDateVal) {
        return {
            eligible: false,
            code: "VisitDateInFuture",
            message: `This visit is booked for ${formattedVisitDate}${timeSlot ? ` (${timeSlot})` : ""}. Check-in is only permitted on the day of the visit.`,
        };
    }
    // 2. Past Date Check (yesterday or earlier)
    if (visitDateVal < nowDateVal) {
        return {
            eligible: false,
            isExpired: true,
            code: "BookingDatePast",
            message: `This booking was scheduled for ${formattedVisitDate} and has expired. It can no longer be checked in.`,
        };
    }
    // 3. Same Day: Check slot timing
    const range = parseSlotTimeRange(timeSlot);
    // Slot has already ended
    if (range.endMinutes !== null) {
        const nowTotalMin = nowHours * 60 + nowMinutes;
        if (nowTotalMin > range.endMinutes) {
            return {
                eligible: false,
                isExpired: true,
                code: "BookingExpired",
                message: `This booking slot has expired. The session for ${timeSlot || "today"} ended at ${range.endTimeStr} and can no longer be checked in.`,
            };
        }
        // Check-in opens 30 minutes before slot start
        if (range.startMinutes !== null) {
            const checkInOpenMin = Math.max(0, range.startMinutes - 30);
            if (nowTotalMin < checkInOpenMin) {
                const h24 = Math.floor(checkInOpenMin / 60) % 24;
                const m = checkInOpenMin % 60;
                const ampm = h24 >= 12 ? "PM" : "AM";
                const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
                const opensAtStr = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
                return {
                    eligible: false,
                    code: "CheckInTooEarly",
                    message: `Check-in is not open yet. This slot is booked for today at ${range.startTimeStr}. Check-in opens at ${opensAtStr} (30 minutes before the session starts).`,
                };
            }
        }
    }
    return { eligible: true };
}
//# sourceMappingURL=bookingTime.js.map