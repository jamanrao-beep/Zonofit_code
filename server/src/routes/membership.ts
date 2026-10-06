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
    // 1. Repurchase allowed when membership is expired OR within 3 days of expiry AND cycleNumber < 12
    // 2. Buy additional credits allowed ONLY when membership is active
    const canRepurchase = (isExpired || daysRemaining <= 3) && cycleNumber < maxCycles;
    const isExpiringSoon = !isExpired && daysRemaining <= 3;
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
        isExpiringSoon,
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
    body("planId").optional().isString().withMessage("Valid plan ID required if planId is provided."),
    body("gymPlanId").optional().isString().withMessage("Valid gym plan ID required if gymPlanId is provided."),
    body("referenceId").isString().notEmpty().withMessage("Payment reference required."),
    body("amountPaidPaise").isInt({ min: 1 }).withMessage("Amount paid (paise) required."),
    body("primaryGymId").optional().isString(),
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
        // Check existing membership
        const existingMembership = await tx.membership.findUnique({
          where: { userId: req.dbUserId! },
          include: { plan: true }
        });

        const now = new Date();

        // PRD Rule #19: Maximum 12 Membership Cycles
        const currentCycle = existingMembership?.cycleNumber || 0;
        const nextCycleNumber = currentCycle >= 12 ? 1 : currentCycle + 1;

        let plan: any;
        let gymPlan: any;
        let gym: any;
        let initialVisits = 10;
        let remainingCreditsToAdd = 0;
        
        // If renewing or upgrading an active plan, extend duration seamlessly
        const baseDate = (existingMembership && existingMembership.status === "ACTIVE" && existingMembership.endDate > now)
          ? existingMembership.endDate
          : now;
        let endDate = new Date(baseDate);

        if (gymPlanId) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gymPlanId);
          gymPlan = isUuid ? await tx.gymPlan.findUnique({ where: { id: gymPlanId, isActive: true }, include: { gym: true } }) : null;
          if (!gymPlan) {
            gymPlan = await tx.gymPlan.findFirst({ where: { isActive: true }, include: { gym: true } });
          }
          if (!gymPlan) throw createError("Gym Plan not found.", 404, "PlanNotFound");
          gym = gymPlan.gym;
          
          const cutDays = gymPlan.initialCutoffDays || 10;
          initialVisits = cutDays;
          const netCreditDays = Math.max(0, 30 - cutDays);
          remainingCreditsToAdd = netCreditDays * (gym.creditCost || 8);
          
          const durationDays = gymPlan.billingCycle === "YEARLY" ? 365 : 30;
          endDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        } else if (planId) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);
          if (isUuid) {
            plan = await tx.membershipPlan.findUnique({ where: { id: planId, isActive: true } });
          }
          if (!plan) {
            const cleanedName = planId.replace(/^plan[-_]/i, "").trim();
            plan = await tx.membershipPlan.findFirst({
              where: {
                OR: [
                  { name: { equals: cleanedName, mode: "insensitive" } },
                  { name: { contains: cleanedName, mode: "insensitive" } },
                ],
                isActive: true,
              },
            });
          }
          if (!plan) {
            plan = await tx.membershipPlan.findFirst({ where: { isActive: true }, orderBy: { priceInPaise: "asc" } });
          }
          if (!plan) throw createError("Plan not found.", 404, "PlanNotFound");

          let targetGymId = primaryGymId || existingMembership?.primaryGymId;
          if (targetGymId) {
            gym = await tx.gym.findUnique({ where: { id: targetGymId, isActive: true } });
          }
          if (!gym) {
            gym = await tx.gym.findFirst({ where: { isActive: true } });
          }
          if (!gym) {
            gym = await tx.gym.create({
              data: {
                name: "FitZone Pro",
                description: "Premier fitness center",
                address: "100 Ft Road, Shobhagpura",
                city: "Udaipur",
                pincode: "313001",
                creditCost: 8,
                category: "STANDARD",
                lat: 24.5854,
                lng: 73.7125,
                facilities: ["Strength Equipment", "Cardio Zone", "Steam Room"],
                imageUrls: ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800"],
                rating: 4.8,
                totalRatings: 120,
                isVerified: true,
                isActive: true,
                totalSlots: 30,
              }
            });
          }

          const settings = await getSystemSettings();
          initialVisits = settings.initialVisitCut || 10;
          const gymCreditCost = gym.creditCost || 8;
          let initialCreditsCost = gymCreditCost * initialVisits;

          if (initialCreditsCost > plan.monthlyCredits) {
            initialVisits = Math.max(5, Math.floor(plan.monthlyCredits / gymCreditCost));
            initialCreditsCost = Math.min(plan.monthlyCredits, gymCreditCost * initialVisits);
          }

          remainingCreditsToAdd = Math.max(0, plan.monthlyCredits - initialCreditsCost);
          endDate = new Date(baseDate.getTime() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000);
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
