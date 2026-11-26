import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { fulfillPaymentOrder } from "../services/payments";
import {
  challengeUrlForAmount,
  confirmPluralPayment,
  createPluralUpiIntent,
  isPluralConfigured,
  verifyPluralReturnSignature,
  verifyPluralWebhookSignature,
} from "../services/plural";

const router = Router();

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

function returnFields(req: Request): Record<string, string> {
  const merged: Record<string, unknown> = {
    ...(req.query && typeof req.query === "object" ? req.query : {}),
    ...(req.body && typeof req.body === "object" ? req.body : {}),
  };
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (key === "signature") continue;
    const text = textValue(value);
    if (text) fields[key] = text;
  }
  return fields;
}

function safeOrderId(value: string): string {
  return /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : "";
}

function webhookEvent(payload: unknown): { event: string; orderId: string; status: string } {
  const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const data = body.data && typeof body.data === "object" ? body.data as Record<string, unknown> : {};
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
router.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody || !verifyPluralWebhookSignature(rawBody, req.headers)) {
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
    const paid = await confirmPluralPayment(orderId);
    if (!paid) {
      if (event === "ORDER_PROCESSED") {
        res.status(500).json({ error: "NotYetProcessed" });
        return;
      }
      res.status(200).json({ status: "received" });
      return;
    }
    await fulfillPaymentOrder({
      gatewayOrderId: paid.orderId,
      referenceId: paid.paymentId,
      paidPaise: paid.amountPaise,
    });
    console.log(`[Plural Webhook] Fulfilled order ${paid.orderId}.`);
  } catch (err: unknown) {
    const coded = err as { code?: string; statusCode?: number; message?: string };
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
router.post(
  "/verify",
  requireAuth,
  [body("orderId").isString().notEmpty().withMessage("Order ID required.")],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    if (!isPluralConfigured()) {
      res.status(503).json({ error: "PluralNotConfigured", message: "Card payments are not configured." });
      return;
    }

    const { orderId } = req.body as { orderId: string };

    try {
      const order = await (prisma as any).paymentOrder.findFirst({
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

      const paid = await confirmPluralPayment(order.gatewayOrderId);
      if (!paid) {
        res.status(400).json({
          success: false,
          status: order.status,
          message: "Payment is pending or not yet confirmed by Pine Labs.",
        });
        return;
      }

      await fulfillPaymentOrder({
        gatewayOrderId: order.gatewayOrderId,
        referenceId: paid.paymentId,
        paidPaise: paid.amountPaise,
        userId: req.dbUserId,
      });

      res.json({ success: true, status: "FULFILLED", message: "Payment verified and fulfilled." });
    } catch (err: unknown) {
      const coded = err as { statusCode?: number; code?: string; message?: string };
      const status = coded.statusCode || 500;
      console.error("[Plural Verify] Verification failed:", coded.code || coded.message || "error");
      res.status(status).json({
        error: coded.code || "VerificationFailed",
        message: status === 404
          ? "Pine Labs could not find this payment."
          : "Failed to verify payment.",
      });
    }
  }
);

const upiIntentJobs = new Map<string, Promise<string | null>>();
const upiIntentCache = new Map<string, string>();

function readMeta(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/**
 * POST /api/payments/plural/upi-intent
 * Returns Pine Labs' UPI app link for this order. The amount comes from the
 * stored order. Opening the link does not grant credits.
 */
router.post(
  "/upi-intent",
  requireAuth,
  [body("orderId").isString().notEmpty().withMessage("Order ID required.")],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }
    if (!isPluralConfigured()) {
      res.status(503).json({ error: "PluralNotConfigured", message: "Card payments are not configured." });
      return;
    }

    const { orderId } = req.body as { orderId: string };
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(orderId)) {
      res.status(400).json({ error: "ValidationError", message: "Order ID required." });
      return;
    }

    try {
      const order = await (prisma as any).paymentOrder.findFirst({
        where: { gatewayOrderId: orderId, userId: req.dbUserId },
      });
      if (!order) {
        res.status(404).json({ error: "OrderNotFound", message: "Payment order not found." });
        return;
      }
      if (order.status === "FULFILLED") {
        res.json({ success: true, status: "FULFILLED", upiUrl: null });
        return;
      }
      if (order.status !== "CREATED") {
        res.status(409).json({ error: "PaymentConflict", message: "This payment can no longer be started." });
        return;
      }
      if (!Number.isInteger(order.amountPaise) || order.amountPaise < 100) {
        res.status(400).json({ error: "AmountTooSmall", message: "This payment cannot be opened in a UPI app." });
        return;
      }

      const remembered = upiIntentCache.get(order.gatewayOrderId);
      const rememberedUrl = remembered ? challengeUrlForAmount(remembered, order.amountPaise) : null;
      if (rememberedUrl) {
        res.json({ upiUrl: rememberedUrl });
        return;
      }

      const running = upiIntentJobs.get(order.gatewayOrderId);
      const job = running || (async (): Promise<string | null> => {
        const fresh = await (prisma as any).paymentOrder.findFirst({
          where: { gatewayOrderId: order.gatewayOrderId, userId: req.dbUserId, status: "CREATED" },
        });
        if (!fresh) return null;
        const meta = readMeta(fresh.metaJson);
        const cached = typeof meta.upiChallengeUrl === "string"
          ? challengeUrlForAmount(meta.upiChallengeUrl, fresh.amountPaise)
          : null;
        if (cached) {
          upiIntentCache.set(fresh.gatewayOrderId, cached);
          return cached;
        }
        if (meta.upiIntentBlocked === true) return null;

        const challenge = await createPluralUpiIntent(fresh.gatewayOrderId, fresh.amountPaise);
        if (challenge.url) upiIntentCache.set(fresh.gatewayOrderId, challenge.url);
        const nextMeta = {
          ...readMeta(fresh.metaJson),
          ...(challenge.url
            ? { upiChallengeUrl: challenge.url }
            : challenge.blockRetry
              ? { upiIntentBlocked: true }
              : {}),
        };
        if (challenge.url || challenge.blockRetry) {
          try {
            await (prisma as any).paymentOrder.update({
              where: { gatewayOrderId: fresh.gatewayOrderId },
              data: { metaJson: JSON.stringify(nextMeta) },
            });
          } catch (saveErr: unknown) {
            const message = saveErr instanceof Error ? saveErr.message : "error";
            console.error("[Plural UPI] Saved the app link in memory only:", message);
          }
        }
        return challenge.url;
      })().finally(() => {
        upiIntentJobs.delete(order.gatewayOrderId);
      });
      if (!running) upiIntentJobs.set(order.gatewayOrderId, job);

      const upiUrl = await job;
      if (!upiUrl) {
        res.status(502).json({
          error: "UpiIntentUnavailable",
          message: "UPI app pay is not available for this payment. Use the page below.",
        });
        return;
      }
      res.json({ upiUrl });
    } catch (err: unknown) {
      const coded = err as { message?: string };
      console.error("[Plural UPI] Could not create an app link:", coded.message || "error");
      res.status(500).json({
        error: "UpiIntentFailed",
        message: "UPI app pay is not available for this payment. Use the page below.",
      });
    }
  }
);

/**
 * GET/POST /api/payments/plural/callback
 * Browser return from hosted checkout. This page does not grant credits.
 */
router.all("/callback", async (req: Request, res: Response): Promise<void> => {
  const fields = returnFields(req);
  const orderId = safeOrderId(fields.order_id || "");
  const status = (fields.status || fields.payment_status || "").toUpperCase();
  const signature = textValue(req.query.signature || req.body?.signature);
  const signed = verifyPluralReturnSignature(fields, signature);
  const paid = status === "PROCESSED" && signed;
  const failed = !paid && (
    status === "FAILED" ||
    status === "CANCELLED" ||
    Boolean(fields.error_code)
  );

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

export default router;
