"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const phone_1 = require("../lib/phone");
const auth_1 = require("../middleware/auth");
const referral_1 = require("../lib/referral");
const otpStore_1 = require("../lib/otpStore");
function parseDob(value) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!match)
        return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
        return null;
    if (year < 1900 || date.getTime() > Date.now())
        return null;
    return date;
}
function isAtLeast18(date) {
    const cutoff = new Date(Date.UTC(date.getUTCFullYear() + 18, date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
    return cutoff.getTime() <= Date.now();
}
function formatDob(value) {
    if (!value)
        return null;
    const day = String(value.getUTCDate()).padStart(2, "0");
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${value.getUTCFullYear()}`;
}
const router = (0, express_1.Router)();
// Avatars are stored on this server's disk (server/uploads) and served from /uploads by index.ts.
const uploadsDir = path_1.default.join(__dirname, "../../uploads");
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            cb(null, uploadsDir);
        },
        filename: (_req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const extByType = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/webp": ".webp",
            };
            cb(null, `avatar-${uniqueSuffix}${extByType[file.mimetype] || ".jpg"}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
        if (!allowed.has(file.mimetype)) {
            cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
            return;
        }
        cb(null, true);
    },
});
// ─── GET /api/users/me ────────────────────────────────────────────────────────
/**
 * Returns the authenticated user's full profile with membership, wallet, and referral stats.
 * This is the "load everything" endpoint called on app boot / profile screen.
 */
router.get("/me", auth_1.requireAuth, async (req, res) => {
    const user = await prisma_1.default.user.findUnique({
        where: { id: req.dbUserId },
        include: {
            wallet: true,
            membership: {
                include: { plan: true, primaryGym: true },
            },
        },
    });
    if (!user) {
        res.status(404).json({ error: "UserNotFound" });
        return;
    }
    // Ensure user has an actual unique random referral code saved in PostgreSQL
    let userReferralCode = user.referralCode;
    if (!userReferralCode) {
        userReferralCode = await (0, referral_1.generateUniqueReferralCode)();
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: { referralCode: userReferralCode },
        }).catch(() => { });
    }
    // Real counts from actual database
    const [totalWorkouts, thisMonthWorkouts, friendsJoined, completedReferrals] = await Promise.all([
        prisma_1.default.booking.count({
            where: { userId: user.id, status: { in: ["CHECKED_IN", "COMPLETED"] } },
        }),
        prisma_1.default.booking.count({
            where: {
                userId: user.id,
                status: { in: ["CHECKED_IN", "COMPLETED"] },
                visitDate: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
            },
        }),
        prisma_1.default.user.count({
            where: { referredByUserId: user.id },
        }),
        prisma_1.default.user.count({
            where: {
                referredByUserId: user.id,
                bookings: {
                    some: { status: { in: ["CHECKED_IN", "COMPLETED"] } }
                }
            }
        })
    ]);
    const creditsEarned = completedReferrals * 5;
    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        dob: formatDob(user.dob),
        referralApplied: !!user.referredByUserId,
        avatarUrl: user.avatarUrl,
        referralCode: userReferralCode,
        createdAt: user.createdAt,
        wallet: user.wallet
            ? {
                balance: user.wallet.balance,
                convertibleCashBalanceINR: user.wallet.convertibleCashBalanceInPaise / 100,
                nonConvertibleCashBalanceINR: user.wallet.nonConvertibleCashBalanceInPaise / 100,
            }
            : null,
        progress: {
            streak: user.streak,
            totalWorkouts: Math.max(user.totalWorkouts, totalWorkouts),
            trainingHours: Math.max(user.trainingHours, Math.round(totalWorkouts * 1.5)),
            identityStage: user.identityStage,
        },
        membership: user.membership
            ? {
                status: user.membership.status,
                tier: user.membership.plan?.tier || "STANDARD",
                planName: user.membership.plan?.name || "Standard",
                startDate: user.membership.startDate,
                endDate: user.membership.endDate,
                monthlyCredits: user.membership.plan?.monthlyCredits || 0,
                primaryGymId: user.membership.primaryGymId,
                gymName: user.membership.primaryGym?.name || "Being Fitness",
                primaryGymVisits: user.membership.primaryGymVisits || ((user.membership.cycleNumber || 1) <= 4 ? 10 : 15),
                cycleNumber: user.membership.cycleNumber || 1,
                maxCycles: user.membership.maxCycles || 12,
                mandatoryVisits: user.membership.mandatoryVisits || ((user.membership.cycleNumber || 1) <= 4 ? 10 : 15),
                completedVisits: user.membership.completedVisits || 0,
            }
            : null,
        stats: {
            totalWorkouts,
            thisMonthWorkouts,
        },
        referral: {
            code: userReferralCode,
            friendsJoined,
            creditsEarned,
            rewardAmount: 5,
        },
    });
});
// ─── GET /api/users/referral ────────────────────────────────────────────────
/**
 * Dedicated endpoint for the Refer & Earn screen.
 * Fetches real random referral code and actual friends joined / credits earned from DB.
 */
router.get("/referral", auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.dbUserId },
            select: { id: true, referralCode: true }
        });
        if (!user) {
            res.status(404).json({ error: "UserNotFound" });
            return;
        }
        let referralCode = user.referralCode;
        if (!referralCode) {
            referralCode = await (0, referral_1.generateUniqueReferralCode)();
            await prisma_1.default.user.update({
                where: { id: user.id },
                data: { referralCode }
            }).catch(() => { });
        }
        const [friendsJoined, completedReferrals] = await Promise.all([
            prisma_1.default.user.count({
                where: { referredByUserId: user.id },
            }),
            prisma_1.default.user.count({
                where: {
                    referredByUserId: user.id,
                    bookings: {
                        some: { status: { in: ["CHECKED_IN", "COMPLETED"] } }
                    }
                }
            })
        ]);
        res.json({
            referralCode,
            friendsJoined,
            creditsEarned: completedReferrals * 5,
            rewardAmount: 5
        });
    }
    catch (err) {
        console.error("Failed to fetch referral info:", err);
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/users/referral/apply ───────────────────────────────────────────
// Stores who invited this member. It does not add credits.
router.post("/referral/apply", auth_1.requireAuth, async (req, res) => {
    const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
    if (!code || code.length > 32) {
        res.status(400).json({ error: "InvalidCode", message: "Enter a referral code." });
        return;
    }
    const referrer = await prisma_1.default.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
    });
    if (!referrer) {
        res.status(404).json({ error: "InvalidCode", message: "That referral code isn't valid." });
        return;
    }
    if (referrer.id === req.dbUserId) {
        res.status(400).json({ error: "InvalidCode", message: "You can't use your own referral code." });
        return;
    }
    const me = await prisma_1.default.user.findUnique({
        where: { id: req.dbUserId },
        select: { referredByUserId: true },
    });
    if (!me) {
        res.status(404).json({ error: "UserNotFound", message: "Account not found." });
        return;
    }
    if (me.referredByUserId) {
        res.json({ applied: true, already: true });
        return;
    }
    await prisma_1.default.user.update({
        where: { id: req.dbUserId },
        data: { referredByUserId: referrer.id },
    });
    res.json({ applied: true });
});
// ─── PATCH /api/users/me ──────────────────────────────────────────────────────
/**
 * Update the authenticated user's profile (name, phone, email, date of birth).
 */
router.patch("/me", auth_1.requireAuth, [
    (0, express_validator_1.body)("name").optional().isString().trim().isLength({ min: 2, max: 100 }),
    (0, express_validator_1.body)("phone").optional().isString(),
    (0, express_validator_1.body)("email").optional().isEmail(),
    (0, express_validator_1.body)("dob").optional().isString().trim(),
    (0, express_validator_1.body)("avatarUrl").optional().isURL(),
    (0, express_validator_1.body)("expoPushToken").optional().isString(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { name, phone, email, dob, avatarUrl, expoPushToken } = req.body;
    const current = await prisma_1.default.user.findUnique({
        where: { id: req.dbUserId },
        select: { email: true },
    });
    if (!current) {
        res.status(404).json({ error: "UserNotFound", message: "Account not found." });
        return;
    }
    let nextDob;
    if (dob !== undefined) {
        const parsed = parseDob(dob);
        if (!parsed) {
            res.status(400).json({ error: "InvalidDob", message: "That date doesn't look right." });
            return;
        }
        if (!isAtLeast18(parsed)) {
            res.status(400).json({ error: "TooYoung", message: "You need to be 18 or older to join." });
            return;
        }
        nextDob = parsed;
    }
    const nextEmail = email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== current.email.trim().toLowerCase()) {
        const proved = await (0, otpStore_1.verifyOTP)(`verified-email:${req.dbUserId}`, nextEmail);
        if (!proved) {
            res.status(400).json({
                error: "EmailNotVerified",
                message: "Verify that email before saving it.",
            });
            return;
        }
    }
    let nextPhone;
    if (phone === undefined) {
        nextPhone = undefined;
    }
    else if (phone.trim() === "") {
        nextPhone = null;
    }
    else {
        const normalized = (0, phone_1.normalizePhone)(phone);
        if (!normalized) {
            res.status(400).json({ error: "InvalidPhone", message: "Enter a valid 10-digit mobile number." });
            return;
        }
        nextPhone = normalized;
    }
    if (nextPhone) {
        const taken = await prisma_1.default.user.findFirst({
            where: { phone: nextPhone, NOT: { id: req.dbUserId } },
            select: { id: true },
        });
        if (taken) {
            res.status(409).json({ error: "PhoneInUse", message: "That phone number is already on another account." });
            return;
        }
    }
    if (nextEmail) {
        const taken = await prisma_1.default.user.findFirst({
            where: { email: nextEmail, NOT: { id: req.dbUserId } },
            select: { id: true },
        });
        if (taken) {
            res.status(409).json({ error: "EmailInUse", message: "That email is already on another account." });
            return;
        }
    }
    try {
        const updated = await prisma_1.default.user.update({
            where: { id: req.dbUserId },
            data: {
                ...(name !== undefined && { name }),
                ...(nextPhone !== undefined && { phone: nextPhone }),
                ...(nextEmail !== undefined && { email: nextEmail }),
                ...(nextDob !== undefined && { dob: nextDob }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(expoPushToken !== undefined && { expoPushToken }),
            },
            select: { id: true, name: true, phone: true, avatarUrl: true, email: true, dob: true, expoPushToken: true },
        });
        res.json({ user: { ...updated, dob: formatDob(updated.dob) } });
    }
    catch (err) {
        if (err.code === "P2002") {
            res.status(409).json({ error: "PhoneInUse", message: "That phone number is already on another account." });
            return;
        }
        throw err;
    }
});
// ─── POST /api/users/avatar ───────────────────────────────────────────────────
/**
 * Upload a profile picture.
 */
router.post("/avatar", auth_1.requireAuth, upload.single("avatar"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
    }
    // Public URL of the uploaded file (PUBLIC_API_URL e.g. https://api.zonofit.com)
    const baseUrl = (process.env.PUBLIC_API_URL ?? `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;
    const updated = await prisma_1.default.user.update({
        where: { id: req.dbUserId },
        data: { avatarUrl },
        select: { id: true, name: true, phone: true, avatarUrl: true, email: true },
    });
    res.json({ user: updated, avatarUrl });
});
// ─── GET /api/users/notifications ─────────────────────────────────────────────
router.get("/notifications", auth_1.requireAuth, async (req, res) => {
    try {
        const notifications = await prisma_1.default.notification.findMany({
            where: {
                userId: req.dbUserId
            },
            orderBy: { createdAt: "desc" }
        });
        res.json({ success: true, notifications });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/users/notifications/read ───────────────────────────────────────
router.post("/notifications/read", auth_1.requireAuth, async (req, res) => {
    try {
        await prisma_1.default.notification.updateMany({
            where: { userId: req.dbUserId, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map