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
// ─── POST /api/roles/register ────────────────────────────────────────────────
/**
 * Register the user as a Trainer or Workout Buddy.
 * Expects: role (TRAINER | BUDDY), bio, costPerSession, timingInterval, gymIds (array of gym IDs)
 */
router.post("/register", auth_1.requireAuth, [
    (0, express_validator_1.body)("role").isIn(["TRAINER", "BUDDY"]),
    (0, express_validator_1.body)("bio").optional().isString(),
    (0, express_validator_1.body)("costPerSessionInPaise").optional().isInt({ min: 0 }),
    (0, express_validator_1.body)("timingInterval").optional().isString(),
    (0, express_validator_1.body)("gymIds").isArray().withMessage("gymIds must be an array of strings"),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const userId = req.dbUserId;
    const { role, bio, costPerSessionInPaise, timingInterval, gymIds } = req.body;
    try {
        // Upsert the profile (create if not exists, update if exists)
        const profile = await prisma_1.default.userRoleProfile.upsert({
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
        await prisma_1.default.userRoleGym.deleteMany({
            where: { userRoleProfileId: profile.id },
        });
        if (gymIds && gymIds.length > 0) {
            await prisma_1.default.userRoleGym.createMany({
                data: gymIds.map((gymId) => ({
                    userRoleProfileId: profile.id,
                    gymId,
                })),
            });
        }
        const updatedProfile = await prisma_1.default.userRoleProfile.findUnique({
            where: { id: profile.id },
            include: { gyms: { include: { gym: true } } },
        });
        res.json({ message: "Role registered successfully", profile: updatedProfile });
    }
    catch (err) {
        console.error("Failed to register role:", err);
        res.status(500).json({ error: "InternalServerError", message: "Failed to register role" });
    }
});
// ─── GET /api/roles ───────────────────────────────────────────────────────
/**
 * Get all trainers and buddies. Supports filtering by gymId and role.
 */
router.get("/", auth_1.requireAuth, [
    (0, express_validator_1.query)("gymId").optional().isString(),
    (0, express_validator_1.query)("role").optional().isIn(["TRAINER", "BUDDY"]),
], async (req, res) => {
    const { gymId, role } = req.query;
    const where = { isApproved: true };
    if (role)
        where.role = role;
    if (gymId) {
        where.gyms = {
            some: { gymId },
        };
    }
    try {
        const profiles = await prisma_1.default.userRoleProfile.findMany({
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
    }
    catch (err) {
        console.error("Failed to fetch roles:", err);
        res.status(500).json({ error: "InternalServerError", message: "Failed to fetch roles" });
    }
});
// ─── GET /api/roles/me ────────────────────────────────────────────────────
/**
 * Get the current user's role profile.
 */
router.get("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const profile = await prisma_1.default.userRoleProfile.findUnique({
            where: { userId: req.dbUserId },
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
    }
    catch (err) {
        console.error("Failed to fetch user role profile:", err);
        res.status(500).json({ error: "InternalServerError", message: "Failed to fetch profile" });
    }
});
// ─── GET /api/roles/:id ────────────────────────────────────────────────────
/**
 * Get a specific trainer/buddy profile.
 */
router.get("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const profile = await prisma_1.default.userRoleProfile.findUnique({
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
    }
    catch (err) {
        console.error("Failed to fetch role profile:", err);
        res.status(500).json({ error: "InternalServerError", message: "Failed to fetch profile" });
    }
});
exports.default = router;
//# sourceMappingURL=roles.js.map