"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrementCredits = decrementCredits;
exports.decrementConvertibleCash = decrementConvertibleCash;
const errorHandler_1 = require("../middleware/errorHandler");
async function decrementCredits(tx, userId, credits) {
    if (!Number.isInteger(credits) || credits < 0) {
        throw (0, errorHandler_1.createError)("Credit amount must be a whole number.", 400, "InvalidAmount");
    }
    if (credits === 0) {
        const wallet = await tx.creditWallet.findUnique({ where: { userId } });
        if (!wallet)
            throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
        return wallet;
    }
    const updated = await tx.creditWallet.updateMany({
        where: { userId, balance: { gte: credits } },
        data: { balance: { decrement: credits } },
    });
    if (updated.count !== 1) {
        throw (0, errorHandler_1.createError)("Insufficient credits.", 400, "InsufficientCredits");
    }
    const wallet = await tx.creditWallet.findUnique({ where: { userId } });
    if (!wallet)
        throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
    return wallet;
}
async function decrementConvertibleCash(tx, userId, paise) {
    if (!Number.isInteger(paise) || paise < 0) {
        throw (0, errorHandler_1.createError)("Cash amount is invalid.", 400, "InvalidAmount");
    }
    if (paise === 0) {
        const wallet = await tx.creditWallet.findUnique({ where: { userId } });
        if (!wallet)
            throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
        return wallet;
    }
    const updated = await tx.creditWallet.updateMany({
        where: { userId, convertibleCashBalanceInPaise: { gte: paise } },
        data: { convertibleCashBalanceInPaise: { decrement: paise } },
    });
    if (updated.count !== 1) {
        throw (0, errorHandler_1.createError)("Insufficient convertible cash.", 400, "InsufficientCash");
    }
    const wallet = await tx.creditWallet.findUnique({ where: { userId } });
    if (!wallet)
        throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
    return wallet;
}
//# sourceMappingURL=wallet.js.map