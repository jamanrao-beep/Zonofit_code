"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanOwnerEmail = cleanOwnerEmail;
exports.cleanOwnerPassword = cleanOwnerPassword;
exports.createGymOwner = createGymOwner;
exports.updateGymOwnerLogin = updateGymOwnerLogin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const referral_1 = require("./referral");
/** Matches portal sign-in, which strips Gmail dots and +tags before lookup. */
function canonicalLoginEmail(email) {
    const at = email.lastIndexOf("@");
    if (at < 1)
        return email;
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (domain === "gmail.com" || domain === "googlemail.com") {
        const base = local.split("+")[0].replace(/\./g, "");
        return `${base}@gmail.com`;
    }
    return email;
}
function cleanOwnerEmail(value) {
    if (typeof value !== "string")
        return null;
    const email = canonicalLoginEmail(value.trim().toLowerCase());
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)
        return null;
    return email;
}
function cleanOwnerPassword(value) {
    if (typeof value !== "string")
        return null;
    if (value.length < 8 || value.length > 72)
        return null;
    return value;
}
async function createGymOwner(db, input) {
    const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    const referralCode = await (0, referral_1.generateUniqueReferralCode)();
    return db.user.create({
        data: {
            email: input.email,
            name: input.name,
            passwordHash,
            systemRole: "GYM_OWNER",
            referralCode,
            wallet: {
                create: {
                    balance: 0,
                    convertibleCashBalanceInPaise: 0,
                    nonConvertibleCashBalanceInPaise: 0,
                },
            },
        },
        select: { id: true, email: true, name: true },
    });
}
async function updateGymOwnerLogin(db, userId, input) {
    const data = {};
    if (input.email)
        data.email = input.email;
    if (input.name)
        data.name = input.name;
    if (input.password)
        data.passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    if (Object.keys(data).length === 0) {
        return db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
    }
    return db.user.update({
        where: { id: userId },
        data,
        select: { id: true, email: true, name: true },
    });
}
//# sourceMappingURL=gymOwner.js.map