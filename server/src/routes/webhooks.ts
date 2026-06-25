import { Router, Request, Response } from "express";
import { createHmac } from "crypto";
import prisma from "../lib/prisma";

const router = Router();

/**
 * POST /api/webhooks/clerk
 *
 * Receives Clerk webhook events.
 * Handles: user.created, user.updated, user.deleted
 *
 * This is how a new Clerk signup becomes a User row + CreditWallet in our DB.
 * Must be configured in Clerk Dashboard → Webhooks → Add endpoint.
 * The endpoint URL: https://your-server.com/api/webhooks/clerk
 */
router.post("/clerk", async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify webhook signature from Clerk
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Webhook] CLERK_WEBHOOK_SECRET not set");
      res.status(500).json({ error: "Webhook secret not configured" });
      return;
    }

    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      res.status(400).json({ error: "Missing Svix headers" });
      return;
    }

    // Verify the signature
    const body = JSON.stringify(req.body);
    const signedContent = `${svixId}.${svixTimestamp}.${body}`;
    const secret = webhookSecret.replace("whsec_", "");
    const secretBytes = Buffer.from(secret, "base64");
    const computedSignature = createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    const signatures = svixSignature.split(" ").map((s) => s.split(",")[1]);
    const isValid = signatures.some((sig) => sig === computedSignature);

    if (!isValid) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const { type, data } = req.body;

    switch (type) {
      case "user.created": {
        const primaryEmail = data.email_addresses?.find(
          (e: { id: string; email_address: string }) =>
            e.id === data.primary_email_address_id
        );
        const primaryPhone = data.phone_numbers?.find(
          (p: { id: string; phone_number: string }) =>
            p.id === data.primary_phone_number_id
        );

        const user = await prisma.user.create({
          data: {
            clerkId: data.id,
            email: primaryEmail?.email_address ?? "",
            name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
            phone: primaryPhone?.phone_number ?? null,
            avatarUrl: data.image_url ?? null,
            // Auto-create the credit wallet with 0 balance
            wallet: {
              create: {
                balance: 0,
                cashBalanceInPaise: 0,
              },
            },
          },
        });

        console.log(`[Webhook] user.created → DB user: ${user.id}`);
        break;
      }

      case "user.updated": {
        const primaryEmail = data.email_addresses?.find(
          (e: { id: string; email_address: string }) =>
            e.id === data.primary_email_address_id
        );

        await prisma.user.update({
          where: { clerkId: data.id },
          data: {
            email: primaryEmail?.email_address,
            name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
            avatarUrl: data.image_url ?? null,
          },
        });

        console.log(`[Webhook] user.updated → clerkId: ${data.id}`);
        break;
      }

      case "user.deleted": {
        // Soft delete — mark as cancelled rather than hard delete
        // to preserve transaction history
        await prisma.membership.updateMany({
          where: { user: { clerkId: data.id }, status: "ACTIVE" },
          data: { status: "CANCELLED" },
        });
        console.log(`[Webhook] user.deleted → clerkId: ${data.id}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Webhook] Error processing webhook:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
