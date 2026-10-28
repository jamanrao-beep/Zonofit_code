"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpStore = void 0;
exports.setOTP = setOTP;
exports.verifyOTP = verifyOTP;
exports.otpStore = new Map();
/**
 * Save an OTP to the in-memory store for a phone number.
 * Defaults to 5 minutes expiration.
 */
function setOTP(phone, code, ttlMinutes = 5) {
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    exports.otpStore.set(phone, { code, expiresAt });
}
/**
 * Verify if the OTP matches and is not expired.
 * Deletes the OTP if valid.
 */
function verifyOTP(phone, code) {
    const record = exports.otpStore.get(phone);
    if (!record)
        return false;
    if (Date.now() > record.expiresAt) {
        exports.otpStore.delete(phone);
        return false;
    }
    if (record.code === code) {
        exports.otpStore.delete(phone);
        return true;
    }
    return false;
}
//# sourceMappingURL=otpStore.js.map