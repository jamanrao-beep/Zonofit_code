import prisma from "../lib/prisma";
import { createError } from "../middleware/errorHandler";
import { redeemFreeMonth } from "../lib/referralRewards";
import { activatePaidMembership } from "./membershipActivate";
import { sendPushNotification } from "./notifications";

export interface PaymentMeta {
  planId?: string | null;
  gymPlanId?: string | null;
  primaryGymId?: string;
  gymName?: string | null;
  freeMonthId?: string | null;
  waiverPaise?: number;
}

async function grantPurchase(
  tx: any,
  order: { userId: string; creditsToAdd: number; cashToAddPaise: number; gatewayOrderId: string },
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
 * Applies a confirmed Pine Labs order once.
 * `paidPaise` must match the order when the gateway reports an amount.
 */
export async function fulfillPaymentOrder(input: {
  gatewayOrderId: string;
  referenceId: string;
  paidPaise?: number;
  userId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await (tx as any).paymentOrder.findFirst({
      where: {
        OR: [
          { gatewayOrderId: input.gatewayOrderId },
          { metaJson: { contains: input.gatewayOrderId } },
        ],
      },
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
        where: { gatewayOrderId: order.gatewayOrderId, status: "CREATED" },
        data: { status: "PAID" },
      });
      if (claimed.count !== 1) {
        const latest = await (tx as any).paymentOrder.findUnique({ where: { gatewayOrderId: order.gatewayOrderId } });
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
      if (meta.freeMonthId && (meta.waiverPaise ?? 0) > 0) {
        try {
          const redeemed = await redeemFreeMonth(tx, order.userId, meta.freeMonthId);
          if (!redeemed) console.warn("[referral] free month was not redeemed");
        } catch {
          console.warn("[referral] free month was not redeemed");
        }
      }
      await sendPushNotification(
        order.userId,
        "Membership activated",
        `Your membership at ${meta.gymName || "your primary gym"} is now active! 10 primary visits and credits are ready in your wallet.`
      ).catch(() => {});
    } else {
      await grantPurchase(tx, order, input.referenceId);
    }

    return (tx as any).paymentOrder.update({
      where: { gatewayOrderId: order.gatewayOrderId },
      data: { status: "FULFILLED" },
    });
  });
}
