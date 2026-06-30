import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import multer from "multer";
import path from "path";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../../uploads"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname) || ".jpg";
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ─── GET /api/users/me ────────────────────────────────────────────────────────
/**
 * Returns the authenticated user's full profile with membership and wallet.
 * This is the "load everything" endpoint called on app boot / profile screen.
 */
router.get(
    "/me",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        const user = await prisma.user.findUnique({
            where: { id: req.dbUserId! },
            include: {
                wallet: true,
                membership: {
                    include: { plan: true },
                },
            },
        });

        if (!user) {
            res.status(404).json({ error: "UserNotFound" });
            return;
        }

        // Compute streak and stats from booking history
        const [totalWorkouts, thisMonthWorkouts] = await Promise.all([
            prisma.booking.count({
                where: { userId: user.id, status: { in: ["CHECKED_IN", "COMPLETED"] } },
            }),
            prisma.booking.count({
                where: {
                    userId: user.id,
                    status: { in: ["CHECKED_IN", "COMPLETED"] },
                    visitDate: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
        ]);

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            referralCode: user.referralCode,
            createdAt: user.createdAt,
            wallet: user.wallet
                ? {
                    balance: user.wallet.balance,
                    convertibleCashBalanceINR: user.wallet.convertibleCashBalanceInPaise / 100,
                    nonConvertibleCashBalanceINR: user.wallet.nonConvertibleCashBalanceInPaise / 100,
                }
                : null,
            progress: {
                streak: user.streak,
                totalWorkouts: user.totalWorkouts,
                trainingHours: user.trainingHours,
                identityStage: user.identityStage,
            },
            membership: user.membership
                ? {
                    status: user.membership.status,
                    tier: user.membership.plan.tier,
                    planName: user.membership.plan.name,
                    endDate: user.membership.endDate,
                    monthlyCredits: user.membership.plan.monthlyCredits,
                }
                : null,
            stats: {
                totalWorkouts,
                thisMonthWorkouts,
            },
        });
    }
);

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────
/**
 * Update the authenticated user's profile (name, phone, avatarUrl).
 */
router.patch(
    "/me",
    requireAuth,
    [
        body("name").optional().isString().trim().isLength({ min: 2, max: 100 }),
        body("phone").optional().isMobilePhone("any"),
        body("avatarUrl").optional().isURL(),
    ],
    async (req: Request, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ error: "ValidationError", details: errors.array() });
            return;
        }

        const { name, phone, avatarUrl } = req.body as {
            name?: string;
            phone?: string;
            avatarUrl?: string;
        };

        const updated = await prisma.user.update({
            where: { id: req.dbUserId! },
            data: {
                ...(name !== undefined && { name }),
                ...(phone !== undefined && { phone }),
                ...(avatarUrl !== undefined && { avatarUrl }),
            },
            select: { id: true, name: true, phone: true, avatarUrl: true, email: true },
        });

        res.json({ user: updated });
    }
);

// ─── POST /api/users/avatar ───────────────────────────────────────────────────
/**
 * Upload a profile picture.
 */
router.post(
    "/avatar",
    requireAuth,
    upload.single("avatar"),
    async (req: Request, res: Response): Promise<void> => {
        if (!req.file) {
            res.status(400).json({ error: "No image file provided" });
            return;
        }

        // Generate the full URL to access the uploaded file
        const host = req.get("host") || "localhost:3000";
        // Handle forwarded protocols correctly for deployed environments
        const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
        const avatarUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        const updated = await prisma.user.update({
            where: { id: req.dbUserId! },
            data: { avatarUrl },
            select: { id: true, name: true, phone: true, avatarUrl: true, email: true },
        });

        res.json({ user: updated, avatarUrl });
    }
);

export default router;
