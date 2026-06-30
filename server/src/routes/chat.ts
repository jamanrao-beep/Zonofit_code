import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── GET /api/chat/:gymId ─────────────────────────────────────────────────────
/**
 * Returns the chat history between the current user and the specified gym.
 */
router.get("/:gymId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const gymId = req.params.gymId as string;

  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  if (!gym) {
    res.status(404).json({ error: "GymNotFound", message: "Gym not found." });
    return;
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      userId: req.dbUserId!,
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
router.post(
  "/:gymId",
  requireAuth,
  [body("text").isString().notEmpty().withMessage("Message text is required.")],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const gymId = req.params.gymId as string;
    const { text } = req.body as { text: string };

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym) {
      res.status(404).json({ error: "GymNotFound", message: "Gym not found." });
      return;
    }

    const message = await prisma.chatMessage.create({
      data: {
        userId: req.dbUserId!,
        gymId,
        sender: "USER",
        text,
      },
    });

    res.status(201).json(message);
  }
);

export default router;
