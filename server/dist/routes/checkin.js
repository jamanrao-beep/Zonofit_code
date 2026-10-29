"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const notifications_1 = require("../services/notifications");
const router = (0, express_1.Router)();
function codesMatch(actual, expected) {
    const actualBuf = Buffer.from(actual);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length)
        return false;
    return crypto_1.default.timingSafeEqual(actualBuf, expectedBuf);
}
function startOfTodayInKolkata() {
    const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
    return new Date(`${date}T00:00:00+05:30`);
}
// ─── POST /api/checkin/verify ─────────────────────────────────────────────────
/**
 * Members cannot complete their own visit. The pass is shown to gym staff,
 * who confirm it on POST /api/checkin/staff. Client GPS is not accepted.
 */
router.post("/verify", auth_1.requireAuth, async (_req, res) => {
    res.status(403).json({
        error: "StaffConfirmationRequired",
        message: "Show your pass to the front desk. A gym partner confirms the visit.",
    });
});
// ─── GET /api/checkin/pass/:bookingId ─────────────────────────────────────────
/**
 * Returns the QR pass data for a specific booking.
 * The mobile app uses this to render the QR code.
 * Only the booking owner can access their pass.
 */
router.get("/pass/:bookingId", auth_1.requireAuth, async (req, res) => {
    const bookingId = req.params.bookingId;
    const booking = await prisma_1.default.booking.findFirst({
        where: {
            id: bookingId,
            userId: req.dbUserId,
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
        include: {
            gym: { select: { name: true, address: true } },
            checkIn: { select: { status: true, verifiedAt: true, expiresAt: true } },
        },
    });
    if (!booking) {
        res.status(404).json({ error: "BookingNotFound", message: "Active booking not found." });
        return;
    }
    res.json({
        bookingId: booking.id,
        passCode: booking.passCode,
        gym: booking.gym,
        visitDate: booking.visitDate,
        timeSlot: booking.timeSlot,
        status: booking.status,
        checkIn: booking.checkIn,
    });
});
// ─── POST /api/checkin/staff ──────────────────────────────────────────────────
/**
 * Gym staff confirm a member's pass code at the desk.
 * The member does not mark their own visit from this route.
 */
router.post("/staff", auth_1.requireAuth, [(0, express_validator_1.body)("passCode").isString().notEmpty().withMessage("Pass code required.")], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { passCode } = req.body;
    const ownedGyms = await prisma_1.default.gym.findMany({
        where: { ownerId: req.dbUserId, isActive: true },
        select: { id: true },
    });
    if (ownedGyms.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "Only a gym partner can confirm a visit." });
        return;
    }
    try {
        const result = await prisma_1.default.$transaction(async (tx) => {
            const booking = await tx.booking.findFirst({
                where: {
                    passCode,
                    gymId: { in: ownedGyms.map((gym) => gym.id) },
                    status: "CONFIRMED",
                },
                include: {
                    checkIn: true,
                    gym: { select: { name: true } },
                    user: { select: { id: true, name: true, referredByUserId: true, totalWorkouts: true } },
                },
            });
            if (!booking)
                throw (0, errorHandler_1.createError)("No confirmed visit matches that pass.", 404, "BookingNotFound");
            if (!booking.checkIn)
                throw (0, errorHandler_1.createError)("Check-in record not found.", 404, "CheckInNotFound");
            if (booking.checkIn.status === "VERIFIED") {
                throw (0, errorHandler_1.createError)("This visit has already been checked in.", 409, "AlreadyCheckedIn");
            }
            if (new Date() > booking.checkIn.expiresAt) {
                await tx.checkIn.update({ where: { id: booking.checkIn.id }, data: { status: "EXPIRED" } });
                throw (0, errorHandler_1.createError)("Check-in code has expired.", 410, "CheckInExpired");
            }
            if (!codesMatch(passCode, booking.checkIn.verificationCode)) {
                throw (0, errorHandler_1.createError)("Invalid verification code.", 400, "InvalidCode");
            }
            const alreadyCheckedInToday = await tx.checkIn.count({
                where: {
                    status: "VERIFIED",
                    verifiedAt: { gte: startOfTodayInKolkata() },
                    booking: { userId: booking.userId },
                },
            });
            const updatedCheckIn = await tx.checkIn.update({
                where: { id: booking.checkIn.id },
                data: {
                    status: "VERIFIED",
                    verifiedAt: new Date(),
                    verifiedByStaff: req.dbUserId,
                },
            });
            await tx.booking.update({ where: { id: booking.id }, data: { status: "CHECKED_IN" } });
            await tx.user.update({
                where: { id: booking.userId },
                data: {
                    totalWorkouts: { increment: 1 },
                    trainingHours: { increment: 1 },
                    ...(alreadyCheckedInToday === 0 ? { streak: { increment: 1 } } : {}),
                },
            });
            await tx.membership.updateMany({
                where: { userId: booking.userId, status: "ACTIVE" },
                data: { completedVisits: { increment: 1 } },
            });
            let referrerIdToNotify = null;
            if (booking.user?.referredByUserId && booking.user.totalWorkouts === 0) {
                referrerIdToNotify = booking.user.referredByUserId;
                const referrerWallet = await tx.creditWallet.findUnique({ where: { userId: referrerIdToNotify } });
                if (referrerWallet) {
                    await tx.creditWallet.update({
                        where: { id: referrerWallet.id },
                        data: { balance: { increment: 5 } },
                    });
                    await tx.creditTransaction.create({
                        data: {
                            walletId: referrerWallet.id,
                            userId: referrerIdToNotify,
                            type: "BONUS",
                            amount: 5,
                            balanceAfter: referrerWallet.balance + 5,
                            description: `Referral reward: ${booking.user?.name || "Friend"} completed their first gym visit.`,
                        },
                    });
                }
            }
            return { verifiedAt: updatedCheckIn.verifiedAt, gymName: booking.gym.name, memberId: booking.userId, referrerIdToNotify };
        });
        (0, notifications_1.sendPushNotification)(result.memberId, "Check-in Verified", `You're all checked in at ${result.gymName}. Have a great workout.`).catch(() => { });
        if (result.referrerIdToNotify) {
            (0, notifications_1.sendPushNotification)(result.referrerIdToNotify, "Referral Bonus", "You earned 5 credits. Your referred friend just completed their first workout.").catch(() => { });
        }
        res.json({
            success: true,
            message: `Checked in at ${result.gymName}.`,
            verifiedAt: result.verifiedAt,
        });
    }
    catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.code || "CheckInFailed", message: err.message || "Check-in failed." });
    }
});
exports.default = router;
//# sourceMappingURL=checkin.js.map