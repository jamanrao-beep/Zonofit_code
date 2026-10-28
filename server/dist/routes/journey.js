"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ─── GET /api/journey ────────────────────────────────────────────────────────
/**
 * Returns user progress, milestones, badges, and challenges
 */
router.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.dbUserId;
        const user = await prisma_1.default.user.findUnique({
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
        const allBadges = await prisma_1.default.badge.findMany();
        const allMilestones = await prisma_1.default.milestone.findMany({ orderBy: { targetCount: 'asc' } });
        const allChallenges = await prisma_1.default.challenge.findMany();
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
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch journey data" });
    }
});
exports.default = router;
//# sourceMappingURL=journey.js.map