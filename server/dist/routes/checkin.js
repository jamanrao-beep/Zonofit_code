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
const bookingTime_1 = require("../lib/bookingTime");
async function gymIdsForStaff(userId, systemRole) {
    const owned = await prisma_1.default.gym.findMany({
        where: { ownerId: userId, isActive: true },
        select: { id: true },
    });
    if (owned.length > 0)
        return owned.map((gym) => gym.id);
    if (systemRole === "ADMIN") {
        const gyms = await prisma_1.default.gym.findMany({
            where: { isActive: true },
            select: { id: true },
        });
        return gyms.map((gym) => gym.id);
    }
    return [];
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
    const gymIds = await gymIdsForStaff(req.dbUserId, req.systemRole);
    if (gymIds.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "Only a gym partner can confirm a visit." });
        return;
    }
    const rawCode = passCode.trim();
    const desk = (0, bookingTime_1.typedDeskCode)(rawCode);
    try {
        const result = await prisma_1.default.$transaction(async (tx) => {
            const include = {
                checkIn: true,
                gym: { select: { name: true } },
                user: { select: { id: true, name: true, referredByUserId: true, totalWorkouts: true } },
            };
            let booking = await tx.booking.findFirst({
                where: {
                    gymId: { in: gymIds },
                    status: "CONFIRMED",
                    OR: [{ id: rawCode }, { passCode: rawCode }],
                },
                include,
            });
            if (!booking && desk) {
                const candidates = await tx.booking.findMany({
                    where: { gymId: { in: gymIds }, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
                    include,
                    orderBy: { createdAt: "desc" },
                });
                const matches = candidates.filter((row) => (0, bookingTime_1.deskCodeFromBookingId)(row.id) === desk);
                if (matches.length > 1 && matches.every((row) => row.status === "CONFIRMED")) {
                    throw (0, errorHandler_1.createError)("More than one visit uses that code. Confirm the member from Today's Visitors.", 409, "AmbiguousCode");
                }
                booking = matches.find((row) => row.status === "CONFIRMED") ?? matches[0] ?? null;
            }
            if (!booking)
                throw (0, errorHandler_1.createError)("No confirmed visit matches that code. Use the desk code on the member pass, such as ZF-4F2A9C.", 404, "BookingNotFound");
            let checkIn = booking.checkIn;
            if (!checkIn) {
                const end = new Date(booking.visitDate);
                end.setHours(23, 59, 59, 999);
                checkIn = await tx.checkIn.create({
                    data: {
                        bookingId: booking.id,
                        method: "STAFF_APPROVAL",
                        verificationCode: booking.passCode || booking.id,
                        status: "PENDING",
                        expiresAt: end,
                    },
                });
            }
            if (checkIn.status === "VERIFIED" || booking.status === "CHECKED_IN") {
                throw (0, errorHandler_1.createError)("This visit has already been checked in.", 409, "AlreadyCheckedIn");
            }
            if (booking.status === "COMPLETED") {
                throw (0, errorHandler_1.createError)("This booking has already ended and was completed.", 400, "AlreadyCompleted");
            }
            // Validate if this booking can be checked in right now (date, time slot start, expiration)
            const eligibility = (0, bookingTime_1.checkBookingCheckInEligibility)(booking.visitDate, booking.timeSlot);
            if (!eligibility.eligible) {
                if (eligibility.isExpired) {
                    if (checkIn.status === "PENDING") {
                        await tx.checkIn.update({ where: { id: checkIn.id }, data: { status: "EXPIRED" } });
                    }
                    await tx.booking.update({ where: { id: booking.id }, data: { status: "NO_SHOW" } });
                    throw (0, errorHandler_1.createError)(eligibility.message || "This booking slot has expired.", 410, eligibility.code || "BookingExpired");
                }
                throw (0, errorHandler_1.createError)(eligibility.message || "This booking is not eligible for check-in right now.", 400, eligibility.code || "CheckInNotAllowed");
            }
            const typedIsPass = rawCode.toLowerCase() === booking.passCode.toLowerCase();
            const typedIsId = rawCode === booking.id;
            const typedIsDesk = desk !== null && desk === (0, bookingTime_1.deskCodeFromBookingId)(booking.id);
            const typedIsStored = codesMatch(rawCode, checkIn.verificationCode);
            if (!typedIsPass && !typedIsId && !typedIsDesk && !typedIsStored) {
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
                where: { id: checkIn.id },
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
            return {
                bookingId: booking.id,
                deskCode: (0, bookingTime_1.deskCodeFromBookingId)(booking.id),
                memberName: booking.user?.name || "Member",
                verifiedAt: updatedCheckIn.verifiedAt,
                gymName: booking.gym.name,
                memberId: booking.userId,
                referrerIdToNotify,
            };
        });
        (0, notifications_1.sendPushNotification)(result.memberId, "Check-in Verified", `You're all checked in at ${result.gymName}. Have a great workout.`).catch(() => { });
        if (result.referrerIdToNotify) {
            (0, notifications_1.sendPushNotification)(result.referrerIdToNotify, "Referral Bonus", "You earned 5 credits. Your referred friend just completed their first workout.").catch(() => { });
        }
        res.json({
            success: true,
            bookingId: result.bookingId,
            deskCode: result.deskCode,
            memberName: result.memberName,
            gymName: result.gymName,
            message: `Checked in ${result.memberName} at ${result.gymName}.`,
            verifiedAt: result.verifiedAt,
        });
    }
    catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.code || "CheckInFailed", message: err.message || "Check-in failed." });
    }
});
// ─── POST /api/checkin/undo ───────────────────────────────────────────────────
/**
 * Gym staff undo / remove an accidental check-in.
 * Reverts the booking back to CONFIRMED and the checkIn back to PENDING.
 * Also decrements user workouts, training hours, streak, and membership completed visits.
 */
router.post("/undo", auth_1.requireAuth, [(0, express_validator_1.body)("bookingId").isString().notEmpty().withMessage("Booking ID required.")], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { bookingId } = req.body;
    const gymIds = await gymIdsForStaff(req.dbUserId, req.systemRole);
    if (gymIds.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "Only a gym partner can undo a visit check-in." });
        return;
    }
    const rawCode = bookingId.trim();
    const desk = (0, bookingTime_1.typedDeskCode)(rawCode);
    try {
        const result = await prisma_1.default.$transaction(async (tx) => {
            const include = {
                checkIn: true,
                gym: { select: { name: true } },
                user: { select: { id: true, name: true, totalWorkouts: true, trainingHours: true, streak: true } },
            };
            let booking = await tx.booking.findFirst({
                where: {
                    gymId: { in: gymIds },
                    OR: [{ id: rawCode }, { passCode: rawCode }],
                },
                include,
            });
            if (!booking && desk) {
                const candidates = await tx.booking.findMany({
                    where: {
                        gymId: { in: gymIds },
                        status: { in: ["CHECKED_IN", "COMPLETED"] },
                    },
                    include,
                    orderBy: { updatedAt: "desc" },
                });
                booking = candidates.find((row) => (0, bookingTime_1.deskCodeFromBookingId)(row.id) === desk) ?? null;
            }
            if (!booking) {
                throw (0, errorHandler_1.createError)("No check-in record matches that code or booking.", 404, "BookingNotFound");
            }
            if (booking.status !== "CHECKED_IN" && booking.status !== "COMPLETED") {
                throw (0, errorHandler_1.createError)("This booking is not currently checked in.", 400, "NotCheckedIn");
            }
            // Revert check-in
            if (booking.checkIn) {
                await tx.checkIn.update({
                    where: { id: booking.checkIn.id },
                    data: {
                        status: "PENDING",
                        verifiedAt: null,
                        verifiedByStaff: null,
                    },
                });
            }
            // Revert booking status back to CONFIRMED
            await tx.booking.update({
                where: { id: booking.id },
                data: { status: "CONFIRMED" },
            });
            // Revert user stats
            if (booking.user) {
                const newWorkouts = Math.max(0, (booking.user.totalWorkouts || 1) - 1);
                const newHours = Math.max(0, (booking.user.trainingHours || 1) - 1);
                const newStreak = Math.max(0, (booking.user.streak || 1) - 1);
                await tx.user.update({
                    where: { id: booking.user.id },
                    data: {
                        totalWorkouts: newWorkouts,
                        trainingHours: newHours,
                        streak: newStreak,
                    },
                });
                const activeMemberships = await tx.membership.findMany({
                    where: { userId: booking.user.id, status: "ACTIVE" },
                });
                for (const m of activeMemberships) {
                    await tx.membership.update({
                        where: { id: m.id },
                        data: { completedVisits: Math.max(0, (m.completedVisits || 0) - 1) },
                    });
                }
            }
            return {
                bookingId: booking.id,
                deskCode: (0, bookingTime_1.deskCodeFromBookingId)(booking.id),
                memberName: booking.user?.name || "Member",
                gymName: booking.gym?.name || "Gym",
            };
        });
        res.json({
            success: true,
            bookingId: result.bookingId,
            deskCode: result.deskCode,
            memberName: result.memberName,
            message: `Check-in for ${result.memberName} has been undone. Pass is back to booked.`,
        });
    }
    catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.code || "UndoFailed", message: err.message || "Could not undo check-in." });
    }
});
exports.default = router;
//# sourceMappingURL=checkin.js.map