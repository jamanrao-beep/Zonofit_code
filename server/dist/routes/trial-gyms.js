"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ─── GET /api/trial-gyms ─────────────────────────────────────────────────────
router.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.dbUserId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        // Fetch all trial gyms
        const trialGyms = await prisma_1.default.trialGym.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { votes: true }
                }
            }
        });
        // Determine which ones the user has voted for
        const userVotes = await prisma_1.default.trialGymVote.findMany({
            where: { userId },
            select: { trialGymId: true }
        });
        const votedSet = new Set(userVotes.map(v => v.trialGymId));
        const formattedGyms = trialGyms.map(gym => ({
            id: gym.id,
            name: gym.name,
            city: gym.city,
            area: gym.area,
            description: gym.description,
            imageUrl: gym.imageUrl,
            voteCount: gym._count.votes,
            hasVoted: votedSet.has(gym.id)
        }));
        res.json({ trialGyms: formattedGyms });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/trial-gyms/:id/vote ───────────────────────────────────────────
router.post("/:id/vote", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.dbUserId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const trialGymId = req.params.id;
        const trialGym = await prisma_1.default.trialGym.findUnique({ where: { id: trialGymId } });
        if (!trialGym)
            return res.status(404).json({ error: "Trial Gym not found" });
        // Toggle vote logic
        const existingVote = await prisma_1.default.trialGymVote.findUnique({
            where: {
                trialGymId_userId: {
                    trialGymId,
                    userId
                }
            }
        });
        if (existingVote) {
            await prisma_1.default.trialGymVote.delete({
                where: { id: existingVote.id }
            });
            return res.json({ message: "Vote removed", hasVoted: false });
        }
        else {
            await prisma_1.default.trialGymVote.create({
                data: {
                    trialGymId,
                    userId
                }
            });
            return res.json({ message: "Vote cast", hasVoted: true });
        }
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=trial-gyms.js.map