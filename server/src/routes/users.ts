import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── GET /api/users/me ────────────────────────────────────────────────────────
/**
 * Returns the authenticated user's full profile with membership and wallet.
 * This is the "load everything" endpoint called on app boot / profile screen.
 */
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: req.dbUserId! },
      include: {
        wallet: true,
        membership: {
          include: { plan: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "UserNotFound" });
      return;
    }

    // Compute streak and stats from booking history
    const [totalWorkouts, thisMonthWorkouts] = await Promise.all([
      prisma.booking.count({
        where: { userId: user.id, status: { in: ["CHECKED_IN", "COMPLETED"] } },
      }),
      prisma.booking.count({
        where: {
          userId: user.id,
          status: { in: ["CHECKED_IN", "COMPLETED"] },
          visitDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      wallet: user.wallet
        ? {
            balance: user.wallet.balance,
            cashBalanceINR: user.wallet.cashBalanceInPaise / 100,
          }
        : null,
      membership: user.membership
        ? {
            status: user.membership.status,
            tier: user.membership.plan.tier,
            planName: user.membership.plan.name,
            endDate: user.membership.endDate,
            monthlyCredits: user.membership.plan.monthlyCredits,
          }
        : null,
      stats: {
        totalWorkouts,
        thisMonthWorkouts,
      },
    });
  }
);

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────
/**
 * Update the authenticated user's profile (name, phone, avatarUrl).
 */
router.patch(
  "/me",
  requireAuth,
  [
    body("name").optional().isString().trim().isLength({ min: 2, max: 100 }),
    body("phone").optional().isMobilePhone("any"),
    body("avatarUrl").optional().isURL(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { name, phone, avatarUrl } = req.body as {
      name?: string;
      phone?: string;
      avatarUrl?: string;
    };

    const updated = await prisma.user.update({
      where: { id: req.dbUserId! },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: { id: true, name: true, phone: true, avatarUrl: true, email: true },
    });

    res.json({ user: updated });
  }
);

export default router;
