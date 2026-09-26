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
      include: { 
        plan: true,
        primaryGym: { select: { id: true, name: true, city: true, address: true } }
      },
    });

    if (!membership) {
      res.json({ membership: null });
      return;
    }

    const now = new Date();
    const isExpired = membership.endDate < now || membership.status === "EXPIRED";
    const daysRemaining = isExpired
      ? 0
      : Math.ceil(
          (membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

    const cycleNumber = membership.cycleNumber || 1;
    const maxCycles = 12;
    const cyclesRemaining = Math.max(0, maxCycles - cycleNumber);
    const mandatoryVisits = membership.mandatoryVisits || 10;
    const completedVisits = membership.completedVisits || 0;
    const mandatoryVisitsRemaining = Math.max(0, mandatoryVisits - completedVisits);

    // PRD Rules:
    // 1. Repurchase allowed ONLY when membership is expired AND cycleNumber < 12
    // 2. Buy additional credits allowed ONLY when membership is active
    const canRepurchase = isExpired && cycleNumber < maxCycles;
    const canBuyAdditionalCredits = !isExpired;

    res.json({
      membership: {
        ...membership,
        gymName: membership.primaryGym?.name || "ZonoFit Partner Gym",
        plan: membership.plan ? {
          ...membership.plan,
          priceINR: membership.plan.priceInPaise / 100,
        } : null,
        isExpired,
        daysRemaining,
        cycleNumber,
        maxCycles,
        cyclesRemaining,
        mandatoryVisits,
        completedVisits,
        mandatoryVisitsRemaining,
        canRepurchase,
        canBuyAdditionalCredits,
      },
    });
  }
);

// ─── POST /api/membership/activate ───────────────────────────────────────────
/**
 * Activate or Repurchase a membership after payment confirmation.
 * Called after payment confirmation.
 *
 * PRD Constraints:
 * 1. Active membership CANNOT be repurchased early.
 * 2. Maximum 12 membership cycles allowed.
 * 3. INR wallet is automatically deducted up to the total purchase amount.
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
        // Check existing membership to enforce PRD rules
        const existingMembership = await tx.membership.findUnique({
          where: { userId: req.dbUserId! },
          include: { plan: true }
        });

        const now = new Date();

        // PRD Rule #11: Repurchase while active is STRICTLY PREVENTED
        if (existingMembership && existingMembership.status === "ACTIVE" && existingMembership.endDate > now) {
          throw createError(
            "Active membership cannot be repurchased early. If credits finish before your membership expires, please buy additional credits.",
            400,
            "ActiveMembershipCannotRepurchase"
          );
        }

        // PRD Rule #19: Maximum 12 Membership Cycles
        const currentCycle = existingMembership?.cycleNumber || 0;
        if (currentCycle >= 12) {
          throw createError(
            "Plan limit reached. You have completed all 12 membership cycles under this plan.",
            400,
            "MembershipPlanLimitReached"
          );
        }

        const nextCycleNumber = currentCycle + 1;

        let plan: any;
        let gymPlan: any;
        let gym: any;
        let initialVisits = 10;
        let remainingCreditsToAdd = 0;
        let endDate = new Date();

        if (gymPlanId) {
          gymPlan = await tx.gymPlan.findUnique({ where: { id: gymPlanId, isActive: true }, include: { gym: true } });
          if (!gymPlan) throw createError("Gym Plan not found.", 404, "PlanNotFound");
          gym = gymPlan.gym;
          
          const cutDays = gymPlan.initialCutoffDays;
          initialVisits = cutDays;
          const netCreditDays = 30 - cutDays;
          remainingCreditsToAdd = netCreditDays * gym.creditCost;
          
          const durationDays = gymPlan.billingCycle === "YEARLY" ? 365 : 30;
          endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        } else if (planId) {
          plan = await tx.membershipPlan.findUnique({ where: { id: planId, isActive: true } });
          if (!plan) throw createError("Plan not found.", 404, "PlanNotFound");

          const targetGymId = primaryGymId || existingMembership?.primaryGymId;
          if (!targetGymId) throw createError("Primary Gym selection required.", 400, "GymRequired");

          gym = await tx.gym.findUnique({ where: { id: targetGymId, isActive: true } });
          if (!gym) throw createError("Primary Gym not found or inactive.", 404, "GymNotFound");

          const settings = await getSystemSettings();
          initialVisits = settings.initialVisitCut || 10;
          const initialCreditsCost = gym.creditCost * initialVisits;

          if (initialCreditsCost > plan.monthlyCredits) {
            throw createError(
              `Primary gym's initial ${initialVisits} visits cost (${initialCreditsCost} cr) exceeds the plan's granted credits (${plan.monthlyCredits} cr). Please choose a more affordable primary gym or upgrade your plan.`,
              400,
              "InsufficientPlanCredits"
            );
          }

          remainingCreditsToAdd = plan.monthlyCredits - initialCreditsCost;
          endDate = new Date(now.getTime() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000);
        }

        // PRD Rule #15, #16, #17: Auto-deduct valid INR Wallet from checkout
        const wallet = await tx.creditWallet.findUnique({
          where: { userId: req.dbUserId! }
        });

        if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");

        let inrWalletDeductedPaise = 0;
        if (wallet.convertibleCashBalanceInPaise > 0 && wallet.cashExpiryDate && wallet.cashExpiryDate > now) {
          // Automatic deduction up to purchase price
          const pricePaise = plan ? plan.priceInPaise : (gymPlan ? gymPlan.priceInPaise : 0);
          inrWalletDeductedPaise = Math.min(pricePaise, wallet.convertibleCashBalanceInPaise);

          if (inrWalletDeductedPaise > 0) {
            await tx.creditWallet.update({
              where: { id: wallet.id },
              data: {
                convertibleCashBalanceInPaise: { decrement: inrWalletDeductedPaise }
              }
            });

            await tx.creditTransaction.create({
              data: {
                userId: req.dbUserId!,
                walletId: wallet.id,
                type: "CONVERSION",
                amount: 0,
                balanceAfter: wallet.balance,
                description: `INR Wallet auto-applied: -₹${inrWalletDeductedPaise / 100} for Membership Cycle ${nextCycleNumber}.`
              }
            });
          }
        }

        // Upsert membership for the new 30-day cycle
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
            cycleNumber: nextCycleNumber,
            mandatoryVisits: initialVisits,
            completedVisits: 0
          },
          update: {
            planId: planId || null,
            gymPlanId: gymPlanId || null,
            status: "ACTIVE",
            startDate: now,
            endDate,
            primaryGymId: gym.id,
            primaryGymVisits: initialVisits,
            cycleNumber: nextCycleNumber,
            mandatoryVisits: initialVisits,
            completedVisits: 0
          },
          include: { plan: true, gymPlan: true, primaryGym: true },
        });

        // Grant remaining credits
        const updatedWallet = await tx.creditWallet.update({
          where: { userId: req.dbUserId! },
          data: { balance: { increment: remainingCreditsToAdd } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: req.dbUserId!,
            walletId: wallet.id,
            type: "MEMBERSHIP_GRANT",
            amount: remainingCreditsToAdd,
            balanceAfter: updatedWallet.balance,
            description: `Membership ${nextCycleNumber} of 12 activated — ${initialVisits} visits at ${gym.name}, ${remainingCreditsToAdd} credits added.`,
          },
        });

        return { 
          membership, 
          wallet: updatedWallet, 
          remainingCreditsToAdd, 
          initialVisits, 
          gym, 
          nextCycleNumber,
          inrWalletDeductedPaise 
        };
      });

      res.status(201).json({
        membership: {
          ...result.membership,
          plan: result.membership.plan ? {
            ...result.membership.plan,
            priceINR: result.membership.plan.priceInPaise / 100,
          } : null,
          cycleNumber: result.nextCycleNumber,
          maxCycles: 12,
        },
        newCreditBalance: result.wallet.balance,
        inrWalletDeductedINR: result.inrWalletDeductedPaise / 100,
        message: `Membership ${result.nextCycleNumber} of 12 activated. ${result.initialVisits} mandatory visits available at ${result.gym.name}.`,
      });
    } catch (err: any) {
      if (err.statusCode || err.status) {
        res.status(err.statusCode || err.status).json({ error: err.code || "Error", message: err.message });
      } else {
        res.status(500).json({ error: "ServerError", message: err.message });
      }
    }
  }
);

export default router;
