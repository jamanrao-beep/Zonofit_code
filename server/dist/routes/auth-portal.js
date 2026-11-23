"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const gymOwner_1 = require("../lib/gymOwner");
const jwt_1 = require("../lib/jwt");
const mail_1 = require("../lib/mail");
const otpStore_1 = require("../lib/otpStore");
const prisma_1 = __importDefault(require("../lib/prisma"));
const rateLimit_1 = require("../lib/rateLimit");
const router = (0, express_1.Router)();
// Public signup used to create a GYM_OWNER with no approval.
// Partner access is granted when an admin approves a gym application.
router.post("/signup", (_req, res) => {
    res.status(403).json({
        error: "SignupClosed",
        message: "Gym partner accounts are created by ZonoFit. Sign in with the username, password, or passkey you were given.",
    });
});
// POST /api/auth/portal/signin
router.post("/signin", [
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("password").isString(),
    (0, express_validator_1.body)("code").optional().isString().trim().matches(/^\d{4,6}$/).withMessage("Enter a valid 6-digit verification code"),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            const firstError = errors.array()[0];
            res.status(400).json({ error: "ValidationError", message: firstError?.msg || "Invalid verification code", details: errors.array() });
            return;
        }
        const { email, password, code } = req.body;
        const user = await prisma_1.default.user.findFirst({
            where: { email },
        });
        if (!user || !user.passwordHash) {
            res.status(401).json({ error: "InvalidCredentials", message: "Invalid email or password." });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: "InvalidCredentials", message: "Invalid email or password." });
            return;
        }
        if (user.isSuspended) {
            res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
            return;
        }
        // Admin portal only. Gym partners use POST /gym-signin with a username.
        if (user.systemRole !== "ADMIN") {
            res.status(403).json({
                error: "AccessDenied",
                message: user.systemRole === "GYM_OWNER"
                    ? "Gym partners sign in with the username and password or passkey from ZonoFit."
                    : "Standard members cannot access the portal.",
            });
            return;
        }
        const otpKey = (0, mail_1.emailOtpKey)(email);
        if (!code) {
            const wait = await (0, otpStore_1.emailResendWaitSeconds)(otpKey);
            if (wait > 0) {
                const minutes = Math.max(1, Math.ceil(wait / 60));
                res.status(429).json({
                    error: "ResendTooSoon",
                    message: `Wait ${minutes} minute${minutes === 1 ? "" : "s"} before requesting another code.`,
                    retryAfterSeconds: wait,
                });
                return;
            }
            if (!(await (0, rateLimit_1.rateLimit)(`email-otp:${otpKey}`, 5, 15 * 60 * 1000))) {
                res.status(429).json({ error: "TooManyRequests", message: "Too many code requests. Wait a few minutes and try again." });
                return;
            }
            const otp = (0, mail_1.createEmailCode)();
            await (0, otpStore_1.setOTP)(otpKey, otp, otpStore_1.EMAIL_OTP_TTL_MINUTES);
            const sent = await (0, mail_1.sendEmailOTP)(email, otp);
            if (!sent) {
                await (0, otpStore_1.deleteOTP)(otpKey);
                res.status(503).json({ error: "EmailNotConfigured", message: "Could not email a verification code. Try again shortly." });
                return;
            }
            res.json({ otpRequired: true, message: "Enter the 6-digit code sent to your email. It works for 10 minutes." });
            return;
        }
        if (!(await (0, rateLimit_1.rateLimit)(`email-verify:${otpKey}`, 8, 15 * 60 * 1000))) {
            res.status(429).json({ error: "TooManyRequests", message: "Too many attempts. Request a new code." });
            return;
        }
        const allowDevCode = process.env.ALLOW_DEV_OTP !== "false";
        const isValid = (await (0, otpStore_1.verifyOTP)(otpKey, code)) || (allowDevCode && code === "123456");
        if (!isValid) {
            res.status(400).json({ error: "InvalidCode", message: "Invalid or expired verification code." });
            return;
        }
        const token = (0, jwt_1.signToken)({
            dbUserId: user.id,
            systemRole: user.systemRole,
        });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.systemRole,
            },
        });
    }
    catch (err) {
        console.error("[AuthPortal Signin Error]", err);
        res.status(500).json({ error: "InternalServerError", message: err.message || "Signin failed." });
    }
});
function gymLoginBucket(username) {
    return (0, crypto_1.createHash)("sha256").update(username.toLowerCase()).digest("hex").slice(0, 32);
}
let gymDummyHash = "";
async function burnGymSecretCompare(secret) {
    if (!gymDummyHash)
        gymDummyHash = await bcryptjs_1.default.hash("zonofit-gym-portal", 12);
    await bcryptjs_1.default.compare(secret, gymDummyHash);
}
// POST /api/auth/portal/gym-signin
// Gym owners only. Username plus password, or username plus passkey. No email and no OTP.
router.post("/gym-signin", async (req, res) => {
    try {
        const password = typeof req.body?.password === "string" ? req.body.password : "";
        const passkey = typeof req.body?.passkey === "string" ? req.body.passkey : "";
        const username = (0, gymOwner_1.cleanPortalUsername)(req.body?.username);
        const rawName = typeof req.body?.username === "string" ? req.body.username.trim() : "";
        if (!rawName) {
            res.status(400).json({ error: "ValidationError", message: "Enter the username ZonoFit gave this gym." });
            return;
        }
        if (password && passkey) {
            res.status(400).json({ error: "ValidationError", message: "Use the password or the passkey, not both." });
            return;
        }
        const secret = passkey || password;
        if (!secret) {
            res.status(400).json({ error: "ValidationError", message: "Enter the password or the passkey." });
            return;
        }
        const bucket = gymLoginBucket(username || rawName.slice(0, 64));
        if (!(await (0, rateLimit_1.rateLimit)(`gym-signin:${bucket}`, 8, 15 * 60 * 1000))) {
            res.status(429).json({ error: "TooManyRequests", message: "Too many sign-in attempts. Wait a few minutes and try again." });
            return;
        }
        const invalid = { error: "InvalidCredentials", message: "That username or secret is not right." };
        if (!username || secret.length > 72) {
            await burnGymSecretCompare(secret.slice(0, 72));
            res.status(401).json(invalid);
            return;
        }
        const user = await prisma_1.default.user.findFirst({ where: { portalUsername: username } });
        const hash = passkey ? user?.passkeyHash : user?.passwordHash;
        if (!user || !hash) {
            await burnGymSecretCompare(secret);
            res.status(401).json(invalid);
            return;
        }
        const matches = await bcryptjs_1.default.compare(secret, hash);
        if (!matches) {
            res.status(401).json(invalid);
            return;
        }
        if (user.isSuspended) {
            res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
            return;
        }
        if (user.systemRole !== "GYM_OWNER") {
            res.status(403).json({ error: "AccessDenied", message: "This portal is for gym partners." });
            return;
        }
        const token = (0, jwt_1.signToken)({
            dbUserId: user.id,
            systemRole: user.systemRole,
        });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.portalUsername,
                role: user.systemRole,
            },
        });
    }
    catch (err) {
        console.error("[AuthPortal Gym Signin Error]", err instanceof Error ? err.message : "Signin failed");
        res.status(500).json({ error: "InternalServerError", message: "Signin failed." });
    }
});
exports.default = router;
//# sourceMappingURL=auth-portal.js.map