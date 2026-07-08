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
        creditPurchasePrice: settings?.creditPurchasePrice || 10,
        creditConversionValue: settings?.creditConversionValue || 8,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

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
