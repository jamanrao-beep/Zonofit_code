"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const crypto_1 = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET || "zonofit_super_secret_key_1234567890";
/**
 * signToken — Generates a stateless session token.
 * Format: base64url(payload).base64url(signature)
 */
function signToken(payload) {
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = (0, crypto_1.createHmac)("sha256", JWT_SECRET)
        .update(payloadStr)
        .digest("base64url");
    return `${payloadStr}.${signature}`;
}
/**
 * verifyToken — Verifies a stateless session token and returns the parsed payload.
 * Returns null if invalid or expired.
 */
function verifyToken(token) {
    const parts = token.split(".");
    if (parts.length !== 2)
        return null;
    const [payloadStr, signature] = parts;
    const expectedSignature = (0, crypto_1.createHmac)("sha256", JWT_SECRET)
        .update(payloadStr)
        .digest("base64url");
    if (signature !== expectedSignature) {
        return null;
    }
    try {
        const jsonStr = Buffer.from(payloadStr, "base64url").toString("utf8");
        return JSON.parse(jsonStr);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map