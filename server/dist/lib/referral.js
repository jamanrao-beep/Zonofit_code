"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomReferralCode = generateRandomReferralCode;
exports.generateUniqueReferralCode = generateUniqueReferralCode;
const prisma_1 = __importDefault(require("./prisma"));
function generateRandomReferralCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "ZONO-";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
async function generateUniqueReferralCode() {
    for (let i = 0; i < 10; i++) {
        const code = generateRandomReferralCode();
        const existing = await prisma_1.default.user.findUnique({ where: { referralCode: code } });
        if (!existing)
            return code;
    }
    return "ZONO-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}
//# sourceMappingURL=referral.js.map