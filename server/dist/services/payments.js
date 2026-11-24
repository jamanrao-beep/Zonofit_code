"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fulfillPaymentOrder = fulfillPaymentOrder;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const referralRewards_1 = require("../lib/referralRewards");
const membershipActivate_1 = require("./membershipActivate");
const notifications_1 = require("./notifications");
async function grantPurchase(tx, order, referenceId) {
    const wallet = await tx.creditWallet.findUnique({ where: { userId: order.userId } });
    if (!wallet)
        throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
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
 * The stored gateway order id is the `razorpayOrderId` column.
 * `paidPaise` must match the order when the gateway reports an amount.
 */
async function fulfillPaymentOrder(input) {
    return prisma_1.default.$transaction(async (tx) => {
        const order = await tx.paymentOrder.findFirst({
            where: {
                OR: [
                    { razorpayOrderId: input.razorpayOrderId },
                    { metaJson: { contains: input.razorpayOrderId } },
                ],
            },
        });
        if (!order)
            throw (0, errorHandler_1.createError)("Payment order not found.", 404, "OrderNotFound");
        if (input.userId && order.userId !== input.userId) {
            throw (0, errorHandler_1.createError)("This payment does not belong to you.", 403, "Forbidden");
        }
        if (order.status === "FULFILLED")
            return order;
        if (typeof input.paidPaise === "number" && input.paidPaise !== order.amountPaise) {
            throw (0, errorHandler_1.createError)("Paid amount does not match the order.", 400, "AmountMismatch");
        }
        if (order.status === "CREATED") {
            const claimed = await tx.paymentOrder.updateMany({
                where: { razorpayOrderId: order.razorpayOrderId, status: "CREATED" },
                data: { status: "PAID" },
            });
            if (claimed.count !== 1) {
                const latest = await tx.paymentOrder.findUnique({ where: { razorpayOrderId: order.razorpayOrderId } });
                if (latest?.status === "FULFILLED")
                    return latest;
                throw (0, errorHandler_1.createError)("Payment is already being processed.", 409, "PaymentConflict");
            }
        }
        const meta = order.metaJson ? JSON.parse(order.metaJson) : {};
        if (order.purpose === "MEMBERSHIP") {
            if (!meta.primaryGymId)
                throw (0, errorHandler_1.createError)("Membership payment is missing a gym.", 400, "GymRequired");
            await (0, membershipActivate_1.activatePaidMembership)(tx, order.userId, {
                planId: meta.planId,
                gymPlanId: meta.gymPlanId,
                primaryGymId: meta.primaryGymId,
                gymName: meta.gymName,
            });
            if (meta.freeMonthId && (meta.waiverPaise ?? 0) > 0) {
                try {
                    const redeemed = await (0, referralRewards_1.redeemFreeMonth)(tx, order.userId, meta.freeMonthId);
                    if (!redeemed)
                        console.warn("[referral] free month was not redeemed");
                }
                catch {
                    console.warn("[referral] free month was not redeemed");
                }
            }
            await (0, notifications_1.sendPushNotification)(order.userId, "Membership activated", `Your membership at ${meta.gymName || "your primary gym"} is now active! 10 primary visits and credits are ready in your wallet.`).catch(() => { });
        }
        else {
            await grantPurchase(tx, order, input.referenceId);
        }
        return tx.paymentOrder.update({
            where: { razorpayOrderId: order.razorpayOrderId },
            data: { status: "FULFILLED" },
        });
    });
}
//# sourceMappingURL=payments.js.map