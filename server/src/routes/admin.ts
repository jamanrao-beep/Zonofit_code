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

    const pendingTickets = await prisma.supportTicket.count({ where: { status: "OPEN" } });
    const pendingPayouts = await prisma.gymPayout.count({ where: { status: "PENDING" } });
    const pendingApplications = await prisma.gymApplication.count({ where: { status: "PENDING" } });

    res.json({
      totalUsers,
      activeUsers,
      totalPartnerGyms,
      activeGyms,
      newSignupsToday,
      membershipsSoldToday,
      creditsCirculated,
      recentGymSignups,
      pendingTickets,
      pendingPayouts,
      pendingApplications
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/users ────────────────────────────────────────────────
router.get("/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const where: any = {};
    if (role && role !== "ALL") {
      where.systemRole = role;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        membership: true,
        wallet: true,
        gymsOwned: {
          select: { id: true, name: true, city: true }
        },
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
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

// ─── POST /api/admin/gyms ────────────────────────────────────────────────
router.post("/gyms", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      // * star internal
      customGymId,
      ownerName,
      bankDetails,
      cappingMode,
      maxDailyVisits,
      maxSlotVisits,
      payoutModel,
      payoutCommissionRate,
      payoutFixedPerVisit,
      paymentCycle,
      isGstRegistered,
      gstNumber,
      invoicePrefix,

      // public / user facing
      name,
      address,
      city,
      state,
      landmark,
      googleMapsUrl,
      contactPhone,
      monthlyPrice,
      weekdayHours,
      weekendHours,
      facilities,
      slots,
      logoUrl,
      exteriorImageUrl,
      interiorImageUrls,
      lat,
      lng,
      isVerified,
      isActive,
    } = req.body;

    if (!name || !address) {
      res.status(400).json({ error: "ValidationError", message: "Gym Name and Full Address are required." });
      return;
    }

    const priceM = monthlyPrice ? parseInt(monthlyPrice, 10) : 3000;
    // Derive credit cost using PRD v2.0 Formula: U = M / 25, 1 Credit = ₹10
    const derivedCreditCost = Math.max(1, Math.round(priceM / 25 / 10));

    // Handle exclusive capping mode (do not overlap)
    const finalCappingMode = cappingMode === "PER_SLOT" ? "PER_SLOT" : "DAILY_TOTAL";
    const finalMaxDaily = finalCappingMode === "DAILY_TOTAL" ? (maxDailyVisits ? parseInt(maxDailyVisits, 10) : 25) : null;
    const finalMaxSlot = finalCappingMode === "PER_SLOT" ? (maxSlotVisits ? parseInt(maxSlotVisits, 10) : 5) : null;

    // Handle exclusive payout model (do not overlap)
    const finalPayoutModel = payoutModel === "FIXED_PER_VISIT" ? "FIXED_PER_VISIT" : "COMMISSION_PERCENTAGE";
    const finalCommRate = finalPayoutModel === "COMMISSION_PERCENTAGE" ? (payoutCommissionRate !== undefined ? parseFloat(payoutCommissionRate) : 20.0) : null;
    const finalFixedPayout = finalPayoutModel === "FIXED_PER_VISIT" ? (payoutFixedPerVisit !== undefined ? parseFloat(payoutFixedPerVisit) : Math.round((priceM / 30) * 0.8)) : null;

    const latVal = lat ? parseFloat(lat) : 18.5204;
    const lngVal = lng ? parseFloat(lng) : 73.8567;

    let finalCustomId = customGymId?.trim();
    if (!finalCustomId) {
      const count = await prisma.gym.count();
      finalCustomId = `ZONO-${String(count + 1).padStart(3, "0")}`;
    }

    const gym = await prisma.gym.create({
      data: {
        customGymId: finalCustomId,
        name,
        address,
        city: city || "Mumbai",
        state: state || "Maharashtra",
        landmark: landmark || null,
        googleMapsUrl: googleMapsUrl || null,
        contactPhone: contactPhone || null,
        monthlyPrice: priceM,
        creditCost: derivedCreditCost,
        weekdayHours: weekdayHours || "06:00 AM - 10:00 PM",
        weekendHours: weekendHours || "07:00 AM - 08:00 PM",
        facilities: Array.isArray(facilities) ? facilities : (facilities ? [facilities] : ["Strength", "Cardio"]),
        
        cappingMode: finalCappingMode,
        maxDailyVisits: finalMaxDaily,
        maxSlotVisits: finalMaxSlot,

        slotsJson: slots ? (typeof slots === "string" ? slots : JSON.stringify(slots)) : null,

        ownerName: ownerName || null,
        bankDetailsJson: bankDetails ? (typeof bankDetails === "string" ? bankDetails : JSON.stringify(bankDetails)) : null,

        logoUrl: logoUrl || null,
        exteriorImageUrl: exteriorImageUrl || null,
        interiorImageUrls: Array.isArray(interiorImageUrls) ? interiorImageUrls : (interiorImageUrls ? [interiorImageUrls] : []),
        imageUrls: [exteriorImageUrl, logoUrl, ...(Array.isArray(interiorImageUrls) ? interiorImageUrls : [])].filter(Boolean) as string[],

        payoutModel: finalPayoutModel,
        payoutCommissionRate: finalCommRate,
        payoutFixedPerVisit: finalFixedPayout,
        paymentCycle: paymentCycle || "WEEKLY",

        isGstRegistered: !!isGstRegistered,
        gstNumber: gstNumber || null,
        invoicePrefix: invoicePrefix || null,

        lat: latVal,
        lng: lngVal,
        isVerified: isVerified !== undefined ? !!isVerified : true,
        isActive: isActive !== undefined ? !!isActive : true,
      }
    });

    await prisma.gymPlan.create({
      data: {
        gymId: gym.id,
        name: `${gym.name} Monthly Membership`,
        description: `Full access to ${gym.name} facilities with ZonoFit credits.`,
        priceInPaise: priceM * 100,
        billingCycle: "MONTHLY",
        initialPeriodMonths: 1,
        initialCutoffDays: 10,
        subsequentCutoffDays: 15,
        isActive: true,
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "CREATE_GYM",
        targetId: gym.id,
        details: `Created gym ${gym.name} (${finalCustomId})`
      }
    });

    res.status(201).json({ gym, message: "Gym created successfully" });
  } catch (err: any) {
    console.error("Admin create gym error:", err);
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── PUT /api/admin/gyms/:id ──────────────────────────────────────────────────
router.put("/gyms/:id", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const gymId = req.params.id as string;
    const {
      customGymId,
      ownerName,
      bankDetails,
      cappingMode,
      maxDailyVisits,
      maxSlotVisits,
      payoutModel,
      payoutCommissionRate,
      payoutFixedPerVisit,
      paymentCycle,
      isGstRegistered,
      gstNumber,
      invoicePrefix,

      name,
      address,
      city,
      state,
      landmark,
      googleMapsUrl,
      contactPhone,
      monthlyPrice,
      weekdayHours,
      weekendHours,
      facilities,
      slots,
      logoUrl,
      exteriorImageUrl,
      interiorImageUrls,
      lat,
      lng,
      isVerified,
      isActive,
    } = req.body;

    const existingGym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!existingGym) {
      res.status(404).json({ error: "NotFound", message: "Gym not found" });
      return;
    }

    const priceM = monthlyPrice !== undefined ? parseInt(monthlyPrice, 10) : existingGym.monthlyPrice;
    const derivedCreditCost = priceM ? Math.max(1, Math.round(priceM / 25 / 10)) : existingGym.creditCost;

    const finalCappingMode = cappingMode !== undefined ? cappingMode : existingGym.cappingMode;
    const finalMaxDaily = finalCappingMode === "DAILY_TOTAL" ? (maxDailyVisits !== undefined ? parseInt(maxDailyVisits, 10) : existingGym.maxDailyVisits) : null;
    const finalMaxSlot = finalCappingMode === "PER_SLOT" ? (maxSlotVisits !== undefined ? parseInt(maxSlotVisits, 10) : existingGym.maxSlotVisits) : null;

    const finalPayoutModel = payoutModel !== undefined ? payoutModel : existingGym.payoutModel;
    const finalCommRate = finalPayoutModel === "COMMISSION_PERCENTAGE" ? (payoutCommissionRate !== undefined ? parseFloat(payoutCommissionRate) : existingGym.payoutCommissionRate) : null;
    const finalFixedPayout = finalPayoutModel === "FIXED_PER_VISIT" ? (payoutFixedPerVisit !== undefined ? parseFloat(payoutFixedPerVisit) : existingGym.payoutFixedPerVisit) : null;

    const latVal = lat !== undefined ? parseFloat(lat) : existingGym.lat;
    const lngVal = lng !== undefined ? parseFloat(lng) : existingGym.lng;

    const gym = await prisma.gym.update({
      where: { id: gymId },
      data: {
        customGymId: customGymId !== undefined ? customGymId : existingGym.customGymId,
        name: name !== undefined ? name : existingGym.name,
        address: address !== undefined ? address : existingGym.address,
        city: city !== undefined ? city : existingGym.city,
        state: state !== undefined ? state : existingGym.state,
        landmark: landmark !== undefined ? landmark : existingGym.landmark,
        googleMapsUrl: googleMapsUrl !== undefined ? googleMapsUrl : existingGym.googleMapsUrl,
        contactPhone: contactPhone !== undefined ? contactPhone : existingGym.contactPhone,
        monthlyPrice: priceM,
        creditCost: derivedCreditCost,
        weekdayHours: weekdayHours !== undefined ? weekdayHours : existingGym.weekdayHours,
        weekendHours: weekendHours !== undefined ? weekendHours : existingGym.weekendHours,
        facilities: facilities !== undefined ? (Array.isArray(facilities) ? facilities : [facilities]) : (existingGym.facilities as any ?? []),
        
        cappingMode: finalCappingMode,
        maxDailyVisits: finalMaxDaily,
        maxSlotVisits: finalMaxSlot,

        slotsJson: slots !== undefined ? (typeof slots === "string" ? slots : JSON.stringify(slots)) : existingGym.slotsJson,

        ownerName: ownerName !== undefined ? ownerName : existingGym.ownerName,
        bankDetailsJson: bankDetails !== undefined ? (typeof bankDetails === "string" ? bankDetails : JSON.stringify(bankDetails)) : existingGym.bankDetailsJson,

        logoUrl: logoUrl !== undefined ? logoUrl : existingGym.logoUrl,
        exteriorImageUrl: exteriorImageUrl !== undefined ? exteriorImageUrl : existingGym.exteriorImageUrl,
        interiorImageUrls: interiorImageUrls !== undefined ? (Array.isArray(interiorImageUrls) ? interiorImageUrls : [interiorImageUrls]) : (existingGym.interiorImageUrls as any ?? []),
        imageUrls: [
          exteriorImageUrl || existingGym.exteriorImageUrl,
          logoUrl || existingGym.logoUrl,
          ...(Array.isArray(interiorImageUrls) ? interiorImageUrls : (Array.isArray(existingGym.interiorImageUrls) ? (existingGym.interiorImageUrls as any[]) : []))
        ].filter(Boolean) as string[],

        payoutModel: finalPayoutModel,
        payoutCommissionRate: finalCommRate,
        payoutFixedPerVisit: finalFixedPayout,
        paymentCycle: paymentCycle !== undefined ? paymentCycle : existingGym.paymentCycle,

        isGstRegistered: isGstRegistered !== undefined ? !!isGstRegistered : existingGym.isGstRegistered,
        gstNumber: gstNumber !== undefined ? gstNumber : existingGym.gstNumber,
        invoicePrefix: invoicePrefix !== undefined ? invoicePrefix : existingGym.invoicePrefix,

        lat: latVal,
        lng: lngVal,
        isVerified: isVerified !== undefined ? !!isVerified : existingGym.isVerified,
        isActive: isActive !== undefined ? !!isActive : existingGym.isActive,
      }
    });

    res.json({ gym, message: "Gym updated successfully" });
  } catch (err: any) {
    console.error("Admin update gym error:", err);
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/gyms/:id ─────────────────────────────────────────────────
router.get("/gyms/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const gymId = req.params.id as string;
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      include: {
        plans: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!gym) return res.status(404).json({ error: "Gym not found" });
    res.json({ gym });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── PUT /api/admin/gyms/:id/economy ─────────────────────────────────────────
router.put("/gyms/:id/economy", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const gymId = req.params.id as string;
    const { creditPurchasePrice, creditConversionValue, initialVisitCut, cashExpiryDays } = req.body;
    
    const gym = await prisma.gym.update({
      where: { id: gymId },
      data: {
        creditPurchasePrice: creditPurchasePrice !== "" ? parseInt(creditPurchasePrice, 10) : null,
        creditConversionValue: creditConversionValue !== "" ? parseInt(creditConversionValue, 10) : null,
        initialVisitCut: initialVisitCut !== "" ? parseInt(initialVisitCut, 10) : null,
        cashExpiryDays: cashExpiryDays !== "" ? parseInt(cashExpiryDays, 10) : null
      }
    });
    
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "UPDATE_GYM_ECONOMY",
        targetId: gym.id,
        details: "Updated per-gym economy overrides"
      }
    });
    
    res.json({ gym });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/admin/gyms/:id/plans ──────────────────────────────────────────
router.post("/gyms/:id/plans", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const gymId = req.params.id as string;
    const { name, description, initialPeriodMonths, initialCutoffDays, subsequentCutoffDays, priceInPaise, billingCycle } = req.body;
    
    const plan = await prisma.gymPlan.create({
      data: {
        gymId,
        name,
        description,
        priceInPaise: parseInt(priceInPaise, 10),
        billingCycle: billingCycle || "MONTHLY",
        initialPeriodMonths: parseInt(initialPeriodMonths, 10),
        initialCutoffDays: parseInt(initialCutoffDays, 10),
        subsequentCutoffDays: parseInt(subsequentCutoffDays, 10)
      }
    });
    
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "CREATE_GYM_PLAN",
        targetId: plan.id,
        details: `Created plan ${name} for gym ${gymId}`
      }
    });
    
    res.json({ plan });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── DELETE /api/admin/gyms/:gymId/plans/:planId ─────────────────────────────
router.delete("/gyms/:gymId/plans/:planId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const planId = req.params.planId as string;
    await prisma.gymPlan.delete({
      where: { id: planId }
    });
    
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "DELETE_GYM_PLAN",
        targetId: planId,
        details: `Deleted plan ${planId}`
      }
    });
    
    res.json({ success: true });
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

// ─── PUT /api/admin/marketing/coupons/:id ───────────────────────────────────
router.put("/marketing/coupons/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { isActive, usageLimit } = req.body;
    
    const coupon = await prisma.marketingCoupon.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(usageLimit !== undefined && { usageLimit: usageLimit ? parseInt(usageLimit, 10) : null })
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "UPDATE_COUPON",
        targetId: coupon.id,
        details: `Updated coupon ${coupon.code}`
      }
    });

    res.json({ coupon });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── DELETE /api/admin/marketing/coupons/:id ────────────────────────────────
router.delete("/marketing/coupons/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const coupon = await prisma.marketingCoupon.delete({
      where: { id }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "DELETE_COUPON",
        targetId: coupon.id,
        details: `Deleted coupon ${coupon.code}`
      }
    });

    res.json({ success: true, message: "Coupon deleted successfully" });
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
        data: { userId, title, body }
      });
    } else {
      // In a real system, you'd queue this. For MVP, we insert for all active users (limited for safety).
      const users = await prisma.user.findMany({ take: 1000, select: { id: true } });
      const notifications = users.map(u => ({
        userId: u.id,
        title,
        body
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
    res.json({ message: "Content updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GLOBAL MEMBERSHIP PLANS ─────────────────────────────────────────────────

router.get("/plans", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      orderBy: { priceInPaise: "asc" }
    });
    res.json({ plans });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

router.post("/plans", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, tier, priceInPaise, monthlyCredits, durationDays, features } = req.body;
    const plan = await prisma.membershipPlan.create({
      data: {
        name,
        tier,
        priceInPaise,
        monthlyCredits,
        durationDays,
        features
      }
    });
    res.json({ plan });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

router.delete("/plans/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.membershipPlan.delete({
      where: { id }
    });
    res.json({ message: "Plan deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/marketplace ──────────────────────────────────────────────
router.get("/marketplace", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const items = await prisma.marketplaceItem.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/admin/marketplace ─────────────────────────────────────────────
router.post("/marketplace", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, description, pricePaise, imageUrl, inStock, storeCategory, sizes, colors } = req.body;
    
    const parsedSizes = Array.isArray(sizes) 
      ? sizes 
      : (typeof sizes === "string" ? sizes.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      
    const parsedColors = Array.isArray(colors)
      ? colors
      : (typeof colors === "string" ? colors.split(",").map((c: string) => c.trim()).filter(Boolean) : []);

    const item = await prisma.marketplaceItem.create({
      data: {
        title,
        description,
        pricePaise: parseInt(pricePaise, 10),
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80",
        inStock: inStock !== undefined ? inStock : true,
        storeCategory: storeCategory || "ZONOFIT_COMMON",
        sizes: parsedSizes,
        colors: parsedColors
      }
    });
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "CREATE_MARKETPLACE_ITEM",
        targetId: item.id,
        details: `Created item: ${title}`
      }
    });
    res.json({ item });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── PUT /api/admin/marketplace/:id ──────────────────────────────────────────
router.put("/marketplace/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, description, pricePaise, imageUrl, inStock, storeCategory, sizes, colors } = req.body;

    const parsedSizes = sizes !== undefined 
      ? (Array.isArray(sizes) ? sizes : (typeof sizes === "string" ? sizes.split(",").map((s: string) => s.trim()).filter(Boolean) : []))
      : undefined;

    const parsedColors = colors !== undefined
      ? (Array.isArray(colors) ? colors : (typeof colors === "string" ? colors.split(",").map((c: string) => c.trim()).filter(Boolean) : []))
      : undefined;

    const item = await prisma.marketplaceItem.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(pricePaise && { pricePaise: parseInt(pricePaise, 10) }),
        ...(imageUrl && { imageUrl }),
        ...(inStock !== undefined && { inStock }),
        ...(storeCategory && { storeCategory }),
        ...(parsedSizes !== undefined && { sizes: parsedSizes }),
        ...(parsedColors !== undefined && { colors: parsedColors })
      }
    });
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "UPDATE_MARKETPLACE_ITEM",
        targetId: item.id,
        details: `Updated item: ${item.title}`
      }
    });
    res.json({ item });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── DELETE /api/admin/marketplace/:id ───────────────────────────────────────
router.delete("/marketplace/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    // Delete any dependent orders first to avoid foreign key errors
    await prisma.marketplaceOrder.deleteMany({
      where: { itemId: id }
    });
    await prisma.marketplaceItem.delete({
      where: { id }
    });
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "DELETE_MARKETPLACE_ITEM",
        targetId: id,
        details: `Deleted item: ${id}`
      }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/trial-gyms ───────────────────────────────────────────────
router.get("/trial-gyms", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const trialGyms = await prisma.trialGym.findMany({
      include: {
        _count: {
          select: { votes: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ trialGyms });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/admin/trial-gyms ──────────────────────────────────────────────
router.post("/trial-gyms", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, city, area, description, imageUrl } = req.body;
    const trialGym = await prisma.trialGym.create({
      data: {
        name,
        city,
        area,
        description,
        imageUrl
      }
    });
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "CREATE_TRIAL_GYM",
        targetId: trialGym.id,
        details: `Created trial gym: ${name}`
      }
    });
    res.json({ trialGym });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});
// ─── PUT /api/admin/trial-gyms/:id ───────────────────────────────────────────
router.put("/trial-gyms/:id", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, city, area, description, imageUrl } = req.body;
    const trialGym = await prisma.trialGym.update({
      where: { id: req.params.id as string },
      data: {
        name,
        city,
        area,
        description,
        imageUrl
      }
    });
    
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "UPDATE_TRIAL_GYM",
        targetId: trialGym.id,
        details: `Updated trial gym: ${name}`
      }
    });
    
    res.json({ trialGym });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── DELETE /api/admin/trial-gyms/:id ────────────────────────────────────────
router.delete("/trial-gyms/:id", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const trialGymId = req.params.id as string;
    
    await prisma.trialGym.delete({
      where: { id: trialGymId }
    });
    
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "DELETE_TRIAL_GYM",
        targetId: trialGymId,
        details: `Deleted trial gym: ${trialGymId}`
      }
    });
    
    res.json({ success: true, message: "Trial gym deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── PUT /api/admin/support/:id/status ─────────────────────────────────────
router.put("/support/:id/status", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id as string },
      data: { status }
    });
    
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "UPDATE_TICKET_STATUS",
        targetId: ticket.id,
        details: `Updated ticket ${ticket.id} status to ${status}`
      }
    });

    res.json({ ticket });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/admin/payouts/process ───────────────────────────────────────
router.post("/payouts/process", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { payoutId } = req.body || {};

    const whereClause: any = { status: "PENDING" };
    if (payoutId) {
      whereClause.id = payoutId;
    }

    const result = await prisma.gymPayout.updateMany({
      where: whereClause,
      data: {
        status: "PAID",
        payoutDate: new Date()
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "PROCESS_PAYOUTS",
        targetId: payoutId || "BULK",
        details: payoutId ? `Processed single payout ${payoutId}` : `Processed ${result.count} pending payouts`
      }
    });

    res.json({ message: "Payout processed successfully", count: result.count });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/admin/gym-applications ───────────────────────────────────────
router.get("/gym-applications", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const applications = await prisma.gymApplication.findMany({
      where: { status: "PENDING" },
      include: {
        gym: { include: { owner: { select: { name: true, email: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ applications });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── PUT /api/admin/gym-applications/:id ───────────────────────────────────
router.put("/gym-applications/:id", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const application = await prisma.gymApplication.update({
      where: { id: req.params.id as string },
      data: { status }
    });

    if (status === "APPROVED") {
      await prisma.gym.update({
        where: { id: application.gymId },
        data: {
          isVerified: true,
          isActive: true
        }
      });
      const gym = await prisma.gym.findUnique({ where: { id: application.gymId } });
      if (gym?.ownerId) {
        await prisma.user.update({
          where: { id: gym.ownerId },
          data: { systemRole: "GYM_OWNER" }
        });
      }
    }

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "EVALUATE_GYM_APPLICATION",
        targetId: application.id,
        details: `Updated gym application ${application.id} to ${status}`
      }
    });

    res.json({ application });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── DELETE /api/admin/gyms/:id ──────────────────────────────────────────────
router.delete("/gyms/:id", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const gymId = req.params.id as string;
    
    // First delete any related applications
    await prisma.gymApplication.deleteMany({
      where: { gymId }
    });

    // Delete the gym
    await prisma.gym.delete({
      where: { id: gymId }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.dbUserId!,
        actionType: "DELETE_GYM",
        targetId: gymId,
        details: `Deleted gym ${gymId}`
      }
    });

    res.json({ success: true, message: "Gym deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

export default router;
// trigger restart
