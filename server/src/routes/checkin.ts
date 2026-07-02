import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { sendPushNotification } from "../services/notifications";

const router = Router();

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
router.post(
  "/verify",
  requireAuth,
  [
    body("bookingId").isUUID().withMessage("Valid booking ID required."),
    body("verificationCode").isString().notEmpty().withMessage("Verification code required."),
    body("userLat").isFloat().withMessage("User latitude required."),
    body("userLng").isFloat().withMessage("User longitude required."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { bookingId, verificationCode, userLat, userLng } = req.body as {
      bookingId: string;
      verificationCode: string;
      userLat: number;
      userLng: number;
    };

    const result = await prisma.$transaction(async (tx) => {
      // Load booking + check-in in one query
      const booking = await tx.booking.findFirst({
        where: {
          id: bookingId,
          userId: req.dbUserId!, // Prevent verifying someone else's booking
        },
        include: {
          checkIn: true,
          gym: { select: { name: true, lat: true, lng: true } },
        },
      });

      if (!booking) throw createError("Booking not found.", 404, "BookingNotFound");
      if (!booking.checkIn) throw createError("Check-in record not found.", 404, "CheckInNotFound");

      const checkIn = booking.checkIn;

      // Already verified?
      if (checkIn.status === "VERIFIED") {
        throw createError("This visit has already been checked in.", 409, "AlreadyCheckedIn");
      }

      // Expired?
      if (new Date() > checkIn.expiresAt) {
        await tx.checkIn.update({
          where: { id: checkIn.id },
          data: { status: "EXPIRED" },
        });
        throw createError("Check-in code has expired.", 410, "CheckInExpired");
      }

      // Too many attempts?
      if (checkIn.attemptCount >= 5) {
        throw createError(
          "Too many failed attempts. Please contact gym staff.",
          429,
          "TooManyAttempts"
        );
      }

      // Increment attempt counter regardless of outcome
      await tx.checkIn.update({
        where: { id: checkIn.id },
        data: { attemptCount: { increment: 1 } },
      });

      // Verify code — in prod this would be a hash comparison
      // TODO: replace with crypto.timingSafeEqual(hash(verificationCode), storedHash)
      if (verificationCode !== checkIn.verificationCode) {
        throw createError(
          "Invalid verification code.",
          400,
          "InvalidCode"
        );
      }

      // Location Check: Must be within 1km
      const R = 6371; // Radius of the earth in km
      const dLat = (booking.gym.lat - userLat) * Math.PI / 180;
      const dLon = (booking.gym.lng - userLng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(userLat * Math.PI / 180) * Math.cos(booking.gym.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
      const distanceInKm = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;
      
      if (distanceInKm > 1) {
        throw createError(
          `You must be within 1km of ${booking.gym.name} to check in. You are currently ${distanceInKm.toFixed(2)}km away.`,
          403,
          "TooFarFromGym"
        );
      }

      // ✅ Valid — mark as VERIFIED
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
      ]);

      return { checkIn: updatedCheckIn, gymName: booking.gym.name };
    });

    // Send push notification
    sendPushNotification(
      req.dbUserId!,
      "Check-in Verified 🔥",
      `You're all checked in at ${result.gymName}. Have a great workout!`
    ).catch(e => console.error(e));

    res.json({
      success: true,
      message: `Checked in at ${result.gymName}. Enjoy your workout! 🔥`,
      verifiedAt: result.checkIn.verifiedAt,
    });
  }
);

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

export default router;
