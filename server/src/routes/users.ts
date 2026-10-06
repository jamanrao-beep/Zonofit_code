import { Request, Response, Router } from "express";
import { body, validationResult } from "express-validator";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import path from "path";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { generateUniqueReferralCode } from "../lib/referral";

const router = Router();

const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME || "zonofit-images",
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req: any, file: any, cb: any) {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = path.extname(file.originalname) || ".jpg";
            cb(null, `avatar-${uniqueSuffix}${ext}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

        const creditsEarned = completedReferrals * 50;

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
                    gymName: user.membership.primaryGym?.name || "FitZone Pro",
                    primaryGymVisits: user.membership.primaryGymVisits || 10,
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
                rewardAmount: 50,
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
                creditsEarned: completedReferrals * 50,
                rewardAmount: 50
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
        body("phone").optional().isMobilePhone("any"),
        body("avatarUrl").optional().isURL(),
        body("expoPushToken").optional().isString(),
    ],
    async (req: Request, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ error: "ValidationError", details: errors.array() });
            return;
        }

        const { name, phone, avatarUrl, expoPushToken } = req.body as {
            name?: string;
            phone?: string;
            avatarUrl?: string;
            expoPushToken?: string;
        };

        const updated = await prisma.user.update({
            where: { id: req.dbUserId! },
            data: {
                ...(name !== undefined && { name }),
                ...(phone !== undefined && { phone }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(expoPushToken !== undefined && { expoPushToken }),
            },
            select: { id: true, name: true, phone: true, avatarUrl: true, email: true, expoPushToken: true },
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

        // Generate the full URL to access the uploaded file from S3
        const file = req.file as any;
        const avatarUrl = file.location;

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
