"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKETPLACE_CREDIT_PAISE = exports.MARKETPLACE_CREDIT_INR = void 0;
exports.creditsForMarketplacePaise = creditsForMarketplacePaise;
/** 1 shop credit = ₹8. Same rule as CREDIT_CASH_VALUE in constants/credits.ts. */
exports.MARKETPLACE_CREDIT_INR = 8;
exports.MARKETPLACE_CREDIT_PAISE = exports.MARKETPLACE_CREDIT_INR * 100;
/** Whole credits needed to cover a shop total. Rounds up so the order is fully paid in credits. */
function creditsForMarketplacePaise(totalPaise) {
    if (!Number.isFinite(totalPaise) || totalPaise <= 0)
        return 0;
    return Math.ceil(totalPaise / exports.MARKETPLACE_CREDIT_PAISE);
}
//# sourceMappingURL=marketplacePay.js.map