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



export default router;
