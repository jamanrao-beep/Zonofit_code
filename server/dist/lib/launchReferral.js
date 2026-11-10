"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardPercentTenths = rewardPercentTenths;
exports.percentFromTenths = percentFromTenths;
exports.normalizeReferralCode = normalizeReferralCode;
exports.noteLaunchReferralCode = noteLaunchReferralCode;
exports.findLaunchPercentTenths = findLaunchPercentTenths;
exports.launchReferralTaken = launchReferralTaken;
exports.resolveReferral = resolveReferral;
exports.launchReferralForUser = launchReferralForUser;
exports.noteLaunchReferralUse = noteLaunchReferralUse;
const prisma_1 = __importDefault(require("./prisma"));
/** Tenths of a percent. 12.5% is 125. Only the prizes the challenge can keep. */
const ALLOWED_TENTHS = new Set([10, 20, 40, 80, 125, 160]);
function rewardPercentTenths(reward) {
    const match = /^(\d+(?:\.\d+)?)%\s*OFF$/i.exec(reward.trim());
    if (!match)
        return null;
    const tenths = Math.round(Number(match[1]) * 10);
    return ALLOWED_TENTHS.has(tenths) ? tenths : null;
}
function percentFromTenths(tenths) {
    return tenths / 10;
}
function normalizeReferralCode(value) {
    return value.trim().toUpperCase().replace(/\s+/g, "").slice(0, 32);
}
function isDuplicate(err) {
    if (!err || typeof err !== "object")
        return false;
    const error = err;
    if (error.code === "P2002")
        return true;
    if (String(error.meta?.code ?? "") === "1062")
        return true;
    return /duplicate/i.test(error.message ?? "");
}
/** Notes the code the challenge showed, and the percent that goes with it. */
async function noteLaunchReferralCode(input) {
    await prisma_1.default.$executeRaw `
    INSERT INTO launch_referral_codes (code, phone, percentTenths, reward)
    VALUES (${input.code}, ${input.phone}, ${input.percentTenths}, ${input.reward})
    ON DUPLICATE KEY UPDATE percentTenths = percentTenths
  `;
}
/** One percent for this code. Mixed percents are ignored. */
async function findLaunchPercentTenths(code) {
    if (!code || code.length > 16)
        return null;
    const rows = await prisma_1.default.$queryRaw `
    SELECT DISTINCT percentTenths
    FROM launch_referral_codes
    WHERE code = ${code}
  `;
    if (rows.length !== 1)
        return null;
    const tenths = Number(rows[0]?.percentTenths);
    return ALLOWED_TENTHS.has(tenths) ? tenths : null;
}
async function launchReferralTaken(code) {
    const rows = await prisma_1.default.$queryRaw `
    SELECT code FROM launch_referral_codes WHERE code = ${code} LIMIT 1
  `;
    return rows.length > 0;
}
/** A member code wins when both exist. A challenge code is the percent noted for that code. */
async function resolveReferral(raw) {
    const code = normalizeReferralCode(raw);
    if (!code)
        return { kind: "none" };
    const friend = await prisma_1.default.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
    });
    if (friend)
        return { kind: "friend", userId: friend.id };
    const tenths = await findLaunchPercentTenths(code);
    if (tenths === null)
        return { kind: "none" };
    return { kind: "launch", code, percentTenths: tenths, percent: percentFromTenths(tenths) };
}
async function launchReferralForUser(userId) {
    const rows = await prisma_1.default.$queryRaw `
    SELECT code, percentTenths
    FROM launch_referral_uses
    WHERE userId = ${userId}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row)
        return null;
    const tenths = Number(row.percentTenths);
    if (!ALLOWED_TENTHS.has(tenths))
        return null;
    return { code: row.code, percent: percentFromTenths(tenths) };
}
/** One challenge code per member. A second insert does not replace the first. */
async function noteLaunchReferralUse(userId, code, percentTenths) {
    try {
        await prisma_1.default.$executeRaw `
      INSERT INTO launch_referral_uses (userId, code, percentTenths)
      VALUES (${userId}, ${code}, ${percentTenths})
    `;
        return "ok";
    }
    catch (err) {
        if (isDuplicate(err))
            return "already";
        throw err;
    }
}
//# sourceMappingURL=launchReferral.js.map