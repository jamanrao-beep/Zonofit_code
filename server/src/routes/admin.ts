import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

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
    const activeGyms = await prisma.gym.count({ where: { isVerified: true, isActive: true } });
    
    // Sum of all convertible cash and credits
    const wallets = await prisma.creditWallet.aggregate({
      _sum: { balance: true }
    });
    const creditsCirculated = wallets._sum.balance || 0;

    // Platform Growth Data (Users grouped by month, simplified for SQLite/Postgres)
    // For a generic approach without complex raw SQL, we can fetch recent users and group in memory for MVP
    const recentUsers = await prisma.user.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const growthMap: Record<string, number> = {};
    
    let cumulative = 0;
    recentUsers.forEach(u => {
      const monthStr = months[u.createdAt.getMonth()];
      if (!growthMap[monthStr]) growthMap[monthStr] = cumulative;
      growthMap[monthStr] += 1;
      cumulative++;
    });

    // Make sure we have at least 6 months of data
    const chartData = Object.keys(growthMap).map(k => ({
      name: k,
      users: growthMap[k]
    })).slice(-6); // Last 6 months

    if (chartData.length === 0) {
      chartData.push({ name: "Jan", users: 0 }, { name: "Feb", users: 0 });
    }

    const recentGymSignups = await prisma.gym.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, city: true, isVerified: true }
    });

    res.json({
      totalUsers,
      activeGyms,
      creditsCirculated,
      chartData,
      recentGymSignups: recentGymSignups.map(g => ({
        id: g.id,
        name: g.name,
        city: g.city,
        status: g.isVerified ? "Verified" : "Pending"
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

export default router;
