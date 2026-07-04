import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { getSystemSettings } from "../services/settings";

const router = Router();

// Middleware to ensure user is an Admin
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  if (!req.dbUserId) {
    return next(createError("Unauthorized", 401, "Unauthorized"));
  }
  const user = await prisma.user.findUnique({ where: { id: req.dbUserId } });
  if (user?.systemRole !== "ADMIN") {
    return next(createError("Forbidden. Admin access required.", 403, "Forbidden"));
  }
  next();
};

// ─── GET /api/admin/dashboard ────────────────────────────────────────────────
router.get("/dashboard", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        bookings: { some: { status: "COMPLETED", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }
      }
    });

    const activeGyms = await prisma.gym.count({ where: { isVerified: true, isActive: true } });
    const totalPartnerGyms = await prisma.gym.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newSignupsToday = await prisma.user.count({ where: { createdAt: { gte: today } } });
    const membershipsSoldToday = await prisma.membership.count({ where: { createdAt: { gte: today } } });

    // Sum of all convertible cash and credits
    const wallets = await prisma.creditWallet.aggregate({
      _sum: { balance: true }
    });
    const creditsCirculated = wallets._sum.balance || 0;

    const recentGymSignups = await prisma.gym.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, city: true, isVerified: true }
    });

    res.json({
      totalUsers,
      activeUsers,
      totalPartnerGyms,
      activeGyms,
      newSignupsToday,
      membershipsSoldToday,
      creditsCirculated,
      recentGymSignups
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/users ────────────────────────────────────────────────
router.get("/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        membership: true,
        wallet: true,
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/admin/users/:id/action ──────────────────────────────────────────
router.post("/users/:id/action", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { action, credits } = req.body;
    const userId = req.params.id as string;
    if (action === "GRANT_CREDITS" && credits) {
      const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
      if (wallet) {
        await prisma.creditWallet.update({
          where: { id: wallet.id },
          data: { balance: wallet.balance + parseInt(credits, 10) }
        });
        await prisma.creditTransaction.create({
          data: {
            userId,
            walletId: wallet.id,
            type: "BONUS",
            amount: parseInt(credits, 10),
            balanceAfter: wallet.balance + parseInt(credits, 10),
            description: "Admin granted credits"
          }
        });
        await prisma.adminAuditLog.create({
          data: {
            adminId: req.dbUserId!,
            actionType: "GRANT_CREDITS",
            targetId: userId,
            details: `Granted ${credits} credits`
          }
        });
        return res.json({ message: "Credits granted" });
      }
    } else if (action === "SUSPEND") {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { isSuspended: !user.isSuspended }
        });
        await prisma.adminAuditLog.create({
          data: {
            adminId: req.dbUserId!,
            actionType: "SUSPEND_USER",
            targetId: userId,
            details: `Set isSuspended to ${!user.isSuspended}`
          }
        });
        return res.json({ message: "User suspension status updated", isSuspended: updated.isSuspended });
      }
    }
    res.status(400).json({ error: "Invalid action" });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/gyms ────────────────────────────────────────────────
router.get("/gyms", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const gyms = await prisma.gym.findMany({
      include: {
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ gyms });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── PUT /api/admin/gyms/:id/status ──────────────────────────────────────────
router.put("/gyms/:id/status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { isVerified, isActive } = req.body;
    const gymId = req.params.id as string;
    const gym = await prisma.gym.update({
      where: { id: gymId },
      data: { isVerified, isActive }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "UPDATE_GYM_STATUS",
        targetId: gym.id,
        details: `isVerified: ${isVerified}, isActive: ${isActive}`
      }
    });

    res.json({ gym });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/finance ────────────────────────────────────────────────
router.get("/finance", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const totalPayments = await prisma.paymentOrder.aggregate({
      where: { status: "PAID" },
      _sum: { amountPaise: true }
    });
    const gmv = (totalPayments._sum.amountPaise || 0) / 100; // in INR

    const totalPayouts = await prisma.gymPayout.aggregate({
      where: { status: "PAID" },
      _sum: { amountPaise: true }
    });
    const totalPaid = (totalPayouts._sum.amountPaise || 0) / 100;

    const pendingPayouts = await prisma.gymPayout.aggregate({
      where: { status: "PENDING" },
      _sum: { amountPaise: true }
    });
    const totalPending = (pendingPayouts._sum.amountPaise || 0) / 100;

    const recentPayouts = await prisma.gymPayout.findMany({
      include: { gym: true },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    res.json({
      gmv,
      totalPaid,
      totalPending,
      netRevenue: gmv - totalPaid,
      recentPayouts
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/support ────────────────────────────────────────────────
router.get("/support", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        gym: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ tickets });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/marketing/coupons ───────────────────────────────────────
router.get("/marketing/coupons", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const coupons = await prisma.marketingCoupon.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json({ coupons });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/admin/marketing/coupons ──────────────────────────────────────
router.post("/marketing/coupons", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { code, discountType, discountValue, usageLimit } = req.body;
    const coupon = await prisma.marketingCoupon.create({
      data: {
        code: code.toUpperCase(),
        discountType: discountType || "PERCENTAGE",
        discountValue: parseInt(discountValue, 10),
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "CREATE_COUPON",
        targetId: coupon.id,
        details: `Created coupon ${coupon.code}`
      }
    });

    res.json({ coupon });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/audit-logs ──────────────────────────────────────────────
router.get("/audit-logs", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      include: {
        admin: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/settings ─────────────────────────────────────────────────
router.get("/settings", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await getSystemSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── PUT /api/admin/settings ─────────────────────────────────────────────────
router.put("/settings", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { 
      creditPurchasePrice, creditConversionValue, cashExpiryDays, initialVisitCut,
      referralsEnabled, payoutsEnabled, signupsEnabled, couponsEnabled
    } = req.body;
    
    const settings = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        creditPurchasePrice,
        creditConversionValue,
        cashExpiryDays,
        initialVisitCut,
        referralsEnabled,
        payoutsEnabled,
        signupsEnabled,
        couponsEnabled
      },
      create: {
        id: "default",
        creditPurchasePrice: creditPurchasePrice || 10,
        creditConversionValue: creditConversionValue || 8,
        cashExpiryDays: cashExpiryDays || 15,
        initialVisitCut: initialVisitCut !== undefined ? initialVisitCut : 10,
        referralsEnabled: referralsEnabled !== undefined ? referralsEnabled : true,
        payoutsEnabled: payoutsEnabled !== undefined ? payoutsEnabled : true,
        signupsEnabled: signupsEnabled !== undefined ? signupsEnabled : true,
        couponsEnabled: couponsEnabled !== undefined ? couponsEnabled : true
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "UPDATE_SETTINGS",
        details: "Updated system settings (including Kill Switches)"
      }
    });
    
    res.json({ message: "Settings updated successfully", settings });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/users/:id/history ─────────────────────────────────────────
router.get("/users/:id/history", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: { gym: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    res.json({ bookings, transactions });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/memberships ──────────────────────────────────────────────
router.get("/memberships", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const memberships = await prisma.membership.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        plan: { select: { name: true, monthlyCredits: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ memberships });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── PUT /api/admin/memberships/:id/status ───────────────────────────────────
router.put("/memberships/:id/status", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const membershipId = req.params.id as string;
    const membership = await prisma.membership.update({
      where: { id: membershipId },
      data: { status }
    });
    
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "UPDATE_MEMBERSHIP",
        targetId: membership.id,
        details: `Updated membership status to ${status}`
      }
    });

    res.json({ membership });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/content ──────────────────────────────────────────────────
router.get("/content", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const content = await prisma.systemContent.findMany();
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/admin/content ─────────────────────────────────────────────────
router.post("/content", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    const content = await prisma.systemContent.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "UPDATE_CONTENT",
        details: `Updated content for key: ${key}`
      }
    });

    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/admin/notifications/broadcast ─────────────────────────────────
router.post("/notifications/broadcast", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, body, userId } = req.body;
    
    if (userId) {
      await prisma.notification.create({
        data: { userId, title, body, type: "SYSTEM" }
      });
    } else {
      // In a real system, you'd queue this. For MVP, we insert for all active users (limited for safety).
      const users = await prisma.user.findMany({ take: 1000, select: { id: true } });
      const notifications = users.map(u => ({
        userId: u.id,
        title,
        body,
        type: "SYSTEM"
      }));
      await prisma.notification.createMany({ data: notifications as any });
    }

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "SEND_BROADCAST",
        details: `Sent broadcast: ${title} to ${userId ? 'Specific User' : 'All Users'}`
      }
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

export default router;
// trigger restart
