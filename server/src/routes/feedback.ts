import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { memberEntries, normalizeVote, spotForUser, ideasShared, canonicalFeature } from "../lib/earlyAccess";

const router = Router();

type FeedbackRow = {
  id: string;
  userId: string;
  featureName: string;
  comment: string;
  createdAt: Date;
};

function feedbackDb() {
  return (prisma as unknown as {
    featureFeedback: {
      create: (args: { data: { userId: string; featureName: string; comment: string } }) => Promise<FeedbackRow>;
      findMany: (args: {
        select: { userId: true; featureName: true; comment: true; createdAt: true };
      }) => Promise<FeedbackRow[]>;
    };
  }).featureFeedback;
}

// GET /api/feedback/feature — this member's early-access votes and real queue spot.
router.get("/feature", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.dbUserId!;
  try {
    const rows = await feedbackDb().findMany({
      select: { userId: true, featureName: true, comment: true, createdAt: true },
    });
    res.json({ entries: memberEntries(rows, userId) });
  } catch (error) {
    console.error("Failed to load feature feedback");
    res.status(500).json({ error: "InternalServerError", message: "Could not load your early access votes." });
  }
});

// POST /api/feedback/feature
router.post("/feature", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.dbUserId!;
  const parsed = normalizeVote(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: "ValidationError", message: parsed.message });
    return;
  }

  const { vote } = parsed;
  try {
    await feedbackDb().create({
      data: {
        userId,
        featureName: vote.storedName,
        comment: vote.comment,
      },
    });

    const rows = await feedbackDb().findMany({
      select: { userId: true, featureName: true, comment: true, createdAt: true },
    });
    const key = canonicalFeature(vote.storedName) ?? vote.storedName;
    const group = rows.filter((row) => (canonicalFeature(row.featureName) ?? row.featureName) === key);
    const spot = spotForUser(group, userId) ?? 1;

    res.json({
      message: "Feedback submitted successfully!",
      featureKey: key,
      spot,
      choices: vote.choices,
      idea: vote.idea,
      ideasShared: ideasShared(vote.choices, vote.idea),
    });
  } catch (error) {
    console.error("Failed to submit feature feedback");
    res.status(500).json({ error: "InternalServerError", message: "Could not save your early access vote." });
  }
});

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
