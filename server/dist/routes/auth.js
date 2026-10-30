"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const jwt_1 = require("../lib/jwt");
const prisma_1 = __importDefault(require("../lib/prisma"));
const phone_1 = require("../lib/phone");
const sms_1 = require("../lib/sms");
const mail_1 = require("../lib/mail");
const otpStore_1 = require("../lib/otpStore");
const referral_1 = require("../lib/referral");
const rateLimit_1 = require("../lib/rateLimit");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function readPhone(req, res) {
    const phone = (0, phone_1.normalizePhone)(req.body?.phone);
    if (!phone) {
        res.status(400).json({ error: "InvalidPhone", message: "Enter a valid 10-digit mobile number." });
        return null;
    }
    return phone;
}
// POST /api/auth/signup
router.post("/signup", [
    (0, express_validator_1.body)("username").isString().trim().isLength({ min: 2, max: 50 }),
    (0, express_validator_1.body)("phone").isString().trim().isLength({ min: 10, max: 20 }),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const phone = readPhone(req, res);
    if (!phone)
        return;
    const { username } = req.body;
    // Check if phone already registered
    const existingUser = await prisma_1.default.user.findFirst({
        where: { phone },
    });
    if (existingUser) {
        res.status(400).json({ error: "PhoneAlreadyRegistered", message: "This phone number is already registered." });
        return;
    }
    if (!(await (0, rateLimit_1.rateLimit)(`otp:${phone}`, 5, 15 * 60 * 1000))) {
        res.status(429).json({ error: "TooManyRequests", message: "Too many code requests. Wait a few minutes and try again." });
        return;
    }
    const code = (0, crypto_1.randomInt)(1000, 10000).toString();
    await (0, otpStore_1.setOTP)(phone, code);
    const sent = await (0, sms_1.sendOTP)(phone, code);
    if (sent.success) {
        res.json({ success: true, message: "OTP sent successfully." });
    }
    else {
        res.status(500).json({ error: "SMSFailed", message: sent.message || "Failed to send OTP SMS." });
    }
});
// POST /api/auth/signin
router.post("/signin", [
    (0, express_validator_1.body)("phone").isString().trim().isLength({ min: 10, max: 20 }),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const phone = readPhone(req, res);
    if (!phone)
        return;
    const user = await prisma_1.default.user.findFirst({
        where: { phone },
    });
    if (!user) {
        res.status(404).json({ error: "UserNotFound", message: "No user found with this phone number." });
        return;
    }
    if (!(await (0, rateLimit_1.rateLimit)(`otp:${phone}`, 5, 15 * 60 * 1000))) {
        res.status(429).json({ error: "TooManyRequests", message: "Too many code requests. Wait a few minutes and try again." });
        return;
    }
    const code = (0, crypto_1.randomInt)(1000, 10000).toString();
    await (0, otpStore_1.setOTP)(phone, code);
    const sent = await (0, sms_1.sendOTP)(phone, code);
    if (sent.success) {
        res.json({ success: true, message: "OTP sent successfully." });
    }
    else {
        res.status(500).json({ error: "SMSFailed", message: sent.message || "Failed to send OTP SMS." });
    }
});
// POST /api/auth/check-user
router.post("/check-user", async (req, res) => {
    try {
        const { phone, email } = req.body || {};
        const cleanPhone = (0, phone_1.normalizePhone)(phone);
        const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        let phoneUser = null;
        if (cleanPhone) {
            phoneUser = await prisma_1.default.user.findFirst({
                where: { phone: cleanPhone },
                select: { id: true, name: true, phone: true, email: true },
            });
        }
        let emailUser = null;
        if (cleanEmail && cleanEmail.includes("@")) {
            emailUser = await prisma_1.default.user.findUnique({
                where: { email: cleanEmail },
                select: { id: true, name: true, phone: true, email: true },
            });
        }
        const matchedUser = phoneUser || emailUser;
        res.json({
            exists: !!matchedUser,
            phoneExists: !!phoneUser,
            emailExists: !!emailUser,
            isOnboarded: !!(matchedUser && matchedUser.name && matchedUser.name !== "ZonoFit Member"),
        });
    }
    catch (err) {
        res.status(500).json({ error: "CheckUserFailed", message: err.message });
    }
});
// POST /api/auth/verify
router.post("/verify", auth_1.optionalAuth, [
    (0, express_validator_1.body)("phone").isString().trim(),
    (0, express_validator_1.body)("code").isString().trim(),
    (0, express_validator_1.body)("isSignIn").isBoolean(),
    (0, express_validator_1.body)("username").optional().isString().trim(),
    (0, express_validator_1.body)("referralCode").optional().isString().trim(),
    (0, express_validator_1.body)("attachPhone").optional().isBoolean(),
], async (req, res) => {
    const phone = readPhone(req, res);
    if (!phone)
        return;
    const { code, isSignIn, username, referralCode: inputRefCode } = req.body;
    if (!(await (0, rateLimit_1.rateLimit)(`verify:${phone}`, 8, 15 * 60 * 1000))) {
        res.status(429).json({ error: "TooManyRequests", message: "Too many attempts. Request a new code." });
        return;
    }
    const allowDevCode = process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP === "true";
    const isValid = (await (0, otpStore_1.verifyOTP)(phone, code)) || (allowDevCode && code === "1234");
    if (!isValid) {
        res.status(400).json({ error: "InvalidCode", message: "Invalid or expired verification code." });
        return;
    }
    let user;
    // Google already opened this account. The code proves the mobile number,
    // then we save it on that same user instead of creating a second account.
    if (req.body?.attachPhone === true) {
        if (!req.dbUserId) {
            res.status(401).json({
                error: "Unauthorized",
                message: "Open Google or verify this code to create the account first.",
            });
            return;
        }
        const taken = await prisma_1.default.user.findFirst({
            where: { phone, NOT: { id: req.dbUserId } },
            select: { id: true },
        });
        if (taken) {
            res.status(409).json({
                error: "PhoneInUse",
                message: "That phone number is already on another account. Sign in with it instead.",
            });
            return;
        }
        user = await prisma_1.default.user.update({
            where: { id: req.dbUserId },
            data: { phone },
            include: { wallet: true, membership: true },
        });
        const token = (0, jwt_1.signToken)({ dbUserId: user.id, phone: user.phone || undefined });
        const realName = !!(user.name && user.name !== "ZonoFit Member" && user.name !== "Google User");
        const isOnboarded = realName && !!user.membership?.primaryGymId;
        res.json({
            token,
            user: {
                id: user.id,
                username: user.name,
                phone: user.phone,
                email: user.email,
                authMethod: "phone",
                isOnboarded,
            },
            isOnboarded,
        });
        return;
    }
    if (isSignIn) {
        user = await prisma_1.default.user.findFirst({
            where: { phone },
            include: {
                wallet: true,
                membership: true,
            },
        });
        if (!user) {
            res.status(404).json({ error: "UserNotFound", message: "User not found." });
            return;
        }
        if (user.isSuspended) {
            res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
            return;
        }
    }
    else {
        // Signup flow
        const settings = await prisma_1.default.systemSettings.findUnique({ where: { id: "default" } });
        if (settings && !settings.signupsEnabled) {
            res.status(403).json({ error: "SignupsDisabled", message: "New signups are currently disabled." });
            return;
        }
        if (!username) {
            res.status(400).json({ error: "UsernameRequired", message: "Username is required for signup." });
            return;
        }
        // Check duplicate phone or username
        const dupUser = await prisma_1.default.user.findFirst({
            where: { OR: [{ phone }, { email: `${username.toLowerCase()}_${phone}@zonofit.com` }] },
        });
        if (dupUser) {
            res.status(400).json({ error: "UserAlreadyExists", message: "Username or phone number already registered." });
            return;
        }
        const email = `${username.toLowerCase()}_${phone}@zonofit.com`;
        // Fetch Premium membership plan to auto-grant to new users for testing
        const premiumPlan = await prisma_1.default.membershipPlan.findFirst({
            where: { name: "Premium" },
        });
        let referredByUserId = undefined;
        if (inputRefCode && typeof inputRefCode === "string") {
            const referrer = await prisma_1.default.user.findUnique({
                where: { referralCode: inputRefCode.trim().toUpperCase() },
            });
            if (referrer) {
                referredByUserId = referrer.id;
            }
        }
        const uniqueReferralCode = await (0, referral_1.generateUniqueReferralCode)();
        try {
            user = await prisma_1.default.user.create({
                data: {
                    email,
                    name: username,
                    phone,
                    referralCode: uniqueReferralCode,
                    referredByUserId,
                    wallet: {
                        create: {
                            balance: 0,
                            convertibleCashBalanceInPaise: 0,
                            nonConvertibleCashBalanceInPaise: 0,
                        },
                    },
                },
                include: {
                    wallet: true,
                    membership: true,
                },
            });
        }
        catch (err) {
            if (err.code === "P2002") {
                res.status(409).json({ error: "UserAlreadyExists", message: "Username or phone number already registered." });
                return;
            }
            throw err;
        }
    }
    // Generate custom JWT token
    const token = (0, jwt_1.signToken)({
        dbUserId: user.id,
        phone: user.phone || undefined,
    });
    const isOnboarded = !!(user.name && user.name !== "ZonoFit Member");
    res.json({
        token,
        user: {
            id: user.id,
            username: user.name,
            phone: user.phone,
            email: user.email,
            authMethod: "phone",
            isOnboarded,
        },
        isOnboarded,
    });
});
// POST /api/auth/google
// Accepts only a Google ID token. An email typed into the app is not proof of identity.
router.post("/google", async (req, res) => {
    try {
        const { idToken, referralCode: inputRefCode } = req.body || {};
        if (!idToken || typeof idToken !== "string") {
            res.status(400).json({
                error: "GoogleTokenRequired",
                message: "Sign in with your phone number. Google sign-in needs a verified Google token, which this build does not send.",
            });
            return;
        }
        const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
        if (!clientId) {
            res.status(503).json({ error: "GoogleNotConfigured", message: "Google sign-in is not configured. Use your phone number." });
            return;
        }
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (!googleRes.ok) {
            res.status(401).json({ error: "InvalidGoogleToken", message: "Google could not verify this sign-in." });
            return;
        }
        const google = await googleRes.json();
        if (google.aud !== clientId || google.email_verified !== "true" || !google.email) {
            res.status(401).json({ error: "InvalidGoogleToken", message: "Google could not verify this sign-in." });
            return;
        }
        const email = google.email.trim().toLowerCase();
        const name = google.name || email.split("@")[0] || "Google User";
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser && existingUser.isSuspended) {
            res.status(403).json({ error: "AccountSuspended", message: "Your account has been suspended by an administrator." });
            return;
        }
        if (!existingUser) {
            const settings = await prisma_1.default.systemSettings.findUnique({ where: { id: "default" } });
            if (settings && !settings.signupsEnabled) {
                res.status(403).json({ error: "SignupsDisabled", message: "New signups are currently disabled." });
                return;
            }
        }
        let referredByUserId = undefined;
        if (inputRefCode && typeof inputRefCode === "string") {
            const referrer = await prisma_1.default.user.findUnique({
                where: { referralCode: inputRefCode.trim().toUpperCase() },
            });
            if (referrer) {
                referredByUserId = referrer.id;
            }
        }
        const uniqueReferralCode = await (0, referral_1.generateUniqueReferralCode)();
        //  Use upsert so clicking Google twice doesn't crash
        const user = await prisma_1.default.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                name,
                avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
                referralCode: uniqueReferralCode,
                referredByUserId,
                wallet: {
                    create: {
                        balance: 0,
                        convertibleCashBalanceInPaise: 0,
                        nonConvertibleCashBalanceInPaise: 0,
                    },
                },
            },
            include: { wallet: true, membership: true },
        });
        const token = (0, jwt_1.signToken)({ dbUserId: user.id });
        const hasMembership = !!user.membership;
        const hasPrimaryGym = !!(user.membership && user.membership.primaryGymId);
        const isOnboarded = !!(user.name && user.name !== "Google User" && user.name !== "ZonoFit Member" && hasPrimaryGym);
        res.json({
            token,
            user: {
                id: user.id,
                username: user.name,
                phone: user.phone || "",
                email: user.email,
                authMethod: "google",
                isOnboarded,
                primaryGymId: user.membership?.primaryGymId || null,
            },
            isOnboarded,
        });
    }
    catch (err) {
        console.error("[Google Auth Error]", err);
        res.status(500).json({ error: "GoogleAuthFailed", message: "Google sign-in failed." });
    }
});
function cleanEmail(value) {
    if (typeof value !== "string")
        return null;
    const email = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)
        return null;
    return email;
}
// POST /api/auth/email-otp/send
// Used while a member is registering an email address. The code goes to that inbox.
router.post("/email-otp/send", auth_1.requireAuth, async (req, res) => {
    const email = cleanEmail(req.body?.email);
    if (!email) {
        res.status(400).json({ error: "InvalidEmail", message: "Enter a valid email address." });
        return;
    }
    const otpKey = (0, mail_1.emailOtpKey)(email);
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
    const code = (0, mail_1.createEmailCode)();
    await (0, otpStore_1.setOTP)(otpKey, code, otpStore_1.EMAIL_OTP_TTL_MINUTES);
    const sent = await (0, mail_1.sendEmailOTP)(email, code);
    if (!sent) {
        await (0, otpStore_1.deleteOTP)(otpKey);
        res.status(503).json({ error: "EmailNotConfigured", message: "Could not email a verification code. Try again shortly." });
        return;
    }
    res.json({ success: true, message: "Enter the 6-digit code sent to your email. It works for 10 minutes." });
});
// POST /api/auth/email-otp/verify
router.post("/email-otp/verify", auth_1.requireAuth, async (req, res) => {
    const email = cleanEmail(req.body?.email);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!email || !/^\d{6}$/.test(code)) {
        res.status(400).json({ error: "InvalidCode", message: "Enter the 6-digit code from your email." });
        return;
    }
    const otpKey = (0, mail_1.emailOtpKey)(email);
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
    // Proof that this signed-in member verified this inbox. Profile save consumes it.
    await (0, otpStore_1.setOTP)(`verified-email:${req.dbUserId}`, email, 30);
    res.json({ verified: true, email });
});
exports.default = router;
//# sourceMappingURL=auth.js.map