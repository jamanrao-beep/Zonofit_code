"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanOwnerEmail = cleanOwnerEmail;
exports.cleanOwnerPassword = cleanOwnerPassword;
exports.cleanPortalUsername = cleanPortalUsername;
exports.cleanOwnerPasskey = cleanOwnerPasskey;
exports.readOwnerCredentials = readOwnerCredentials;
exports.accountConflictMessage = accountConflictMessage;
exports.createGymOwner = createGymOwner;
exports.updateGymOwnerLogin = updateGymOwnerLogin;
exports.portalUsernameTaken = portalUsernameTaken;
const crypto_1 = require("crypto");
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
/** Admin-assigned gym portal username. Symbols are allowed. Spaces are not. */
function cleanPortalUsername(value) {
    if (typeof value !== "string")
        return null;
    const username = value.trim();
    if (username.length < 3 || username.length > 64)
        return null;
    if (/[\u0000-\u001F\u007F\s]/.test(username))
        return null;
    return username;
}
/** Admin-assigned gym portal passkey or 4-6 digit quick desk PIN. Stored only as a hash. */
function cleanOwnerPasskey(value) {
    if (typeof value !== "string")
        return null;
    const pin = value.trim();
    if (pin.length < 4 || pin.length > 72)
        return null;
    return pin;
}
function readOwnerCredentials(body) {
    const usernameRaw = typeof body.ownerUsername === "string" ? body.ownerUsername : "";
    const passwordRaw = typeof body.ownerPassword === "string" ? body.ownerPassword : "";
    const pinInput = body.ownerPin !== undefined ? body.ownerPin : body.ownerPasskey;
    const passkeyRaw = typeof pinInput === "string" ? pinInput : "";
    const rawAuthMode = typeof body.authMode === "string" ? body.authMode.toUpperCase() : "BOTH";
    const authMode = rawAuthMode === "PASSWORD" || rawAuthMode === "PIN" ? rawAuthMode : "BOTH";
    const usernameProvided = usernameRaw.trim() !== "";
    const passwordProvided = passwordRaw.length > 0;
    const passkeyProvided = passkeyRaw.trim().length > 0;
    const username = usernameProvided ? cleanPortalUsername(usernameRaw) : null;
    const password = passwordProvided ? cleanOwnerPassword(passwordRaw) : null;
    const passkey = passkeyProvided ? cleanOwnerPasskey(passkeyRaw) : null;
    if (usernameProvided && !username) {
        return { ok: false, message: "Username must be 3 to 64 characters, with no spaces. Symbols are allowed." };
    }
    if (passwordProvided && !password) {
        return { ok: false, message: "Password must be 8 to 72 characters." };
    }
    if (passkeyProvided && !passkey) {
        return { ok: false, message: "Desk PIN or passkey must be at least 4 characters (e.g. 4-6 digit PIN)." };
    }
    return {
        ok: true,
        value: { username, password, passkey, authMode, usernameProvided, passwordProvided, passkeyProvided },
    };
}
function accountConflictMessage(err) {
    if (err.code !== "P2002")
        return null;
    const target = err.meta?.target;
    const fields = Array.isArray(target) ? target.join(" ") : String(target ?? "");
    if (/portalUsername/i.test(fields))
        return "That username is already used.";
    if (/customGymId/i.test(fields))
        return "That gym ID is already used.";
    return "That username or gym ID is already used.";
}
const ownerSelect = { id: true, name: true, portalUsername: true };
function internalOwnerEmail() {
    return `gym.${(0, crypto_1.randomUUID)()}@owners.zonofit.internal`;
}
async function createGymOwner(db, input) {
    const [passwordHash, passkeyHash] = await Promise.all([
        input.password ? bcryptjs_1.default.hash(input.password, 12) : Promise.resolve(null),
        input.passkey ? bcryptjs_1.default.hash(input.passkey, 12) : Promise.resolve(null),
    ]);
    const referralCode = await (0, referral_1.generateUniqueReferralCode)();
    return db.user.create({
        data: {
            email: internalOwnerEmail(),
            name: input.name,
            portalUsername: input.username,
            passwordHash,
            passkeyHash,
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
        select: ownerSelect,
    });
}
async function updateGymOwnerLogin(db, userId, input) {
    const data = {};
    if (input.username)
        data.portalUsername = input.username;
    if (input.name)
        data.name = input.name;
    if (input.password)
        data.passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    if (input.passkey)
        data.passkeyHash = await bcryptjs_1.default.hash(input.passkey, 12);
    if (Object.keys(data).length === 0) {
        return db.user.findUnique({ where: { id: userId }, select: ownerSelect });
    }
    return db.user.update({
        where: { id: userId },
        data,
        select: ownerSelect,
    });
}
async function portalUsernameTaken(db, username, exceptUserId) {
    const existing = await db.user.findFirst({
        where: { portalUsername: username },
        select: { id: true },
    });
    return !!existing && existing.id !== exceptUserId;
}
//# sourceMappingURL=gymOwner.js.map