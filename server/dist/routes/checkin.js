"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const notifications_1 = require("../services/notifications");
const router = (0, express_1.Router)();
// ─── POST /api/checkin/verify ─────────────────────────────────────────────────
/**
 * Verify a QR check-in.
 *
 * TRUST BOUNDARY — the authoritative "this visit is valid" decision.
 * The app can display a QR code, but this endpoint makes the call.
 *
 * Called when:
 *   - Gym staff scans user's QR pass (passCode from booking)
 *   - OR user self-reports check-in via OTP (future)
 *
 * Success → booking.status = CHECKED_IN, checkIn.status = VERIFIED
 * Failure → checkIn.attemptCount incremented, booking stays CONFIRMED
 *
 * Security rules:
 *   - Code must match the stored verificationCode
 *   - Must not be expired
 *   - Must not already be verified (prevents duplicate check-ins)
 *   - Max 5 attempts before locking
 */
router.post("/verify", auth_1.requireAuth, [
    (0, express_validator_1.body)("bookingId").isUUID().withMessage("Valid booking ID required."),
    (0, express_validator_1.body)("verificationCode").isString().notEmpty().withMessage("Verification code required."),
    (0, express_validator_1.body)("userLat").isFloat().withMessage("User latitude required."),
    (0, express_validator_1.body)("userLng").isFloat().withMessage("User longitude required."),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { bookingId, verificationCode, userLat, userLng } = req.body;
    const result = await prisma_1.default.$transaction(async (tx) => {
        // Load booking + check-in in one query
        const booking = await tx.booking.findFirst({
            where: {
                id: bookingId,
                userId: req.dbUserId, // Prevent verifying someone else's booking
            },
            include: {
                checkIn: true,
                gym: { select: { name: true, lat: true, lng: true } },
                user: { select: { id: true, name: true, referredByUserId: true, totalWorkouts: true } },
            },
        });
        if (!booking)
            throw (0, errorHandler_1.createError)("Booking not found.", 404, "BookingNotFound");
        if (!booking.checkIn)
            throw (0, errorHandler_1.createError)("Check-in record not found.", 404, "CheckInNotFound");
        const checkIn = booking.checkIn;
        // Already verified?
        if (checkIn.status === "VERIFIED") {
            throw (0, errorHandler_1.createError)("This visit has already been checked in.", 409, "AlreadyCheckedIn");
        }
        // Expired?
        if (new Date() > checkIn.expiresAt) {
            await tx.checkIn.update({
                where: { id: checkIn.id },
                data: { status: "EXPIRED" },
            });
            throw (0, errorHandler_1.createError)("Check-in code has expired.", 410, "CheckInExpired");
        }
        // Too many attempts?
        if (checkIn.attemptCount >= 5) {
            throw (0, errorHandler_1.createError)("Too many failed attempts. Please contact gym staff.", 429, "TooManyAttempts");
        }
        // Increment attempt counter regardless of outcome
        await tx.checkIn.update({
            where: { id: checkIn.id },
            data: { attemptCount: { increment: 1 } },
        });
        // Verify code — in prod this would be a hash comparison
        // TODO: replace with crypto.timingSafeEqual(hash(verificationCode), storedHash)
        if (verificationCode !== checkIn.verificationCode) {
            throw (0, errorHandler_1.createError)("Invalid verification code.", 400, "InvalidCode");
        }
        // Location Check: Must be within 1km
        const R = 6371; // Radius of the earth in km
        const dLat = (booking.gym.lat - userLat) * Math.PI / 180;
        const dLon = (booking.gym.lng - userLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(booking.gym.lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const distanceInKm = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;
        if (distanceInKm > 1) {
            throw (0, errorHandler_1.createError)(`You must be within 1km of ${booking.gym.name} to check in. You are currently ${distanceInKm.toFixed(2)}km away.`, 403, "TooFarFromGym");
        }
        // ✅ Valid — mark as VERIFIED and update user journey stats
        const [updatedCheckIn] = await Promise.all([
            tx.checkIn.update({
                where: { id: checkIn.id },
                data: {
                    status: "VERIFIED",
                    verifiedAt: new Date(),
                },
            }),
            tx.booking.update({
                where: { id: booking.id },
                data: { status: "CHECKED_IN" },
            }),
            tx.user.update({
                where: { id: req.dbUserId },
                data: {
                    totalWorkouts: { increment: 1 },
                    streak: { increment: 1 },
                    trainingHours: { increment: 1 },
                },
            }),
            tx.membership.updateMany({
                where: { userId: req.dbUserId, status: "ACTIVE" },
                data: {
                    completedVisits: { increment: 1 },
                },
            }),
        ]);
        // Award 5 credits to referrer if this is their friend's first completed visit
        let referrerIdToNotify = null;
        if (booking.user?.referredByUserId && booking.user.totalWorkouts === 0) {
            referrerIdToNotify = booking.user.referredByUserId;
            const referrerWallet = await tx.creditWallet.findUnique({
                where: { userId: referrerIdToNotify },
            });
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
                        description: `Referral reward: ${booking.user?.name || "Friend"} completed their first gym visit!`,
                    },
                });
            }
        }
        return { checkIn: updatedCheckIn, gymName: booking.gym.name, referrerIdToNotify };
    });
    // Send push notification to user
    (0, notifications_1.sendPushNotification)(req.dbUserId, "Check-in Verified 🔥", `You're all checked in at ${result.gymName}. Have a great workout!`).catch(e => console.error(e));
    // Send push notification to referrer if applicable
    if (result.referrerIdToNotify) {
        (0, notifications_1.sendPushNotification)(result.referrerIdToNotify, "Referral Bonus! 🎁", "You earned 5 credits! Your referred friend just completed their first workout.").catch(e => console.error(e));
    }
    res.json({
        success: true,
        message: `Checked in at ${result.gymName}. Enjoy your workout! 🔥`,
        verifiedAt: result.checkIn.verifiedAt,
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
exports.default = router;
//# sourceMappingURL=checkin.js.map