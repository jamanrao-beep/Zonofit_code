import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { membershipTaxBranches } from "../lib/taxDocuments";
import { quotedFreeMonth, redeemFreeMonth, redeemOpenFreeMonth } from "../lib/referralRewards";
import { activatePaidMembership, quotePaidMembership, type MembershipActivationInput } from "../services/membershipActivate";
import { fulfillPaymentOrder, getRazorpay, getRazorpayConfig, isRazorpayConfigured, verifyCheckoutSignature } from "../services/payments";
import { sendPushNotification } from "../services/notifications";

const router = Router();

/** Member responses keep the gym name. The GSTIN stays off the customer payload. */
function hideSupplierGstin<T extends { primaryGym?: { gstNumber?: string | null } | null }>(membership: T): T {
  if (!membership.primaryGym) return membership;
  const { gstNumber: _gstNumber, ...primaryGym } = membership.primaryGym;
  return { ...membership, primaryGym };
}

/** Activates a cycle and redeems a free month in the same transaction. Visit math stays on the full price. */
async function activateAndMaybeRedeem(
  userId: string,
  input: MembershipActivationInput,
  freeMonthId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const activated = await activatePaidMembership(tx, userId, input);
    if (freeMonthId) {
      const redeemed = await redeemFreeMonth(tx, userId, freeMonthId);
      if (!redeemed) console.warn("[referral] free month was not redeemed");
    }
    return activated;
  });
}

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
    let completedVisits = Math.max(0, membership.completedVisits ?? 0);
    if ((membership.completedVisits ?? 0) < 0) {
      await prisma.membership.update({
        where: { id: membership.id },
        data: { completedVisits: 0 },
      });
      completedVisits = 0;
    }
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
      const offer = await quotedFreeMonth(req.dbUserId!, quote.pricePaise);
      const chargePaise = offer.chargePaise;
      const tax = membershipTaxBranches({
        grossPaise: chargePaise,
        gymGstRegistered: quote.gym.isGstRegistered === true,
      });
      const activationInput = {
        primaryGymId: quote.gym.id,
        gymName: gymName || quote.gym.name,
        planId: quote.planId,
        gymPlanId: quote.gymPlanId,
      };

      // A covered month activates now. So does a server that has no card checkout.
      if (chargePaise === 0 || !isRazorpayConfigured()) {
        const activationResult = await activateAndMaybeRedeem(
          req.dbUserId!,
          activationInput,
          offer.waiverPaise > 0 ? offer.freeMonthId : null,
        );

        await sendPushNotification(
          req.dbUserId!,
          "Membership activated",
          `Your membership at ${activationResult.gym.name} is active! ${activationResult.initialVisits} primary visits and ${activationResult.remainingCreditsToAdd} credits added to your wallet.`
        ).catch(() => {});

        const covered = chargePaise === 0 && offer.waiverPaise > 0;
        res.status(200).json({
          directAccepted: true,
          success: true,
          message: covered
            ? "Your free referral month is active."
            : "Membership activated directly for testing (card payments not configured).",
          membership: hideSupplierGstin({
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
          }),
          newCreditBalance: activationResult.wallet.balance,
          gymId: activationResult.gym.id,
          gymName: activationResult.gym.name,
          amount: chargePaise,
          waiverPaise: offer.waiverPaise,
          currency: "INR",
          tax,
        });
        return;
      }

      const razorpay = getRazorpay();
      const { keyId } = getRazorpayConfig();
      const order = await razorpay.orders.create({
        amount: chargePaise,
        currency: "INR",
        receipt: `mem_${Date.now()}`,
      });

      await (prisma as any).paymentOrder.create({
        data: {
          userId: req.dbUserId!,
          razorpayOrderId: order.id,
          amountPaise: chargePaise,
          creditsToAdd: 0,
          cashToAddPaise: 0,
          purpose: "MEMBERSHIP",
          metaJson: JSON.stringify({
            planId: quote.planId,
            gymPlanId: quote.gymPlanId,
            primaryGymId,
            gymName: gymName || quote.gym.name,
            tax,
            ...(offer.freeMonthId && offer.waiverPaise > 0
              ? { freeMonthId: offer.freeMonthId, waiverPaise: offer.waiverPaise }
              : {}),
          }),
          status: "CREATED",
        },
      });

      res.status(200).json({
        razorpayOrderId: order.id,
        keyId,
        amount: chargePaise,
        waiverPaise: offer.waiverPaise,
        currency: "INR",
        gymId: quote.gym.id,
        gymName: quote.gym.name,
        tax,
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
        // Direct accept mode for testing. An open free month is used after the cycle is granted.
        const targetGymId = primaryGymId || "83431d3a-313a-450c-b78e-62732160b6ef";
        const granted = await prisma.$transaction(async (tx) => {
          const activated = await activatePaidMembership(tx, req.dbUserId!, {
            primaryGymId: targetGymId,
            gymName,
            planId,
            gymPlanId,
          });
          const waiverPaise = await redeemOpenFreeMonth(tx, req.dbUserId!, activated.pricePaise);
          return { activated, waiverPaise };
        });
        const result = granted.activated;
        const chargePaise = result.pricePaise - granted.waiverPaise;

        res.status(201).json({
          membership: hideSupplierGstin({
            ...result.membership,
            gymName: result.gym.name,
            plan: result.membership.plan
              ? { ...result.membership.plan, priceINR: result.membership.plan.priceInPaise / 100 }
              : null,
            cycleNumber: result.nextCycleNumber,
            maxCycles: 12,
          }),
          newCreditBalance: result.wallet.balance,
          amount: chargePaise,
          waiverPaise: granted.waiverPaise,
          tax: membershipTaxBranches({
            grossPaise: chargePaise,
            gymGstRegistered: result.gym.isGstRegistered === true,
          }),
          message: granted.waiverPaise > 0 && chargePaise === 0
            ? "Your free referral month is active."
            : "Membership activated (test mode direct accept).",
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
          ? hideSupplierGstin({
              ...membership,
              plan: membership.plan
                ? { ...membership.plan, priceINR: membership.plan.priceInPaise / 100 }
                : null,
              cycleNumber: membership.cycleNumber,
              maxCycles: 12,
            })
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
