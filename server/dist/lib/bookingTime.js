"use strict";
/**
 * Helper functions for booking times, slot expirations, and desk codes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deskCodeFromBookingId = deskCodeFromBookingId;
exports.typedDeskCode = typedDeskCode;
exports.getSlotEndTimeString = getSlotEndTimeString;
exports.isBookingSlotPast = isBookingSlotPast;
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
//# sourceMappingURL=bookingTime.js.map