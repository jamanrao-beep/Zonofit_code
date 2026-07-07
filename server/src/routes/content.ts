import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// ─── GET /api/content/:key ────────────────────────────────────────────────
/**
 * Fetches public system content by key (e.g. faq_general, terms_and_conditions)
 */
router.get("/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    
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
