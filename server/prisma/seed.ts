/**
 * ZonoFit — Prisma Seed Script
 * Run: npm run db:seed
 *
 * Seeds:
 * - 3 MembershipPlans (Basic, Standard, Premium)
 * - 5 sample Gyms in Mumbai with PostGIS location data
 */

import { PrismaClient, GymCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ZonoFit database...");

  // ─── Membership Plans ────────────────────────────────────────────────────────
  console.log("Creating membership plans...");

  const basicPlan = await prisma.membershipPlan.upsert({
    where: { name: "Basic" },
    update: {},
    create: {
      name: "Basic",
      tier: "BASIC",
      monthlyCredits: 20,
      priceInPaise: 49900, // ₹499/month
      durationDays: 30,
      features: [
        "20 credits/month",
        "Access to 50+ partner gyms",
        "Basic workout tracking",
        "Email support",
      ],
    },
  });

  const standardPlan = await prisma.membershipPlan.upsert({
    where: { name: "Standard" },
    update: {},
    create: {
      name: "Standard",
      tier: "STANDARD",
      monthlyCredits: 40,
      priceInPaise: 99900, // ₹999/month
      durationDays: 30,
      features: [
        "40 credits/month",
        "Access to 100+ partner gyms",
        "Advanced workout tracking",
        "Priority support",
        "Exclusive member challenges",
      ],
    },
  });

  const premiumPlan = await prisma.membershipPlan.upsert({
    where: { name: "Premium" },
    update: {},
    create: {
      name: "Premium",
      tier: "PREMIUM",
      monthlyCredits: 80,
      priceInPaise: 199900, // ₹1,999/month
      durationDays: 30,
      features: [
        "80 credits/month",
        "Access to all partner gyms including Premium",
        "Full workout & progress tracking",
        "Dedicated support",
        "Exclusive premium gym access",
        "Member referral bonuses",
      ],
    },
  });

  console.log(
    `✅ Plans: ${basicPlan.name}, ${standardPlan.name}, ${premiumPlan.name}`
  );

  // ─── Sample Gyms (Mumbai) ─────────────────────────────────────────────────────
  // PostGIS location set via raw SQL after Prisma insert
  console.log("Creating sample gyms...");

  type GymSeed = {
    name: string;
    description: string;
    address: string;
    city: string;
    pincode: string;
    lat: number;
    lng: number;
    creditCost: number;
    category: GymCategory;
    facilities: string[];
    imageUrls: string[];
    rating: number;
    totalRatings: number;
    isVerified: boolean;
    totalSlots: number;
    openingTime: string;
    closingTime: string;
  };

  const gyms: GymSeed[] = [
    {
      name: "PowerHouse Fitness",
      description:
        "State-of-the-art equipment, dedicated strength and cardio zones, experienced trainers.",
      address: "Level 2, Inorbit Mall, Malad West",
      city: "Mumbai",
      pincode: "400064",
      lat: 19.1872,
      lng: 72.8489,
      creditCost: 8,
      category: "STANDARD",
      facilities: ["Strength", "Cardio", "CrossFit", "Locker Room", "Parking"],
      imageUrls: [],
      rating: 4.5,
      totalRatings: 128,
      isVerified: true,
      totalSlots: 30,
      openingTime: "05:30",
      closingTime: "23:00",
    },
    {
      name: "Flex Studio",
      description:
        "Boutique fitness studio with group classes, yoga, and pilates. Perfect for beginners.",
      address: "14, Carter Road, Bandra West",
      city: "Mumbai",
      pincode: "400050",
      lat: 19.059,
      lng: 72.8295,
      creditCost: 6,
      category: "BEGINNER_FRIENDLY",
      facilities: [
        "Yoga",
        "Pilates",
        "Cardio",
        "Group Classes",
        "Trainer Available",
        "AC",
      ],
      imageUrls: [],
      rating: 4.8,
      totalRatings: 245,
      isVerified: true,
      totalSlots: 20,
      openingTime: "06:00",
      closingTime: "21:00",
    },
    {
      name: "Iron Paradise",
      description:
        "Premium gym with Olympic lifting platforms, recovery zone, and steam room.",
      address: "8th Floor, One BKC, Bandra Kurla Complex",
      city: "Mumbai",
      pincode: "400051",
      lat: 19.0656,
      lng: 72.8693,
      creditCost: 12,
      category: "PREMIUM",
      facilities: [
        "Strength",
        "Olympic Lifting",
        "Recovery Zone",
        "Steam Room",
        "Sauna",
        "Nutrition Bar",
        "Valet Parking",
      ],
      imageUrls: [],
      rating: 4.9,
      totalRatings: 89,
      isVerified: true,
      totalSlots: 25,
      openingTime: "05:00",
      closingTime: "23:30",
    },
    {
      name: "CrossFit Versova",
      description:
        "High-intensity CrossFit workouts with certified coaches. All fitness levels welcome.",
      address: "32, Juhu Tara Road, Juhu",
      city: "Mumbai",
      pincode: "400049",
      lat: 19.1021,
      lng: 72.8263,
      creditCost: 10,
      category: "CROSSFIT",
      facilities: ["CrossFit", "HIIT", "Strength", "Outdoor Space", "Showers"],
      imageUrls: [],
      rating: 4.6,
      totalRatings: 167,
      isVerified: true,
      totalSlots: 18,
      openingTime: "06:00",
      closingTime: "21:00",
    },
    {
      name: "Gold's Gym Andheri",
      description:
        "The iconic Gold's Gym experience — world-class equipment, cardio floor, and personal training.",
      address: "Infinity Mall, Andheri West",
      city: "Mumbai",
      pincode: "400053",
      lat: 19.1366,
      lng: 72.8296,
      creditCost: 8,
      category: "STANDARD",
      facilities: [
        "Strength",
        "Cardio",
        "Personal Training",
        "Supplement Bar",
        "Locker Room",
        "Parking",
      ],
      imageUrls: [],
      rating: 4.3,
      totalRatings: 512,
      isVerified: true,
      totalSlots: 40,
      openingTime: "05:00",
      closingTime: "23:00",
    },
  ];

  for (const gym of gyms) {
    // Upsert the gym row (without location — set via raw SQL below)
    const created = await prisma.gym.upsert({
      where: { id: (await prisma.gym.findFirst({ where: { name: gym.name } }))?.id ?? "nonexistent" },
      update: {},
      create: {
        name: gym.name,
        description: gym.description,
        address: gym.address,
        city: gym.city,
        pincode: gym.pincode,
        lat: gym.lat,
        lng: gym.lng,
        creditCost: gym.creditCost,
        category: gym.category,
        facilities: gym.facilities,
        imageUrls: gym.imageUrls,
        rating: gym.rating,
        totalRatings: gym.totalRatings,
        isVerified: gym.isVerified,
        totalSlots: gym.totalSlots,
        openingTime: gym.openingTime,
        closingTime: gym.closingTime,
        isActive: true,
        partnerSince: new Date(),
      },
    });

    // Set PostGIS location geometry via raw SQL
    // ST_MakePoint(longitude, latitude) — note the order: lng first!
    await prisma.$executeRaw`
      UPDATE gyms
      SET location = ST_SetSRID(ST_MakePoint(${gym.lng}, ${gym.lat}), 4326)
      WHERE id = ${created.id}
    `;

    console.log(`✅ Gym: ${gym.name} (${gym.city})`);
  }

  console.log("\n🎉 Seed complete!");
  console.log(`   Plans: 3`);
  console.log(`   Gyms: ${gyms.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
