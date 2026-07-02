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
    const { creditPurchasePrice, creditConversionValue, cashExpiryDays, initialVisitCut } = req.body;
    
    const settings = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        creditPurchasePrice,
        creditConversionValue,
        cashExpiryDays,
        initialVisitCut
      },
      create: {
        id: "default",
        creditPurchasePrice: creditPurchasePrice || 10,
        creditConversionValue: creditConversionValue || 8,
        cashExpiryDays: cashExpiryDays || 15,
        initialVisitCut: initialVisitCut !== undefined ? initialVisitCut : 10
      }
    });
    
    res.json({ message: "Settings updated successfully", settings });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/admin/gyms ────────────────────────────────────────────────────
router.post("/gyms", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      name, description, address, city, state, lat, lng, 
      creditCost, category, facilities, totalSlots 
    } = req.body;

    if (!name || !address || !city || !lat || !lng || !creditCost) {
      res.status(400).json({ error: "Missing required fields for gym creation" });
      return;
    }

    const gym = await prisma.gym.create({
      data: {
        name,
        description,
        address,
        city,
        state: state || "Maharashtra",
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        creditCost: parseInt(creditCost, 10),
        category: category || "STANDARD",
        facilities: Array.isArray(facilities) ? facilities : facilities.split(",").map((f: string) => f.trim()),
        totalSlots: parseInt(totalSlots, 10) || 20,
        isVerified: true,
        isActive: true
      }
    });

    // Note: In production we'd also run a raw query here to set the PostGIS location column
    // await prisma.$executeRaw\`UPDATE gyms SET location = ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326) WHERE id = ${gym.id}\`;

    res.json({ message: "Gym created successfully", gym });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

export default router;
