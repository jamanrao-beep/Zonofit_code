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
/** Same code the member pass shows: ZF- plus the last 6 letters of the booking id. */
function deskCodeFromBookingId(id) {
    const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
    return tail.length === 6 ? `ZF-${tail}` : "";
}
function typedDeskCode(value) {
    const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const withPrefix = compact.match(/^ZF([A-Z0-9]{6})$/);
    if (withPrefix)
        return `ZF-${withPrefix[1]}`;
    if (/^[A-Z0-9]{6}$/.test(compact))
        return `ZF-${compact}`;
    return null;
}
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
    const desk = typedDeskCode(rawCode);
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
                const matches = candidates.filter((row) => deskCodeFromBookingId(row.id) === desk);
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
            const visitKey = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(new Date(booking.visitDate));
            const todayKey = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(new Date());
            if (checkIn.expiresAt && new Date() > checkIn.expiresAt && visitKey < todayKey) {
                await tx.checkIn.update({ where: { id: checkIn.id }, data: { status: "EXPIRED" } });
                throw (0, errorHandler_1.createError)("Check-in code has expired.", 410, "CheckInExpired");
            }
            const typedIsPass = rawCode.toLowerCase() === booking.passCode.toLowerCase();
            const typedIsId = rawCode === booking.id;
            const typedIsDesk = desk !== null && desk === deskCodeFromBookingId(booking.id);
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