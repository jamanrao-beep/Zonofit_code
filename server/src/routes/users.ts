import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import multer from "multer";
import fs from "fs";
import path from "path";
import prisma from "../lib/prisma";
import { normalizePhone } from "../lib/phone";
import { requireAuth } from "../middleware/auth";
import { generateUniqueReferralCode } from "../lib/referral";

const router = Router();

// Avatars are stored on this server's disk (server/uploads) and served from /uploads by index.ts.
const uploadsDir = path.join(__dirname, "../../uploads");

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            fs.mkdirSync(uploadsDir, { recursive: true });
            cb(null, uploadsDir);
        },
        filename: (_req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const extByType: Record<string, string> = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/webp": ".webp",
            };
            cb(null, `avatar-${uniqueSuffix}${extByType[file.mimetype] || ".jpg"}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
        if (!allowed.has(file.mimetype)) {
            cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
            return;
        }
        cb(null, true);
    },
});

// ─── GET /api/users/me ────────────────────────────────────────────────────────
/**
 * Returns the authenticated user's full profile with membership, wallet, and referral stats.
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
                    include: { plan: true, primaryGym: true },
                },
            },
        });

        if (!user) {
            res.status(404).json({ error: "UserNotFound" });
            return;
        }

        // Ensure user has an actual unique random referral code saved in PostgreSQL
        let userReferralCode = user.referralCode;
        if (!userReferralCode) {
            userReferralCode = await generateUniqueReferralCode();
            await prisma.user.update({
                where: { id: user.id },
                data: { referralCode: userReferralCode },
            }).catch(() => {});
        }

        // Real counts from actual database
        const [totalWorkouts, thisMonthWorkouts, friendsJoined, completedReferrals] = await Promise.all([
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
            prisma.user.count({
                where: { referredByUserId: user.id },
            }),
            prisma.user.count({
                where: {
                    referredByUserId: user.id,
                    bookings: {
                        some: { status: { in: ["CHECKED_IN", "COMPLETED"] } }
                    }
                }
            })
        ]);

        const creditsEarned = completedReferrals * 5;

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            referralCode: userReferralCode,
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
                totalWorkouts: Math.max(user.totalWorkouts, totalWorkouts),
                trainingHours: Math.max(user.trainingHours, Math.round(totalWorkouts * 1.5)),
                identityStage: user.identityStage,
            },
            membership: user.membership
                ? {
                    status: user.membership.status,
                    tier: user.membership.plan?.tier || "STANDARD",
                    planName: user.membership.plan?.name || "Standard",
                    startDate: user.membership.startDate,
                    endDate: user.membership.endDate,
                    monthlyCredits: user.membership.plan?.monthlyCredits || 0,
                    primaryGymId: user.membership.primaryGymId,
                    gymName: user.membership.primaryGym?.name || "Being Fitness",
                    primaryGymVisits: user.membership.primaryGymVisits || ((user.membership.cycleNumber || 1) <= 4 ? 10 : 15),
                    cycleNumber: user.membership.cycleNumber || 1,
                    maxCycles: (user.membership as any).maxCycles || 12,
                    mandatoryVisits: user.membership.mandatoryVisits || ((user.membership.cycleNumber || 1) <= 4 ? 10 : 15),
                    completedVisits: user.membership.completedVisits || 0,
                }
                : null,
            stats: {
                totalWorkouts,
                thisMonthWorkouts,
            },
            referral: {
                code: userReferralCode,
                friendsJoined,
                creditsEarned,
                rewardAmount: 5,
            },
        });
    }
);

// ─── GET /api/users/referral ────────────────────────────────────────────────
/**
 * Dedicated endpoint for the Refer & Earn screen.
 * Fetches real random referral code and actual friends joined / credits earned from DB.
 */
router.get(
    "/referral",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.dbUserId! },
                select: { id: true, referralCode: true }
            });

            if (!user) {
                res.status(404).json({ error: "UserNotFound" });
                return;
            }

            let referralCode = user.referralCode;
            if (!referralCode) {
                referralCode = await generateUniqueReferralCode();
                await prisma.user.update({
                    where: { id: user.id },
                    data: { referralCode }
                }).catch(() => {});
            }

            const [friendsJoined, completedReferrals] = await Promise.all([
                prisma.user.count({
                    where: { referredByUserId: user.id },
                }),
                prisma.user.count({
                    where: {
                        referredByUserId: user.id,
                        bookings: {
                            some: { status: { in: ["CHECKED_IN", "COMPLETED"] } }
                        }
                    }
                })
            ]);

            res.json({
                referralCode,
                friendsJoined,
                creditsEarned: completedReferrals * 5,
                rewardAmount: 5
            });
        } catch (err: any) {
            console.error("Failed to fetch referral info:", err);
            res.status(500).json({ error: "ServerError", message: err.message });
        }
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
        body("phone").optional().isString(),
        body("email").optional().isEmail(),
        body("avatarUrl").optional().isURL(),
        body("expoPushToken").optional().isString(),
    ],
    async (req: Request, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ error: "ValidationError", details: errors.array() });
            return;
        }

        const { name, phone, email, avatarUrl, expoPushToken } = req.body as {
            name?: string;
            phone?: string;
            email?: string;
            avatarUrl?: string;
            expoPushToken?: string;
        };

        let nextPhone: string | null | undefined;
        if (phone === undefined) {
            nextPhone = undefined;
        } else if (phone.trim() === "") {
            nextPhone = null;
        } else {
            const normalized = normalizePhone(phone);
            if (!normalized) {
                res.status(400).json({ error: "InvalidPhone", message: "Enter a valid 10-digit mobile number." });
                return;
            }
            nextPhone = normalized;
        }
        if (nextPhone) {
            const taken = await prisma.user.findFirst({
                where: { phone: nextPhone, NOT: { id: req.dbUserId! } },
                select: { id: true },
            });
            if (taken) {
                res.status(409).json({ error: "PhoneInUse", message: "That phone number is already on another account." });
                return;
            }
        }
        if (email) {
            const taken = await prisma.user.findFirst({
                where: { email, NOT: { id: req.dbUserId! } },
                select: { id: true },
            });
            if (taken) {
                res.status(409).json({ error: "EmailInUse", message: "That email is already on another account." });
                return;
            }
        }

        try {
            const updated = await prisma.user.update({
                where: { id: req.dbUserId! },
                data: {
                    ...(name !== undefined && { name }),
                    ...(nextPhone !== undefined && { phone: nextPhone }),
                    ...(email !== undefined && { email }),
                    ...(avatarUrl !== undefined && { avatarUrl }),
                    ...(expoPushToken !== undefined && { expoPushToken }),
                },
                select: { id: true, name: true, phone: true, avatarUrl: true, email: true, expoPushToken: true },
            });
            res.json({ user: updated });
        } catch (err: unknown) {
            if ((err as { code?: string }).code === "P2002") {
                res.status(409).json({ error: "PhoneInUse", message: "That phone number is already on another account." });
                return;
            }
            throw err;
        }
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

        // Public URL of the uploaded file (PUBLIC_API_URL e.g. https://api.zonofit.com)
        const baseUrl = (process.env.PUBLIC_API_URL ?? `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
        const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;

        const updated = await prisma.user.update({
            where: { id: req.dbUserId! },
            data: { avatarUrl },
            select: { id: true, name: true, phone: true, avatarUrl: true, email: true },
        });

        res.json({ user: updated, avatarUrl });
    }
);

// ─── GET /api/users/notifications ─────────────────────────────────────────────
router.get(
    "/notifications",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const notifications = await prisma.notification.findMany({
                where: {
                    userId: req.dbUserId!
                },
                orderBy: { createdAt: "desc" }
            });
            res.json({ success: true, notifications });
        } catch (err: any) {
            res.status(500).json({ error: "ServerError", message: err.message });
        }
    }
);

// ─── POST /api/users/notifications/read ───────────────────────────────────────
router.post(
    "/notifications/read",
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        try {
            await prisma.notification.updateMany({
                where: { userId: req.dbUserId!, isRead: false },
                data: { isRead: true }
            });
            res.json({ success: true });
        } catch (err: any) {
            res.status(500).json({ error: "ServerError", message: err.message });
        }
    }
);

export default router;
