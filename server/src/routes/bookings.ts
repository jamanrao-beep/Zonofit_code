import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { sendPushNotification } from "../services/notifications";
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
router.post(
  "/",
  requireAuth,
  [
    body("gymId").isUUID().withMessage("Valid gym ID required."),
    body("visitDate").isISO8601().withMessage("Valid visit date required (ISO 8601)."),
    body("timeSlot")
      .matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
      .withMessage("Time slot format: HH:MM-HH:MM"),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { gymId, visitDate, timeSlot } = req.body as {
      gymId: string;
      visitDate: string;
      timeSlot: string;
    };

    const visitDateObj = new Date(visitDate);
    const visitDateStart = new Date(visitDateObj);
    visitDateStart.setHours(0, 0, 0, 0);
    const visitDateEnd = new Date(visitDateObj);
    visitDateEnd.setHours(23, 59, 59, 999);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get gym and credit cost
      const gym = await tx.gym.findUnique({
        where: { id: gymId, isActive: true },
        select: { id: true, name: true, creditCost: true, totalSlots: true },
      });
      if (!gym) throw createError("Gym not found or unavailable.", 404, "GymNotFound");

      // 2. Check membership is active
      const membership = await tx.membership.findUnique({
        where: { userId: req.dbUserId! },
      });
      if (!membership || membership.status !== "ACTIVE") {
        throw createError(
          "Active membership required to book a visit.",
          403,
          "NoActiveMembership"
        );
      }

      // 3. Check wallet balance or primary visits
      let isPrimaryVisit = false;
      if (membership.primaryGymId === gymId && membership.primaryGymVisits > 0) {
        isPrimaryVisit = true;
      }

      const wallet = await tx.creditWallet.findUnique({
        where: { userId: req.dbUserId! },
      });
      if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");
      if (!isPrimaryVisit && wallet.balance < gym.creditCost) {
        throw createError(
          `Insufficient credits. Need ${gym.creditCost}, have ${wallet.balance}.`,
          400,
          "InsufficientCredits"
        );
      }

      // 4. Check for duplicate booking (same user, same gym, same date)
      const existingBooking = await tx.booking.findFirst({
        where: {
          userId: req.dbUserId!,
          gymId,
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

      // 5. Check slot availability
      const bookedCount = await tx.booking.count({
        where: {
          gymId,
          visitDate: { gte: visitDateStart, lte: visitDateEnd },
          status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
        },
      });
      if (bookedCount >= gym.totalSlots) {
        throw createError(
          "No available slots at this gym for the selected date.",
          409,
          "NoSlotsAvailable"
        );
      }

      // 6. Atomically deduct credits (or primary visits)
      let updatedWallet = wallet;
      if (isPrimaryVisit) {
        await tx.membership.update({
          where: { userId: req.dbUserId! },
          data: { primaryGymVisits: { decrement: 1 } }
        });
      } else {
        updatedWallet = await tx.creditWallet.update({
          where: { userId: req.dbUserId! },
          data: { balance: { decrement: gym.creditCost } },
        });
      }

      // 7. Create the booking
      const passCode = uuidv4();
      const booking = await tx.booking.create({
        data: {
          userId: req.dbUserId!,
          gymId,
          visitDate: visitDateObj,
          timeSlot,
          status: "CONFIRMED",
          creditsDeducted: isPrimaryVisit ? 0 : gym.creditCost,
          passCode,
        },
      });

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

      // 9. Log the credit transaction
      await tx.creditTransaction.create({
        data: {
          userId: req.dbUserId!,
          walletId: wallet.id,
          type: "VISIT_SPEND",
          amount: isPrimaryVisit ? 0 : -gym.creditCost,
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
      "Booking Confirmed ✅",
      `Your workout at ${result.gymName} on ${visitDate} at ${timeSlot} is confirmed!`
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
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { status, upcoming } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

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
      bookings,
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

    const booking = await prisma.booking.findFirst({
      where: {
        userId: req.dbUserId!,
        visitDate: { gte: todayStart, lte: todayEnd },
        status: { in: ["CONFIRMED" as const, "CHECKED_IN" as const] },
      },
      include: {
        gym: { select: { id: true, name: true, address: true, imageUrls: true } },
        checkIn: { select: { status: true, verifiedAt: true } },
      },
    });

    // Append passCode from booking itself for QR display
    res.json({ booking: booking ? { ...booking, passCode: booking.passCode } : null });
  }
);

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
/**
 * Cancel a booking and refund credits.
 * Only allowed if visit is > 2 hours away (to prevent abuse).
 */
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
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

      // Minimum 2 hours before visit
      const twoHoursBefore = new Date(booking.visitDate.getTime() - 2 * 60 * 60 * 1000);
      if (new Date() > twoHoursBefore) {
        throw createError(
          "Cancellations must be made at least 2 hours before the visit.",
          400,
          "CancellationWindowClosed"
        );
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" },
      });

      // Refund credits
      const wallet = await tx.creditWallet.update({
        where: { userId: req.dbUserId! },
        data: { balance: { increment: booking.creditsDeducted } },
      });

      const walletRecord = await tx.creditWallet.findUnique({
        where: { userId: req.dbUserId! },
      });

      const gymName = booking.gym.name;

      await tx.creditTransaction.create({
        data: {
          userId: req.dbUserId!,
          walletId: walletRecord!.id,
          type: "REFUND",
          amount: booking.creditsDeducted,
          balanceAfter: wallet.balance,
          description: `Booking cancelled at ${gymName} — ${booking.creditsDeducted} credits refunded`,
          bookingId: booking.id,
        },
      });

      return { refundedCredits: booking.creditsDeducted, newBalance: wallet.balance };
    });

    res.json({
      message: "Booking cancelled successfully.",
      refundedCredits: result.refundedCredits,
      newCreditBalance: result.newBalance,
    });
  }
);

export default router;
