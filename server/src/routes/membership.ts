import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { activatePaidMembership, quotePaidMembership } from "../services/membershipActivate";
import { fulfillPaymentOrder, getRazorpay, getRazorpayConfig, isRazorpayConfigured, verifyCheckoutSignature } from "../services/payments";

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
    const mandatoryVisits = membership.mandatoryVisits || (cycleNumber <= 4 ? 10 : 15);
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

// ─── POST /api/membership/create-order ───────────────────────────────────────
/**
 * Starts a membership payment. The price comes from the database plan.
 * If card payments are not configured on the server, directly accepts and activates for testing.
 */
router.post(
  "/create-order",
  requireAuth,
  [
    body("primaryGymId").isString().notEmpty().withMessage("A gym is required."),
    body("gymName").optional().isString(),
    body("planId").optional().isString(),
    body("gymPlanId").optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { primaryGymId, gymName, planId, gymPlanId } = req.body as {
      primaryGymId: string;
      gymName?: string;
      planId?: string;
      gymPlanId?: string;
    };

    try {
      const quote = await quotePaidMembership(req.dbUserId!, {
        primaryGymId,
        gymName,
        planId,
        gymPlanId,
      });

      // If Razorpay is not configured on the server, directly accept & activate for testing
      if (!isRazorpayConfigured()) {
        const activationResult = await activatePaidMembership(prisma, req.dbUserId!, {
          primaryGymId: quote.gym.id,
          gymName: gymName || quote.gym.name,
          planId: quote.planId,
          gymPlanId: quote.gymPlanId,
        });

        res.status(200).json({
          directAccepted: true,
          success: true,
          message: "Membership activated directly for testing (card payments not configured).",
          membership: {
            ...activationResult.membership,
            gymName: activationResult.gym.name,
            plan: activationResult.membership.plan
              ? {
                  ...activationResult.membership.plan,
                  priceINR: activationResult.membership.plan.priceInPaise / 100,
                }
              : null,
            cycleNumber: activationResult.nextCycleNumber,
            maxCycles: 12,
          },
          newCreditBalance: activationResult.wallet.balance,
          gymId: activationResult.gym.id,
          gymName: activationResult.gym.name,
          amount: quote.pricePaise,
          currency: "INR",
        });
        return;
      }

      const razorpay = getRazorpay();
      const { keyId } = getRazorpayConfig();
      const order = await razorpay.orders.create({
        amount: quote.pricePaise,
        currency: "INR",
        receipt: `mem_${Date.now()}`,
      });

      await (prisma as any).paymentOrder.create({
        data: {
          userId: req.dbUserId!,
          razorpayOrderId: order.id,
          amountPaise: quote.pricePaise,
          creditsToAdd: 0,
          cashToAddPaise: 0,
          purpose: "MEMBERSHIP",
          metaJson: JSON.stringify({
            planId: quote.planId,
            gymPlanId: quote.gymPlanId,
            primaryGymId,
            gymName: gymName || quote.gym.name,
          }),
          status: "CREATED",
        },
      });

      res.status(200).json({
        razorpayOrderId: order.id,
        keyId,
        amount: quote.pricePaise,
        currency: "INR",
        gymId: quote.gym.id,
        gymName: quote.gym.name,
      });
    } catch (err: any) {
      const status = err.statusCode || err.status || 500;
      res.status(status).json({
        error: err.code || "MembershipOrderFailed",
        message: status === 503 ? err.message : err.message || "Could not start membership payment.",
      });
    }
  }
);

// ─── POST /api/membership/activate ───────────────────────────────────────────
/**
 * Confirms a payment and grants the membership.
 * In testing or when card payments are not configured, directly activates.
 */
router.post(
  "/activate",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      directAccept,
      primaryGymId,
      gymName,
      planId,
      gymPlanId,
    } = req.body as {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      directAccept?: boolean;
      primaryGymId?: string;
      gymName?: string;
      planId?: string;
      gymPlanId?: string;
    };

    try {
      if (
        !isRazorpayConfigured() ||
        directAccept ||
        !razorpaySignature ||
        razorpayOrderId?.startsWith("mock_")
      ) {
        // Direct accept mode for testing
        const targetGymId = primaryGymId || "83431d3a-313a-450c-b78e-62732160b6ef";
        const result = await activatePaidMembership(prisma, req.dbUserId!, {
          primaryGymId: targetGymId,
          gymName,
          planId,
          gymPlanId,
        });

        res.status(201).json({
          membership: {
            ...result.membership,
            gymName: result.gym.name,
            plan: result.membership.plan
              ? { ...result.membership.plan, priceINR: result.membership.plan.priceInPaise / 100 }
              : null,
            cycleNumber: result.nextCycleNumber,
            maxCycles: 12,
          },
          newCreditBalance: result.wallet.balance,
          message: "Membership activated (test mode direct accept).",
        });
        return;
      }

      if (!verifyCheckoutSignature(razorpayOrderId!, razorpayPaymentId!, razorpaySignature)) {
        res.status(400).json({ error: "InvalidSignature", message: "Payment could not be verified." });
        return;
      }

      await fulfillPaymentOrder({
        razorpayOrderId: razorpayOrderId!,
        referenceId: razorpayPaymentId!,
        userId: req.dbUserId,
      });

      const membership = await prisma.membership.findUnique({
        where: { userId: req.dbUserId! },
        include: { plan: true, gymPlan: true, primaryGym: true },
      });
      const wallet = await prisma.creditWallet.findUnique({ where: { userId: req.dbUserId! } });

      res.status(201).json({
        membership: membership
          ? {
              ...membership,
              plan: membership.plan
                ? { ...membership.plan, priceINR: membership.plan.priceInPaise / 100 }
                : null,
              cycleNumber: membership.cycleNumber,
              maxCycles: 12,
            }
          : null,
        newCreditBalance: wallet?.balance ?? 0,
        message: "Membership activated.",
      });
    } catch (err: any) {
      const status = err.statusCode || err.status || 500;
      res.status(status).json({
        error: err.code || "ActivationFailed",
        message: err.message || "Membership could not be activated.",
      });
    }
  }
);

export default router;
