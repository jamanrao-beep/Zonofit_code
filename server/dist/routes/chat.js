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
// ─── GET /api/chat/:gymId ─────────────────────────────────────────────────────
/**
 * Returns the chat history between the current user and the specified gym.
 */
router.get("/:gymId", auth_1.requireAuth, async (req, res) => {
    const gymId = req.params.gymId;
    const gym = await prisma_1.default.gym.findUnique({ where: { id: gymId } });
    if (!gym) {
        res.status(404).json({ error: "GymNotFound", message: "Gym not found." });
        return;
    }
    const messages = await prisma_1.default.chatMessage.findMany({
        where: {
            userId: req.dbUserId,
            gymId,
        },
        orderBy: { createdAt: "asc" },
    });
    res.json(messages);
});
// ─── POST /api/chat/:gymId ────────────────────────────────────────────────────
/**
 * Send a message to the gym. For now this is one-way (User -> Gym).
 */
router.post("/:gymId", auth_1.requireAuth, [(0, express_validator_1.body)("text").isString().notEmpty().withMessage("Message text is required.")], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const gymId = req.params.gymId;
    const { text } = req.body;
    const gym = await prisma_1.default.gym.findUnique({ where: { id: gymId } });
    if (!gym) {
        res.status(404).json({ error: "GymNotFound", message: "Gym not found." });
        return;
    }
    const message = await prisma_1.default.chatMessage.create({
        data: {
            userId: req.dbUserId,
            gymId,
            sender: "USER",
            text,
        },
    });
    res.status(201).json(message);
});
exports.default = router;
//# sourceMappingURL=chat.js.map