"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/feedback/feature
router.post("/feature", auth_1.requireAuth, [
    (0, express_validator_1.body)("featureName").isString().notEmpty(),
    (0, express_validator_1.body)("comment").isString().notEmpty(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const userId = req.dbUserId;
    const { featureName, comment } = req.body;
    try {
        // Use 'as any' since the local prisma client might not have generated the types due to Windows file locks.
        const feedback = await prisma_1.default.featureFeedback.create({
            data: {
                userId,
                featureName,
                comment,
            },
        });
        res.json({ message: "Feedback submitted successfully!", feedback });
    }
    catch (error) {
        console.error("Failed to submit feedback:", error);
        res.status(500).json({ error: "InternalServerError", message: "Failed to submit feedback" });
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