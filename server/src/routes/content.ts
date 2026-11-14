import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// ─── GET /api/content/settings ──────────────────────────────────────────────
router.get("/settings", async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" }
    });

    res.json({
      success: true,
      settings: {
        creditPurchasePrice: settings?.creditPurchasePrice ?? 10,
        creditConversionValue: settings?.creditConversionValue ?? 8,
        cashExpiryDays: settings?.cashExpiryDays ?? 15,
        initialVisitCut: settings?.initialVisitCut ?? 10,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

const DEFAULT_CONTENT: Record<string, string> = {
  daily_motivation_quote: "Consistency beats intensity. You've already outperformed the person who stayed home.",
  refund_policy: `ZONOFIT REFUND & CANCELLATION POLICY\n\n1. General Policy\nMemberships and access credits purchased on ZonoFit are non-refundable once activated and utilized.\n\n2. Plan Cancellation\nIf you have not booked or utilized any visits within 48 hours of purchase, you may request a review for cancellation.\n\n3. Gym Transfer / Prior Membership\nIf inaccurate prior gym membership info was submitted, refunds can be capped at 50% upon review.\n\n4. Contact\nFor refund inquiries, reach out to support@zonofit.com.`,
  terms_and_conditions: `ZONOFIT TERMS AND CONDITIONS\n\n1. Acceptance of Terms\nBy creating an account or using ZonoFit, you agree to these terms.\n\n2. Membership & Credits\nCredits remain active for the duration of an active membership.\n\n3. Partner Gym Access\nUsers must present a valid active check-in pass to enter partner gyms.`,
  privacy_policy: `ZONOFIT PRIVACY POLICY\n\n1. Data Collection\nWe collect only essential information required to provide flexible gym access and booking services.\n\n2. Data Protection\nYour information is protected with industry-standard security measures.`,
  disclaimer: `ZONOFIT DISCLAIMER\n\n1. Health & Safety\nConsult a physician before beginning any physical exercise regimen.\n\n2. Partner Gym Liability\nPartner facilities maintain their own safety rules and operational guidelines.`,
  gym_partner_agreement: `ZONOFIT GYM PARTNER AGREEMENT\n\nStandard terms governing gym partner participation, check-in validation, and settlement cycles.`,
};

// ─── GET /api/content/:key ────────────────────────────────────────────────
/**
 * Fetches public system content by key (e.g. faq_general, terms_and_conditions)
 */
router.get("/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key as string;
    
    const content = await prisma.systemContent.findUnique({
      where: { key }
    });

    if (!content) {
      if (DEFAULT_CONTENT[key]) {
        res.json({
          success: true,
          content: {
            key,
            value: DEFAULT_CONTENT[key]
          }
        });
        return;
      }
      res.status(404).json({ error: "NotFound", message: "Content not found for key: " + key });
      return;
    }

    res.json({
      success: true,
      content: {
        key: content.key,
        value: content.value
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

export default router;
