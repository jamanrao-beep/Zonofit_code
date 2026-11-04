"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const uuid_1 = require("uuid");
const prisma_1 = __importDefault(require("../lib/prisma"));
const couponMath_1 = require("../lib/couponMath");
const gymCommercial_1 = require("../lib/gymCommercial");
const wallet_1 = require("../lib/wallet");
const auth_1 = require("../middleware/auth");
const notifications_1 = require("../services/notifications");
const bookingTime_1 = require("../lib/bookingTime");
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
    (0, express_validator_1.body)("gymId").isString().notEmpty().withMessage("Valid gym ID required."),
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
        // 1. Get gym and credit cost (supports UUID, customGymId, name, or fallback)
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const gym = (UUID_RE.test(gymId)
            ? await tx.gym.findFirst({
                where: { id: gymId, isActive: true },
                select: {
                    id: true,
                    name: true,
                    creditCost: true,
                    totalSlots: true,
                    cappingMode: true,
                    maxDailyVisits: true,
                    maxSlotVisits: true,
                    slotsJson: true,
                },
            })
            : null) || (await tx.gym.findFirst({
            where: {
                isActive: true,
                OR: [{ customGymId: gymId }, { name: gymId }]
            },
            select: {
                id: true,
                name: true,
                creditCost: true,
                totalSlots: true,
                cappingMode: true,
                maxDailyVisits: true,
                maxSlotVisits: true,
                slotsJson: true,
            },
        })) || (await tx.gym.findFirst({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                creditCost: true,
                totalSlots: true,
                cappingMode: true,
                maxDailyVisits: true,
                maxSlotVisits: true,
                slotsJson: true,
            },
        }));
        if (!gym)
            throw (0, errorHandler_1.createError)("Gym not found or unavailable.", 404, "GymNotFound");
        // 2. Check membership is active (auto-provision in test mode if unconfigured)
        let membership = await tx.membership.findUnique({
            where: { userId: req.dbUserId },
        });
        if (!membership || membership.status !== "ACTIVE") {
            membership = await tx.membership.upsert({
                where: { userId: req.dbUserId },
                create: {
                    userId: req.dbUserId,
                    status: "ACTIVE",
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    primaryGymId: gym.id,
                    primaryGymVisits: 10,
                    cycleNumber: 1,
                    mandatoryVisits: 10,
                    completedVisits: 0,
                },
                update: {
                    status: "ACTIVE",
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    primaryGymVisits: 10,
                    ...(membership?.primaryGymId ? {} : { primaryGymId: gym.id }),
                },
            });
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
            const discountCredits = (0, couponMath_1.bookingDiscountCredits)(coupon.discountType, coupon.discountValue, finalCreditCost);
            if (discountCredits === null) {
                throw (0, errorHandler_1.createError)("This coupon cannot be used for a gym visit.", 400, "InvalidCoupon");
            }
            if (discountCredits <= 0) {
                throw (0, errorHandler_1.createError)("This coupon does not reduce the visit cost.", 400, "InvalidCoupon");
            }
            finalCreditCost = Math.max(0, finalCreditCost - discountCredits);
            appliedCouponId = coupon.id;
        }
        // 4. Check wallet balance or primary visits
        let isPrimaryVisit = false;
        if (membership.primaryGymId === gym.id && membership.primaryGymVisits > 0) {
            isPrimaryVisit = true;
        }
        let wallet = await tx.creditWallet.findUnique({
            where: { userId: req.dbUserId },
        });
        if (!wallet) {
            wallet = await tx.creditWallet.create({
                data: {
                    userId: req.dbUserId,
                    balance: 420,
                    nonConvertibleCashBalanceInPaise: 0,
                    convertibleCashBalanceInPaise: 0,
                },
            });
        }
        if (!isPrimaryVisit && wallet.balance < finalCreditCost) {
            wallet = await tx.creditWallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: 100 } },
            });
        }
        // 4. Check for duplicate booking (same user, same gym, same date)
        const existingBooking = await tx.booking.findFirst({
            where: {
                userId: req.dbUserId,
                gymId: gym.id,
                visitDate: { gte: visitDateStart, lte: visitDateEnd },
                status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
            },
        });
        if (existingBooking) {
            throw (0, errorHandler_1.createError)("You already have a booking at this gym for this date.", 409, "DuplicateBooking");
        }
        // 5. One cap is active. Daily total and per-slot never apply together.
        if (gym.cappingMode === "PER_SLOT") {
            if (!timeSlot || typeof timeSlot !== "string" || !timeSlot.trim()) {
                throw (0, errorHandler_1.createError)("Choose a time slot.", 400, "SlotRequired");
            }
            const savedSlots = (0, gymCommercial_1.readStoredSlots)(gym.slotsJson);
            const namedSlot = savedSlots.find((slot) => (0, gymCommercial_1.bookingMatchesSlot)(timeSlot, slot));
            if (namedSlot && !namedSlot.isEnabled) {
                throw (0, errorHandler_1.createError)("That time slot is closed.", 409, "SlotClosed");
            }
            const slotCap = namedSlot?.capacity && namedSlot.capacity > 0
                ? namedSlot.capacity
                : (gym.maxSlotVisits ?? 5);
            const daySlotBookings = await tx.booking.findMany({
                where: {
                    gymId: gym.id,
                    visitDate: { gte: visitDateStart, lte: visitDateEnd },
                    status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
                },
                select: { timeSlot: true },
            });
            const slotBooked = daySlotBookings.filter((booking) => (namedSlot
                ? (0, gymCommercial_1.bookingMatchesSlot)(booking.timeSlot, namedSlot)
                : (0, gymCommercial_1.slotKey)(booking.timeSlot) === (0, gymCommercial_1.slotKey)(timeSlot))).length;
            if (slotBooked >= slotCap) {
                throw (0, errorHandler_1.createError)("That time slot is full.", 409, "NoSlotsAvailable");
            }
        }
        else {
            const dayCap = gym.maxDailyVisits ?? gym.totalSlots;
            const bookedCount = await tx.booking.count({
                where: {
                    gymId: gym.id,
                    visitDate: { gte: visitDateStart, lte: visitDateEnd },
                    status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
                },
            });
            if (bookedCount >= dayCap) {
                throw (0, errorHandler_1.createError)("This gym has reached its ZonoFit visits for the day.", 409, "NoSlotsAvailable");
            }
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
            updatedWallet = await (0, wallet_1.decrementCredits)(tx, req.dbUserId, finalCreditCost);
        }
        // 8. Create the booking
        const passCode = (0, uuid_1.v4)();
        const booking = await tx.booking.create({
            data: {
                userId: req.dbUserId,
                gymId: gym.id,
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
    (0, notifications_1.sendPushNotification)(req.dbUserId, "Booking confirmed", `Your workout at ${result.gymName} on ${visitDate} at ${timeSlot} is confirmed!`).catch(e => console.error(e));
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
// ─── GET /api/bookings ────────────────────────────────────────────────────────
/**
 * List the authenticated user's bookings.
 * Supports filtering by status and date range.
 */
router.get("/", auth_1.requireAuth, async (req, res) => {
    const { status, upcoming } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    // Auto-reconcile past bookings: verified check-ins complete, unverified ones become NO_SHOW / EXPIRED
    try {
        const activeCandidateBookings = await prisma_1.default.booking.findMany({
            where: {
                userId: req.dbUserId,
                status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
            },
            select: { id: true, visitDate: true, timeSlot: true, status: true },
        });
        const passedBookings = activeCandidateBookings.filter((b) => (0, bookingTime_1.isBookingSlotPast)(b.visitDate, b.timeSlot));
        const checkedInPassedIds = passedBookings.filter((b) => b.status === "CHECKED_IN").map((b) => b.id);
        const unverifiedPassedIds = passedBookings.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED").map((b) => b.id);
        if (checkedInPassedIds.length > 0) {
            await prisma_1.default.booking.updateMany({
                where: { id: { in: checkedInPassedIds } },
                data: { status: "COMPLETED" },
            });
        }
        if (unverifiedPassedIds.length > 0) {
            await prisma_1.default.booking.updateMany({
                where: { id: { in: unverifiedPassedIds } },
                data: { status: "NO_SHOW" },
            });
            await prisma_1.default.checkIn.updateMany({
                where: { bookingId: { in: unverifiedPassedIds }, status: "PENDING" },
                data: { status: "EXPIRED" },
            });
        }
    }
    catch {
        // Non-blocking auto-reconciliation
    }
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
    // Auto-complete passed bookings for today
    try {
        const todayActive = await prisma_1.default.booking.findMany({
            where: {
                userId: req.dbUserId,
                visitDate: { gte: todayStart, lte: todayEnd },
                status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
            },
            select: { id: true, visitDate: true, timeSlot: true, status: true },
        });
        const passedToday = todayActive.filter((b) => (0, bookingTime_1.isBookingSlotPast)(b.visitDate, b.timeSlot));
        const checkedInPassedIds = passedToday.filter((b) => b.status === "CHECKED_IN").map((b) => b.id);
        const unverifiedPassedIds = passedToday.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED").map((b) => b.id);
        if (checkedInPassedIds.length > 0) {
            await prisma_1.default.booking.updateMany({
                where: { id: { in: checkedInPassedIds } },
                data: { status: "COMPLETED" },
            });
        }
        if (unverifiedPassedIds.length > 0) {
            await prisma_1.default.booking.updateMany({
                where: { id: { in: unverifiedPassedIds } },
                data: { status: "NO_SHOW" },
            });
            await prisma_1.default.checkIn.updateMany({
                where: { bookingId: { in: unverifiedPassedIds }, status: "PENDING" },
                data: { status: "EXPIRED" },
            });
        }
    }
    catch {
        // Non-blocking auto-reconciliation
    }
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
const cancelBookingHandler = async (req, res) => {
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
        if ((0, couponMath_1.isCancellationTooLate)(workoutTime, now)) {
            throw (0, errorHandler_1.createError)("Bookings can only be cancelled more than 2 hours before the visit.", 400, "CancellationTooLate");
        }
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
            const updatedWallet = await (0, wallet_1.decrementCredits)(tx, req.dbUserId, 2);
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
    }, { maxWait: 4000, timeout: 8000 });
    (0, notifications_1.sendPushNotification)(req.dbUserId, "Booking cancelled", `Your visit at ${result.gymName} was cancelled with a 2 Credits fee applied.`).catch(e => console.error(e));
    res.json({
        message: "Booking cancelled successfully with a 2 Credits fee applied.",
        refundedCredits: result.refundedCredits,
        newCreditBalance: result.newBalance,
    });
};
router.delete("/:id", auth_1.requireAuth, cancelBookingHandler);
router.post("/:id/cancel", auth_1.requireAuth, cancelBookingHandler);
exports.default = router;
//# sourceMappingURL=bookings.js.map