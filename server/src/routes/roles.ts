import { Router, Request, Response } from "express";
import { body, query, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── POST /api/roles/register ────────────────────────────────────────────────
/**
 * Register the user as a Trainer or Workout Buddy.
 * Expects: role (TRAINER | BUDDY), bio, costPerSession, timingInterval, gymIds (array of gym IDs)
 */
router.post(
  "/register",
  requireAuth,
  [
    body("role").isIn(["TRAINER", "BUDDY"]),
    body("bio").optional().isString(),
    body("costPerSessionInPaise").optional().isInt({ min: 0 }),
    body("timingInterval").optional().isString(),
    body("gymIds").isArray().withMessage("gymIds must be an array of strings"),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const userId = req.dbUserId!;
    const { role, bio, costPerSessionInPaise, timingInterval, gymIds } = req.body;

    try {
      // Upsert the profile (create if not exists, update if exists)
      const profile = await prisma.userRoleProfile.upsert({
        where: { userId },
        create: {
          userId,
          role,
          bio,
          costPerSessionInPaise: role === "TRAINER" ? costPerSessionInPaise : null,
          timingInterval: role === "BUDDY" ? timingInterval : null,
        },
        update: {
          role,
          bio,
          costPerSessionInPaise: role === "TRAINER" ? costPerSessionInPaise : null,
          timingInterval: role === "BUDDY" ? timingInterval : null,
        },
      });

      // Update gyms: Delete existing and create new ones
      await prisma.userRoleGym.deleteMany({
        where: { userRoleProfileId: profile.id },
      });

      if (gymIds && gymIds.length > 0) {
        await prisma.userRoleGym.createMany({
          data: gymIds.map((gymId: string) => ({
            userRoleProfileId: profile.id,
            gymId,
          })),
        });
      }

      const updatedProfile = await prisma.userRoleProfile.findUnique({
        where: { id: profile.id },
        include: { gyms: { include: { gym: true } } },
      });

      res.json({ message: "Role registered successfully", profile: updatedProfile });
    } catch (err: any) {
      console.error("Failed to register role:", err);
      res.status(500).json({ error: "InternalServerError", message: "Failed to register role" });
    }
  }
);

// ─── GET /api/roles ───────────────────────────────────────────────────────
/**
 * Get all trainers and buddies. Supports filtering by gymId and role.
 */
router.get(
  "/",
  requireAuth,
  [
    query("gymId").optional().isString(),
    query("role").optional().isIn(["TRAINER", "BUDDY"]),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const { gymId, role } = req.query as Record<string, string>;

    const where: any = { isApproved: true };
    if (role) where.role = role;
    if (gymId) {
      where.gyms = {
        some: { gymId },
      };
    }

    try {
      const profiles = await prisma.userRoleProfile.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          gyms: {
            include: {
              gym: {
                select: { id: true, name: true, address: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ profiles });
    } catch (err: any) {
      console.error("Failed to fetch roles:", err);
      res.status(500).json({ error: "InternalServerError", message: "Failed to fetch roles" });
    }
  }
);

// ─── GET /api/roles/me ────────────────────────────────────────────────────
/**
 * Get the current user's role profile.
 */
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const profile = await prisma.userRoleProfile.findUnique({
        where: { userId: req.dbUserId! },
        include: {
          gyms: {
            include: {
              gym: {
                select: { id: true, name: true, address: true, imageUrls: true },
              },
            },
          },
        },
      });

      if (!profile) {
        res.json({ profile: null });
        return;
      }

      res.json({ profile });
    } catch (err: any) {
      console.error("Failed to fetch user role profile:", err);
      res.status(500).json({ error: "InternalServerError", message: "Failed to fetch profile" });
    }
  }
);

// ─── GET /api/roles/:id ────────────────────────────────────────────────────
/**
 * Get a specific trainer/buddy profile.
 */
router.get(
  "/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const profile = await prisma.userRoleProfile.findUnique({
        where: { id: String(req.params.id) },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          gyms: {
            include: {
              gym: {
                select: { id: true, name: true, address: true, imageUrls: true },
              },
            },
          },
        },
      });

      if (!profile) {
        res.status(404).json({ error: "NotFound", message: "Profile not found" });
        return;
      }

      res.json({ profile });
    } catch (err: any) {
      console.error("Failed to fetch role profile:", err);
      res.status(500).json({ error: "InternalServerError", message: "Failed to fetch profile" });
    }
  }
);

export default router;
