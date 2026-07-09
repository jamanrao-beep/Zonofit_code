import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { getSystemSettings } from "../services/settings";

const router = Router();

// ─── GET /api/membership/plans ────────────────────────────────────────────────
/**
 * Returns all active membership plans (public — no auth required).
 * Used on the membership selection screen.
 */
router.get("/plans", async (_req, res: Response): Promise<void> => {
  const plans = await prisma.membershipPlan.findMany({
    where: { isActive: true },
    orderBy: { priceInPaise: "asc" },
  });

  res.json({
    plans: plans.map((p) => ({
      ...p,
      priceINR: p.priceInPaise / 100,
    })),
  });
});

// ─── GET /api/membership/me ───────────────────────────────────────────────────
/**
 * Returns the authenticated user's current membership.
 */
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const membership = await prisma.membership.findUnique({
      where: { userId: req.dbUserId! },
      include: { plan: true },
    });

    if (!membership) {
      res.json({ membership: null });
      return;
    }

    const now = new Date();
    const isExpired = membership.endDate < now;

    res.json({
      membership: {
        ...membership,
        plan: {
          ...membership.plan,
          priceINR: membership.plan.priceInPaise / 100,
        },
        isExpired,
        daysRemaining: isExpired
          ? 0
          : Math.ceil(
              (membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            ),
      },
    });
  }
);

// ─── POST /api/membership/activate ───────────────────────────────────────────
/**
 * Activate a membership after payment confirmation.
 * Called after Razorpay payment webhook confirms success.
 *
 * On activation:
 * 1. Creates/updates the Membership row
 * 2. Grants the plan's monthly credits to the wallet
 * 3. Logs the credit grant transaction
 */
router.post(
  "/activate",
  requireAuth,
  [
    body("planId").optional().isUUID().withMessage("Valid plan ID required if planId is provided."),
    body("gymPlanId").optional().isUUID().withMessage("Valid gym plan ID required if gymPlanId is provided."),
    body("referenceId").isString().notEmpty().withMessage("Payment reference required."),
    body("amountPaidPaise").isInt({ min: 1 }).withMessage("Amount paid (paise) required."),
    body("primaryGymId").optional().isString().notEmpty().withMessage("Primary Gym selection required for global plans."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { planId, gymPlanId, primaryGymId } = req.body as { planId?: string; gymPlanId?: string; referenceId: string; amountPaidPaise: number; primaryGymId?: string };

    if (!planId && !gymPlanId) {
      res.status(400).json({ error: "ValidationError", message: "Either planId or gymPlanId must be provided." });
      return;
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        let plan;
        let gymPlan;
        let gym;
        let initialVisits = 0;
        let remainingCreditsToAdd = 0;
        const now = new Date();
        let endDate = new Date();

        if (gymPlanId) {
          gymPlan = await tx.gymPlan.findUnique({ where: { id: gymPlanId, isActive: true }, include: { gym: true } });
          if (!gymPlan) throw createError("Gym Plan not found.", 404, "PlanNotFound");
          gym = gymPlan.gym;
          
          // GymPlan Logic: 30 days - cut days * cost
          const cutDays = gymPlan.initialCutoffDays;
          initialVisits = cutDays; // We record cut days as initial visits
          const netCreditDays = 30 - cutDays;
          remainingCreditsToAdd = netCreditDays * gym.creditCost;
          
          const durationDays = gymPlan.billingCycle === "YEARLY" ? 365 : 30;
          endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        } else if (planId) {
          plan = await tx.membershipPlan.findUnique({ where: { id: planId, isActive: true } });
          if (!plan) throw createError("Plan not found.", 404, "PlanNotFound");

          if (!primaryGymId) throw createError("primaryGymId required for global plans.", 400, "GymRequired");
          gym = await tx.gym.findUnique({ where: { id: primaryGymId, isActive: true } });
          if (!gym) throw createError("Primary Gym not found or inactive.", 404, "GymNotFound");

          const settings = await getSystemSettings();
          initialVisits = settings.initialVisitCut; // e.g. 10
          const initialCreditsCost = gym.creditCost * initialVisits;

          if (initialCreditsCost > plan.monthlyCredits) {
            throw createError(
              `Primary gym's initial ${initialVisits} visits cost (${initialCreditsCost} cr) exceeds the plan's granted credits (${plan.monthlyCredits} cr). Please choose a more affordable primary gym or upgrade your plan.`,
              400,
              "InsufficientPlanCredits"
            );
          }

          remainingCreditsToAdd = plan.monthlyCredits - initialCreditsCost;
          endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        }

        // Upsert membership
        const membership = await tx.membership.upsert({
          where: { userId: req.dbUserId! },
          create: {
            userId: req.dbUserId!,
            planId: planId || null,
            gymPlanId: gymPlanId || null,
            status: "ACTIVE",
            startDate: now,
            endDate,
            primaryGymId: gym.id,
            primaryGymVisits: initialVisits,
          },
          update: {
            planId: planId || null,
            gymPlanId: gymPlanId || null,
            status: "ACTIVE",
            startDate: now,
            endDate,
            primaryGymId: gym.id,
            primaryGymVisits: initialVisits,
          },
          include: { plan: true, gymPlan: true },
        });

        // Grant remaining credits
        const wallet = await tx.creditWallet.update({
          where: { userId: req.dbUserId! },
          data: { balance: { increment: remainingCreditsToAdd } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: req.dbUserId!,
            walletId: wallet.id,
            type: "MEMBERSHIP_GRANT",
            amount: remainingCreditsToAdd,
            balanceAfter: wallet.balance,
            description: `${plan.name} activated — ${initialVisits} visits locked to ${gym.name}, ${remainingCreditsToAdd} credits added.`,
          },
        });

        return { membership, wallet, remainingCreditsToAdd, initialVisits, gym };
      });

      res.status(201).json({
        membership: {
          ...result.membership,
          plan: {
            ...result.membership.plan,
            priceINR: result.membership.plan.priceInPaise / 100,
          },
        },
        newCreditBalance: result.wallet.balance,
        message: `${result.membership.plan.name} activated. ${result.initialVisits} visits available at ${result.gym.name}.`,
      });
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ error: err.code, message: err.message });
      } else {
        res.status(500).json({ error: "ServerError", message: err.message });
      }
    }
  }
);

export default router;
