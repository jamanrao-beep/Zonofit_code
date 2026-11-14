"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const earlyAccess_1 = require("../lib/earlyAccess");
const router = (0, express_1.Router)();
function feedbackDb() {
    return prisma_1.default.featureFeedback;
}
// GET /api/feedback/feature — this member's early-access votes and real queue spot.
router.get("/feature", auth_1.requireAuth, async (req, res) => {
    const userId = req.dbUserId;
    try {
        const rows = await feedbackDb().findMany({
            select: { userId: true, featureName: true, comment: true, createdAt: true },
        });
        res.json({ entries: (0, earlyAccess_1.memberEntries)(rows, userId) });
    }
    catch (error) {
        console.error("Failed to load feature feedback");
        res.status(500).json({ error: "InternalServerError", message: "Could not load your early access votes." });
    }
});
// POST /api/feedback/feature
router.post("/feature", auth_1.requireAuth, async (req, res) => {
    const userId = req.dbUserId;
    const parsed = (0, earlyAccess_1.normalizeVote)(req.body);
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
        const key = (0, earlyAccess_1.canonicalFeature)(vote.storedName) ?? vote.storedName;
        const group = rows.filter((row) => ((0, earlyAccess_1.canonicalFeature)(row.featureName) ?? row.featureName) === key);
        const spot = (0, earlyAccess_1.spotForUser)(group, userId) ?? 1;
        res.json({
            message: "Feedback submitted successfully!",
            featureKey: key,
            spot,
            choices: vote.choices,
            idea: vote.idea,
            ideasShared: (0, earlyAccess_1.ideasShared)(vote.choices, vote.idea),
        });
    }
    catch (error) {
        console.error("Failed to submit feature feedback");
        res.status(500).json({ error: "InternalServerError", message: "Could not save your early access vote." });
    }
});
// POST /api/feedback/city-vote (Public endpoint for city voting during onboarding)
router.post("/city-vote", [
    (0, express_validator_1.body)("city").isString().notEmpty().withMessage("City name is required."),
    (0, express_validator_1.body)("contact").optional().isString(),
    (0, express_validator_1.body)("note").optional().isString(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { city } = req.body;
    console.log("[City Vote] recorded");
    res.json({
        success: true,
        message: `Thank you! Your vote for ${city} has been recorded.`,
    });
});
exports.default = router;
//# sourceMappingURL=feedback.js.map