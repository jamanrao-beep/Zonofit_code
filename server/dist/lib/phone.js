"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
/** Indian mobile numbers are stored as the last 10 digits. */
function normalizePhone(input) {
    if (typeof input !== "string")
        return null;
    const digits = input.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15)
        return null;
    return digits.slice(-10);
}
//# sourceMappingURL=phone.js.map