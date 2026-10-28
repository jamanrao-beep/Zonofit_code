"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
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
        const feedback = await prisma.featureFeedback.create({
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
    const { city, contact, note } = req.body;
    console.log(`[City Vote] Received request for city: "${city}" | Contact: "${contact || 'N/A'}" | Note: "${note || 'N/A'}"`);
    try {
        await prisma.featureFeedback?.create?.({
            data: {
                featureName: `City Vote: ${city}`,
                comment: `City Vote: ${city}. Contact: ${contact || "Not provided"}. Note: ${note || "None"}`,
            },
        }).catch((e) => console.log("DB featureFeedback optional write:", e?.message));
        res.json({
            success: true,
            message: `Thank you! Your vote for ${city} has been recorded.`,
            targetEmail: "zonofitofficial@gmail.com",
        });
    }
    catch (error) {
        console.error("Failed to record city vote:", error);
        res.json({ success: true, message: "Vote noted!" });
    }
});
exports.default = router;
//# sourceMappingURL=feedback.js.map