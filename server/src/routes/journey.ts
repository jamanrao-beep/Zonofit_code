import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── GET /api/journey ────────────────────────────────────────────────────────
/**
 * Returns user progress, milestones, badges, and challenges
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.dbUserId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        streak: true,
        totalWorkouts: true,
        trainingHours: true,
        identityStage: true,
        userBadges: {
          include: { badge: true }
        },
        userChallenges: {
          include: { challenge: true }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: "UserNotFound" });
      return;
    }

    const allBadges = await prisma.badge.findMany();
    const allMilestones = await prisma.milestone.findMany({ orderBy: { targetCount: 'asc' } });
    const allChallenges = await prisma.challenge.findMany();

    res.json({
      progress: {
        streak: user.streak,
        totalWorkouts: user.totalWorkouts,
        trainingHours: user.trainingHours,
        identityStage: user.identityStage,
      },
      badges: allBadges,
      userBadges: user.userBadges,
      milestones: allMilestones,
      challenges: allChallenges,
      userChallenges: user.userChallenges,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch journey data" });
  }
});

export default router;
