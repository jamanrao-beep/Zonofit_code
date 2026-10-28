"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const jwt_1 = require("../lib/jwt");
const prisma_1 = __importDefault(require("../lib/prisma"));
const sms_1 = require("../lib/sms");
const otpStore_1 = require("../lib/otpStore");
const referral_1 = require("../lib/referral");
const router = (0, express_1.Router)();
// POST /api/auth/signup
router.post("/signup", [
    (0, express_validator_1.body)("username").isString().trim().isLength({ min: 2, max: 50 }),
    (0, express_validator_1.body)("phone").isString().trim().isLength({ min: 10, max: 15 }),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { username, phone } = req.body;
    // Check if phone already registered
    const existingUser = await prisma_1.default.user.findFirst({
        where: { phone },
    });
    if (existingUser) {
        res.status(400).json({ error: "PhoneAlreadyRegistered", message: "This phone number is already registered." });
        return;
    }
    const isRealSMS = !!process.env.FAST2SMS_API_KEY;
    const code = (!isRealSMS && process.env.NODE_ENV === "development")
        ? "1234"
        : Math.floor(1000 + Math.random() * 9000).toString();
    (0, otpStore_1.setOTP)(phone, code);
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
    (0, express_validator_1.body)("phone").isString().trim().isLength({ min: 10, max: 15 }),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { phone } = req.body;
    const user = await prisma_1.default.user.findFirst({
        where: { phone },
    });
    if (!user) {
        res.status(404).json({ error: "UserNotFound", message: "No user found with this phone number." });
        return;
    }
    const isRealSMS = !!process.env.FAST2SMS_API_KEY;
    const code = (!isRealSMS && process.env.NODE_ENV === "development")
        ? "1234"
        : Math.floor(1000 + Math.random() * 9000).toString();
    (0, otpStore_1.setOTP)(phone, code);
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
        const cleanPhone = typeof phone === "string" ? phone.replace(/[^0-9]/g, "").slice(-10) : "";
        const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        let phoneUser = null;
        if (cleanPhone && cleanPhone.length === 10) {
            phoneUser = await prisma_1.default.user.findFirst({
                where: { phone: { contains: cleanPhone } },
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
        const exists = !!matchedUser;
        const isOnboarded = !!(matchedUser && matchedUser.name && matchedUser.name !== "ZonoFit Member");
        res.json({
            exists,
            phoneExists: !!phoneUser,
            emailExists: !!emailUser,
            isOnboarded,
            user: matchedUser
                ? {
                    id: matchedUser.id,
                    name: matchedUser.name,
                    phone: matchedUser.phone,
                    email: matchedUser.email,
                    isOnboarded,
                }
                : null,
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
    const { phone, code, isSignIn, username, referralCode: inputRefCode } = req.body;
    const isDev = process.env.NODE_ENV === "development" || !process.env.FAST2SMS_API_KEY;
    const isValid = (0, otpStore_1.verifyOTP)(phone, code) || (isDev && (code === "1234" || code === "123456"));
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
    // Generate custom JWT token
    const token = (0, jwt_1.signToken)({
        dbUserId: user.id,
        phone: user.phone || undefined,
        createdAt: Date.now(),
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
router.post("/google", async (req, res) => {
    try {
        const { email: bodyEmail, name: bodyName, referralCode: inputRefCode } = req.body || {};
        if (!bodyEmail || typeof bodyEmail !== "string" || !bodyEmail.trim()) {
            res.status(400).json({ error: "EmailRequired", message: "Email address is required for Google Sign-In." });
            return;
        }
        const email = bodyEmail.trim().toLowerCase();
        const name = bodyName || email.split("@")[0] || "Google User";
        const premiumPlan = await prisma_1.default.membershipPlan.findFirst({
            where: { name: "Premium" },
        });
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
        const token = (0, jwt_1.signToken)({ dbUserId: user.id, createdAt: Date.now() });
        const hasMembership = !!user.membership;
        const hasPrimaryGym = !!(user.membership && user.membership.primaryGymId);
        const isOnboarded = !!(user.name && user.name !== "Google User" && user.name !== "ZonoFit Member" && hasPrimaryGym);
        res.json({
            token,
            user: {
                id: user.id,
                username: user.name,
                phone: user.phone || "",
                authMethod: "google",
                isOnboarded,
                primaryGymId: user.membership?.primaryGymId || null,
            },
            isOnboarded,
        });
    }
    catch (err) {
        console.error("[Google Auth Error]", err);
        res.status(500).json({ error: "GoogleAuthFailed", message: err.message || "Google sign-in failed." });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map