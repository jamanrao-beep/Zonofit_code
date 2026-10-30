"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
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
        message: "Gym partner accounts are created when ZonoFit approves a gym application. Sign in if you already have one.",
    });
});
// POST /api/auth/portal/signin
router.post("/signin", [
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("password").isString(),
    (0, express_validator_1.body)("code").optional().isString().trim().matches(/^\d{4}$/),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ error: "ValidationError", details: errors.array() });
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
        // Check if they are allowed to login here
        if (user.systemRole === "MEMBER") {
            res.status(403).json({ error: "AccessDenied", message: "Standard members cannot access the portal." });
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
        const allowDevCode = process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP === "true";
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
exports.default = router;
//# sourceMappingURL=auth-portal.js.map