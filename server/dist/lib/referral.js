"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomReferralCode = generateRandomReferralCode;
exports.generateUniqueReferralCode = generateUniqueReferralCode;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("./prisma"));
const REFERRAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateRandomReferralCode() {
    let code = "ZONO-";
    for (let i = 0; i < 6; i++) {
        code += REFERRAL_CHARS[crypto_1.default.randomInt(REFERRAL_CHARS.length)];
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
    return "ZONO-" + crypto_1.default.randomBytes(4).toString("hex").toUpperCase();
}
//# sourceMappingURL=referral.js.map