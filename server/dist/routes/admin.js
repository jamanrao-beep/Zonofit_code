"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const settings_1 = require("../services/settings");
const router = (0, express_1.Router)();
// Middleware to ensure user is an Admin
const requireAdmin = async (req, res, next) => {
    if (!req.dbUserId) {
        return next((0, errorHandler_1.createError)("Unauthorized", 401, "Unauthorized"));
    }
    const user = await prisma_1.default.user.findUnique({ where: { id: req.dbUserId } });
    if (user?.systemRole !== "ADMIN") {
        return next((0, errorHandler_1.createError)("Forbidden. Admin access required.", 403, "Forbidden"));
    }
    next();
};
// ─── GET /api/admin/dashboard ────────────────────────────────────────────────
router.get("/dashboard", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await prisma_1.default.user.count();
        const activeUsers = await prisma_1.default.user.count({
            where: {
                bookings: { some: { status: "COMPLETED", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }
            }
        });
        const activeGyms = await prisma_1.default.gym.count({ where: { isVerified: true, isActive: true } });
        const totalPartnerGyms = await prisma_1.default.gym.count();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newSignupsToday = await prisma_1.default.user.count({ where: { createdAt: { gte: today } } });
        const membershipsSoldToday = await prisma_1.default.membership.count({ where: { createdAt: { gte: today } } });
        // Sum of all convertible cash and credits
        const wallets = await prisma_1.default.creditWallet.aggregate({
            _sum: { balance: true }
        });
        const creditsCirculated = wallets._sum.balance || 0;
        const recentGymSignups = await prisma_1.default.gym.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, name: true, city: true, isVerified: true }
        });
        const pendingTickets = await prisma_1.default.supportTicket.count({ where: { status: "OPEN" } });
        const pendingPayouts = await prisma_1.default.gymPayout.count({ where: { status: "PENDING" } });
        const pendingApplications = await prisma_1.default.gymApplication.count({ where: { status: "PENDING" } });
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
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/users ────────────────────────────────────────────────
router.get("/users", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const role = req.query.role;
        const where = {};
        if (role && role !== "ALL") {
            where.systemRole = role;
        }
        const users = await prisma_1.default.user.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/admin/users/:id/action ──────────────────────────────────────────
router.post("/users/:id/action", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { action, credits } = req.body;
        const userId = req.params.id;
        if (action === "GRANT_CREDITS" && credits) {
            const wallet = await prisma_1.default.creditWallet.findUnique({ where: { userId } });
            if (wallet) {
                await prisma_1.default.creditWallet.update({
                    where: { id: wallet.id },
                    data: { balance: wallet.balance + parseInt(credits, 10) }
                });
                await prisma_1.default.creditTransaction.create({
                    data: {
                        userId,
                        walletId: wallet.id,
                        type: "BONUS",
                        amount: parseInt(credits, 10),
                        balanceAfter: wallet.balance + parseInt(credits, 10),
                        description: "Admin granted credits"
                    }
                });
                await prisma_1.default.adminAuditLog.create({
                    data: {
                        adminId: req.dbUserId,
                        actionType: "GRANT_CREDITS",
                        targetId: userId,
                        details: `Granted ${credits} credits`
                    }
                });
                return res.json({ message: "Credits granted" });
            }
        }
        else if (action === "SUSPEND") {
            const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
            if (user) {
                const updated = await prisma_1.default.user.update({
                    where: { id: userId },
                    data: { isSuspended: !user.isSuspended }
                });
                await prisma_1.default.adminAuditLog.create({
                    data: {
                        adminId: req.dbUserId,
                        actionType: "SUSPEND_USER",
                        targetId: userId,
                        details: `Set isSuspended to ${!user.isSuspended}`
                    }
                });
                return res.json({ message: "User suspension status updated", isSuspended: updated.isSuspended });
            }
        }
        res.status(400).json({ error: "Invalid action" });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/gyms ────────────────────────────────────────────────
router.get("/gyms", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const gyms = await prisma_1.default.gym.findMany({
            include: {
                _count: {
                    select: { bookings: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json({ gyms });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/gyms/:id/status ──────────────────────────────────────────
router.put("/gyms/:id/status", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { isVerified, isActive } = req.body;
        const gymId = req.params.id;
        const gym = await prisma_1.default.gym.update({
            where: { id: gymId },
            data: { isVerified, isActive }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "UPDATE_GYM_STATUS",
                targetId: gym.id,
                details: `isVerified: ${isVerified}, isActive: ${isActive}`
            }
        });
        res.json({ gym });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/admin/gyms ────────────────────────────────────────────────
router.post("/gyms", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { 
        // * star internal
        customGymId, ownerName, bankDetails, cappingMode, maxDailyVisits, maxSlotVisits, payoutModel, payoutCommissionRate, payoutFixedPerVisit, paymentCycle, isGstRegistered, gstNumber, invoicePrefix, 
        // public / user facing
        name, address, city, state, landmark, googleMapsUrl, contactPhone, monthlyPrice, weekdayHours, weekendHours, facilities, slots, logoUrl, exteriorImageUrl, interiorImageUrls, lat, lng, isVerified, isActive, } = req.body;
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
            const count = await prisma_1.default.gym.count();
            finalCustomId = `ZONO-${String(count + 1).padStart(3, "0")}`;
        }
        const gym = await prisma_1.default.gym.create({
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
                imageUrls: [exteriorImageUrl, logoUrl, ...(Array.isArray(interiorImageUrls) ? interiorImageUrls : [])].filter(Boolean),
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
        await prisma_1.default.gymPlan.create({
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
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "CREATE_GYM",
                targetId: gym.id,
                details: `Created gym ${gym.name} (${finalCustomId})`
            }
        });
        res.status(201).json({ gym, message: "Gym created successfully" });
    }
    catch (err) {
        console.error("Admin create gym error:", err);
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/gyms/:id ──────────────────────────────────────────────────
router.put("/gyms/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const gymId = req.params.id;
        const { customGymId, ownerName, bankDetails, cappingMode, maxDailyVisits, maxSlotVisits, payoutModel, payoutCommissionRate, payoutFixedPerVisit, paymentCycle, isGstRegistered, gstNumber, invoicePrefix, name, address, city, state, landmark, googleMapsUrl, contactPhone, monthlyPrice, weekdayHours, weekendHours, facilities, slots, logoUrl, exteriorImageUrl, interiorImageUrls, lat, lng, isVerified, isActive, } = req.body;
        const existingGym = await prisma_1.default.gym.findUnique({ where: { id: gymId } });
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
        const gym = await prisma_1.default.gym.update({
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
                facilities: facilities !== undefined ? (Array.isArray(facilities) ? facilities : [facilities]) : (existingGym.facilities ?? []),
                cappingMode: finalCappingMode,
                maxDailyVisits: finalMaxDaily,
                maxSlotVisits: finalMaxSlot,
                slotsJson: slots !== undefined ? (typeof slots === "string" ? slots : JSON.stringify(slots)) : existingGym.slotsJson,
                ownerName: ownerName !== undefined ? ownerName : existingGym.ownerName,
                bankDetailsJson: bankDetails !== undefined ? (typeof bankDetails === "string" ? bankDetails : JSON.stringify(bankDetails)) : existingGym.bankDetailsJson,
                logoUrl: logoUrl !== undefined ? logoUrl : existingGym.logoUrl,
                exteriorImageUrl: exteriorImageUrl !== undefined ? exteriorImageUrl : existingGym.exteriorImageUrl,
                interiorImageUrls: interiorImageUrls !== undefined ? (Array.isArray(interiorImageUrls) ? interiorImageUrls : [interiorImageUrls]) : (existingGym.interiorImageUrls ?? []),
                imageUrls: [
                    exteriorImageUrl || existingGym.exteriorImageUrl,
                    logoUrl || existingGym.logoUrl,
                    ...(Array.isArray(interiorImageUrls) ? interiorImageUrls : (Array.isArray(existingGym.interiorImageUrls) ? existingGym.interiorImageUrls : []))
                ].filter(Boolean),
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
    }
    catch (err) {
        console.error("Admin update gym error:", err);
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/gyms/:id ─────────────────────────────────────────────────
router.get("/gyms/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const gymId = req.params.id;
        const gym = await prisma_1.default.gym.findUnique({
            where: { id: gymId },
            include: {
                plans: {
                    orderBy: { createdAt: "asc" }
                }
            }
        });
        if (!gym)
            return res.status(404).json({ error: "Gym not found" });
        res.json({ gym });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/gyms/:id/economy ─────────────────────────────────────────
router.put("/gyms/:id/economy", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const gymId = req.params.id;
        const { creditPurchasePrice, creditConversionValue, initialVisitCut, cashExpiryDays } = req.body;
        const gym = await prisma_1.default.gym.update({
            where: { id: gymId },
            data: {
                creditPurchasePrice: creditPurchasePrice !== "" ? parseInt(creditPurchasePrice, 10) : null,
                creditConversionValue: creditConversionValue !== "" ? parseInt(creditConversionValue, 10) : null,
                initialVisitCut: initialVisitCut !== "" ? parseInt(initialVisitCut, 10) : null,
                cashExpiryDays: cashExpiryDays !== "" ? parseInt(cashExpiryDays, 10) : null
            }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "UPDATE_GYM_ECONOMY",
                targetId: gym.id,
                details: "Updated per-gym economy overrides"
            }
        });
        res.json({ gym });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/admin/gyms/:id/plans ──────────────────────────────────────────
router.post("/gyms/:id/plans", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const gymId = req.params.id;
        const { name, description, initialPeriodMonths, initialCutoffDays, subsequentCutoffDays, priceInPaise, billingCycle } = req.body;
        const plan = await prisma_1.default.gymPlan.create({
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
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "CREATE_GYM_PLAN",
                targetId: plan.id,
                details: `Created plan ${name} for gym ${gymId}`
            }
        });
        res.json({ plan });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── DELETE /api/admin/gyms/:gymId/plans/:planId ─────────────────────────────
router.delete("/gyms/:gymId/plans/:planId", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const planId = req.params.planId;
        await prisma_1.default.gymPlan.delete({
            where: { id: planId }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "DELETE_GYM_PLAN",
                targetId: planId,
                details: `Deleted plan ${planId}`
            }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/finance ────────────────────────────────────────────────
router.get("/finance", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const totalPayments = await prisma_1.default.paymentOrder.aggregate({
            where: { status: "PAID" },
            _sum: { amountPaise: true }
        });
        const gmv = (totalPayments._sum.amountPaise || 0) / 100; // in INR
        const totalPayouts = await prisma_1.default.gymPayout.aggregate({
            where: { status: "PAID" },
            _sum: { amountPaise: true }
        });
        const totalPaid = (totalPayouts._sum.amountPaise || 0) / 100;
        const pendingPayouts = await prisma_1.default.gymPayout.aggregate({
            where: { status: "PENDING" },
            _sum: { amountPaise: true }
        });
        const totalPending = (pendingPayouts._sum.amountPaise || 0) / 100;
        const recentPayouts = await prisma_1.default.gymPayout.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/support ────────────────────────────────────────────────
router.get("/support", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const tickets = await prisma_1.default.supportTicket.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
                gym: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json({ tickets });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/marketing/coupons ───────────────────────────────────────
router.get("/marketing/coupons", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const coupons = await prisma_1.default.marketingCoupon.findMany({
            orderBy: { createdAt: "desc" }
        });
        res.json({ coupons });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/admin/marketing/coupons ──────────────────────────────────────
router.post("/marketing/coupons", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { code, discountType, discountValue, usageLimit } = req.body;
        const coupon = await prisma_1.default.marketingCoupon.create({
            data: {
                code: code.toUpperCase(),
                discountType: discountType || "PERCENTAGE",
                discountValue: parseInt(discountValue, 10),
                usageLimit: usageLimit ? parseInt(usageLimit, 10) : null
            }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "CREATE_COUPON",
                targetId: coupon.id,
                details: `Created coupon ${coupon.code}`
            }
        });
        res.json({ coupon });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/marketing/coupons/:id ───────────────────────────────────
router.put("/marketing/coupons/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const { isActive, usageLimit } = req.body;
        const coupon = await prisma_1.default.marketingCoupon.update({
            where: { id },
            data: {
                ...(isActive !== undefined && { isActive }),
                ...(usageLimit !== undefined && { usageLimit: usageLimit ? parseInt(usageLimit, 10) : null })
            }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "UPDATE_COUPON",
                targetId: coupon.id,
                details: `Updated coupon ${coupon.code}`
            }
        });
        res.json({ coupon });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── DELETE /api/admin/marketing/coupons/:id ────────────────────────────────
router.delete("/marketing/coupons/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const coupon = await prisma_1.default.marketingCoupon.delete({
            where: { id }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "DELETE_COUPON",
                targetId: coupon.id,
                details: `Deleted coupon ${coupon.code}`
            }
        });
        res.json({ success: true, message: "Coupon deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/audit-logs ──────────────────────────────────────────────
router.get("/audit-logs", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const logs = await prisma_1.default.adminAuditLog.findMany({
            include: {
                admin: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 100
        });
        res.json({ logs });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/settings ─────────────────────────────────────────────────
router.get("/settings", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const settings = await (0, settings_1.getSystemSettings)();
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/settings ─────────────────────────────────────────────────
router.put("/settings", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { creditPurchasePrice, creditConversionValue, cashExpiryDays, initialVisitCut, referralsEnabled, payoutsEnabled, signupsEnabled, couponsEnabled } = req.body;
        const settings = await prisma_1.default.systemSettings.upsert({
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
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "UPDATE_SETTINGS",
                details: "Updated system settings (including Kill Switches)"
            }
        });
        res.json({ message: "Settings updated successfully", settings });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/users/:id/history ─────────────────────────────────────────
router.get("/users/:id/history", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const bookings = await prisma_1.default.booking.findMany({
            where: { userId },
            include: { gym: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 10
        });
        const transactions = await prisma_1.default.creditTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 10
        });
        res.json({ bookings, transactions });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/memberships ──────────────────────────────────────────────
router.get("/memberships", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const memberships = await prisma_1.default.membership.findMany({
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                plan: { select: { name: true, monthlyCredits: true } }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json({ memberships });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/memberships/:id/status ───────────────────────────────────
router.put("/memberships/:id/status", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const membershipId = req.params.id;
        const membership = await prisma_1.default.membership.update({
            where: { id: membershipId },
            data: { status }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "UPDATE_MEMBERSHIP",
                targetId: membership.id,
                details: `Updated membership status to ${status}`
            }
        });
        res.json({ membership });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/content ──────────────────────────────────────────────────
router.get("/content", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const content = await prisma_1.default.systemContent.findMany();
        res.json({ content });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/admin/content ─────────────────────────────────────────────────
router.post("/content", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { key, value } = req.body;
        const content = await prisma_1.default.systemContent.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "UPDATE_CONTENT",
                details: `Updated content for key: ${key}`
            }
        });
        res.json({ content });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/admin/notifications/broadcast ─────────────────────────────────
router.post("/notifications/broadcast", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { title, body, userId } = req.body;
        if (userId) {
            await prisma_1.default.notification.create({
                data: { userId, title, body }
            });
        }
        else {
            // In a real system, you'd queue this. For MVP, we insert for all active users (limited for safety).
            const users = await prisma_1.default.user.findMany({ take: 1000, select: { id: true } });
            const notifications = users.map(u => ({
                userId: u.id,
                title,
                body
            }));
            await prisma_1.default.notification.createMany({ data: notifications });
        }
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "SEND_BROADCAST",
                details: `Sent broadcast: ${title} to ${userId ? 'Specific User' : 'All Users'}`
            }
        });
        res.json({ message: "Content updated successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GLOBAL MEMBERSHIP PLANS ─────────────────────────────────────────────────
router.get("/plans", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const plans = await prisma_1.default.membershipPlan.findMany({
            orderBy: { priceInPaise: "asc" }
        });
        res.json({ plans });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
router.post("/plans", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, tier, priceInPaise, monthlyCredits, durationDays, features } = req.body;
        const plan = await prisma_1.default.membershipPlan.create({
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
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
router.delete("/plans/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.membershipPlan.delete({
            where: { id }
        });
        res.json({ message: "Plan deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/marketplace ──────────────────────────────────────────────
router.get("/marketplace", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const items = await prisma_1.default.marketplaceItem.findMany({
            orderBy: { createdAt: "desc" }
        });
        res.json({ items });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/admin/marketplace ─────────────────────────────────────────────
router.post("/marketplace", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { title, description, pricePaise, imageUrl, inStock, storeCategory, sizes, colors } = req.body;
        const parsedSizes = Array.isArray(sizes)
            ? sizes
            : (typeof sizes === "string" ? sizes.split(",").map((s) => s.trim()).filter(Boolean) : []);
        const parsedColors = Array.isArray(colors)
            ? colors
            : (typeof colors === "string" ? colors.split(",").map((c) => c.trim()).filter(Boolean) : []);
        const item = await prisma_1.default.marketplaceItem.create({
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
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "CREATE_MARKETPLACE_ITEM",
                targetId: item.id,
                details: `Created item: ${title}`
            }
        });
        res.json({ item });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/marketplace/:id ──────────────────────────────────────────
router.put("/marketplace/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const { title, description, pricePaise, imageUrl, inStock, storeCategory, sizes, colors } = req.body;
        const parsedSizes = sizes !== undefined
            ? (Array.isArray(sizes) ? sizes : (typeof sizes === "string" ? sizes.split(",").map((s) => s.trim()).filter(Boolean) : []))
            : undefined;
        const parsedColors = colors !== undefined
            ? (Array.isArray(colors) ? colors : (typeof colors === "string" ? colors.split(",").map((c) => c.trim()).filter(Boolean) : []))
            : undefined;
        const item = await prisma_1.default.marketplaceItem.update({
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
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "UPDATE_MARKETPLACE_ITEM",
                targetId: item.id,
                details: `Updated item: ${item.title}`
            }
        });
        res.json({ item });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── DELETE /api/admin/marketplace/:id ───────────────────────────────────────
router.delete("/marketplace/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        // Delete any dependent orders first to avoid foreign key errors
        await prisma_1.default.marketplaceOrder.deleteMany({
            where: { itemId: id }
        });
        await prisma_1.default.marketplaceItem.delete({
            where: { id }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "DELETE_MARKETPLACE_ITEM",
                targetId: id,
                details: `Deleted item: ${id}`
            }
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/trial-gyms ───────────────────────────────────────────────
router.get("/trial-gyms", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const trialGyms = await prisma_1.default.trialGym.findMany({
            include: {
                _count: {
                    select: { votes: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json({ trialGyms });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/admin/trial-gyms ──────────────────────────────────────────────
router.post("/trial-gyms", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, city, area, description, imageUrl } = req.body;
        const trialGym = await prisma_1.default.trialGym.create({
            data: {
                name,
                city,
                area,
                description,
                imageUrl
            }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "CREATE_TRIAL_GYM",
                targetId: trialGym.id,
                details: `Created trial gym: ${name}`
            }
        });
        res.json({ trialGym });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/trial-gyms/:id ───────────────────────────────────────────
router.put("/trial-gyms/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, city, area, description, imageUrl } = req.body;
        const trialGym = await prisma_1.default.trialGym.update({
            where: { id: req.params.id },
            data: {
                name,
                city,
                area,
                description,
                imageUrl
            }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "UPDATE_TRIAL_GYM",
                targetId: trialGym.id,
                details: `Updated trial gym: ${name}`
            }
        });
        res.json({ trialGym });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── DELETE /api/admin/trial-gyms/:id ────────────────────────────────────────
router.delete("/trial-gyms/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const trialGymId = req.params.id;
        await prisma_1.default.trialGym.delete({
            where: { id: trialGymId }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "DELETE_TRIAL_GYM",
                targetId: trialGymId,
                details: `Deleted trial gym: ${trialGymId}`
            }
        });
        res.json({ success: true, message: "Trial gym deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/support/:id/status ─────────────────────────────────────
router.put("/support/:id/status", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await prisma_1.default.supportTicket.update({
            where: { id: req.params.id },
            data: { status }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "UPDATE_TICKET_STATUS",
                targetId: ticket.id,
                details: `Updated ticket ${ticket.id} status to ${status}`
            }
        });
        res.json({ ticket });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/admin/payouts/process ───────────────────────────────────────
router.post("/payouts/process", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { payoutId } = req.body || {};
        const whereClause = { status: "PENDING" };
        if (payoutId) {
            whereClause.id = payoutId;
        }
        const result = await prisma_1.default.gymPayout.updateMany({
            where: whereClause,
            data: {
                status: "PAID",
                payoutDate: new Date()
            }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "PROCESS_PAYOUTS",
                targetId: payoutId || "BULK",
                details: payoutId ? `Processed single payout ${payoutId}` : `Processed ${result.count} pending payouts`
            }
        });
        res.json({ message: "Payout processed successfully", count: result.count });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/admin/gym-applications ───────────────────────────────────────
router.get("/gym-applications", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const applications = await prisma_1.default.gymApplication.findMany({
            where: { status: "PENDING" },
            include: {
                gym: { include: { owner: { select: { name: true, email: true } } } }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json({ applications });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/admin/gym-applications/:id ───────────────────────────────────
router.put("/gym-applications/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const application = await prisma_1.default.gymApplication.update({
            where: { id: req.params.id },
            data: { status }
        });
        if (status === "APPROVED") {
            await prisma_1.default.gym.update({
                where: { id: application.gymId },
                data: {
                    isVerified: true,
                    isActive: true
                }
            });
            const gym = await prisma_1.default.gym.findUnique({ where: { id: application.gymId } });
            if (gym?.ownerId) {
                await prisma_1.default.user.update({
                    where: { id: gym.ownerId },
                    data: { systemRole: "GYM_OWNER" }
                });
            }
        }
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "EVALUATE_GYM_APPLICATION",
                targetId: application.id,
                details: `Updated gym application ${application.id} to ${status}`
            }
        });
        res.json({ application });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── DELETE /api/admin/gyms/:id ──────────────────────────────────────────────
router.delete("/gyms/:id", auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const gymId = req.params.id;
        // First delete any related applications
        await prisma_1.default.gymApplication.deleteMany({
            where: { gymId }
        });
        // Delete the gym
        await prisma_1.default.gym.delete({
            where: { id: gymId }
        });
        await prisma_1.default.adminAuditLog.create({
            data: {
                adminId: req.dbUserId,
                actionType: "DELETE_GYM",
                targetId: gymId,
                details: `Deleted gym ${gymId}`
            }
        });
        res.json({ success: true, message: "Gym deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
exports.default = router;
// trigger restart
//# sourceMappingURL=admin.js.map