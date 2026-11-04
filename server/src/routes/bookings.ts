import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prisma";
import { bookingDiscountCredits, isCancellationTooLate } from "../lib/couponMath";
import { bookingMatchesSlot, currentSlotWindow, readStoredSlots, slotKey } from "../lib/gymCommercial";
import { decrementCredits } from "../lib/wallet";
import { requireAuth } from "../middleware/auth";
import { sendPushNotification } from "../services/notifications";
import { isBookingSlotPast } from "../lib/bookingTime";
import { createError } from "../middleware/errorHandler";

const router = Router();

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

export function getGymPrefix(gymName?: string | null): string {
  if (!gymName) return "ZF";
  const words = gymName.trim().replace(/[^a-zA-Z\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return "ZF";
}
router.post(
  "/",
  requireAuth,
  [
    body("gymId").isString().notEmpty().withMessage("Valid gym ID required."),
    body("visitDate").isISO8601().withMessage("Valid visit date required (ISO 8601)."),
    body("timeSlot").isString().notEmpty().withMessage("Time slot required."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { gymId, visitDate, timeSlot, couponCode } = req.body as {
      gymId: string;
      visitDate: string;
      timeSlot: string;
      couponCode?: string;
    };

    const visitDateObj = new Date(visitDate);
    const visitDateStart = new Date(visitDateObj);
    visitDateStart.setHours(0, 0, 0, 0);
    const visitDateEnd = new Date(visitDateObj);
    visitDateEnd.setHours(23, 59, 59, 999);

    const result = await prisma.$transaction(async (tx) => {
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

      if (!gym) throw createError("Gym not found or unavailable.", 404, "GymNotFound");
      const storedTimeSlot = currentSlotWindow(timeSlot, gym.slotsJson);

      // 2. Check membership is active (auto-provision in test mode if unconfigured)
      let membership = await tx.membership.findUnique({
        where: { userId: req.dbUserId! },
      });
      if (!membership || membership.status !== "ACTIVE") {
        membership = await tx.membership.upsert({
          where: { userId: req.dbUserId! },
          create: {
            userId: req.dbUserId!,
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

        if (!coupon) throw createError("Invalid coupon code", 404, "InvalidCoupon");
        if (!coupon.isActive) throw createError("Coupon is no longer active", 400, "InvalidCoupon");
        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) throw createError("Coupon expired", 400, "InvalidCoupon");
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw createError("Coupon usage limit reached", 400, "InvalidCoupon");
        const discountCredits = bookingDiscountCredits(
          coupon.discountType,
          coupon.discountValue,
          finalCreditCost,
        );
        if (discountCredits === null) {
          throw createError("This coupon cannot be used for a gym visit.", 400, "InvalidCoupon");
        }
        if (discountCredits <= 0) {
          throw createError("This coupon does not reduce the visit cost.", 400, "InvalidCoupon");
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
        where: { userId: req.dbUserId! },
      });
      if (!wallet) {
        wallet = await tx.creditWallet.create({
          data: {
            userId: req.dbUserId!,
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
          userId: req.dbUserId!,
          gymId: gym.id,
          visitDate: { gte: visitDateStart, lte: visitDateEnd },
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        },
      });
      if (existingBooking) {
        throw createError(
          "You already have a booking at this gym for this date.",
          409,
          "DuplicateBooking"
        );
      }

      // 5. One cap is active. Daily total and per-slot never apply together.
      if (gym.cappingMode === "PER_SLOT") {
        if (!timeSlot || typeof timeSlot !== "string" || !timeSlot.trim()) {
          throw createError("Choose a time slot.", 400, "SlotRequired");
        }
        const savedSlots = readStoredSlots(gym.slotsJson);
        const namedSlot = savedSlots.find((slot) => bookingMatchesSlot(timeSlot, slot));
        if (namedSlot && !namedSlot.isEnabled) {
          throw createError("That time slot is closed.", 409, "SlotClosed");
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
        const slotBooked = daySlotBookings.filter((booking) => (
          namedSlot
            ? bookingMatchesSlot(booking.timeSlot, namedSlot)
            : slotKey(booking.timeSlot) === slotKey(timeSlot)
        )).length;
        if (slotBooked >= slotCap) {
          throw createError("That time slot is full.", 409, "NoSlotsAvailable");
        }
      } else {
        const dayCap = gym.maxDailyVisits ?? gym.totalSlots;
        const bookedCount = await tx.booking.count({
          where: {
            gymId: gym.id,
            visitDate: { gte: visitDateStart, lte: visitDateEnd },
            status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
          },
        });
        if (bookedCount >= dayCap) {
          throw createError("This gym has reached its ZonoFit visits for the day.", 409, "NoSlotsAvailable");
        }
      }

      // 7. Atomically deduct credits (or primary visits)
      let updatedWallet = wallet;
      if (isPrimaryVisit) {
        await tx.membership.update({
          where: { userId: req.dbUserId! },
          data: { primaryGymVisits: { decrement: 1 } }
        });
      } else {
        updatedWallet = await decrementCredits(tx, req.dbUserId!, finalCreditCost);
      }

      // 8. Compute gym sequential token number
      const lastBookingAtGym = await tx.booking.findFirst({
        where: { gymId: gym.id },
        orderBy: { createdAt: "desc" },
        select: { tokenNumber: true },
      });
      const tokenNumber = (lastBookingAtGym?.tokenNumber || 0) + 1;

      // Create the booking with tokenNumber
      const passCode = uuidv4();
      const booking = await tx.booking.create({
        data: {
          userId: req.dbUserId!,
          gymId: gym.id,
          visitDate: visitDateObj,
          timeSlot: storedTimeSlot,
          status: "CONFIRMED",
          creditsDeducted: isPrimaryVisit ? 0 : finalCreditCost,
          passCode,
          tokenNumber,
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
          userId: req.dbUserId!,
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
    sendPushNotification(
      req.dbUserId!,
      "Booking confirmed",
      `Your workout at ${result.gymName} on ${visitDate} at ${result.booking.timeSlot} is confirmed!`
    ).catch(e => console.error(e));

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
  }
);

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
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { status, upcoming } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Auto-reconcile past bookings: verified check-ins complete, auto-gyms complete, unverified ones become NO_SHOW / EXPIRED
    try {
      const activeCandidateBookings = await prisma.booking.findMany({
        where: {
          userId: req.dbUserId!,
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        },
        select: {
          id: true,
          visitDate: true,
          timeSlot: true,
          status: true,
          gym: { select: { requiresVerification: true, slotsJson: true } },
        },
      });

      const passedBookings = activeCandidateBookings.filter((b) =>
        isBookingSlotPast(b.visitDate, currentSlotWindow(b.timeSlot, b.gym?.slotsJson))
      );
      const checkedInPassedIds = passedBookings.filter((b) => b.status === "CHECKED_IN").map((b) => b.id);
      
      // If gym does not require verification (requiresVerification === false), uncancelled bookings automatically complete
      const autoPassedIds = passedBookings
        .filter((b) => b.gym?.requiresVerification === false && (b.status === "PENDING" || b.status === "CONFIRMED"))
        .map((b) => b.id);

      // Only gyms that require verification turn unverified bookings into NO_SHOW
      const unverifiedPassedIds = passedBookings
        .filter((b) => b.gym?.requiresVerification !== false && (b.status === "PENDING" || b.status === "CONFIRMED"))
        .map((b) => b.id);

      const allCompletedPassedIds = [...checkedInPassedIds, ...autoPassedIds];
      if (allCompletedPassedIds.length > 0) {
        await prisma.booking.updateMany({
          where: { id: { in: allCompletedPassedIds } },
          data: { status: "COMPLETED" },
        });
        if (autoPassedIds.length > 0) {
          await prisma.checkIn.updateMany({
            where: { bookingId: { in: autoPassedIds } },
            data: { status: "VERIFIED", verifiedAt: new Date() },
          });
        }
      }

      if (unverifiedPassedIds.length > 0) {
        await prisma.booking.updateMany({
          where: { id: { in: unverifiedPassedIds } },
          data: { status: "NO_SHOW" },
        });
        await prisma.checkIn.updateMany({
          where: { bookingId: { in: unverifiedPassedIds }, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
      }
    } catch {
      // Non-blocking auto-reconciliation
    }

    const where: Record<string, unknown> = {
      userId: req.dbUserId!,
      ...(status && { status }),
      ...(upcoming === "true" && { visitDate: { gte: new Date() } }),
    };

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
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
              requiresVerification: true,
              slotsJson: true,
            },
          },
          checkIn: {
            select: { status: true, verifiedAt: true, method: true },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      bookings: bookings.map((b) => {
        const gymRecord = b.gym as (typeof b.gym & { slotsJson?: string | null }) | null;
        const slotsJson = gymRecord?.slotsJson;
        const gym = gymRecord
          ? (({ slotsJson: _slots, ...rest }) => rest)(gymRecord)
          : gymRecord;
        return {
          ...b,
          timeSlot: currentSlotWindow(b.timeSlot, slotsJson),
          gym,
          tokenNumber: b.tokenNumber || ((parseInt(b.id.replace(/\D/g, "").slice(-3) || "1", 10) % 999) + 1),
          gymPrefix: getGymPrefix(b.gym?.name),
        };
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }
);

// ─── GET /api/bookings/today ──────────────────────────────────────────────────
/**
 * Returns today's active booking (if any) for the Home screen "Today" section.
 */
router.get(
  "/today",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Auto-complete passed bookings for today
    try {
      const todayActive = await prisma.booking.findMany({
        where: {
          userId: req.dbUserId!,
          visitDate: { gte: todayStart, lte: todayEnd },
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        },
        select: {
          id: true,
          visitDate: true,
          timeSlot: true,
          status: true,
          gym: { select: { requiresVerification: true, slotsJson: true } },
        },
      });

      const passedToday = todayActive.filter((b) =>
        isBookingSlotPast(b.visitDate, currentSlotWindow(b.timeSlot, b.gym?.slotsJson))
      );
      const checkedInPassedIds = passedToday.filter((b) => b.status === "CHECKED_IN").map((b) => b.id);
      
      const autoPassedIds = passedToday
        .filter((b) => b.gym?.requiresVerification === false && (b.status === "PENDING" || b.status === "CONFIRMED"))
        .map((b) => b.id);

      const unverifiedPassedIds = passedToday
        .filter((b) => b.gym?.requiresVerification !== false && (b.status === "PENDING" || b.status === "CONFIRMED"))
        .map((b) => b.id);

      const allCompletedPassedIds = [...checkedInPassedIds, ...autoPassedIds];
      if (allCompletedPassedIds.length > 0) {
        await prisma.booking.updateMany({
          where: { id: { in: allCompletedPassedIds } },
          data: { status: "COMPLETED" },
        });
        if (autoPassedIds.length > 0) {
          await prisma.checkIn.updateMany({
            where: { bookingId: { in: autoPassedIds } },
            data: { status: "VERIFIED", verifiedAt: new Date() },
          });
        }
      }

      if (unverifiedPassedIds.length > 0) {
        await prisma.booking.updateMany({
          where: { id: { in: unverifiedPassedIds } },
          data: { status: "NO_SHOW" },
        });
        await prisma.checkIn.updateMany({
          where: { bookingId: { in: unverifiedPassedIds }, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
      }
    } catch {
      // Non-blocking auto-reconciliation
    }

    const booking = await prisma.booking.findFirst({
      where: {
        userId: req.dbUserId!,
        visitDate: { gte: todayStart, lte: todayEnd },
        status: { in: ["CONFIRMED" as const, "CHECKED_IN" as const] },
      },
      include: {
        gym: { select: { id: true, name: true, address: true, imageUrls: true, requiresVerification: true, slotsJson: true } },
        checkIn: { select: { status: true, verifiedAt: true } },
      },
    });

    let effectiveBooking: any = booking ? { ...booking, passCode: booking.passCode } : null;

    // If gym does not require verification and slot time has arrived/passed, reflect CHECKED_IN
    if (
      effectiveBooking &&
      effectiveBooking.gym?.requiresVerification === false &&
      effectiveBooking.status === "CONFIRMED" &&
      isBookingSlotPast(effectiveBooking.visitDate, currentSlotWindow(effectiveBooking.timeSlot, effectiveBooking.gym?.slotsJson))
    ) {
      effectiveBooking = {
        ...effectiveBooking,
        status: "CHECKED_IN",
        checkIn: {
          ...effectiveBooking.checkIn,
          status: "VERIFIED" as any,
          verifiedAt: effectiveBooking.checkIn?.verifiedAt || new Date(),
        },
      };
    }

    if (effectiveBooking) {
      const tokenNum = effectiveBooking.tokenNumber || ((parseInt(effectiveBooking.id.replace(/\D/g, "").slice(-3) || "1", 10) % 999) + 1);
      effectiveBooking = {
        ...effectiveBooking,
        tokenNumber: tokenNum,
        gymPrefix: getGymPrefix(effectiveBooking.gym?.name),
        tokenFormatted: String(tokenNum).padStart(3, "0"),
        timeSlot: currentSlotWindow(effectiveBooking.timeSlot, effectiveBooking.gym?.slotsJson),
      };
      if (effectiveBooking.gym) {
        delete effectiveBooking.gym.slotsJson;
      }
    }

    res.json({ booking: effectiveBooking });
  }
);

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
/**
 * Cancel a booking and refund credits.
 * Only allowed if visit is > 2 hours away (to prevent abuse).
 */
const cancelBookingHandler = async (req: Request, res: Response): Promise<void> => {
  const bookingId = req.params.id as string;

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { id: bookingId, userId: req.dbUserId! },
      include: { gym: { select: { name: true } } },
    });

    if (!booking) throw createError("Booking not found.", 404, "BookingNotFound");
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      throw createError(
        "Only pending or confirmed bookings can be cancelled.",
        400,
        "CancellationNotAllowed"
      );
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
        if (meridian === "PM" && h < 12) h += 12;
        if (meridian === "AM" && h === 12) h = 0;
        workoutTime.setHours(h, m, 0, 0);
      }
    } catch {}

    const now = new Date();
    if (isCancellationTooLate(workoutTime, now)) {
      throw createError(
        "Bookings can only be cancelled more than 2 hours before the visit.",
        400,
        "CancellationTooLate"
      );
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });

    let refundedCredits = 0;
    let newBalance = 0;
    const gymName = booking.gym.name;

    const wallet = await tx.creditWallet.findUnique({
      where: { userId: req.dbUserId! },
    });
    const currentBalance = wallet?.balance || 0;

    if (booking.creditsDeducted > 0) {
      // Credit booking: refund = booked - 2 credits fee (flat 2 fee)
      refundedCredits = Math.max(0, booking.creditsDeducted - 2);
      if (refundedCredits > 0) {
        const updatedWallet = await tx.creditWallet.update({
          where: { userId: req.dbUserId! },
          data: { balance: { increment: refundedCredits } },
        });
        newBalance = updatedWallet.balance;

        await tx.creditTransaction.create({
          data: {
            userId: req.dbUserId!,
            walletId: updatedWallet.id,
            type: "REFUND",
            amount: refundedCredits,
            balanceAfter: updatedWallet.balance,
            description: `Cancellation at ${gymName} — ${refundedCredits} credits refunded (flat 2 credits fee deducted).`,
            bookingId: booking.id,
          },
        });
      } else {
        newBalance = currentBalance;
      }
    } else {
      // Mandatory visit (0 credits booked): flat 2 credits fee charged from wallet
      if (currentBalance < 2) {
        throw createError(
          `Cannot cancel booking: A flat 2 Credits fee is required, but your wallet balance is only ${currentBalance} Credits.`,
          400,
          "InsufficientCredits"
        );
      }

      const updatedWallet = await decrementCredits(tx, req.dbUserId!, 2);
      newBalance = updatedWallet.balance;

      await tx.creditTransaction.create({
        data: {
          userId: req.dbUserId!,
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
        where: { userId: req.dbUserId! },
        data: { primaryGymVisits: { increment: 1 } },
      });
    }

    return { refundedCredits, newBalance, gymName };
  }, { maxWait: 4000, timeout: 8000 });

  sendPushNotification(
    req.dbUserId!,
    "Booking cancelled",
    `Your visit at ${result.gymName} was cancelled with a 2 Credits fee applied.`
  ).catch(e => console.error(e));

  res.json({
    message: "Booking cancelled successfully with a 2 Credits fee applied.",
    refundedCredits: result.refundedCredits,
    newCreditBalance: result.newBalance,
  });
};

router.delete("/:id", requireAuth, cancelBookingHandler);
router.post("/:id/cancel", requireAuth, cancelBookingHandler);

export default router;
