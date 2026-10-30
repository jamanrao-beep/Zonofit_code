"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
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
    if (sent) {
        res.json({ success: true, message: "OTP sent successfully." });
    }
    else {
        res.status(500).json({ error: "SMSFailed", message: "Failed to send OTP SMS." });
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
    if (sent) {
        res.json({ success: true, message: "OTP sent successfully." });
    }
    else {
        res.status(500).json({ error: "SMSFailed", message: "Failed to send OTP SMS." });
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
router.post("/verify", [
    (0, express_validator_1.body)("phone").isString().trim(),
    (0, express_validator_1.body)("code").isString().trim(),
    (0, express_validator_1.body)("isSignIn").isBoolean(),
    (0, express_validator_1.body)("username").optional().isString().trim(),
    (0, express_validator_1.body)("referralCode").optional().isString().trim(),
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
function cleanPassword(value) {
    if (typeof value !== "string")
        return null;
    if (value.length < 8 || value.length > 72)
        return null;
    return value;
}
function readEmailCode(value) {
    return typeof value === "string" ? value.trim() : "";
}
function memberEmailSession(user) {
    const isOnboarded = !!(user.name && user.name !== "ZonoFit Member" && user.name !== "Google User");
    return {
        token: (0, jwt_1.signToken)({ dbUserId: user.id, phone: user.phone || undefined }),
        user: {
            id: user.id,
            username: user.name,
            phone: user.phone || "",
            email: user.email,
            authMethod: "email",
            isOnboarded,
        },
        isOnboarded,
    };
}
async function beginEmailOtp(email, res) {
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
    const otp = (0, crypto_1.randomInt)(1000, 10000).toString();
    await (0, otpStore_1.setOTP)(otpKey, otp, otpStore_1.EMAIL_OTP_TTL_MINUTES);
    const sent = await (0, mail_1.sendEmailOTP)(email, otp);
    if (!sent) {
        await (0, otpStore_1.deleteOTP)(otpKey);
        res.status(503).json({ error: "EmailNotConfigured", message: "Could not email a verification code. Try again shortly." });
        return;
    }
    res.json({ otpRequired: true, message: "Enter the 4-digit code sent to your email. It works for 10 minutes." });
}
async function consumeEmailOtp(email, code, res) {
    const otpKey = (0, mail_1.emailOtpKey)(email);
    if (!(await (0, rateLimit_1.rateLimit)(`email-verify:${otpKey}`, 8, 15 * 60 * 1000))) {
        res.status(429).json({ error: "TooManyRequests", message: "Too many attempts. Request a new code." });
        return false;
    }
    const allowDevCode = process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP === "true";
    const isValid = (await (0, otpStore_1.verifyOTP)(otpKey, code)) || (allowDevCode && code === "1234");
    if (!isValid) {
        res.status(400).json({ error: "InvalidCode", message: "Invalid or expired verification code." });
        return false;
    }
    return true;
}
// POST /api/auth/email/signup
// Creates a member only after the emailed code is verified. No token before that.
router.post("/email/signup", async (req, res) => {
    try {
        const email = cleanEmail(req.body?.email);
        const password = cleanPassword(req.body?.password);
        const code = readEmailCode(req.body?.code);
        if (!email) {
            res.status(400).json({ error: "InvalidEmail", message: "Enter a valid email address." });
            return;
        }
        if (!password) {
            res.status(400).json({ error: "InvalidPassword", message: "Use a password between 8 and 72 characters." });
            return;
        }
        if (code && !/^\d{4}$/.test(code)) {
            res.status(400).json({ error: "InvalidCode", message: "Enter the 4-digit code from your email." });
            return;
        }
        const existing = await prisma_1.default.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({
                error: "AccountExists",
                message: existing.passwordHash
                    ? "An account with this email already exists. Sign in."
                    : "This email is already used. Sign in with Google or your phone number.",
            });
            return;
        }
        const settings = await prisma_1.default.systemSettings.findUnique({ where: { id: "default" } });
        if (settings && !settings.signupsEnabled) {
            res.status(403).json({ error: "SignupsDisabled", message: "New signups are currently disabled." });
            return;
        }
        if (!code) {
            await beginEmailOtp(email, res);
            return;
        }
        if (!(await consumeEmailOtp(email, code, res)))
            return;
        const taken = await prisma_1.default.user.findUnique({ where: { email } });
        if (taken) {
            res.status(409).json({ error: "AccountExists", message: "An account with this email already exists. Sign in." });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const referralCode = await (0, referral_1.generateUniqueReferralCode)();
        try {
            const user = await prisma_1.default.user.create({
                data: {
                    email,
                    name: "ZonoFit Member",
                    passwordHash,
                    referralCode,
                    wallet: {
                        create: {
                            balance: 0,
                            convertibleCashBalanceInPaise: 0,
                            nonConvertibleCashBalanceInPaise: 0,
                        },
                    },
                },
            });
            res.json(memberEmailSession(user));
        }
        catch (err) {
            if (err.code === "P2002") {
                res.status(409).json({ error: "AccountExists", message: "An account with this email already exists. Sign in." });
                return;
            }
            throw err;
        }
    }
    catch (err) {
        console.error("[Email Signup Error]", err);
        res.status(500).json({ error: "EmailSignupFailed", message: "Could not create the account." });
    }
});
// POST /api/auth/email/signin
// Password is checked twice: once to send the code, again when the code is submitted.
router.post("/email/signin", async (req, res) => {
    try {
        const email = cleanEmail(req.body?.email);
        const password = typeof req.body?.password === "string" ? req.body.password : "";
        const code = readEmailCode(req.body?.code);
        if (!email || password.length < 8 || password.length > 72) {
            res.status(401).json({ error: "InvalidCredentials", message: "Invalid email or password." });
            return;
        }
        if (code && !/^\d{4}$/.test(code)) {
            res.status(400).json({ error: "InvalidCode", message: "Enter the 4-digit code from your email." });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.systemRole !== "MEMBER") {
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
        if (!code) {
            await beginEmailOtp(email, res);
            return;
        }
        if (!(await consumeEmailOtp(email, code, res)))
            return;
        res.json(memberEmailSession(user));
    }
    catch (err) {
        console.error("[Email Signin Error]", err);
        res.status(500).json({ error: "EmailSigninFailed", message: "Could not sign in." });
    }
});
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
    const code = (0, crypto_1.randomInt)(1000, 10000).toString();
    await (0, otpStore_1.setOTP)(otpKey, code, otpStore_1.EMAIL_OTP_TTL_MINUTES);
    const sent = await (0, mail_1.sendEmailOTP)(email, code);
    if (!sent) {
        await (0, otpStore_1.deleteOTP)(otpKey);
        res.status(503).json({ error: "EmailNotConfigured", message: "Could not email a verification code. Try again shortly." });
        return;
    }
    res.json({ success: true, message: "Enter the 4-digit code sent to your email. It works for 10 minutes." });
});
// POST /api/auth/email-otp/verify
router.post("/email-otp/verify", auth_1.requireAuth, async (req, res) => {
    const email = cleanEmail(req.body?.email);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!email || !/^\d{4}$/.test(code)) {
        res.status(400).json({ error: "InvalidCode", message: "Enter the 4-digit code from your email." });
        return;
    }
    const otpKey = (0, mail_1.emailOtpKey)(email);
    if (!(await (0, rateLimit_1.rateLimit)(`email-verify:${otpKey}`, 8, 15 * 60 * 1000))) {
        res.status(429).json({ error: "TooManyRequests", message: "Too many attempts. Request a new code." });
        return;
    }
    const allowDevCode = process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP === "true";
    const isValid = (await (0, otpStore_1.verifyOTP)(otpKey, code)) || (allowDevCode && code === "1234");
    if (!isValid) {
        res.status(400).json({ error: "InvalidCode", message: "Invalid or expired verification code." });
        return;
    }
    res.json({ verified: true, email });
});
exports.default = router;
//# sourceMappingURL=auth.js.map