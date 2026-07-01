import { Request, Response, Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { sendPushNotification } from "../services/notifications";

const router = Router();

// ─── GET /api/challenges ────────────────────────────────────────────────────────
/**
 * Returns all active challenges along with the authenticated user's progress.
 */
router.get(
    "/",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        try {
            // Get all challenges
            const challenges = await prisma.challenge.findMany({
                orderBy: { createdAt: "desc" },
            });

            // Get user's progress on these challenges
            const userChallenges = await prisma.userChallenge.findMany({
                where: { userId: req.dbUserId! },
            });

            const userChallengeMap = userChallenges.reduce((acc, uc) => {
                acc[uc.challengeId] = uc;
                return acc;
            }, {} as Record<string, typeof userChallenges[0]>);

            // Combine them
            const enrichedChallenges = challenges.map((challenge) => {
                const progress = userChallengeMap[challenge.id];
                return {
                    ...challenge,
                    currentCount: progress?.currentCount || 0,
                    completed: progress?.completed || false,
                };
            });

            res.json({ challenges: enrichedChallenges });
        } catch (error) {
            console.error("[Challenges API] Error fetching challenges:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
);

// ─── POST /api/challenges/:id/claim ─────────────────────────────────────────────
/**
 * Claims the reward for a completed challenge.
 */
router.post(
    "/:id/claim",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const challengeId = req.params.id as string;

            const challenge = await prisma.challenge.findUnique({
                where: { id: challengeId },
            });

            if (!challenge) {
                res.status(404).json({ error: "Challenge not found" });
                return;
            }

            const userChallenge = await prisma.userChallenge.findUnique({
                where: {
                    userId_challengeId: {
                        userId: req.dbUserId!,
                        challengeId: challengeId as string,
                    },
                },
            });

            if (!userChallenge) {
                res.status(400).json({ error: "No progress found for this challenge" });
                return;
            }

            if (userChallenge.completed) {
                res.status(400).json({ error: "Reward already claimed" });
                return;
            }

            if (userChallenge.currentCount < challenge.targetCount) {
                res.status(400).json({ error: "Challenge goal not yet reached" });
                return;
            }

            // Mark complete
            const updatedUc = await prisma.userChallenge.update({
                where: { id: userChallenge.id },
                data: { completed: true },
            });

            // Send push notification
            await sendPushNotification(
                req.dbUserId!,
                "Challenge Completed! 🎉",
                `You successfully completed the "${challenge.title}" challenge. Great work!`
            );

            res.json({
                message: "Challenge marked as completed",
                updatedUc,
            });
        } catch (error) {
            console.error("[Challenges API] Error claiming reward:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
);

export default router;
