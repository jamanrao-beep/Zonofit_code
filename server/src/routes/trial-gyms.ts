import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── GET /api/trial-gyms ─────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.dbUserId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch all trial gyms
    const trialGyms = await prisma.trialGym.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { votes: true }
        }
      }
    });

    // Determine which ones the user has voted for
    const userVotes = await prisma.trialGymVote.findMany({
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
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/trial-gyms/:id/vote ───────────────────────────────────────────
router.post("/:id/vote", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.dbUserId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const trialGymId = req.params.id as string;
    
    const trialGym = await prisma.trialGym.findUnique({ where: { id: trialGymId } });
    if (!trialGym) return res.status(404).json({ error: "Trial Gym not found" });

    // Toggle vote logic
    const existingVote = await prisma.trialGymVote.findUnique({
      where: {
        trialGymId_userId: {
          trialGymId,
          userId
        }
      }
    });

    if (existingVote) {
      await prisma.trialGymVote.delete({
        where: { id: existingVote.id }
      });
      return res.json({ message: "Vote removed", hasVoted: false });
    } else {
      await prisma.trialGymVote.create({
        data: {
          trialGymId,
          userId
        }
      });
      return res.json({ message: "Vote cast", hasVoted: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

export default router;
