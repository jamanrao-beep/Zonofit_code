import crypto from "crypto";
import Razorpay from "razorpay";
import prisma from "../lib/prisma";
import { createError } from "../middleware/errorHandler";
import { activatePaidMembership } from "./membershipActivate";

export interface PaymentMeta {
  planId?: string | null;
  gymPlanId?: string | null;
  primaryGymId?: string;
  gymName?: string | null;
}

function badSecret(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed.length < 8 || /placeholder/i.test(trimmed);
}

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (badSecret(keyId) || badSecret(keySecret)) {
    throw createError("Card payments are not configured on the server.", 503, "PaymentsNotConfigured");
  }
  return { keyId: keyId!, keySecret: keySecret! };
}

export function getRazorpay() {
  const { keyId, keySecret } = getRazorpayConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function safeEqual(actual: string, expected: string): boolean {
  const actualBuf = Buffer.from(actual);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { keySecret } = getRazorpayConfig();
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(signature, expected);
}

export function verifyWebhookSignature(rawBody: Buffer, header: string | undefined): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (badSecret(secret) || !header) return false;
  const expected = crypto.createHmac("sha256", secret!).update(rawBody).digest("hex");
  return safeEqual(header, expected);
}

async function grantPurchase(
  tx: any,
  order: { userId: string; creditsToAdd: number; cashToAddPaise: number; razorpayOrderId: string },
  referenceId: string
) {
  const wallet = await tx.creditWallet.findUnique({ where: { userId: order.userId } });
  if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");

  const updatedWallet = await tx.creditWallet.update({
    where: { userId: order.userId },
    data: {
      balance: { increment: order.creditsToAdd },
      nonConvertibleCashBalanceInPaise: { increment: order.cashToAddPaise },
    },
  });

  await tx.creditTransaction.create({
    data: {
      userId: order.userId,
      walletId: wallet.id,
      type: "PURCHASE",
      amount: order.creditsToAdd,
      balanceAfter: updatedWallet.balance,
      description: order.creditsToAdd > 0
        ? `Purchased ${order.creditsToAdd} credits`
        : `Topped up ₹${order.cashToAddPaise / 100}`,
      referenceId,
    },
  });
}

/**
 * Marks a Razorpay order paid and applies credits, cash, or membership once.
 * `paidPaise` must match the order when the gateway reports an amount.
 */
export async function fulfillPaymentOrder(input: {
  razorpayOrderId: string;
  referenceId: string;
  paidPaise?: number;
  userId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await (tx as any).paymentOrder.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
    });
    if (!order) throw createError("Payment order not found.", 404, "OrderNotFound");
    if (input.userId && order.userId !== input.userId) {
      throw createError("This payment does not belong to you.", 403, "Forbidden");
    }
    if (order.status === "FULFILLED") return order;
    if (typeof input.paidPaise === "number" && input.paidPaise !== order.amountPaise) {
      throw createError("Paid amount does not match the order.", 400, "AmountMismatch");
    }

    if (order.status === "CREATED") {
      const claimed = await (tx as any).paymentOrder.updateMany({
        where: { razorpayOrderId: order.razorpayOrderId, status: "CREATED" },
        data: { status: "PAID" },
      });
      if (claimed.count !== 1) {
        const latest = await (tx as any).paymentOrder.findUnique({ where: { razorpayOrderId: order.razorpayOrderId } });
        if (latest?.status === "FULFILLED") return latest;
        throw createError("Payment is already being processed.", 409, "PaymentConflict");
      }
    }

    const meta = order.metaJson ? JSON.parse(order.metaJson) as PaymentMeta : {};
    if (order.purpose === "MEMBERSHIP") {
      if (!meta.primaryGymId) throw createError("Membership payment is missing a gym.", 400, "GymRequired");
      await activatePaidMembership(tx, order.userId, {
        planId: meta.planId,
        gymPlanId: meta.gymPlanId,
        primaryGymId: meta.primaryGymId,
        gymName: meta.gymName,
      });
    } else {
      await grantPurchase(tx, order, input.referenceId);
    }

    return (tx as any).paymentOrder.update({
      where: { razorpayOrderId: order.razorpayOrderId },
      data: { status: "FULFILLED" },
    });
  });
}
