import { Router, Request, Response } from "express";
import { query, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

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
 */
router.get(
  "/",
  requireAuth,
  [
    query("lat").optional().isFloat({ min: -90, max: 90 }),
    query("lng").optional().isFloat({ min: -180, max: 180 }),
    query("radius").optional().isFloat({ min: 0.1, max: 50 }), // KM
    query("category").optional().isString(),
    query("city").optional().isString(),
    query("maxCredits").optional().isInt({ min: 1 }),
    query("search").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const {
      lat,
      lng,
      radius = "5",
      category,
      city,
      maxCredits,
      search,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

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
      const gyms = await prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          address: string;
          city: string;
          lat: number;
          lng: number;
          credit_cost: number;
          category: string;
          facilities: string[];
          image_urls: string[];
          rating: number;
          total_ratings: number;
          is_verified: boolean;
          opening_time: string;
          closing_time: string;
          total_slots: number;
          distance_meters: number;
        }>
      >`
        SELECT
          id,
          name,
          address,
          city,
          lat,
          lng,
          credit_cost,
          category,
          facilities,
          image_urls,
          rating,
          total_ratings,
          is_verified,
          opening_time,
          closing_time,
          total_slots,
          ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography
          ) AS distance_meters
        FROM gyms
        WHERE
          is_active = true
          AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography,
            ${radiusMeters}
          )
          ${category ? prisma.$queryRaw`AND category = ${category}` : prisma.$queryRaw``}
          ${maxCredits ? prisma.$queryRaw`AND credit_cost <= ${parseInt(maxCredits)}` : prisma.$queryRaw``}
          ${city ? prisma.$queryRaw`AND LOWER(city) = LOWER(${city})` : prisma.$queryRaw``}
          ${search ? prisma.$queryRaw`AND (LOWER(name) LIKE ${"%" + search.toLowerCase() + "%"} OR LOWER(address) LIKE ${"%" + search.toLowerCase() + "%"})` : prisma.$queryRaw``}
        ORDER BY distance_meters ASC
        LIMIT ${limitNum}
        OFFSET ${skip}
      `;

      res.json({
        gyms: gyms.map((g) => ({
          ...g,
          distanceKm: +(g.distance_meters / 1000).toFixed(2),
        })),
        pagination: { page: pageNum, limit: limitNum },
      });
      return;
    }

    // No lat/lng → standard Prisma query (city/search/category filters)
    const where: Record<string, unknown> = {
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

    const [gyms, total] = await prisma.$transaction([
      prisma.gym.findMany({
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
      prisma.gym.count({ where }),
    ]);

    res.json({ gyms, pagination: { page: pageNum, limit: limitNum, total } });
  }
);

// ─── GET /api/gyms/near-primary ───────────────────────────────────────────────
/**
 * Gyms near the authenticated user's primary gym (Explore Section 6).
 * These are displayed for awareness only — NOT bookable under current plan.
 * Returns gyms within 5KM of the user's last booked / primary gym.
 */
router.get(
  "/explore/near-primary",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    // Find the user's most recent booking to determine their "primary" gym
    const lastBooking = await prisma.booking.findFirst({
      where: {
        userId: req.dbUserId!,
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

    const nearbyGyms = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        address: string;
        distance_meters: number;
      }>
    >`
      SELECT
        id,
        name,
        address,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS distance_meters
      FROM gyms
      WHERE
        is_active = true
        AND id != ${primaryGymId}
        AND ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${RADIUS_METERS}
        )
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
  }
);

// ─── GET /api/gyms/:id ────────────────────────────────────────────────────────
/**
 * Get full gym details by ID.
 * Also returns available slot count for today (bookings remaining).
 */
router.get(
  "/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const gymId = req.params.id as string;
    const gym = await prisma.gym.findUnique({
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

    const bookedToday = await prisma.booking.count({
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
  }
);

// ─── GET /api/gyms/analytics/dashboard ─────────────────────────────────────
/**
 * Dashboard analytics for Gym Owners.
 */
router.get(
  "/analytics/dashboard",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Get all gyms owned by this user
      const gyms = await prisma.gym.findMany({
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
      const todayCheckins = await prisma.booking.findMany({
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
      const monthBookings = await prisma.booking.findMany({
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
      const recentCheckins = await prisma.booking.findMany({
        where: { gymId: { in: gymIds }, status: { in: ["CHECKED_IN", "COMPLETED"] } },
        orderBy: { updatedAt: "desc" },
        take: 3,
        include: { user: { select: { name: true, membership: { select: { plan: { select: { name: true } } } } } } }
      });

      // Upcoming Bookings
      const upcomingBookings = await prisma.booking.findMany({
        where: { gymId: { in: gymIds }, status: "CONFIRMED", visitDate: { gte: new Date() } },
        orderBy: { visitDate: "asc" },
        take: 3,
        include: { user: { select: { name: true } } }
      });

      // Weekly Attendance Chart (Last 7 days)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekBookings = await prisma.booking.findMany({
        where: {
          gymId: { in: gymIds },
          visitDate: { gte: weekStart, lte: todayEnd },
          status: { in: ["CHECKED_IN", "COMPLETED"] }
        },
        select: { visitDate: true }
      });

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const attendanceMap: Record<string, number> = {};
      
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
          plan: (c.user as any)?.membership?.plan?.name || "Standard"
        })),
        upcomingBookings: upcomingBookings.map(b => ({
          name: b.user?.name || "Unknown",
          slot: new Date(b.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: b.status
        }))
      });
    } catch (err: any) {
      res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);



// ─── GET /api/gyms/analytics/members ──────────────────────────────────────────
router.get(
  "/analytics/members",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const gyms = await prisma.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
      if (gyms.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
        return;
      }
      const gymIds = gyms.map((g) => g.id);

      // Find all completed/checked_in bookings for these gyms
      const bookings = await prisma.booking.findMany({
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
      const memberMap: Record<string, any> = {};
      bookings.forEach(b => {
        if (!b.user) return;
        if (!memberMap[b.user.id]) {
          memberMap[b.user.id] = {
            id: b.user.id,
            name: b.user.name,
            plan: (b.user as any).membership?.plan?.name || "Standard",
            joined: (b.user as any).membership?.createdAt ? new Date((b.user as any).membership.createdAt).toLocaleDateString() : "N/A",
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
    } catch (err: any) {
      res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

// ─── GET /api/gyms/analytics/payouts ──────────────────────────────────────────
router.get(
  "/analytics/payouts",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const gyms = await prisma.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true, creditCost: true } });
      if (gyms.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
        return;
      }
      const gymIds = gyms.map((g) => g.id);

      // Total earnings this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0,0,0,0);
      
      const monthBookings = await prisma.booking.findMany({
        where: {
          gymId: { in: gymIds },
          visitDate: { gte: monthStart },
          status: { in: ["CHECKED_IN", "COMPLETED"] }
        },
        include: { gym: true }
      });

      const visitsThisMonth = monthBookings.length;
      const earningsThisMonth = monthBookings.reduce((sum, b) => sum + (b.gym?.creditCost || 0), 0) * 10;
      
      // Fetch payouts
      const payouts = await prisma.gymPayout.findMany({
        where: { gymId: { in: gymIds } },
        orderBy: { createdAt: "desc" }
      });

      res.json({
        pendingPayout: 0, // Simplified for now
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
    } catch (err: any) {
      res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

// ─── GET & POST /api/gyms/offers ──────────────────────────────────────────────
router.get(
  "/offers",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const gyms = await prisma.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
      if (gyms.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
        return;
      }
      const gymIds = gyms.map((g) => g.id);

      const offers = await prisma.gymOffer.findMany({
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
    } catch (err: any) {
      res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

router.post(
  "/offers",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { title, discountText, status, expiryDate } = req.body;
      const gyms = await prisma.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
      if (gyms.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
        return;
      }
      
      const newOffer = await prisma.gymOffer.create({
        data: {
          gymId: gyms[0].id,
          title,
          discountText,
          status: status || "ACTIVE",
          expiryDate: expiryDate ? new Date(expiryDate) : null
        }
      });
      res.json({ success: true, offer: newOffer });
    } catch (err: any) {
      res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

// ─── PUT /api/gyms/profile ──────────────────────────────────────────────────
router.put(
  "/profile",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, contactPhone, openingTime, closingTime, facilities } = req.body;
      const gyms = await prisma.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
      if (gyms.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
        return;
      }

      const updated = await prisma.gym.update({
        where: { id: gyms[0].id },
        data: {
          name, description, contactPhone, openingTime, closingTime, facilities
        }
      });

      res.json({ success: true, gym: updated });
    } catch (err: any) {
      res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

// ─── GET /api/gyms/analytics/performance ──────────────────────────────────────
router.get(
  "/analytics/performance",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const gyms = await prisma.gym.findMany({ where: { ownerId: req.dbUserId, isActive: true }, select: { id: true } });
      if (gyms.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
        return;
      }
      const gymIds = gyms.map((g) => g.id);

      // Simple mock-like structure for the area charts but generated from DB
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0,0,0,0);
      
      const bookings = await prisma.booking.findMany({
        where: {
          gymId: { in: gymIds },
          visitDate: { gte: weekStart },
          status: { in: ["CHECKED_IN", "COMPLETED"] }
        },
        select: { userId: true, visitDate: true }
      });

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const performanceMap: Record<string, { newMembers: number, total: number }> = {};
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        performanceMap[dayNames[d.getDay()]] = { newMembers: 0, total: 0 };
      }

      const userVisits = new Set<string>();
      
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
    } catch (err: any) {
      res.status(500).json({ error: "ServerError", message: err.message });
    }
  }
);

// ─── POST /api/gyms/support ────────────────────────────────────────────────
router.post("/support", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { subject, message } = req.body;
    const gym = await prisma.gym.findFirst({ where: { ownerId: req.dbUserId, isActive: true } });
    const ticket = await prisma.supportTicket.create({
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
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/gyms/support ─────────────────────────────────────────────────
router.get("/support", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.dbUserId },
      orderBy: { createdAt: "desc" }
    });
    res.json({ tickets });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/gyms/payouts/request ────────────────────────────────────────
router.post("/payouts/request", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amountPaise } = req.body;
    const gym = await prisma.gym.findFirst({ where: { ownerId: req.dbUserId, isActive: true } });
    if (!gym) {
      res.status(403).json({ error: "Forbidden", message: "Not a gym owner" });
      return;
    }

    const payout = await prisma.gymPayout.create({
      data: {
        gymId: gym.id,
        periodStart: new Date(),
        periodEnd: new Date(),
        amountPaise: parseInt(amountPaise, 10),
        status: "PENDING"
      }
    });
    res.json({ payout });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── POST /api/gyms/applications ───────────────────────────────────────────
router.post("/applications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      name, city, address, description, facilities, 
      logoUrl, coverImageUrl, tagline, landmark, area, 
      establishedYear, gymSizeSqFt, trainerCount, branchesCount, 
      services, rules, operatingHours 
    } = req.body;
    
    // Create a disabled Gym record
    const gym = await prisma.gym.create({
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
        ownerId: req.dbUserId,
        facilities: Array.isArray(facilities) ? facilities : (facilities ? [facilities] : []),
        services: Array.isArray(services) ? services : (services ? [services] : []),
        rules: Array.isArray(rules) ? rules : (rules ? [rules] : [])
      }
    });

    // Create Operating Hours if provided
    if (operatingHours && Array.isArray(operatingHours)) {
      const hoursData = operatingHours.map((h: any) => ({
        gymId: gym.id,
        dayOfWeek: parseInt(h.dayOfWeek, 10),
        startTime: h.startTime,
        endTime: h.endTime,
        capacity: parseInt(h.capacity, 10),
        isActive: true
      }));
      if (hoursData.length > 0) {
        await prisma.gymOperatingHour.createMany({
          data: hoursData
        });
      }
    }

    // Create the Application record
    const application = await prisma.gymApplication.create({
      data: {
        gymId: gym.id,
        status: "PENDING",
        notes: `Application created by user ${req.dbUserId}`
      }
    });

    res.json({ application, gym });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

export default router;
