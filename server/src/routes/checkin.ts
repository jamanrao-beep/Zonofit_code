import crypto from "crypto";
import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { sendPushNotification } from "../services/notifications";

const router = Router();

function codesMatch(actual: string, expected: string): boolean {
  const actualBuf = Buffer.from(actual);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function startOfTodayInKolkata(): Date {
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
router.post("/verify", requireAuth, async (_req: Request, res: Response): Promise<void> => {
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
router.get(
  "/pass/:bookingId",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.bookingId as string;

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: req.dbUserId!,
        status: { in: ["CONFIRMED" as const, "CHECKED_IN" as const] },
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
  }
);

// ─── POST /api/checkin/staff ──────────────────────────────────────────────────
/**
 * Gym staff confirm a member's pass code at the desk.
 * The member does not mark their own visit from this route.
 */
router.post(
  "/staff",
  requireAuth,
  [body("passCode").isString().notEmpty().withMessage("Pass code required.")],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { passCode } = req.body as { passCode: string };
    const ownedGyms = await prisma.gym.findMany({
      where: { ownerId: req.dbUserId!, isActive: true },
      select: { id: true },
    });
    if (ownedGyms.length === 0) {
      res.status(403).json({ error: "Forbidden", message: "Only a gym partner can confirm a visit." });
      return;
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
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
        if (!booking) throw createError("No confirmed visit matches that pass.", 404, "BookingNotFound");
        if (!booking.checkIn) throw createError("Check-in record not found.", 404, "CheckInNotFound");
        if (booking.checkIn.status === "VERIFIED") {
          throw createError("This visit has already been checked in.", 409, "AlreadyCheckedIn");
        }
        if (new Date() > booking.checkIn.expiresAt) {
          await tx.checkIn.update({ where: { id: booking.checkIn.id }, data: { status: "EXPIRED" } });
          throw createError("Check-in code has expired.", 410, "CheckInExpired");
        }
        if (!codesMatch(passCode, booking.checkIn.verificationCode)) {
          throw createError("Invalid verification code.", 400, "InvalidCode");
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
            verifiedByStaff: req.dbUserId!,
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

        let referrerIdToNotify: string | null = null;
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

      sendPushNotification(
        result.memberId,
        "Check-in Verified",
        `You're all checked in at ${result.gymName}. Have a great workout.`
      ).catch(() => {});
      if (result.referrerIdToNotify) {
        sendPushNotification(
          result.referrerIdToNotify,
          "Referral Bonus",
          "You earned 5 credits. Your referred friend just completed their first workout."
        ).catch(() => {});
      }

      res.json({
        success: true,
        message: `Checked in at ${result.gymName}.`,
        verifiedAt: result.verifiedAt,
      });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.code || "CheckInFailed", message: err.message || "Check-in failed." });
    }
  }
);

export default router;
