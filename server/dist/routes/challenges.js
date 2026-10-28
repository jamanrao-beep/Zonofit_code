"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const notifications_1 = require("../services/notifications");
const router = (0, express_1.Router)();
// ─── GET /api/challenges ────────────────────────────────────────────────────────
/**
 * Returns all active challenges along with the authenticated user's progress.
 */
router.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        // Get all challenges
        const challenges = await prisma_1.default.challenge.findMany({
            orderBy: { createdAt: "desc" },
        });
        // Get user's progress on these challenges
        const userChallenges = await prisma_1.default.userChallenge.findMany({
            where: { userId: req.dbUserId },
        });
        const userChallengeMap = userChallenges.reduce((acc, uc) => {
            acc[uc.challengeId] = uc;
            return acc;
        }, {});
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
    }
    catch (error) {
        console.error("[Challenges API] Error fetching challenges:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// ─── POST /api/challenges/:id/claim ─────────────────────────────────────────────
/**
 * Claims the reward for a completed challenge.
 */
router.post("/:id/claim", auth_1.requireAuth, async (req, res) => {
    try {
        const challengeId = req.params.id;
        const challenge = await prisma_1.default.challenge.findUnique({
            where: { id: challengeId },
        });
        if (!challenge) {
            res.status(404).json({ error: "Challenge not found" });
            return;
        }
        const userChallenge = await prisma_1.default.userChallenge.findUnique({
            where: {
                userId_challengeId: {
                    userId: req.dbUserId,
                    challengeId: challengeId,
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
        const updatedUc = await prisma_1.default.userChallenge.update({
            where: { id: userChallenge.id },
            data: { completed: true },
        });
        // Send push notification
        await (0, notifications_1.sendPushNotification)(req.dbUserId, "Challenge Completed! 🎉", `You successfully completed the "${challenge.title}" challenge. Great work!`);
        res.json({
            message: "Challenge marked as completed",
            updatedUc,
        });
    }
    catch (error) {
        console.error("[Challenges API] Error claiming reward:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=challenges.js.map