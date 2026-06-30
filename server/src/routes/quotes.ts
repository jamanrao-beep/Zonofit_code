import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// ─── GET /api/quotes/daily ───────────────────────────────────────────────────
/**
 * Returns a dynamic daily quote. For MVP, we'll pick a random one.
 */
router.get("/daily", async (req: Request, res: Response) => {
  try {
    const quotes = await prisma.quote.findMany();
    if (quotes.length === 0) {
      res.json({ text: "Consistency beats intensity. Just show up today." });
      return;
    }
    const randomIndex = Math.floor(Math.random() * quotes.length);
    res.json(quotes[randomIndex]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

export default router;
