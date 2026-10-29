"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const crypto_1 = require("crypto");
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BANNED_SECRETS = new Set([
    "zonofit_super_secret_key_1234567890",
    "changeme",
    "secret",
]);
function getSecret() {
    const secret = process.env.JWT_SECRET?.trim() ?? "";
    if (secret.length < 32 || BANNED_SECRETS.has(secret)) {
        throw new Error("JWT_SECRET must be set to a unique value of at least 32 characters.");
    }
    return secret;
}
function sign(payloadStr) {
    return (0, crypto_1.createHmac)("sha256", getSecret()).update(payloadStr).digest("base64url");
}
function signaturesMatch(actual, expected) {
    const actualBuf = Buffer.from(actual);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(actualBuf, expectedBuf);
}
function signToken(payload) {
    const now = Date.now();
    const full = { ...payload, iat: now, exp: now + TOKEN_TTL_MS };
    const payloadStr = Buffer.from(JSON.stringify(full)).toString("base64url");
    return `${payloadStr}.${sign(payloadStr)}`;
}
function verifyToken(token) {
    const parts = token.split(".");
    if (parts.length !== 2)
        return null;
    const [payloadStr, signature] = parts;
    let expectedSignature;
    try {
        expectedSignature = sign(payloadStr);
    }
    catch {
        return null;
    }
    if (!signaturesMatch(signature, expectedSignature))
        return null;
    try {
        const parsed = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf8"));
        if (!parsed?.dbUserId || typeof parsed.exp !== "number" || Date.now() > parsed.exp)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map