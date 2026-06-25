import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  CREDIT_CONSTANTS,
  creditsToCashINR,
  creditsToDisplayINR,
} from "../lib/constants";
import { createError } from "../middleware/errorHandler";

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
      cashBalanceINR: wallet.cashBalanceInPaise / 100,
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
          cashBalanceInPaise: { increment: cashPaise },
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
      newCashBalanceINR: result.cashBalanceInPaise / 100,
      message: `${credits} credits converted to ₹${cashINR}.`,
    });
  }
);

// ─── POST /api/credits/purchase ───────────────────────────────────────────────
/**
 * Records a successful credit purchase after payment gateway confirmation.
 * The payment itself is handled by Razorpay — this endpoint is called
 * after the payment webhook confirms success, NOT directly from the app.
 *
 * Flow: App → Razorpay → Razorpay Webhook → POST /api/credits/purchase
 */
router.post(
  "/purchase",
  requireAuth,
  [
    body("credits").isInt({ min: 1 }).withMessage("Credits must be a positive integer."),
    body("referenceId").isString().notEmpty().withMessage("Payment reference ID required."),
    body("amountPaidPaise").isInt({ min: 1 }).withMessage("Amount paid (in paise) required."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { credits, referenceId, amountPaidPaise } = req.body as {
      credits: number;
      referenceId: string;
      amountPaidPaise: number;
    };

    // TODO: Verify referenceId against Razorpay API before crediting
    // This prevents fake purchase requests
    // const isValid = await verifyRazorpayPayment(referenceId, amountPaidPaise);
    // if (!isValid) { res.status(400).json({ error: "PaymentVerificationFailed" }); return; }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.findUnique({
        where: { userId: req.dbUserId! },
      });

      if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");

      // Check for duplicate reference ID (idempotency)
      const existing = await tx.creditTransaction.findFirst({
        where: { referenceId },
      });
      if (existing) {
        throw createError("Duplicate payment reference.", 409, "DuplicatePayment");
      }

      const updatedWallet = await tx.creditWallet.update({
        where: { userId: req.dbUserId! },
        data: { balance: { increment: credits } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: req.dbUserId!,
          walletId: wallet.id,
          type: "PURCHASE",
          amount: credits,
          balanceAfter: updatedWallet.balance,
          description: `Purchased ${credits} credits`,
          referenceId,
        },
      });

      return updatedWallet;
    });

    res.status(201).json({
      creditsPurchased: credits,
      newBalance: result.balance,
      displayValueINR: creditsToDisplayINR(result.balance),
      message: `${credits} credits added to wallet.`,
    });
  }
);

export default router;
