import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  CREDIT_CONSTANTS,
  creditsToDisplayINR,
} from "../lib/constants";
import { decrementConvertibleCash, decrementCredits } from "../lib/wallet";
import { createError } from "../middleware/errorHandler";
import { sendPushNotification } from "../services/notifications";
import { fulfillPaymentOrder, getRazorpay, getRazorpayConfig, verifyCheckoutSignature, verifyWebhookSignature } from "../services/payments";
import { getSystemSettings } from "../services/settings";

const router = Router();

// ─── GET /api/credits/balance ─────────────────────────────────────────────────
/**
 * Returns the authoritative credit balance and wallet info for the
 * authenticated user. The mobile app should call this on screen focus
 * and after any mutation — never trust a locally cached balance.
 */
router.get(
  "/balance",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const wallet = await prisma.creditWallet.findUnique({
      where: { userId: req.dbUserId! },
      include: {
        user: {
          include: {
            membership: {
              include: { 
                plan: true,
                gymPlan: true,
                primaryGym: { select: { id: true, name: true, city: true, address: true } }
              },
            },
          },
        },
      },
    });

    if (!wallet) {
      res.status(404).json({ error: "WalletNotFound", message: "Wallet not found." });
      return;
    }

    const now = new Date();
    const membership = wallet.user.membership;
    const isExpired = membership ? (membership.endDate < now || membership.status === "EXPIRED") : true;

    const convertibleCashINR = wallet.convertibleCashBalanceInPaise / 100;
    const isCashValid = !!(wallet.cashExpiryDate && wallet.cashExpiryDate > now && convertibleCashINR > 0);
    const inrWalletDaysRemaining = isCashValid
      ? Math.ceil((wallet.cashExpiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const daysRemaining = membership && !isExpired
      ? Math.ceil((membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const cycleNumber = membership?.cycleNumber || 1;
    const maxCycles = 12;
    const cyclesRemaining = Math.max(0, maxCycles - cycleNumber);
    const mandatoryVisits = membership?.mandatoryVisits || 10;
    const completedVisits = membership?.completedVisits || 0;
    const mandatoryVisitsRemaining = Math.max(0, mandatoryVisits - completedVisits);

    // Can repurchase/renew if expired OR within 3 days of expiry
    const canRepurchase = !!membership && (isExpired || daysRemaining <= 3) && cycleNumber <= maxCycles;
    const canBuyAdditionalCredits = !!membership && !isExpired;

    res.json({
      balance: wallet.balance,
      displayValueINR: creditsToDisplayINR(wallet.balance),
      convertibleCashBalanceINR: convertibleCashINR,
      nonConvertibleCashBalanceINR: wallet.nonConvertibleCashBalanceInPaise / 100,
      inrWallet: {
        balanceINR: convertibleCashINR,
        daysRemaining: inrWalletDaysRemaining,
        isValid: isCashValid,
        expiryDate: wallet.cashExpiryDate,
      },
      membership: membership
        ? {
            status: isExpired ? "EXPIRED" : membership.status,
            isExpired,
            isExpiringSoon: !isExpired && daysRemaining <= 3,
            tier: membership.plan ? membership.plan.tier : "STANDARD",
            planName: membership.plan ? membership.plan.name : "Plan",
            gymName: membership.primaryGym?.name || "ZonoFit Partner Gym",
            endDate: membership.endDate,
            daysRemaining,
            cycleNumber,
            maxCycles,
            cyclesRemaining,
            mandatoryVisits,
            completedVisits,
            mandatoryVisitsRemaining,
            canRepurchase,
            canBuyAdditionalCredits,
            creditExpiryDate: new Date(
              membership.endDate.getTime() +
                CREDIT_CONSTANTS.CREDITS_EXPIRE_DAYS_AFTER_MEMBERSHIP *
                  24 *
                  60 *
                  60 *
                  1000
            ),
          }
        : null,
    });
  }
);

// ─── GET /api/credits/transactions ───────────────────────────────────────────
/**
 * Returns paginated credit transaction history for the authenticated user.
 */
router.get(
  "/transactions",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await prisma.$transaction([
      prisma.creditTransaction.findMany({
        where: { userId: req.dbUserId! },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          booking: {
            include: { gym: { select: { name: true } } },
          },
        },
      }),
      prisma.creditTransaction.count({ where: { userId: req.dbUserId! } }),
    ]);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

// ─── POST /api/credits/convert ────────────────────────────────────────────────
/**
 * Converts fitness credits to withdrawable INR cash.
 * Rate: 1 credit = ₹8 (not ₹10 — the asymmetry is intentional).
 *
 * This is a trust-boundary operation — never compute this client-side.
 */
router.post(
  "/convert",
  requireAuth,
  [
    body("credits")
      .isInt({ min: CREDIT_CONSTANTS.MIN_CREDITS_FOR_CONVERSION })
      .withMessage(
        `Minimum ${CREDIT_CONSTANTS.MIN_CREDITS_FOR_CONVERSION} credits required for conversion.`
      ),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { credits } = req.body as { credits: number };
    const settings = await getSystemSettings();
    const cashINR = credits * settings.creditConversionValue;
    const cashPaise = cashINR * 100;

    // Atomic transaction — deduct credits and add cash in one DB operation
    const result = await prisma.$transaction(async (tx) => {
      const debited = await decrementCredits(tx, req.dbUserId!, credits);
      const updatedWallet = await tx.creditWallet.update({
        where: { id: debited.id },
        data: { convertibleCashBalanceInPaise: { increment: cashPaise } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: req.dbUserId!,
          walletId: debited.id,
          type: "CONVERSION",
          amount: -credits,
          balanceAfter: updatedWallet.balance,
          description: `Converted ${credits} credits to ₹${cashINR} cash`,
        },
      });

      return updatedWallet;
    });

    res.json({
      creditsConverted: credits,
      cashAddedINR: cashINR,
      newCreditBalance: result.balance,
      newConvertibleCashBalanceINR: result.convertibleCashBalanceInPaise / 100,
      message: `${credits} credits converted to ₹${cashINR}.`,
    });
  }
);

// ─── POST /api/credits/create-order ──────────────────────────────────────────
/**
 * Step 1: Create an order in our DB and fetch an Order ID from Razorpay.
 */
router.post(
  "/create-order",
  requireAuth,
  [
    body("credits")
      .isInt({ min: 10 })
      .withMessage("Minimum purchase is 10 credits and must be a whole number."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { credits } = req.body;

    // Verify user has an active membership (PRD Rule #6, #7, #11)
    const membership = await prisma.membership.findFirst({
      where: {
        userId: req.dbUserId!,
        status: "ACTIVE",
        endDate: { gt: new Date() },
      },
    });

    if (!membership) {
      res.status(400).json({
        error: "ActiveMembershipRequired",
        message: "Additional credits can only be purchased while your membership is active.",
      });
      return;
    }

    const settings = await getSystemSettings();
    const amountINR = credits * settings.creditPurchasePrice;
    const amountPaise = amountINR * 100;

    try {
      const razorpay = getRazorpay();
      const { keyId } = getRazorpayConfig();
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: `cr_${Date.now()}`,
      });

      await (prisma as any).paymentOrder.create({
        data: {
          userId: req.dbUserId!,
          razorpayOrderId: order.id,
          amountPaise: amountPaise,
          creditsToAdd: credits,
          purpose: "CREDITS",
          status: "CREATED",
        },
      });

      res.status(200).json({
        razorpayOrderId: order.id,
        keyId,
        amount: order.amount,
        currency: order.currency,
        credits,
      });
    } catch (error: any) {
      const status = error.statusCode || error.status || 500;
      console.error("Razorpay order creation failed");
      res.status(status).json({
        error: error.code || "PaymentOrderFailed",
        message: status === 503 ? error.message : "Failed to create payment order",
      });
    }
  }
);

// ─── POST /api/credits/webhook ───────────────────────────────────────────────
/**
 * Step 2: Razorpay calls this securely when payment succeeds.
 */
router.post(
  "/webhook",
  async (req: Request, res: Response): Promise<void> => {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const signatureHeader = req.headers["x-razorpay-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!rawBody || !verifyWebhookSignature(rawBody, signature)) {
      res.status(400).send("Invalid signature");
      return;
    }

    const event = req.body?.event;
    if (event !== "payment.captured") {
      res.status(200).send("OK");
      return;
    }

    const payment = req.body?.payload?.payment?.entity;
    const orderId = payment?.order_id as string | undefined;
    const referenceId = payment?.id as string | undefined;
    if (!orderId || !referenceId) {
      res.status(200).send("OK");
      return;
    }

    try {
      const paidPaise = typeof payment.amount === "number" ? payment.amount : undefined;
      const fulfilled = await fulfillPaymentOrder({
        razorpayOrderId: orderId,
        referenceId,
        paidPaise,
      });

      if (fulfilled?.creditsToAdd > 0) {
        sendPushNotification(
          fulfilled.userId,
          "Credits Purchased",
          `You successfully purchased ${fulfilled.creditsToAdd} credits.`
        ).catch(() => {});
      } else if (fulfilled?.cashToAddPaise > 0) {
        sendPushNotification(
          fulfilled.userId,
          "Wallet Top Up",
          `You successfully added ₹${fulfilled.cashToAddPaise / 100} to your wallet.`
        ).catch(() => {});
      }

      res.status(200).send("OK");
    } catch (err: any) {
      console.error("Webhook processing error");
      const status = err.statusCode || 500;
      res.status(status >= 500 ? 500 : 400).send("Payment could not be applied");
    }
  }
);

// ─── POST /api/credits/mock-payment ───────────────────────────────────────────
/**
 * Developer utility: Simulates a successful payment webhook.
 * Only available in non-production environments to bypass Razorpay on simulators.
 */
router.post(
  "/mock-payment",
  requireAuth,
  [
    body("razorpayOrderId").isString().notEmpty().withMessage("Order ID required."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    if (process.env.NODE_ENV === "production" || process.env.ALLOW_MOCK_PAYMENTS !== "true") {
      res.status(403).json({ error: "Forbidden", message: "Mock payments are disabled." });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { razorpayOrderId } = req.body as { razorpayOrderId: string };
    const existing = await (prisma as any).paymentOrder.findUnique({ where: { razorpayOrderId } });
    if (!existing || existing.userId !== req.dbUserId) {
      res.status(404).json({ error: "OrderNotFound", message: "Payment order not found." });
      return;
    }

    try {
      await fulfillPaymentOrder({
        razorpayOrderId,
        referenceId: `mock_${Date.now()}`,
        userId: req.dbUserId,
      });
      res.json({ success: true, message: "Payment mocked successfully." });
    } catch (error: any) {
      console.error("Mock payment error");
      res.status(error.statusCode || 500).json({ error: error.code || "MockPaymentFailed", message: error.message || "Failed to mock payment" });
    }
  }
);

// ─── POST /api/credits/reconvert ──────────────────────────────────────────────
/**
 * Converts convertible cash back to fitness credits.
 * Rate: ₹10 = 1 credit.
 */
router.post(
  "/reconvert",
  requireAuth,
  [
    body("creditsToBuy")
      .isInt({ min: 1 })
      .withMessage("Must reconvert to at least 1 credit."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { creditsToBuy } = req.body as { creditsToBuy: number };
    const settings = await getSystemSettings();
    const cashRequiredPaise = creditsToBuy * settings.creditPurchasePrice * 100; // using dynamic price

    try {
      const result = await prisma.$transaction(async (tx) => {
        const debited = await decrementConvertibleCash(tx, req.dbUserId!, cashRequiredPaise);
        const updatedWallet = await tx.creditWallet.update({
          where: { id: debited.id },
          data: { balance: { increment: creditsToBuy } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: req.dbUserId!,
            walletId: updatedWallet.id,
            type: "RECONVERSION",
            amount: creditsToBuy,
            balanceAfter: updatedWallet.balance,
            description: `Converted ₹${cashRequiredPaise/100} cash back to ${creditsToBuy} credits.`,
          },
        });

        return updatedWallet;
      });

      res.json({
        creditsBought: creditsToBuy,
        cashDeductedINR: cashRequiredPaise / 100,
        newCreditBalance: result.balance,
        newConvertibleCashBalanceINR: result.convertibleCashBalanceInPaise / 100,
        message: `Successfully bought ${creditsToBuy} credits with ₹${cashRequiredPaise/100} convertible cash.`,
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || (error as any).status;
      if (statusCode) {
        res.status(statusCode).json({ error: (error as any).code, message: (error as any).message });
      } else {
        console.error("Reconvert error:", error);
        res.status(500).json({ error: "InternalError", message: "Failed to reconvert cash." });
      }
    }
  }
);

// ─── POST /api/credits/create-cash-order ──────────────────────────────────────
/**
 * Step 1 for cash top-up: Create an order to buy non-convertible cash.
 */
router.post(
  "/create-cash-order",
  requireAuth,
  [
    body("amountINR")
      .isInt({ min: 10 })
      .withMessage("Must top up at least ₹10."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { amountINR } = req.body;
    const amountPaise = amountINR * 100;

    try {
      const razorpay = getRazorpay();
      const { keyId } = getRazorpayConfig();
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: `cash_${Date.now()}`,
      });

      await (prisma as any).paymentOrder.create({
        data: {
          userId: req.dbUserId!,
          razorpayOrderId: order.id,
          amountPaise,
          creditsToAdd: 0,
          cashToAddPaise: amountPaise,
          purpose: "CASH",
          status: "CREATED",
        },
      });

      res.status(200).json({
        razorpayOrderId: order.id,
        keyId,
        amount: order.amount,
        currency: order.currency,
        cashToAddINR: amountINR,
      });
    } catch (error: any) {
      const status = error.statusCode || error.status || 500;
      console.error("Razorpay cash order creation failed");
      res.status(status).json({
        error: error.code || "PaymentOrderFailed",
        message: status === 503 ? error.message : "Failed to create cash payment order",
      });
    }
  }
);

// ─── POST /api/credits/confirm ────────────────────────────────────────────────
/**
 * Confirms a Razorpay checkout from the app and applies the order once.
 * The webhook can do the same later without granting the purchase twice.
 */
router.post(
  "/confirm",
  requireAuth,
  [
    body("razorpayOrderId").isString().notEmpty(),
    body("razorpayPaymentId").isString().notEmpty(),
    body("razorpaySignature").isString().notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body as {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    };

    try {
      if (!verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
        res.status(400).json({ error: "InvalidSignature", message: "Payment could not be verified." });
        return;
      }
      const order = await fulfillPaymentOrder({
        razorpayOrderId,
        referenceId: razorpayPaymentId,
        userId: req.dbUserId,
      });
      const wallet = await prisma.creditWallet.findUnique({ where: { userId: req.dbUserId! } });
      res.json({
        success: true,
        newCreditBalance: wallet?.balance ?? 0,
        creditsAdded: order?.creditsToAdd ?? 0,
        cashAddedINR: (order?.cashToAddPaise ?? 0) / 100,
      });
    } catch (err: any) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.code || "ConfirmFailed", message: err.message || "Payment could not be applied." });
    }
  }
);

export default router;
