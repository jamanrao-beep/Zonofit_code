import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import crypto from "crypto";
import Razorpay from "razorpay";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  CREDIT_CONSTANTS,
  creditsToCashINR,
  creditsToDisplayINR,
} from "../lib/constants";
import { createError } from "../middleware/errorHandler";

// Initialize Razorpay
// We use placeholder keys if env vars are missing so the server doesn't crash on boot
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

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
              include: { plan: true },
            },
          },
        },
      },
    });

    if (!wallet) {
      res.status(404).json({ error: "WalletNotFound", message: "Wallet not found." });
      return;
    }

    const membership = wallet.user.membership;

    res.json({
      balance: wallet.balance,
      displayValueINR: creditsToDisplayINR(wallet.balance),
      convertibleCashBalanceINR: wallet.convertibleCashBalanceInPaise / 100,
      nonConvertibleCashBalanceINR: wallet.nonConvertibleCashBalanceInPaise / 100,
      membership: membership
        ? {
            status: membership.status,
            tier: membership.plan.tier,
            planName: membership.plan.name,
            endDate: membership.endDate,
            // Credits expire 15 days after membership end
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
    const cashINR = creditsToCashINR(credits);
    const cashPaise = cashINR * 100;

    // Atomic transaction — deduct credits and add cash in one DB operation
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.findUnique({
        where: { userId: req.dbUserId! },
      });

      if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");
      if (wallet.balance < credits) {
        throw createError("Insufficient credits.", 400, "InsufficientCredits");
      }

      const updatedWallet = await tx.creditWallet.update({
        where: { userId: req.dbUserId! },
        data: {
          balance: { decrement: credits },
          convertibleCashBalanceInPaise: { increment: cashPaise },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: req.dbUserId!,
          walletId: wallet.id,
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
    body("credits").isInt({ min: 1 }).withMessage("Credits must be a positive integer."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { credits } = req.body;
    // Calculation: 1 credit = 10 INR = 1000 Paise
    const amountINR = credits * 10;
    const amountPaise = amountINR * 100;

    try {
      const options = {
        amount: amountPaise,
        currency: "INR",
        receipt: `receipt_user_${req.dbUserId}_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);

      // Save it in our DB
      const paymentOrder = await (prisma as any).paymentOrder.create({
        data: {
          userId: req.dbUserId!,
          razorpayOrderId: order.id,
          amountPaise: amountPaise,
          creditsToAdd: credits,
          status: "CREATED",
        },
      });

      res.status(200).json({
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
        credits: credits,
      });
    } catch (error) {
      console.error("Razorpay order creation failed:", error);
      res.status(500).json({ error: "Failed to create payment order" });
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
    // Note: Razorpay sends webhook payload as JSON
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "placeholder_webhook_secret";

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== req.headers["x-razorpay-signature"]) {
      console.error("Webhook signature mismatch!");
      res.status(400).send("Invalid signature");
      return;
    }

    const event = req.body.event;
    if (event === "payment.captured") {
      const payment = req.body.payload.payment.entity;
      const orderId = payment.order_id;
      const referenceId = payment.id; // payment ID

      try {
        await prisma.$transaction(async (tx) => {
          // Find the order
          const paymentOrder = await (tx as any).paymentOrder.findUnique({
            where: { razorpayOrderId: orderId },
          });

          if (!paymentOrder) {
            console.error(`Webhook error: Order ${orderId} not found.`);
            return;
          }

          if (paymentOrder.status === "PAID") {
            // Idempotency: already processed
            console.log(`Webhook note: Order ${orderId} already paid.`);
            return;
          }

          // Mark order as PAID
          await (tx as any).paymentOrder.update({
            where: { razorpayOrderId: orderId },
            data: { status: "PAID" },
          });

          // Give credits to user
          const wallet = await tx.creditWallet.findUnique({
            where: { userId: paymentOrder.userId },
          });

          if (!wallet) throw new Error("Wallet not found");

          const updatedWallet = await tx.creditWallet.update({
            where: { userId: paymentOrder.userId },
            data: { 
              balance: { increment: paymentOrder.creditsToAdd },
              nonConvertibleCashBalanceInPaise: { increment: paymentOrder.cashToAddPaise }
            },
          });

          // Record transaction
          await tx.creditTransaction.create({
            data: {
              userId: paymentOrder.userId,
              walletId: wallet.id,
              type: "PURCHASE",
              amount: paymentOrder.creditsToAdd,
              balanceAfter: updatedWallet.balance,
              description: paymentOrder.creditsToAdd > 0 
                ? `Purchased ${paymentOrder.creditsToAdd} credits via Razorpay`
                : `Topped up ₹${paymentOrder.cashToAddPaise / 100} non-convertible cash via Razorpay`,
              referenceId: referenceId, // Store payment ID here
            },
          });
        });

        res.status(200).send("OK");
      } catch (err) {
        console.error("Webhook processing error:", err);
        res.status(500).send("Internal Error");
      }
    } else {
      // Ignore other events
      res.status(200).send("OK");
    }
  }
);

// ─── POST /api/credits/deduct ─────────────────────────────────────────────────
/**
 * Generic endpoint to deduct credits from the wallet.
 */
router.post(
  "/deduct",
  requireAuth,
  [
    body("credits").isInt({ min: 1 }).withMessage("Credits must be a positive integer."),
    body("description").isString().notEmpty().withMessage("Description required."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { credits, description } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.findUnique({
        where: { userId: req.dbUserId! },
      });

      if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");
      if (wallet.balance < credits) {
        throw createError("Insufficient credits.", 400, "InsufficientCredits");
      }

      const updatedWallet = await tx.creditWallet.update({
        where: { userId: req.dbUserId! },
        data: { balance: { decrement: credits } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: req.dbUserId!,
          walletId: wallet.id,
          type: "VISIT_SPEND", // Since DEDUCTION is not in CreditTransactionType enum
          amount: -credits,
          balanceAfter: updatedWallet.balance,
          description,
        },
      });

      return updatedWallet;
    });

    res.json({
      creditsDeducted: credits,
      newBalance: result.balance,
      message: `${credits} credits deducted.`,
    });
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
    const cashRequiredPaise = creditsToBuy * 10 * 100; // ₹10 per credit

    try {
      const result = await prisma.$transaction(async (tx) => {
        const wallet = await tx.creditWallet.findUnique({
          where: { userId: req.dbUserId! },
        });

        if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");
        if (wallet.convertibleCashBalanceInPaise < cashRequiredPaise) {
          throw createError("Insufficient convertible cash.", 400, "InsufficientCash");
        }

        const updatedWallet = await tx.creditWallet.update({
          where: { userId: req.dbUserId! },
          data: {
            balance: { increment: creditsToBuy },
            convertibleCashBalanceInPaise: { decrement: cashRequiredPaise },
          },
        });

        await tx.creditTransaction.create({
          data: {
            userId: req.dbUserId!,
            walletId: wallet.id,
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
      if ((error as any).status) {
        res.status((error as any).status).json({ error: (error as any).code, message: (error as any).message });
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
      const options = {
        amount: amountPaise,
        currency: "INR",
        receipt: `receipt_cash_user_${req.dbUserId}_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);

      // Save it in our DB, note creditsToAdd is 0
      const paymentOrder = await (prisma as any).paymentOrder.create({
        data: {
          userId: req.dbUserId!,
          razorpayOrderId: order.id,
          amountPaise: amountPaise,
          creditsToAdd: 0,
          cashToAddPaise: amountPaise,
          status: "CREATED",
        },
      });

      res.status(200).json({
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
        cashToAddINR: amountINR,
      });
    } catch (error) {
      console.error("Razorpay cash order creation failed:", error);
      res.status(500).json({ error: "Failed to create cash payment order" });
    }
  }
);

export default router;
