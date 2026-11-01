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

/** Same code the member pass shows: ZF- plus the last 6 letters of the booking id. */
function deskCodeFromBookingId(id: string): string {
  const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return tail.length === 6 ? `ZF-${tail}` : "";
}

function typedDeskCode(value: string): string | null {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const withPrefix = compact.match(/^ZF([A-Z0-9]{6})$/);
  if (withPrefix) return `ZF-${withPrefix[1]}`;
  if (/^[A-Z0-9]{6}$/.test(compact)) return `ZF-${compact}`;
  return null;
}

async function gymIdsForStaff(userId: string, systemRole?: string): Promise<string[]> {
  const owned = await prisma.gym.findMany({
    where: { ownerId: userId, isActive: true },
    select: { id: true },
  });
  if (owned.length > 0) return owned.map((gym) => gym.id);
  if (systemRole === "ADMIN") {
    const gyms = await prisma.gym.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return gyms.map((gym) => gym.id);
  }
  return [];
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
    let gymIds: string[] = [];
    const ownedGyms = await prisma.gym.findMany({
      where: { ownerId: req.dbUserId!, isActive: true },
      select: { id: true },
    });
    if (ownedGyms.length > 0) {
      gymIds = ownedGyms.map((gym) => gym.id);
    } else if (req.systemRole === "ADMIN") {
      const allGyms = await prisma.gym.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      gymIds = allGyms.map((gym) => gym.id);
    }

    if (gymIds.length === 0) {
      res.status(403).json({ error: "Forbidden", message: "Only a gym partner can confirm a visit." });
      return;
    }

    const rawCode = passCode.trim();
    const normalizedCode = rawCode.toUpperCase();
    const suffixCode = normalizedCode.replace(/^ZF-?/, "").replace(/[^A-Z0-9]/g, "");

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Direct match by exact booking ID or passCode
        let booking = await tx.booking.findFirst({
          where: {
            gymId: { in: gymIds },
            OR: [
              { id: rawCode },
              { passCode: rawCode },
            ],
          },
          include: {
            checkIn: true,
            gym: { select: { name: true } },
            user: { select: { id: true, name: true, referredByUserId: true, totalWorkouts: true } },
          },
        });

        // 2. If not found, match by display ticket code / suffix (e.g. ZF-821CD0 or 821CD0)
        if (!booking && suffixCode.length >= 4) {
          const candidates = await tx.booking.findMany({
            where: {
              gymId: { in: gymIds },
              status: { in: ["CONFIRMED", "PENDING", "CHECKED_IN"] },
            },
            include: {
              checkIn: true,
              gym: { select: { name: true } },
              user: { select: { id: true, name: true, referredByUserId: true, totalWorkouts: true } },
            },
            orderBy: { createdAt: "desc" },
          });

          booking = candidates.find((b) => {
            const idClean = b.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            const passClean = (b.passCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            return (
              idClean.endsWith(suffixCode) ||
              passClean.endsWith(suffixCode) ||
              idClean === suffixCode ||
              passClean === suffixCode
            );
          }) || null;
        }

        if (!booking) throw createError("No confirmed visit matches that pass.", 404, "BookingNotFound");

        // Ensure check-in record exists
        let checkIn = booking.checkIn;
        if (!checkIn) {
          checkIn = await tx.checkIn.create({
            data: {
              bookingId: booking.id,
              method: "STAFF_APPROVAL",
              verificationCode: booking.passCode || booking.id,
              status: "PENDING",
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        }

        if (checkIn.status === "VERIFIED" || booking.status === "CHECKED_IN") {
          throw createError("This visit has already been checked in.", 409, "AlreadyCheckedIn");
        }
        if (checkIn.expiresAt && new Date() > checkIn.expiresAt) {
          await tx.checkIn.update({ where: { id: checkIn.id }, data: { status: "EXPIRED" } });
          throw createError("Check-in code has expired.", 410, "CheckInExpired");
        }

        // Verify authenticity of code
        const idClean = booking.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const passClean = (booking.passCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const vCodeClean = (checkIn.verificationCode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

        const isValid =
          booking.passCode === rawCode ||
          booking.id === rawCode ||
          checkIn.verificationCode === rawCode ||
          codesMatch(rawCode, checkIn.verificationCode) ||
          (suffixCode.length >= 4 && (
            idClean.endsWith(suffixCode) ||
            passClean.endsWith(suffixCode) ||
            vCodeClean.endsWith(suffixCode)
          ));

        if (!isValid) {
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
          where: { id: checkIn.id },
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
