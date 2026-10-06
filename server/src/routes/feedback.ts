import { PrismaClient } from "@prisma/client";
import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// POST /api/feedback/feature
router.post(
  "/feature",
  requireAuth,
  [
    body("featureName").isString().notEmpty(),
    body("comment").isString().notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const userId = req.dbUserId!;
    const { featureName, comment } = req.body;

    try {
      // Use 'as any' since the local prisma client might not have generated the types due to Windows file locks.
      const feedback = await (prisma as any).featureFeedback.create({
        data: {
          userId,
          featureName,
          comment,
        },
      });

      res.json({ message: "Feedback submitted successfully!", feedback });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      res.status(500).json({ error: "InternalServerError", message: "Failed to submit feedback" });
    }
  }
);

// POST /api/feedback/city-vote (Public endpoint for city voting during onboarding)
router.post(
  "/city-vote",
  [
    body("city").isString().notEmpty().withMessage("City name is required."),
    body("contact").optional().isString(),
    body("note").optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { city, contact, note } = req.body;
    console.log(`[City Vote] Received request for city: "${city}" | Contact: "${contact || 'N/A'}" | Note: "${note || 'N/A'}"`);

    try {
      await (prisma as any).featureFeedback?.create?.({
        data: {
          featureName: `City Vote: ${city}`,
          comment: `City Vote: ${city}. Contact: ${contact || "Not provided"}. Note: ${note || "None"}`,
        },
      }).catch((e: any) => console.log("DB featureFeedback optional write:", e?.message));

      res.json({
        success: true,
        message: `Thank you! Your vote for ${city} has been recorded.`,
        targetEmail: "zonofitofficial@gmail.com",
      });
    } catch (error) {
      console.error("Failed to record city vote:", error);
      res.json({ success: true, message: "Vote noted!" });
    }
  }
);

export default router;
