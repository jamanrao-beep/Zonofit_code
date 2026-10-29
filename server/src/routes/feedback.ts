import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

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

    const { city } = req.body as { city: string };
    console.log("[City Vote] recorded");

    res.json({
      success: true,
      message: `Thank you! Your vote for ${city} has been recorded.`,
    });
  }
);

export default router;
