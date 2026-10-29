"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRazorpayConfig = getRazorpayConfig;
exports.getRazorpay = getRazorpay;
exports.verifyCheckoutSignature = verifyCheckoutSignature;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.fulfillPaymentOrder = fulfillPaymentOrder;
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const membershipActivate_1 = require("./membershipActivate");
function badSecret(value) {
    if (!value)
        return true;
    const trimmed = value.trim();
    return trimmed.length < 8 || /placeholder/i.test(trimmed);
}
function getRazorpayConfig() {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (badSecret(keyId) || badSecret(keySecret)) {
        throw (0, errorHandler_1.createError)("Card payments are not configured on the server.", 503, "PaymentsNotConfigured");
    }
    return { keyId: keyId, keySecret: keySecret };
}
function getRazorpay() {
    const { keyId, keySecret } = getRazorpayConfig();
    return new razorpay_1.default({ key_id: keyId, key_secret: keySecret });
}
function safeEqual(actual, expected) {
    const actualBuf = Buffer.from(actual);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length)
        return false;
    return crypto_1.default.timingSafeEqual(actualBuf, expectedBuf);
}
function verifyCheckoutSignature(orderId, paymentId, signature) {
    const { keySecret } = getRazorpayConfig();
    const expected = crypto_1.default.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    return safeEqual(signature, expected);
}
function verifyWebhookSignature(rawBody, header) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    if (badSecret(secret) || !header)
        return false;
    const expected = crypto_1.default.createHmac("sha256", secret).update(rawBody).digest("hex");
    return safeEqual(header, expected);
}
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
 * Marks a Razorpay order paid and applies credits, cash, or membership once.
 * `paidPaise` must match the order when the gateway reports an amount.
 */
async function fulfillPaymentOrder(input) {
    return prisma_1.default.$transaction(async (tx) => {
        const order = await tx.paymentOrder.findUnique({
            where: { razorpayOrderId: input.razorpayOrderId },
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