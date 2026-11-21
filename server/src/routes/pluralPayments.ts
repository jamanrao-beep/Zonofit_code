import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { fulfillPaymentOrder } from "../services/payments";
import {
  getPluralOrderStatus,
  isPluralConfigured,
  verifyPluralWebhookSignature,
} from "../services/plural";

const router = Router();

/**
 * POST /api/payments/plural/webhook
 * Real-time notification from Plural / Pine Labs when an order/payment changes state.
 * Responds with 200 within 5 seconds as required by Plural.
 */
router.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const signatureHeader = req.headers["x-plural-signature"] || req.headers["x-verify"] || req.headers["signature"];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  // Verify HMAC-SHA256 signature if webhook secret is configured
  if (process.env.PLURAL_WEBHOOK_SECRET) {
    if (!rawBody || !verifyPluralWebhookSignature(rawBody, signature)) {
      console.warn("[Plural Webhook] Rejected webhook with invalid signature.");
      res.status(400).json({ error: "InvalidSignature" });
      return;
    }
  }

  const payload = req.body;
  const event = payload?.event || payload?.event_name || payload?.status || "";
  const orderId = payload?.order_id || payload?.data?.order_id || payload?.merchant_order_reference || payload?.data?.merchant_order_reference;
  const paymentId = payload?.payment_id || payload?.data?.payment_id || `plrl_${Date.now()}`;
  const status = (payload?.data?.status || payload?.status || "").toUpperCase();

  console.log(`[Plural Webhook] Received event: ${event || status} for order ${orderId}`);

  // Treat as successful if status is CHARGED, CAPTURED, SUCCESS, or event contains payment.captured / order.processed
  const isSuccess =
    status === "CHARGED" ||
    status === "CAPTURED" ||
    status === "SUCCESS" ||
    event.toLowerCase().includes("captured") ||
    event.toLowerCase().includes("success") ||
    event.toLowerCase().includes("order_processed");

  if (orderId && isSuccess) {
    try {
      await fulfillPaymentOrder({
        razorpayOrderId: String(orderId),
        referenceId: String(paymentId),
      });
      console.log(`[Plural Webhook] Order ${orderId} successfully fulfilled.`);
    } catch (err: any) {
      console.error(`[Plural Webhook] Error fulfilling order ${orderId}:`, err.message);
    }
  }

  // Acknowledge receipt within 5 seconds
  res.status(200).json({ status: "received", orderId });
});

/**
 * POST /api/payments/plural/verify
 * Client-triggered check: Queries Plural Order API server-to-server and fulfills if successful.
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

    const { orderId } = req.body;

    try {
      // Find the local order record
      const order = await (prisma as any).paymentOrder.findUnique({
        where: { razorpayOrderId: orderId },
      });

      if (!order) {
        res.status(404).json({ error: "OrderNotFound", message: "Payment order not found." });
        return;
      }

      if (order.status === "FULFILLED") {
        res.json({ success: true, status: "FULFILLED", message: "Payment already verified and fulfilled." });
        return;
      }

      // Check Plural server-to-server if configured
      let isPaid = false;
      let referenceId = `plrl_vrfy_${Date.now()}`;

      if (isPluralConfigured()) {
        try {
          const pluralOrder = await getPluralOrderStatus(orderId);
          const pluralStatus = (pluralOrder?.status || "").toUpperCase();
          if (pluralStatus === "CHARGED" || pluralStatus === "CAPTURED" || pluralStatus === "SUCCESS") {
            isPaid = true;
            referenceId = pluralOrder?.payment_id || pluralOrder?.transaction_id || referenceId;
          }
        } catch (gatewayErr: any) {
          console.warn("[Plural Verify] Server-to-server check warning:", gatewayErr.message);
        }
      } else {
        // Dev fallback if gateway is not configured
        isPaid = true;
      }

      if (isPaid) {
        await fulfillPaymentOrder({
          razorpayOrderId: orderId,
          referenceId,
          userId: req.dbUserId,
        });

        res.json({ success: true, status: "FULFILLED", message: "Payment verified and fulfilled." });
        return;
      }

      res.status(400).json({
        success: false,
        status: order.status,
        message: "Payment is pending or not yet confirmed by Pine Labs.",
      });
    } catch (err: any) {
      console.error("[Plural Verify] Verification failed:", err);
      res.status(500).json({ error: "VerificationFailed", message: err.message || "Failed to verify payment." });
    }
  }
);

/**
 * GET/POST /api/payments/plural/callback
 * Browser return URL when a user completes or cancels the hosted checkout page.
 */
router.all("/callback", async (req: Request, res: Response): Promise<void> => {
  const orderId = req.query.order_id || req.body?.order_id || req.query.merchant_order_reference || "";
  const status = (req.query.status || req.body?.status || "").toString().toLowerCase();
  const isFailed = status === "failed" || status === "cancelled";

  const deepLink = `zonofit://payment/${isFailed ? "failure" : "success"}?order_id=${encodeURIComponent(String(orderId))}`;

  // Serve a mobile-responsive landing page that deep-links back to the ZonoFit app
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isFailed ? "Payment Failed" : "Payment Successful"}</title>
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
        setTimeout(() => {
          window.location.href = "${deepLink}";
        }, 1200);
      </script>
    </head>
    <body>
      <div class="card">
        <div class="icon ${isFailed ? "failed" : "success"}">${isFailed ? "✕" : "✓"}</div>
        <h1>${isFailed ? "Payment Not Completed" : "Payment Successful!"}</h1>
        <p>${isFailed ? "Your transaction could not be processed. Please return to the app to try again." : "Your transaction has been processed. Returning you to ZonoFit..."}</p>
        <a class="btn" href="${deepLink}">Return to ZonoFit</a>
      </div>
    </body>
    </html>
  `);
});

export default router;

