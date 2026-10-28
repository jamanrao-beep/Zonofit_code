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
// ─── GET /api/gyms ────────────────────────────────────────────────────────────
/**
 * List gyms — supports filtering by:
 *   - lat/lng + radius (PostGIS ST_DWithin) for "Near Me"
 *   - category (STANDARD, PREMIUM, BEGINNER_FRIENDLY, etc.)
 *   - city
 *   - maxCredits (filter by cost)
 *   - search (name/address text search)
 *
 * Returns gyms sorted by distance when lat/lng are provided.
 * Supports guest exploration per PRD Section 4.3.
 */
router.get("/", auth_1.optionalAuth, [
    (0, express_validator_1.query)("lat").optional().isFloat({ min: -90, max: 90 }),
    (0, express_validator_1.query)("lng").optional().isFloat({ min: -180, max: 180 }),
    (0, express_validator_1.query)("radius").optional().isFloat({ min: 0.1, max: 50 }), // KM
    (0, express_validator_1.query)("category").optional().isString(),
    (0, express_validator_1.query)("city").optional().isString(),
    (0, express_validator_1.query)("maxCredits").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("search").optional().isString(),
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 50 }),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { lat, lng, radius = "5", category, city, maxCredits, search, page = "1", limit = "20", } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    // If lat/lng provided → use PostGIS spatial query
    if (lat && lng) {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusMeters = parseFloat(radius) * 1000; // Convert KM to meters
        // ST_DWithin is faster than ST_Distance filter because it uses spatial index
        // ST_Distance gives us the actual distance in meters for sorting/display
        // Geography cast converts to spheroid for accurate real-world distances
        const gyms = await prisma_1.default.$queryRaw `
        SELECT
          id,
          name,
          address,
          city,
          lat,
          lng,
          creditCost AS credit_cost,
          category,
          facilities,
          imageUrls AS image_urls,
          rating,
          totalRatings AS total_ratings,
          isVerified AS is_verified,
          openingTime AS opening_time,
          closingTime AS closing_time,
          totalSlots AS total_slots,
          ST_Distance_Sphere(
            POINT(lng, lat),
            POINT(${lngNum}, ${latNum})
          ) AS distance_meters
        FROM gyms
        WHERE
          isActive = true
          AND ST_Distance_Sphere(
            POINT(lng, lat),
            POINT(${lngNum}, ${latNum})
          ) <= ${radiusMeters}
          ${category ? prisma_1.default.$queryRaw `AND category = ${category}` : prisma_1.default.$queryRaw ``}
          ${maxCredits ? prisma_1.default.$queryRaw `AND creditCost <= ${parseInt(maxCredits)}` : prisma_1.default.$queryRaw ``}
          ${city ? prisma_1.default.$queryRaw `AND LOWER(city) = LOWER(${city})` : prisma_1.default.$queryRaw ``}
          ${search ? prisma_1.default.$queryRaw `AND (LOWER(name) LIKE ${"%" + search.toLowerCase() + "%"} OR LOWER(address) LIKE ${"%" + search.toLowerCase() + "%"})` : prisma_1.default.$queryRaw ``}
        ORDER BY distance_meters ASC
        LIMIT ${limitNum}
        OFFSET ${skip}
      `;
        res.json({
            gyms: gyms.map((g) => ({
                ...g,
                facilities: typeof g.facilities === "string" ? JSON.parse(g.facilities) : (g.facilities ?? []),
                imageUrls: typeof (g.imageUrls ?? g.image_urls) === "string" ? JSON.parse(g.imageUrls ?? g.image_urls) : (g.imageUrls ?? g.image_urls ?? []),
                creditCost: g.creditCost ?? g.credit_cost,
                distanceKm: +(g.distance_meters / 1000).toFixed(2),
            })),
            pagination: { page: pageNum, limit: limitNum },
        });
        return;
    }
    // No lat/lng → standard Prisma query (city/search/category filters)
    const where = {
        isActive: true,
        ...(category && { category }),
        ...(city && { city: { equals: city, mode: "insensitive" } }),
        ...(maxCredits && { creditCost: { lte: parseInt(maxCredits) } }),
        ...(search && {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
            ],
        }),
    };
    const [gyms, total] = await prisma_1.default.$transaction([
        prisma_1.default.gym.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { rating: "desc" },
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                lat: true,
                lng: true,
                creditCost: true,
                category: true,
                facilities: true,
                imageUrls: true,
                rating: true,
                totalRatings: true,
                isVerified: true,
                openingTime: true,
                closingTime: true,
                totalSlots: true,
            },
        }),
        prisma_1.default.gym.count({ where }),
    ]);
    res.json({ gyms, pagination: { page: pageNum, limit: limitNum, total } });
});
// ─── GET /api/gyms/near-primary ───────────────────────────────────────────────
/**
 * Gyms near the authenticated user's primary gym (Explore Section 6).
 * These are displayed for awareness only — NOT bookable under current plan.
 * Returns gyms within 5KM of the user's last booked / primary gym.
 */
router.get("/explore/near-primary", auth_1.requireAuth, async (req, res) => {
    // Find the user's most recent booking to determine their "primary" gym
    const lastBooking = await prisma_1.default.booking.findFirst({
        where: {
            userId: req.dbUserId,
            status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
        },
        orderBy: { createdAt: "desc" },
        include: { gym: { select: { id: true, lat: true, lng: true } } },
    });
    if (!lastBooking) {
        res.json({ gyms: [], message: "No primary gym found. Book a visit first." });
        return;
    }
    const { lat, lng, id: primaryGymId } = lastBooking.gym;
    const RADIUS_METERS = 5000; // 5KM
    const nearbyGyms = await prisma_1.default.$queryRaw `
      SELECT
        id,
        name,
        address,
        ST_Distance_Sphere(
          POINT(lng, lat),
          POINT(${lng}, ${lat})
        ) AS distance_meters
      FROM gyms
      WHERE
        isActive = true
        AND id != ${primaryGymId}
        AND ST_Distance_Sphere(
          POINT(lng, lat),
          POINT(${lng}, ${lat})
        ) <= ${RADIUS_METERS}
      ORDER BY distance_meters ASC
      LIMIT 10
    `;
    res.json({
        primaryGymId,
        gyms: nearbyGyms.map((g) => ({
            ...g,
            distanceKm: +(g.distance_meters / 1000).toFixed(2),
            isBookable: false, // Always false — these are display-only per spec
            lockReason: "Not available under current access",
        })),
    });
});
// ─── GET /api/gyms/favorites ────────────────────────────────────────────────
/**
 * Get all saved/favorite gyms for the authenticated user.
 * Must be registered before /:id so Express does not capture 'favorites' as a gym ID.
 */
router.get("/favorites", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.dbUserId;
        const savedGyms = await prisma_1.default.savedGym.findMany({
            where: { userId },
            include: {
                gym: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        creditCost: true,
                        rating: true,
                        imageUrls: true,
                        facilities: true,
                        category: true,
                        isVerified: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json({
            savedGyms: savedGyms.map(sg => ({ ...sg.gym, savedAt: sg.createdAt })),
            favoriteGymIds: savedGyms.map(sg => sg.gym.id)
        });
    }
    catch (err) {
        console.error("Failed to fetch favorites:", err);
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/gyms/:id ────────────────────────────────────────────────────────
/**
 * Get full gym details by ID.
 * Also returns available slot count for today (bookings remaining).
 */
router.get("/:id", auth_1.optionalAuth, async (req, res) => {
    const gymId = req.params.id;
    const gym = await prisma_1.default.gym.findUnique({
        where: { id: gymId, isActive: true },
        select: {
            id: true,
            name: true,
            description: true,
            address: true,
            city: true,
            pincode: true,
            state: true,
            lat: true,
            lng: true,
            creditCost: true,
            category: true,
            facilities: true,
            imageUrls: true,
            rating: true,
            totalRatings: true,
            isVerified: true,
            openingTime: true,
            closingTime: true,
            totalSlots: true,
            contactPhone: true,
            partnerSince: true,
            plans: {
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    priceInPaise: true,
                    billingCycle: true,
                    initialPeriodMonths: true,
                    initialCutoffDays: true,
                    subsequentCutoffDays: true
                }
            }
        },
    });
    if (!gym) {
        res.status(404).json({ error: "GymNotFound", message: "Gym not found." });
        return;
    }
    // Count today's confirmed/checked-in bookings to derive available slots
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const bookedToday = await prisma_1.default.booking.count({
        where: {
            gymId: gym.id,
            visitDate: { gte: todayStart, lte: todayEnd },
            status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
        },
    });
    res.json({
        ...gym,
        availableSlots: Math.max(0, gym.totalSlots - bookedToday),
    });
});
// ─── GET /api/gyms/analytics/dashboard ─────────────────────────────────────
/**
 * Dashboard analytics for Gym Owners.
 */
router.get("/analytics/dashboard", auth_1.requireAuth, async (req, res) => {
    try {
        // Get all gyms owned by this user
        const gyms = await prisma_1.default.gym.findMany({
            where: { ownerId: req.dbUserId, isActive: true },
            select: { id: true, name: true, creditCost: true }
        });
        if (gyms.length === 0) {
            res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
            return;
        }
        const gymIds = gyms.map(g => g.id);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        // Check-ins Today
        const todayCheckins = await prisma_1.default.booking.findMany({
            where: {
                gymId: { in: gymIds },
                visitDate: { gte: todayStart, lte: todayEnd },
                status: { in: ["CHECKED_IN", "COMPLETED"] }
            },
            include: { gym: true }
        });
        const usersToday = todayCheckins.length;
        const creditsToday = todayCheckins.reduce((sum, b) => sum + (b.gym?.creditCost || 0), 0);
        // Sales This Month
        const monthBookings = await prisma_1.default.booking.findMany({
            where: {
                gymId: { in: gymIds },
                visitDate: { gte: monthStart, lte: todayEnd },
                status: { in: ["CHECKED_IN", "COMPLETED"] }
            },
            include: { gym: true }
        });
        const monthCredits = monthBookings.reduce((sum, b) => sum + (b.gym?.creditCost || 0), 0);
        const salesThisMonth = monthCredits * 10; // Estimated INR
        // Recent Check-ins
        const recentCheckins = await prisma_1.default.booking.findMany({
            where: { gymId: { in: gymIds }, status: { in: ["CHECKED_IN", "COMPLETED"] } },
            orderBy: { updatedAt: "desc" },
            take: 3,
            include: { user: { select: { name: true, membership: { select: { plan: { select: { name: true } } } } } } }
        });
        // Upcoming Bookings
        const upcomingBookings = await prisma_1.default.booking.findMany({
            where: { gymId: { in: gymIds }, status: "CONFIRMED", visitDate: { gte: new Date() } },
            orderBy: { visitDate: "asc" },
            take: 3,
            include: { user: { select: { name: true } } }
        });
        // Weekly Attendance Chart (Last 7 days)
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        const weekBookings = await prisma_1.default.booking.findMany({
            where: {
                gymId: { in: gymIds },
                visitDate: { gte: weekStart, lte: todayEnd },
                status: { in: ["CHECKED_IN", "COMPLETED"] }
            },
            select: { visitDate: true }
        });
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const attendanceMap = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            attendanceMap[dayNames[d.getDay()]] = 0;
        }
        weekBookings.forEach(b => {
            const dayStr = dayNames[b.visitDate.getDay()];
            if (attendanceMap[dayStr] !== undefined) {
                attendanceMap[dayStr]++;
            }
        });
        const chartData = Object.keys(attendanceMap).map(day => ({
            day,
            visits: attendanceMap[day]
        }));
        res.json({
            gymId: gymIds[0] || null,
            usersToday,
            creditsToday,
            salesThisMonth,
            chartData,
            recentCheckins: recentCheckins.map(c => ({
                name: c.user?.name || "Unknown",
                time: new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                plan: c.user?.membership?.plan?.name || "Standard"
            })),
            upcomingBookings: upcomingBookings.map(b => ({
                name: b.user?.name || "Unknown",
                slot: new Date(b.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: b.status
            }))
        });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/gyms/analytics/members ──────────────────────────────────────────
router.get("/analytics/members", auth_1.requireAuth, async (req, res) => {
    try {
        const gyms = await prisma_1.default.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
        if (gyms.length === 0) {
            res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
            return;
        }
        const gymIds = gyms.map((g) => g.id);
        // Find all completed/checked_in bookings for these gyms
        const bookings = await prisma_1.default.booking.findMany({
            where: {
                gymId: { in: gymIds },
                status: { in: ["CHECKED_IN", "COMPLETED"] }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        membership: { select: { plan: { select: { name: true } }, createdAt: true } }
                    }
                }
            },
            orderBy: { visitDate: "desc" }
        });
        // Aggregate by user
        const memberMap = {};
        bookings.forEach(b => {
            if (!b.user)
                return;
            if (!memberMap[b.user.id]) {
                memberMap[b.user.id] = {
                    id: b.user.id,
                    name: b.user.name,
                    plan: b.user.membership?.plan?.name || "Standard",
                    joined: b.user.membership?.createdAt ? new Date(b.user.membership.createdAt).toLocaleDateString() : "N/A",
                    visits: 0,
                    lastVisit: b.visitDate,
                };
            }
            memberMap[b.user.id].visits += 1;
            if (new Date(b.visitDate) > new Date(memberMap[b.user.id].lastVisit)) {
                memberMap[b.user.id].lastVisit = b.visitDate;
            }
        });
        const members = Object.values(memberMap).map(m => ({
            ...m,
            lastVisit: new Date(m.lastVisit).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
        }));
        res.json({ members });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/gyms/analytics/payouts ──────────────────────────────────────────
router.get("/analytics/payouts", auth_1.requireAuth, async (req, res) => {
    try {
        const gyms = await prisma_1.default.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true, creditCost: true } });
        if (gyms.length === 0) {
            res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
            return;
        }
        const gymIds = gyms.map((g) => g.id);
        // Total earnings this month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthBookings = await prisma_1.default.booking.findMany({
            where: {
                gymId: { in: gymIds },
                visitDate: { gte: monthStart },
                status: { in: ["CHECKED_IN", "COMPLETED"] }
            },
            include: { gym: true }
        });
        const visitsThisMonth = monthBookings.length;
        // PRD v2.0 Formula: G = (M / 30) * 80% (Gym payout per eligible visit)
        const plans = await prisma_1.default.gymPlan.findMany({
            where: { gymId: { in: gymIds }, isActive: true },
        });
        const gymPlanMap = new Map();
        for (const p of plans) {
            if (p.gymId && p.priceInPaise > 0) {
                gymPlanMap.set(p.gymId, p.priceInPaise / 100);
            }
        }
        const getGymVisitPayout = (gymId, creditCost) => {
            const M = gymPlanMap.get(gymId) || (creditCost ? (creditCost * 10 * 30) / 8 : 3000);
            return (M / 30) * 0.8;
        };
        const earningsThisMonth = Math.round(monthBookings.reduce((sum, b) => sum + getGymVisitPayout(b.gymId, b.gym?.creditCost || 8), 0) * 100) / 100;
        // Fetch payouts
        const payouts = await prisma_1.default.gymPayout.findMany({
            where: { gymId: { in: gymIds } },
            orderBy: { createdAt: "desc" }
        });
        // Calculate total verified unsettled earnings
        const allVerifiedBookings = await prisma_1.default.booking.findMany({
            where: {
                gymId: { in: gymIds },
                status: { in: ["CHECKED_IN", "COMPLETED"] }
            },
            include: { gym: true }
        });
        const totalEarnedPaise = Math.round(allVerifiedBookings.reduce((sum, b) => sum + getGymVisitPayout(b.gymId, b.gym?.creditCost || 8), 0) * 100);
        const existingPayouts = await prisma_1.default.gymPayout.aggregate({
            where: {
                gymId: { in: gymIds },
                status: { in: ["PENDING", "PAID"] }
            },
            _sum: { amountPaise: true }
        });
        const alreadyDrawnPaise = existingPayouts._sum.amountPaise || 0;
        const pendingPayout = Math.max(0, Math.round((totalEarnedPaise - alreadyDrawnPaise) / 100));
        res.json({
            pendingPayout,
            earningsThisMonth,
            visitsThisMonth,
            payouts: payouts.map(p => ({
                id: p.id,
                period: `${new Date(p.periodStart).toLocaleDateString()} - ${new Date(p.periodEnd).toLocaleDateString()}`,
                amount: `₹${p.amountPaise / 100}`,
                status: p.status,
                date: p.payoutDate ? new Date(p.payoutDate).toLocaleDateString() : "Pending"
            }))
        });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET & POST /api/gyms/offers ──────────────────────────────────────────────
router.get("/offers", auth_1.requireAuth, async (req, res) => {
    try {
        const gyms = await prisma_1.default.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
        if (gyms.length === 0) {
            res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
            return;
        }
        const gymIds = gyms.map((g) => g.id);
        const offers = await prisma_1.default.gymOffer.findMany({
            where: { gymId: { in: gymIds } },
            orderBy: { createdAt: "desc" }
        });
        res.json({
            offers: offers.map(o => ({
                id: o.id,
                title: o.title,
                discountText: o.discountText,
                status: o.status,
                expiryDate: o.expiryDate ? new Date(o.expiryDate).toLocaleDateString() : "No Expiry"
            }))
        });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
router.post("/offers", auth_1.requireAuth, async (req, res) => {
    try {
        const { title, discountText, status, expiryDate } = req.body;
        const gyms = await prisma_1.default.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
        if (gyms.length === 0) {
            res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
            return;
        }
        const newOffer = await prisma_1.default.gymOffer.create({
            data: {
                gymId: gyms[0].id,
                title,
                discountText,
                status: status || "ACTIVE",
                expiryDate: expiryDate ? new Date(expiryDate) : null
            }
        });
        res.json({ success: true, offer: newOffer });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── PUT /api/gyms/profile ──────────────────────────────────────────────────
router.put("/profile", auth_1.requireAuth, async (req, res) => {
    try {
        const { name, description, contactPhone, openingTime, closingTime, facilities } = req.body;
        const gyms = await prisma_1.default.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
        if (gyms.length === 0) {
            res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
            return;
        }
        const updated = await prisma_1.default.gym.update({
            where: { id: gyms[0].id },
            data: {
                name, description, contactPhone, openingTime, closingTime, facilities
            }
        });
        res.json({ success: true, gym: updated });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/gyms/analytics/performance ──────────────────────────────────────
router.get("/analytics/performance", auth_1.requireAuth, async (req, res) => {
    try {
        const gyms = await prisma_1.default.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
        if (gyms.length === 0) {
            res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
            return;
        }
        const gymIds = gyms.map((g) => g.id);
        // Simple mock-like structure for the area charts but generated from DB
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        const bookings = await prisma_1.default.booking.findMany({
            where: {
                gymId: { in: gymIds },
                visitDate: { gte: weekStart },
                status: { in: ["CHECKED_IN", "COMPLETED"] }
            },
            select: { userId: true, visitDate: true }
        });
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const performanceMap = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            performanceMap[dayNames[d.getDay()]] = { newMembers: 0, total: 0 };
        }
        const userVisits = new Set();
        bookings.forEach(b => {
            const dayStr = dayNames[b.visitDate.getDay()];
            if (performanceMap[dayStr]) {
                performanceMap[dayStr].total++;
                if (!userVisits.has(b.userId)) {
                    performanceMap[dayStr].newMembers++;
                    userVisits.add(b.userId);
                }
            }
        });
        const chartData = Object.keys(performanceMap).map(day => {
            const d = performanceMap[day];
            // Calculate a basic retention % for the chart
            const retention = d.total > 0 ? Math.round(((d.total - d.newMembers) / d.total) * 100) + 70 : 80;
            return {
                name: day,
                newMembers: d.newMembers,
                retention: Math.min(100, retention) // cap at 100%
            };
        });
        res.json({ chartData });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/gyms/support ────────────────────────────────────────────────
router.post("/support", auth_1.requireAuth, async (req, res) => {
    try {
        const { subject, message } = req.body;
        const gym = await prisma_1.default.gym.findFirst({ where: { ownerId: req.dbUserId, isActive: true } });
        const ticket = await prisma_1.default.supportTicket.create({
            data: {
                subject,
                message,
                status: "OPEN",
                priority: "MEDIUM",
                userId: req.dbUserId,
                gymId: gym ? gym.id : null
            }
        });
        res.json({ ticket });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/gyms/support ─────────────────────────────────────────────────
router.get("/support", auth_1.requireAuth, async (req, res) => {
    try {
        const tickets = await prisma_1.default.supportTicket.findMany({
            where: { userId: req.dbUserId },
            orderBy: { createdAt: "desc" }
        });
        res.json({ tickets });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/gyms/payouts/request ────────────────────────────────────────
router.post("/payouts/request", auth_1.requireAuth, async (req, res) => {
    try {
        const { amountPaise } = req.body;
        const requestedPaise = parseInt(amountPaise, 10);
        if (isNaN(requestedPaise) || requestedPaise <= 0) {
            res.status(400).json({ error: "InvalidAmount", message: "A valid positive amount is required." });
            return;
        }
        const gym = await prisma_1.default.gym.findFirst({ where: { ownerId: req.dbUserId, isActive: true } });
        if (!gym) {
            res.status(403).json({ error: "Forbidden", message: "Not a gym owner" });
            return;
        }
        // Calculate total verified earnings for this gym
        const completedBookings = await prisma_1.default.booking.count({
            where: {
                gymId: gym.id,
                status: { in: ["CHECKED_IN", "COMPLETED"] }
            }
        });
        // PRD v2.0 Formula 2: G = (M / 30) * 80% (Gym payout per eligible visit)
        const gymPlan = await prisma_1.default.gymPlan.findFirst({
            where: { gymId: gym.id, isActive: true },
            orderBy: { createdAt: "desc" }
        });
        const M = gymPlan && gymPlan.priceInPaise > 0
            ? (gymPlan.priceInPaise / 100)
            : (gym.creditCost ? (gym.creditCost * 10 * 30) / 8 : 3000);
        const payoutPerVisitINR = (M / 30) * 0.8;
        const totalEarnedPaise = Math.round(completedBookings * payoutPerVisitINR * 100);
        // Sum already requested or paid payouts
        const existingPayouts = await prisma_1.default.gymPayout.aggregate({
            where: {
                gymId: gym.id,
                status: { in: ["PENDING", "PAID"] }
            },
            _sum: { amountPaise: true }
        });
        const alreadyDrawnPaise = existingPayouts._sum.amountPaise || 0;
        const availablePaise = Math.max(0, totalEarnedPaise - alreadyDrawnPaise);
        if (availablePaise <= 0) {
            res.status(400).json({
                error: "InsufficientEarnings",
                message: "No unsettled earnings available for payout. Completed verified visits required."
            });
            return;
        }
        if (requestedPaise > availablePaise) {
            res.status(400).json({
                error: "AmountExceedsEarnings",
                message: `Requested amount (₹${requestedPaise / 100}) exceeds available balance of ₹${availablePaise / 100}.`
            });
            return;
        }
        const payout = await prisma_1.default.gymPayout.create({
            data: {
                gymId: gym.id,
                periodStart: new Date(),
                periodEnd: new Date(),
                amountPaise: requestedPaise,
                status: "PENDING"
            }
        });
        res.json({ payout, message: "Payout requested successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/gyms/applications ───────────────────────────────────────────
router.post("/applications", auth_1.requireAuth, async (req, res) => {
    try {
        const { name, city, address, description, facilities, logoUrl, coverImageUrl, tagline, landmark, area, establishedYear, gymSizeSqFt, trainerCount, branchesCount, services, rules, operatingHours } = req.body;
        // Create a disabled Gym record
        const gym = await prisma_1.default.gym.create({
            data: {
                name,
                city,
                address,
                description,
                logoUrl: logoUrl || null,
                coverImageUrl: coverImageUrl || null,
                tagline: tagline || null,
                landmark: landmark || null,
                area: area || null,
                establishedYear: establishedYear ? parseInt(establishedYear, 10) : null,
                gymSizeSqFt: gymSizeSqFt ? parseInt(gymSizeSqFt, 10) : null,
                trainerCount: trainerCount ? parseInt(trainerCount, 10) : null,
                branchesCount: branchesCount ? parseInt(branchesCount, 10) : null,
                state: "Maharashtra", // default
                lat: 0,
                lng: 0,
                creditCost: 10, // default
                isVerified: false,
                isActive: false,
                ownerId: req.dbUserId || null,
                facilities: Array.isArray(facilities) ? facilities : (facilities ? [facilities] : []),
                services: Array.isArray(services) ? services : (services ? [services] : []),
                rules: Array.isArray(rules) ? rules : (rules ? [rules] : [])
            }
        });
        // Create Operating Hours if provided
        if (operatingHours && Array.isArray(operatingHours)) {
            const hoursData = operatingHours.map((h) => ({
                gymId: gym.id,
                dayOfWeek: parseInt(h.dayOfWeek, 10),
                startTime: h.startTime,
                endTime: h.endTime,
                capacity: parseInt(h.capacity, 10),
                isActive: true
            }));
            if (hoursData.length > 0) {
                await prisma_1.default.gymOperatingHour.createMany({
                    data: hoursData
                });
            }
        }
        // Create the Application record
        const application = await prisma_1.default.gymApplication.create({
            data: {
                gymId: gym.id,
                status: "PENDING",
                notes: `Application created by user ${req.dbUserId}`
            }
        });
        res.json({ application, gym });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── POST /api/gyms/:id/favorite ────────────────────────────────────────────
/**
 * Toggle favorite/saved status for a gym.
 * If already saved, removes it. If not saved, adds it.
 * Returns { isSaved: boolean }
 */
router.post("/:id/favorite", auth_1.requireAuth, async (req, res) => {
    try {
        const gymId = req.params.id;
        const userId = req.dbUserId;
        // Check if already saved
        const existing = await prisma_1.default.savedGym.findUnique({
            where: { userId_gymId: { userId, gymId } }
        });
        if (existing) {
            // Unsave
            await prisma_1.default.savedGym.delete({
                where: { id: existing.id }
            });
            const count = await prisma_1.default.savedGym.count({ where: { gymId } });
            res.json({ isSaved: false, favoritesCount: count });
        }
        else {
            // Save
            await prisma_1.default.savedGym.create({
                data: { userId, gymId }
            });
            const count = await prisma_1.default.savedGym.count({ where: { gymId } });
            res.json({ isSaved: true, favoritesCount: count });
        }
    }
    catch (err) {
        console.error("Failed to toggle gym favorite:", err);
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
// ─── GET /api/gyms/:id/favorite ─────────────────────────────────────────────
/**
 * Check if a specific gym is saved/favorited by the authenticated user.
 */
router.get("/:id/favorite", auth_1.requireAuth, async (req, res) => {
    try {
        const gymId = req.params.id;
        const userId = req.dbUserId;
        const existing = await prisma_1.default.savedGym.findUnique({
            where: { userId_gymId: { userId, gymId } }
        });
        const count = await prisma_1.default.savedGym.count({ where: { gymId } });
        res.json({ isSaved: !!existing, favoritesCount: count });
    }
    catch (err) {
        console.error("Failed to check gym favorite:", err);
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=gyms.js.map