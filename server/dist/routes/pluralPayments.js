"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const payments_1 = require("../services/payments");
const plural_1 = require("../services/plural");
const router = (0, express_1.Router)();
function textValue(value) {
    if (typeof value === "string")
        return value.trim();
    if (Array.isArray(value) && typeof value[0] === "string")
        return value[0].trim();
    return "";
}
function returnFields(req) {
    const merged = {
        ...(req.query && typeof req.query === "object" ? req.query : {}),
        ...(req.body && typeof req.body === "object" ? req.body : {}),
    };
    const fields = {};
    for (const [key, value] of Object.entries(merged)) {
        if (key === "signature")
            continue;
        const text = textValue(value);
        if (text)
            fields[key] = text;
    }
    return fields;
}
function safeOrderId(value) {
    return /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : "";
}
function webhookEvent(payload) {
    const body = payload && typeof payload === "object" ? payload : {};
    const data = body.data && typeof body.data === "object" ? body.data : {};
    const event = textValue(body.event_type || body.eventType || body.event);
    const orderId = textValue(data.order_id || body.order_id);
    const status = textValue(data.status || body.status).toUpperCase();
    return { event, orderId, status };
}
/**
 * POST /api/payments/plural/webhook
 * Pine Labs notifies this URL. Credits are granted only after the signature
 * checks out and Get Order says the payment is PROCESSED.
 */
router.post("/webhook", async (req, res) => {
    const rawBody = req.rawBody;
    if (!rawBody || !(0, plural_1.verifyPluralWebhookSignature)(rawBody, req.headers)) {
        console.warn("[Plural Webhook] Rejected an unsigned or invalid webhook.");
        res.status(401).json({ error: "InvalidSignature" });
        return;
    }
    const { event, orderId, status } = webhookEvent(req.body);
    console.log(`[Plural Webhook] ${event || status || "event"} for order ${orderId || "unknown"}`);
    const shouldFulfill = event === "ORDER_PROCESSED" || status === "PROCESSED";
    if (!orderId || !shouldFulfill) {
        res.status(200).json({ status: "received" });
        return;
    }
    try {
        const paid = await (0, plural_1.confirmPluralPayment)(orderId);
        if (!paid) {
            if (event === "ORDER_PROCESSED") {
                res.status(500).json({ error: "NotYetProcessed" });
                return;
            }
            res.status(200).json({ status: "received" });
            return;
        }
        await (0, payments_1.fulfillPaymentOrder)({
            gatewayOrderId: paid.orderId,
            referenceId: paid.paymentId,
            paidPaise: paid.amountPaise,
        });
        console.log(`[Plural Webhook] Fulfilled order ${paid.orderId}.`);
    }
    catch (err) {
        const coded = err;
        if (coded.code === "OrderNotFound" || coded.code === "AmountMismatch" || coded.statusCode === 404) {
            console.error(`[Plural Webhook] Did not fulfill ${orderId}: ${coded.code || coded.statusCode}`);
            res.status(200).json({ status: "received" });
            return;
        }
        console.error(`[Plural Webhook] Fulfillment failed for ${orderId}: ${coded.message || "error"}`);
        res.status(500).json({ error: "FulfillmentFailed" });
        return;
    }
    res.status(200).json({ status: "received" });
});
/**
 * POST /api/payments/plural/verify
 * The app calls this after hosted checkout. Pine Labs is the source of truth.
 */
router.post("/verify", auth_1.requireAuth, [(0, express_validator_1.body)("orderId").isString().notEmpty().withMessage("Order ID required.")], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    if (!(0, plural_1.isPluralConfigured)()) {
        res.status(503).json({ error: "PluralNotConfigured", message: "Card payments are not configured." });
        return;
    }
    const { orderId } = req.body;
    try {
        const order = await prisma_1.default.paymentOrder.findFirst({
            where: {
                OR: [
                    { gatewayOrderId: orderId },
                    { metaJson: { contains: orderId } },
                ],
            },
        });
        if (!order) {
            res.status(404).json({ error: "OrderNotFound", message: "Payment order not found." });
            return;
        }
        if (order.userId !== req.dbUserId) {
            res.status(403).json({ error: "Forbidden", message: "This payment does not belong to you." });
            return;
        }
        if (order.status === "FULFILLED") {
            res.json({ success: true, status: "FULFILLED", message: "Payment already verified and fulfilled." });
            return;
        }
        const paid = await (0, plural_1.confirmPluralPayment)(order.gatewayOrderId);
        if (!paid) {
            res.status(400).json({
                success: false,
                status: order.status,
                message: "Payment is pending or not yet confirmed by Pine Labs.",
            });
            return;
        }
        await (0, payments_1.fulfillPaymentOrder)({
            gatewayOrderId: order.gatewayOrderId,
            referenceId: paid.paymentId,
            paidPaise: paid.amountPaise,
            userId: req.dbUserId,
        });
        res.json({ success: true, status: "FULFILLED", message: "Payment verified and fulfilled." });
    }
    catch (err) {
        const coded = err;
        const status = coded.statusCode || 500;
        console.error("[Plural Verify] Verification failed:", coded.code || coded.message || "error");
        res.status(status).json({
            error: coded.code || "VerificationFailed",
            message: status === 404
                ? "Pine Labs could not find this payment."
                : "Failed to verify payment.",
        });
    }
});
/**
 * GET/POST /api/payments/plural/callback
 * Browser return from hosted checkout. This page does not grant credits.
 */
router.all("/callback", async (req, res) => {
    const fields = returnFields(req);
    const orderId = safeOrderId(fields.order_id || "");
    const status = (fields.status || fields.payment_status || "").toUpperCase();
    const signature = textValue(req.query.signature || req.body?.signature);
    const signed = (0, plural_1.verifyPluralReturnSignature)(fields, signature);
    const paid = status === "PROCESSED" && signed;
    const failed = !paid && (status === "FAILED" ||
        status === "CANCELLED" ||
        Boolean(fields.error_code));
    const deepLink = `zonofit://payment/${paid ? "success" : "failure"}?order_id=${encodeURIComponent(orderId)}`;
    const title = paid ? "Payment Successful" : failed ? "Payment Not Completed" : "Confirming Payment";
    const message = paid
        ? "Your payment was confirmed. Returning you to ZonoFit."
        : failed
            ? "This payment was not completed. Return to ZonoFit to try again."
            : "Return to ZonoFit. Your wallet updates only after Pine Labs confirms the payment.";
    res
        .type("html")
        .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #F9FAFB; text-align: center; padding: 24px; box-sizing: border-box; }
    .card { background: white; padding: 36px 24px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 360px; width: 100%; }
    .icon { width: 64px; height: 64px; border-radius: 32px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px; }
    .icon.success { background: #ECFDF5; color: #166534; }
    .icon.failed { background: #FEF2F2; color: #991B1B; }
    h1 { font-size: 20px; font-weight: 800; margin: 0 0 8px; color: #111827; }
    p { font-size: 14px; color: #6B7280; line-height: 1.5; margin: 0 0 24px; }
    .btn { display: block; width: 100%; padding: 14px 0; background: #166534; color: white; border-radius: 14px; text-decoration: none; font-weight: 700; font-size: 15px; }
  </style>
  <script>
    setTimeout(function () {
      window.location.href = ${JSON.stringify(deepLink)};
    }, 1200);
  </script>
</head>
<body>
  <div class="card">
    <div class="icon ${paid ? "success" : "failed"}">${paid ? "✓" : "✕"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" href=${JSON.stringify(deepLink)}>Return to ZonoFit</a>
  </div>
</body>
</html>`);
});
exports.default = router;
//# sourceMappingURL=pluralPayments.js.map