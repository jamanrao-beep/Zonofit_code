"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const uuid_1 = require("uuid");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const notifications_1 = require("../services/notifications");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// ─── POST /api/bookings ───────────────────────────────────────────────────────
/**
 * Create a new gym visit booking.
 * This is a TRUST BOUNDARY — credits are deducted atomically in a DB transaction.
 * The client must never deduct credits locally.
 *
 * Flow:
 * 1. Validate request
 * 2. Check membership is active
 * 3. Check credit balance ≥ gym's creditCost
 * 4. Check slot availability for that date
 * 5. Atomically: deduct credits + create booking + create check-in pass + log transaction
 * 6. Return booking with passCode for QR display
 */
router.post("/", auth_1.requireAuth, [
    (0, express_validator_1.body)("gymId").isUUID().withMessage("Valid gym ID required."),
    (0, express_validator_1.body)("visitDate").isISO8601().withMessage("Valid visit date required (ISO 8601)."),
    (0, express_validator_1.body)("timeSlot").isString().notEmpty().withMessage("Time slot required."),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { gymId, visitDate, timeSlot, couponCode } = req.body;
    const visitDateObj = new Date(visitDate);
    const visitDateStart = new Date(visitDateObj);
    visitDateStart.setHours(0, 0, 0, 0);
    const visitDateEnd = new Date(visitDateObj);
    visitDateEnd.setHours(23, 59, 59, 999);
    const result = await prisma_1.default.$transaction(async (tx) => {
        // 1. Get gym and credit cost
        let gym = await tx.gym.findUnique({
            where: { id: gymId, isActive: true },
            select: { id: true, name: true, creditCost: true, totalSlots: true },
        });
        if (!gym) {
            gym = await tx.gym.findFirst({
                where: {
                    OR: [
                        { name: { contains: "Being" } },
                        { name: { contains: "Fit" } },
                        { isActive: true }
                    ]
                },
                select: { id: true, name: true, creditCost: true, totalSlots: true },
            });
        }
        if (!gym)
            throw (0, errorHandler_1.createError)("Gym not found or unavailable.", 404, "GymNotFound");
        // 2. Check membership is active
        const membership = await tx.membership.findUnique({
            where: { userId: req.dbUserId },
        });
        if (!membership || membership.status !== "ACTIVE") {
            throw (0, errorHandler_1.createError)("Active membership required to book a visit.", 403, "NoActiveMembership");
        }
        // 3. Apply coupon if provided
        let finalCreditCost = gym.creditCost;
        let appliedCouponId = null;
        if (couponCode) {
            const coupon = await tx.marketingCoupon.findUnique({
                where: { code: couponCode.toUpperCase() }
            });
            if (!coupon)
                throw (0, errorHandler_1.createError)("Invalid coupon code", 404, "InvalidCoupon");
            if (!coupon.isActive)
                throw (0, errorHandler_1.createError)("Coupon is no longer active", 400, "InvalidCoupon");
            if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date())
                throw (0, errorHandler_1.createError)("Coupon expired", 400, "InvalidCoupon");
            if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
                throw (0, errorHandler_1.createError)("Coupon usage limit reached", 400, "InvalidCoupon");
            if (coupon.discountType === "RUPEES")
                throw (0, errorHandler_1.createError)("This coupon can only be used for marketplace purchases", 400, "InvalidCoupon");
            if (coupon.discountType === "PERCENTAGE") {
                finalCreditCost = Math.max(0, Math.floor(finalCreditCost - (finalCreditCost * (coupon.discountValue / 100))));
            }
            else if (coupon.discountType === "CREDITS") {
                finalCreditCost = Math.max(0, finalCreditCost - coupon.discountValue);
            }
            appliedCouponId = coupon.id;
        }
        // 4. Check wallet balance or primary visits
        let isPrimaryVisit = false;
        if (membership.primaryGymId === gymId && membership.primaryGymVisits > 0) {
            isPrimaryVisit = true;
        }
        const wallet = await tx.creditWallet.findUnique({
            where: { userId: req.dbUserId },
        });
        if (!wallet)
            throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
        if (!isPrimaryVisit && wallet.balance < finalCreditCost) {
            throw (0, errorHandler_1.createError)(`Insufficient credits. Need ${finalCreditCost}, have ${wallet.balance}.`, 400, "InsufficientCredits");
        }
        // 4. Check for duplicate booking (same user, same gym, same date)
        const existingBooking = await tx.booking.findFirst({
            where: {
                userId: req.dbUserId,
                gymId,
                visitDate: { gte: visitDateStart, lte: visitDateEnd },
                status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
            },
        });
        if (existingBooking) {
            throw (0, errorHandler_1.createError)("You already have a booking at this gym for this date.", 409, "DuplicateBooking");
        }
        // 5. Check slot availability
        const bookedCount = await tx.booking.count({
            where: {
                gymId,
                visitDate: { gte: visitDateStart, lte: visitDateEnd },
                status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
            },
        });
        if (bookedCount >= gym.totalSlots) {
            throw (0, errorHandler_1.createError)("No available slots at this gym for the selected date.", 409, "NoSlotsAvailable");
        }
        // 7. Atomically deduct credits (or primary visits)
        let updatedWallet = wallet;
        if (isPrimaryVisit) {
            await tx.membership.update({
                where: { userId: req.dbUserId },
                data: { primaryGymVisits: { decrement: 1 } }
            });
        }
        else {
            updatedWallet = await tx.creditWallet.update({
                where: { userId: req.dbUserId },
                data: { balance: { decrement: finalCreditCost } },
            });
        }
        // 8. Create the booking
        const passCode = (0, uuid_1.v4)();
        const booking = await tx.booking.create({
            data: {
                userId: req.dbUserId,
                gymId,
                visitDate: visitDateObj,
                timeSlot,
                status: "CONFIRMED",
                creditsDeducted: isPrimaryVisit ? 0 : finalCreditCost,
                passCode,
            },
        });
        // 9. Mark coupon as used if applied
        if (appliedCouponId && !isPrimaryVisit) {
            await tx.marketingCoupon.update({
                where: { id: appliedCouponId },
                data: { usageCount: { increment: 1 } }
            });
        }
        // 8. Create the check-in record with QR verification code
        // In prod: hash the passCode before storing
        // The QR shown in the app encodes: bookingId + passCode + timestamp
        const checkInExpiresAt = new Date(visitDateEnd);
        checkInExpiresAt.setHours(23, 59, 59, 999); // Valid for the entire visit day
        await tx.checkIn.create({
            data: {
                bookingId: booking.id,
                method: "QR",
                verificationCode: passCode, // TODO: hash in production
                status: "PENDING",
                expiresAt: checkInExpiresAt,
            },
        });
        // 11. Log the credit transaction
        await tx.creditTransaction.create({
            data: {
                userId: req.dbUserId,
                walletId: wallet.id,
                type: "VISIT_SPEND",
                amount: isPrimaryVisit ? 0 : -finalCreditCost,
                balanceAfter: updatedWallet.balance,
                description: isPrimaryVisit
                    ? `Primary Gym Visit booked at ${gym.name} (Cost: 0 credits). Remaining: ${membership.primaryGymVisits - 1}`
                    : `Visit booked at ${gym.name} on ${visitDateObj.toDateString()}`,
                bookingId: booking.id,
            },
        });
        return { booking, updatedWallet, gymName: gym.name };
    });
    // Send push notification asynchronously
    (0, notifications_1.sendPushNotification)(req.dbUserId, "Booking Confirmed ✅", `Your workout at ${result.gymName} on ${visitDate} at ${timeSlot} is confirmed!`).catch(e => console.error(e));
    res.status(201).json({
        booking: {
            id: result.booking.id,
            gymId: result.booking.gymId,
            gymName: result.gymName,
            visitDate: result.booking.visitDate,
            timeSlot: result.booking.timeSlot,
            status: result.booking.status,
            creditsDeducted: result.booking.creditsDeducted,
            passCode: result.booking.passCode, // Used to generate QR in the app
        },
        newCreditBalance: result.updatedWallet.balance,
        message: `Visit booked at ${result.gymName}. Show your QR pass at the gym.`,
    });
});
// ─── GET /api/bookings ────────────────────────────────────────────────────────
/**
 * List the authenticated user's bookings.
 * Supports filtering by status and date range.
 */
router.get("/", auth_1.requireAuth, async (req, res) => {
    const { status, upcoming } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where = {
        userId: req.dbUserId,
        ...(status && { status }),
        ...(upcoming === "true" && { visitDate: { gte: new Date() } }),
    };
    const [bookings, total] = await prisma_1.default.$transaction([
        prisma_1.default.booking.findMany({
            where,
            orderBy: { visitDate: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                gym: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        imageUrls: true,
                    },
                },
                checkIn: {
                    select: { status: true, verifiedAt: true, method: true },
                },
            },
        }),
        prisma_1.default.booking.count({ where }),
    ]);
    res.json({
        bookings,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
});
// ─── GET /api/bookings/today ──────────────────────────────────────────────────
/**
 * Returns today's active booking (if any) for the Home screen "Today" section.
 */
router.get("/today", auth_1.requireAuth, async (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const booking = await prisma_1.default.booking.findFirst({
        where: {
            userId: req.dbUserId,
            visitDate: { gte: todayStart, lte: todayEnd },
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
        include: {
            gym: { select: { id: true, name: true, address: true, imageUrls: true } },
            checkIn: { select: { status: true, verifiedAt: true } },
        },
    });
    // Append passCode from booking itself for QR display
    res.json({ booking: booking ? { ...booking, passCode: booking.passCode } : null });
});
// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
/**
 * Cancel a booking and refund credits.
 * Only allowed if visit is > 2 hours away (to prevent abuse).
 */
router.delete("/:id", auth_1.requireAuth, async (req, res) => {
    const bookingId = req.params.id;
    const result = await prisma_1.default.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({
            where: { id: bookingId, userId: req.dbUserId },
            include: { gym: { select: { name: true } } },
        });
        if (!booking)
            throw (0, errorHandler_1.createError)("Booking not found.", 404, "BookingNotFound");
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
            throw (0, errorHandler_1.createError)("Only pending or confirmed bookings can be cancelled.", 400, "CancellationNotAllowed");
        }
        // Calculate the exact workout time
        let workoutTime = new Date(booking.visitDate);
        try {
            const slotPart = (booking.timeSlot || "").split('-')[0].trim();
            const timeParts = slotPart.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (timeParts) {
                let h = parseInt(timeParts[1], 10);
                const m = parseInt(timeParts[2], 10);
                const meridian = timeParts[3]?.toUpperCase();
                if (meridian === "PM" && h < 12)
                    h += 12;
                if (meridian === "AM" && h === 12)
                    h = 0;
                workoutTime.setHours(h, m, 0, 0);
            }
        }
        catch { }
        const now = new Date();
        const timeUntilWorkoutMs = workoutTime.getTime() - now.getTime();
        const timeUntilWorkoutHours = timeUntilWorkoutMs / (1000 * 60 * 60);
        const timeSinceBookingMs = now.getTime() - booking.createdAt.getTime();
        await tx.booking.update({
            where: { id: booking.id },
            data: { status: "CANCELLED" },
        });
        let refundedCredits = 0;
        let newBalance = 0;
        const gymName = booking.gym.name;
        const wallet = await tx.creditWallet.findUnique({
            where: { userId: req.dbUserId },
        });
        const currentBalance = wallet?.balance || 0;
        if (booking.creditsDeducted > 0) {
            // Credit booking: refund = booked - 2 credits fee (flat 2 fee)
            refundedCredits = Math.max(0, booking.creditsDeducted - 2);
            if (refundedCredits > 0) {
                const updatedWallet = await tx.creditWallet.update({
                    where: { userId: req.dbUserId },
                    data: { balance: { increment: refundedCredits } },
                });
                newBalance = updatedWallet.balance;
                await tx.creditTransaction.create({
                    data: {
                        userId: req.dbUserId,
                        walletId: updatedWallet.id,
                        type: "REFUND",
                        amount: refundedCredits,
                        balanceAfter: updatedWallet.balance,
                        description: `Cancellation at ${gymName} — ${refundedCredits} credits refunded (flat 2 credits fee deducted).`,
                        bookingId: booking.id,
                    },
                });
            }
            else {
                newBalance = currentBalance;
            }
        }
        else {
            // Mandatory visit (0 credits booked): flat 2 credits fee charged from wallet
            if (currentBalance < 2) {
                throw (0, errorHandler_1.createError)(`Cannot cancel booking: A flat 2 Credits fee is required, but your wallet balance is only ${currentBalance} Credits.`, 400, "InsufficientCredits");
            }
            const updatedWallet = await tx.creditWallet.update({
                where: { userId: req.dbUserId },
                data: { balance: { decrement: 2 } },
            });
            newBalance = updatedWallet.balance;
            await tx.creditTransaction.create({
                data: {
                    userId: req.dbUserId,
                    walletId: updatedWallet.id,
                    type: "VISIT_SPEND",
                    amount: -2,
                    balanceAfter: updatedWallet.balance,
                    description: `Cancellation fee (flat 2 credits) for mandatory visit at ${gymName}.`,
                    bookingId: booking.id,
                },
            });
            // Restore 1 primary gym mandatory visit on membership
            await tx.membership.updateMany({
                where: { userId: req.dbUserId },
                data: { primaryGymVisits: { increment: 1 } },
            });
        }
        return { refundedCredits, newBalance, gymName };
    });
    (0, notifications_1.sendPushNotification)(req.dbUserId, "Booking Cancelled ℹ️", `Your visit at ${result.gymName} was cancelled with a 2 Credits fee applied.`).catch(e => console.error(e));
    res.json({
        message: "Booking cancelled successfully with a 2 Credits fee applied.",
        refundedCredits: result.refundedCredits,
        newCreditBalance: result.newBalance,
    });
});
exports.default = router;
//# sourceMappingURL=bookings.js.map