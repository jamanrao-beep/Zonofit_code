import { Prisma } from "@prisma/client";
import { Router, Request, Response, NextFunction } from "express";
import { query, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { bookingMatchesSlot, publicBookingSlots, readStoredSlots, setStoredSlotEnabled, visitPayoutInr } from "../lib/gymCommercial";
import { deskCodeFromBookingId } from "../lib/bookingTime";
import { requireAuth, optionalAuth } from "../middleware/auth";

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
 * Supports guest exploration per PRD Section 4.3.
 */
router.get(
  "/",
  optionalAuth,
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
      const filters: Prisma.Sql[] = [];
      if (category) filters.push(Prisma.sql`AND category = ${category}`);
      if (maxCredits) filters.push(Prisma.sql`AND creditCost <= ${parseInt(maxCredits, 10)}`);
      if (city) filters.push(Prisma.sql`AND LOWER(city) = LOWER(${city})`);
      if (search) {
        const like = `%${search.toLowerCase()}%`;
        filters.push(Prisma.sql`AND (LOWER(name) LIKE ${like} OR LOWER(address) LIKE ${like})`);
      }
      const filterSql = filters.length > 0 ? Prisma.join(filters, " ") : Prisma.empty;

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
          facilities: any;
          image_urls: any;
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
          ${filterSql}
        ORDER BY distance_meters ASC
        LIMIT ${limitNum}
        OFFSET ${skip}
      `;

      res.json({
        gyms: gyms.map((g: any) => ({
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
    const where: Record<string, unknown> = {
      isActive: true,
      ...(category && { category }),
      ...(city && { city }),
      ...(maxCredits && { creditCost: { lte: parseInt(maxCredits) } }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { address: { contains: search } },
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
          logoUrl: true,
          exteriorImageUrl: true,
          landmark: true,
          monthlyPrice: true,
          weekdayHours: true,
          weekendHours: true,
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
  }
);

// ─── GET /api/gyms/favorites ────────────────────────────────────────────────
/**
 * Get all saved/favorite gyms for the authenticated user.
 * Must be registered before /:id so Express does not capture 'favorites' as a gym ID.
 */
router.get("/favorites", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.dbUserId!;

    const savedGyms = await prisma.savedGym.findMany({
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
  } catch (err: any) {
    console.error("Failed to fetch favorites:", err);
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/gyms/:id ────────────────────────────────────────────────────────
/**
 * Get full gym details by ID.
 * Also returns available slot count for today (bookings remaining).
 */
router.get(
  "/:id",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const gymId = req.params.id as string;
    const reserved = new Set(["favorites", "offers", "support", "analytics", "profile", "applications", "payouts", "explore", "slots", "today-visitors"]);
    if (reserved.has(gymId)) {
      next();
      return;
    }
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
        landmark: true,
        googleMapsUrl: true,
        weekdayHours: true,
        weekendHours: true,
        monthlyPrice: true,
        logoUrl: true,
        exteriorImageUrl: true,
        interiorImageUrls: true,
        slotsJson: true,
        cappingMode: true,
        maxDailyVisits: true,
        maxSlotVisits: true,
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

    const { cappingMode, maxDailyVisits, maxSlotVisits, slotsJson, ...publicGym } = gym;
    const slots = publicBookingSlots(slotsJson);
    const availableSlots = cappingMode === "PER_SLOT"
      ? (maxSlotVisits ?? gym.totalSlots)
      : Math.max(0, (maxDailyVisits ?? gym.totalSlots) - bookedToday);
    res.json({
      ...publicGym,
      slots,
      availableSlots,
    });
  }
);

const BOOKED_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED"] as const;

function todayBounds(): { start: Date; end: Date; label: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const label = start.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return { start, end, label };
}

async function gymsOwnedBy(userId: string | undefined, systemRole?: string) {
  if (!userId) return [];
  const owned = await prisma.gym.findMany({
    where: { ownerId: userId, isActive: true },
    select: {
      id: true,
      name: true,
      creditCost: true,
      monthlyPrice: true,
      payoutModel: true,
      payoutCommissionRate: true,
      payoutFixedPerVisit: true,
      cappingMode: true,
      maxDailyVisits: true,
      maxSlotVisits: true,
      slotsJson: true,
    },
    orderBy: { name: "asc" },
  });
  if (owned.length === 0 && systemRole === "ADMIN") {
    return prisma.gym.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        creditCost: true,
        monthlyPrice: true,
        payoutModel: true,
        payoutCommissionRate: true,
        payoutFixedPerVisit: true,
        cappingMode: true,
        maxDailyVisits: true,
        maxSlotVisits: true,
        slotsJson: true,
      },
      orderBy: { name: "asc" },
    });
  }
  return owned;
}

// ─── GET /api/gyms/slots ──────────────────────────────────────────────────────
router.get("/slots", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const gyms = await gymsOwnedBy(req.dbUserId, req.systemRole);
    if (gyms.length === 0) {
      res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
      return;
    }
    res.json({
      gyms: gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        cappingMode: gym.cappingMode === "PER_SLOT" ? "PER_SLOT" : "DAILY_TOTAL",
        maxDailyVisits: gym.maxDailyVisits,
        maxSlotVisits: gym.maxSlotVisits,
        slots: readStoredSlots(gym.slotsJson),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── PATCH /api/gyms/slots/:slotId ────────────────────────────────────────────
router.patch("/slots/:slotId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const slotId = req.params.slotId as string;
    const gymId = typeof req.body?.gymId === "string" ? req.body.gymId : "";
    if (typeof req.body?.isEnabled !== "boolean" || !gymId) {
      res.status(400).json({ error: "InvalidSlots", message: "Choose a gym and say whether the slot is open." });
      return;
    }
    const gyms = await gymsOwnedBy(req.dbUserId, req.systemRole);
    const gym = gyms.find((row) => row.id === gymId);
    if (!gym) {
      res.status(403).json({ error: "Forbidden", message: "That gym is not on this login." });
      return;
    }
    const updated = setStoredSlotEnabled(gym.slotsJson, slotId, req.body.isEnabled);
    if (!updated.ok) {
      res.status(404).json({ error: "SlotNotFound", message: updated.message });
      return;
    }
    await prisma.gym.update({
      where: { id: gym.id },
      data: { slotsJson: updated.slotsJson },
    });
    res.json({
      slot: updated.slot,
      message: updated.slot.isEnabled
        ? "Slot is open for booking."
        : "Slot is closed. Bookings already made stay.",
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

// ─── GET /api/gyms/today-visitors ─────────────────────────────────────────────
router.get("/today-visitors", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const gyms = await gymsOwnedBy(req.dbUserId, req.systemRole);
    if (gyms.length === 0) {
      res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
      return;
    }
    const today = todayBounds();
    const bookings = await prisma.booking.findMany({
      where: {
        gymId: { in: gyms.map((gym) => gym.id) },
        visitDate: { gte: today.start, lte: today.end },
        status: { in: [...BOOKED_STATUSES] },
      },
      select: {
        id: true,
        gymId: true,
        timeSlot: true,
        status: true,
        passCode: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({
      date: today.label,
      gyms: gyms.map((gym) => {
        const slots = readStoredSlots(gym.slotsJson);
        const mine = bookings.filter((booking) => booking.gymId === gym.id);
        const used = new Set<string>();
        const slotRows = slots.map((slot) => {
          const visitors = mine.filter((booking) => {
            if (used.has(booking.id) || !bookingMatchesSlot(booking.timeSlot, slot)) return false;
            used.add(booking.id);
            return true;
          }).map((booking) => ({
            bookingId: booking.id,
            name: booking.user?.name?.trim() || "Member",
            status: booking.status,
            passCode: `ZF-${booking.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`,
            timeSlot: booking.timeSlot,
          }));
          return { ...slot, booked: visitors.length, visitors };
        });
        const otherMap = new Map<string, typeof slotRows[number]["visitors"]>();
        mine.forEach((booking) => {
          if (used.has(booking.id)) return;
          const label = booking.timeSlot?.trim() || "Unspecified time";
          const list = otherMap.get(label) ?? [];
          list.push({
            bookingId: booking.id,
            name: booking.user?.name?.trim() || "Member",
            status: booking.status,
            passCode: `ZF-${booking.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`,
            timeSlot: booking.timeSlot,
          });
          otherMap.set(label, list);
        });
        const checkedInToday = mine.filter((booking) => booking.status === "CHECKED_IN" || booking.status === "COMPLETED").length;
        return {
          id: gym.id,
          name: gym.name,
          cappingMode: gym.cappingMode === "PER_SLOT" ? "PER_SLOT" : "DAILY_TOTAL",
          maxDailyVisits: gym.maxDailyVisits,
          maxSlotVisits: gym.maxSlotVisits,
          bookedToday: mine.length,
          checkedInToday,
          slots: slotRows,
          otherTimes: Array.from(otherMap.entries()).map(([timeSlot, visitors]) => ({
            timeSlot,
            booked: visitors.length,
            visitors,
          })),
        };
      }),
    });
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

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
      const gyms = await gymsOwnedBy(req.dbUserId, req.systemRole);

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
        include: { gym: { select: { creditCost: true } } }
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
        include: { gym: { select: { creditCost: true } } }
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
          bookingId: c.id,
          deskCode: deskCodeFromBookingId(c.id),
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
      const gyms = await gymsOwnedBy(req.dbUserId, req.systemRole);
      if (gyms.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
        return;
      }
      const gymIds = gyms.map((g) => g.id);

      // 1. Fetch all registered network members (all users who are members, excluding the partner's own account)
      const registeredUsers = await prisma.user.findMany({
        where: {
          id: { not: req.dbUserId },
        },
        include: {
          membership: {
            include: {
              plan: { select: { name: true } },
              gymPlan: { select: { name: true } },
              primaryGym: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // 2. Fetch all memberships (with primary gym or network access)
      const memberships = await prisma.membership.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              systemRole: true,
            },
          },
          plan: { select: { name: true } },
          gymPlan: { select: { name: true } },
          primaryGym: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // 3. Fetch all bookings for this gym (and network bookings)
      const bookings = await prisma.booking.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              membership: {
                select: {
                  plan: { select: { name: true } },
                  gymPlan: { select: { name: true } },
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { visitDate: "desc" },
      });

      // Aggregate into memberMap
      const memberMap: Record<string, {
        id: string;
        name: string;
        plan: string;
        joined: string;
        joinedTimestamp: number;
        visits: number;
        lastVisitDate: Date | null;
        hasScheduled: boolean;
      }> = {};

      const addOrUpdateUser = (
        userId: string,
        userName: string | null | undefined,
        userEmail: string | null | undefined,
        planName: string | null | undefined,
        joinedAt: Date | string | null | undefined
      ) => {
        if (!userId) return;
        const name = userName?.trim() || userEmail?.split("@")[0] || "Member";
        const plan = planName || "Standard";
        const joinedDateObj = joinedAt ? new Date(joinedAt) : null;
        const joinedStr = joinedDateObj && !isNaN(joinedDateObj.getTime())
          ? joinedDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "N/A";
        const joinedTimestamp = joinedDateObj && !isNaN(joinedDateObj.getTime()) ? joinedDateObj.getTime() : 0;

        if (!memberMap[userId]) {
          memberMap[userId] = {
            id: userId,
            name,
            plan,
            joined: joinedStr,
            joinedTimestamp,
            visits: 0,
            lastVisitDate: null,
            hasScheduled: false,
          };
        } else {
          if (
            (memberMap[userId].plan === "Standard" || memberMap[userId].plan === "ZonoFit Member") &&
            planName
          ) {
            memberMap[userId].plan = planName;
          }
          if (joinedTimestamp && !memberMap[userId].joinedTimestamp) {
            memberMap[userId].joined = joinedStr;
            memberMap[userId].joinedTimestamp = joinedTimestamp;
          }
        }
      };

      // Seed all registered members in network
      for (const u of registeredUsers) {
        const planName = u.membership?.plan?.name || u.membership?.gymPlan?.name;
        const joinedAt = u.membership?.createdAt || u.createdAt;
        addOrUpdateUser(u.id, u.name, u.email, planName, joinedAt);
      }

      // Seed memberships
      for (const m of memberships) {
        if (!m.user || m.user.id === req.dbUserId) continue;
        const isPrimary = m.primaryGymId && gymIds.includes(m.primaryGymId);
        const basePlan = m.plan?.name || m.gymPlan?.name || (m.status ? `${m.status} Membership` : undefined);
        const planName = isPrimary && basePlan ? `${basePlan} (Primary)` : basePlan;
        const joinedAt = m.createdAt || m.user.createdAt;
        addOrUpdateUser(m.user.id, m.user.name, m.user.email, planName, joinedAt);
      }

      // Overlay bookings and check-in history
      for (const b of bookings) {
        if (!b.user || b.user.id === req.dbUserId) continue;
        const planName = (b.user as any).membership?.plan?.name || (b.user as any).membership?.gymPlan?.name;
        const joinedAt = (b.user as any).membership?.createdAt || b.user.createdAt;
        addOrUpdateUser(b.user.id, b.user.name, (b.user as any).email, planName, joinedAt);

        // Record visits and activity
        const isThisGym = gymIds.includes(b.gymId);
        const isCheckIn = b.status === "CHECKED_IN" || b.status === "COMPLETED";

        if (isCheckIn) {
          if (isThisGym) {
            memberMap[b.user.id].visits += 1;
            const vDate = new Date(b.visitDate);
            if (!memberMap[b.user.id].lastVisitDate || vDate > memberMap[b.user.id].lastVisitDate!) {
              memberMap[b.user.id].lastVisitDate = vDate;
            }
          }
        } else if (b.status === "CONFIRMED" || b.status === "PENDING") {
          if (isThisGym) {
            memberMap[b.user.id].hasScheduled = true;
          }
        }
      }

      // Sort: Members with visits/scheduled visits at this gym first, then by joined date descending
      const members = Object.values(memberMap)
        .sort((a, b) => {
          if (b.visits !== a.visits) return b.visits - a.visits;
          if (b.hasScheduled && !a.hasScheduled) return -1;
          if (!b.hasScheduled && a.hasScheduled) return 1;
          return (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0);
        })
        .map((m) => {
          let lastVisit = "No check-ins yet";
          if (m.lastVisitDate) {
            lastVisit = m.lastVisitDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
          } else if (m.hasScheduled) {
            lastVisit = "Visit Scheduled";
          }

          return {
            id: m.id,
            name: m.name,
            plan: m.plan,
            joined: m.joined,
            visits: m.visits,
            lastVisit,
          };
        });

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
      const gyms = await gymsOwnedBy(req.dbUserId, req.systemRole);
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
        select: { gymId: true },
      });

      const visitsThisMonth = monthBookings.length;

      const gymById = new Map(gyms.map((gym) => [gym.id, gym]));
      const payoutFor = (gymId: string) => visitPayoutInr(gymById.get(gymId) ?? { creditCost: 8 });

      const earningsThisMonth = Math.round(
        monthBookings.reduce((sum, b) => sum + payoutFor(b.gymId), 0) * 100
      ) / 100;
      
      // Fetch payouts
      const payouts = await prisma.gymPayout.findMany({
        where: { gymId: { in: gymIds } },
        orderBy: { createdAt: "desc" }
      });

      // Calculate total verified unsettled earnings
      const allVerifiedBookings = await prisma.booking.findMany({
        where: {
          gymId: { in: gymIds },
          status: { in: ["CHECKED_IN", "COMPLETED"] }
        },
        select: { gymId: true },
      });
      const totalEarnedPaise = Math.round(
        allVerifiedBookings.reduce((sum, b) => sum + payoutFor(b.gymId), 0) * 100
      );
      const existingPayouts = await prisma.gymPayout.aggregate({
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
      const gyms = await gymsOwnedBy(req.dbUserId, req.systemRole);
      if (gyms.length === 0) {
        res.status(403).json({ error: "Forbidden", message: "User is not a gym owner." });
        return;
      }
      const gymIds = gyms.map((g) => g.id);

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const bookings = await prisma.booking.findMany({
        where: {
          gymId: { in: gymIds },
          visitDate: { gte: weekStart },
          status: { in: ["CHECKED_IN", "COMPLETED"] },
        },
        select: { userId: true, visitDate: true },
      });

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const days: { key: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        days.push({ key: dayNames[d.getDay()] });
      }

      const usersByDay = new Map<string, Set<string>>();
      for (const day of days) usersByDay.set(day.key, new Set());
      for (const booking of bookings) {
        usersByDay.get(dayNames[booking.visitDate.getDay()])?.add(booking.userId);
      }

      const weekUserIds = [...new Set(bookings.map((booking) => booking.userId))];
      const priorVisitors = weekUserIds.length === 0
        ? []
        : await prisma.booking.findMany({
            where: {
              gymId: { in: gymIds },
              userId: { in: weekUserIds },
              visitDate: { lt: weekStart },
              status: { in: ["CHECKED_IN", "COMPLETED"] },
            },
            select: { userId: true },
            distinct: ["userId"],
          });

      const seenBefore = new Set(priorVisitors.map((visit) => visit.userId));
      const chartData = days.map((day) => {
        const users = usersByDay.get(day.key) ?? new Set<string>();
        let returning = 0;
        let firstTime = 0;
        for (const userId of users) {
          if (seenBefore.has(userId)) returning += 1;
          else firstTime += 1;
        }
        for (const userId of users) seenBefore.add(userId);
        const retention = users.size === 0 ? 0 : Math.round((returning / users.size) * 100);
        return { name: day.key, newMembers: firstTime, retention };
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
    const requestedPaise = parseInt(amountPaise, 10);
    if (isNaN(requestedPaise) || requestedPaise <= 0) {
      res.status(400).json({ error: "InvalidAmount", message: "A valid positive amount is required." });
      return;
    }

    const gym = await prisma.gym.findFirst({ where: { ownerId: req.dbUserId, isActive: true } });
    if (!gym) {
      res.status(403).json({ error: "Forbidden", message: "Not a gym owner" });
      return;
    }

    // Calculate total verified earnings for this gym
    const completedBookings = await prisma.booking.count({
      where: {
        gymId: gym.id,
        status: { in: ["CHECKED_IN", "COMPLETED"] }
      }
    });

    const payoutPerVisitINR = visitPayoutInr(gym);
    const totalEarnedPaise = Math.round(completedBookings * payoutPerVisitINR * 100);

    // Sum already requested or paid payouts
    const existingPayouts = await prisma.gymPayout.aggregate({
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

    const payout = await prisma.gymPayout.create({
      data: {
        gymId: gym.id,
        periodStart: new Date(),
        periodEnd: new Date(),
        amountPaise: requestedPaise,
        status: "PENDING"
      }
    });
    res.json({ payout, message: "Payout requested successfully" });
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
        ownerId: req.dbUserId || null,
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

// ─── POST /api/gyms/:id/favorite ────────────────────────────────────────────
/**
 * Toggle favorite/saved status for a gym.
 * If already saved, removes it. If not saved, adds it.
 * Returns { isSaved: boolean }
 */
router.post("/:id/favorite", requireAuth, async (req: Request, res: Response) => {
  try {
    const gymId = req.params.id as string;
    const userId = req.dbUserId!;

    // Check if already saved
    const existing = await prisma.savedGym.findUnique({
      where: { userId_gymId: { userId, gymId } }
    });

    if (existing) {
      // Unsave
      await prisma.savedGym.delete({
        where: { id: existing.id }
      });
      const count = await prisma.savedGym.count({ where: { gymId } });
      res.json({ isSaved: false, favoritesCount: count });
    } else {
      // Save
      await prisma.savedGym.create({
        data: { userId, gymId }
      });
      const count = await prisma.savedGym.count({ where: { gymId } });
      res.json({ isSaved: true, favoritesCount: count });
    }
  } catch (err: any) {
    console.error("Failed to toggle gym favorite:", err);
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});


// ─── GET /api/gyms/:id/favorite ─────────────────────────────────────────────
/**
 * Check if a specific gym is saved/favorited by the authenticated user.
 */
router.get("/:id/favorite", requireAuth, async (req: Request, res: Response) => {
  try {
    const gymId = req.params.id as string;
    const userId = req.dbUserId!;

    const existing = await prisma.savedGym.findUnique({
      where: { userId_gymId: { userId, gymId } }
    });
    const count = await prisma.savedGym.count({ where: { gymId } });

    res.json({ isSaved: !!existing, favoritesCount: count });
  } catch (err: any) {
    console.error("Failed to check gym favorite:", err);
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

export default router;
