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
    {
      name: "Kickoff Turf Arena",
      description: "Premium 5v5 and 7v7 football turf with floodlights.",
      address: "Rooftop, Korum Mall, Thane West",
      city: "Mumbai",
      pincode: "400606",
      lat: 19.2018,
      lng: 72.9646,
      creditCost: 15, // Cost in credits (will be multiplied by 8 for cash price)
      category: "STANDARD",
      facilities: ["Turf", "Football", "Floodlights", "Changing Rooms"],
      imageUrls: ["https://images.unsplash.com/photo-1579952363873-27f3bade9f55"],
      rating: 4.7,
      totalRatings: 340,
      isVerified: true,
      totalSlots: 10,
      openingTime: "06:00",
      closingTime: "23:00",
    },
    {
      name: "AquaFit Olympic Pool",
      description: "Olympic-sized swimming pool with dedicated lanes for professionals and beginners.",
      address: "Sports Complex, Andheri East",
      city: "Mumbai",
      pincode: "400069",
      lat: 19.1136,
      lng: 72.8697,
      creditCost: 10, 
      category: "STANDARD",
      facilities: ["Swimming", "Showers", "Locker Room", "Coaching"],
      imageUrls: ["https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534"],
      rating: 4.8,
      totalRatings: 185,
      isVerified: true,
      totalSlots: 50,
      openingTime: "06:00",
      closingTime: "21:00",
    },
    {
      name: "Hoops Basketball Court",
      description: "Indoor wooden basketball court, perfectly maintained for leagues and casual play.",
      address: "Next to YMCA, Colaba",
      city: "Mumbai",
      pincode: "400005",
      lat: 18.9142,
      lng: 72.8183,
      creditCost: 12,
      category: "STANDARD",
      facilities: ["Basketball", "Indoor", "Equipment Rental", "AC"],
      imageUrls: ["https://images.unsplash.com/photo-1546519638-68e109498ffc"],
      rating: 4.9,
      totalRatings: 210,
      isVerified: true,
      totalSlots: 8,
      openingTime: "08:00",
      closingTime: "22:00",
    }
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

  // ─── Marketplace Items ────────────────────────────────────────────────────────
  console.log("Creating marketplace items...");

  await prisma.marketplaceItem.deleteMany();

  const marketplaceItems = [
    {
      title: "Premium Whey Protein",
      description: "High-quality whey protein isolate for muscle recovery.",
      pricePaise: 249900, // ₹2,499
      imageUrl: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d",
    },
    {
      title: "Yoga Mat Pro",
      description: "Non-slip eco-friendly yoga mat with alignment lines.",
      pricePaise: 89900, // ₹899
      imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f",
    },
    {
      title: "Adjustable Dumbbells Set",
      description: "Space-saving adjustable dumbbells for home workouts.",
      pricePaise: 450000, // ₹4,500
      imageUrl: "https://images.unsplash.com/photo-1638262052730-bf5f0951a842",
    },
    {
      title: "ZonoFit Gym Bag",
      description: "Premium duffel bag with separate shoe compartment.",
      pricePaise: 129900, // ₹1,299
      imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
    },
    {
      title: "Resistance Bands Set",
      description: "Set of 5 heavy-duty resistance bands with handles.",
      pricePaise: 59900, // ₹599
      imageUrl: "https://images.unsplash.com/photo-1598289431512-b97b0a1c2785",
    },
  ];

  for (const item of marketplaceItems) {
    await prisma.marketplaceItem.create({
      data: item,
    });
  }
  console.log(`✅ Marketplace Items: ${marketplaceItems.length}`);

  console.log("Creating quotes...");
  await prisma.quote.deleteMany();
  const quotes = [
    "Consistency beats intensity. Just show up today.",
    "You've already outperformed the person who stayed home.",
    "Small daily steps lead to massive long-term progress.",
    "Focus on the habit first, the results will follow.",
    "Your future self will thank you for today's workout.",
    "Fitness is a journey of consistency, not a destination of perfection.",
    "Make working out a non-negotiable part of your daily routine.",
    "Strength doesn't come from what you can do, it comes from overcoming what you thought you couldn't."
  ];
  for (const q of quotes) {
    await prisma.quote.create({ data: { text: q } });
  }
  
  console.log("Creating badges...");
  await prisma.badge.deleteMany();
  const badges = [
    { name: "First Visit", emoji: "🎉", description: "Completed your very first gym visit through ZonoFit.", requirement: "Complete 1 gym visit", unlockedAt: 1 },
    { name: "Getting Started", emoji: "🔥", description: "Five workouts done. You're building a real habit.", requirement: "Complete 5 gym visits", unlockedAt: 5 },
    { name: "10 Strong", emoji: "💪", description: "Double digits. Most people stop here — you didn't.", requirement: "Complete 10 gym visits", unlockedAt: 10 },
    { name: "Quarter Century", emoji: "🥈", description: "25 visits. Consistency is becoming your identity.", requirement: "Complete 25 gym visits", unlockedAt: 25 },
    { name: "50 Workouts", emoji: "🏅", description: "50 completed visits. You've earned elite status.", requirement: "Complete 50 gym visits", unlockedAt: 50 },
    { name: "Century Club", emoji: "🏆", description: "100 workouts. You are in the top 1%.", requirement: "Complete 100 gym visits", unlockedAt: 100 },
    { name: "Gym Explorer", emoji: "🧭", description: "Visited 3 different partner gyms.", requirement: "Visit 3 different gyms", isSpecial: true },
    { name: "Weekly Warrior", emoji: "📅", description: "7-day workout streak. Habits are forming.", requirement: "Maintain a 7-day streak", isSpecial: true },
    { name: "Iron Will", emoji: "⚡", description: "30-day workout streak. Truly remarkable.", requirement: "Maintain a 30-day streak", isSpecial: true },
    { name: "Credit Saver", emoji: "💰", description: "Saved ₹5,000+ compared to pay-per-visit pricing.", requirement: "Save ₹5,000 in credit value", isSpecial: true },
    { name: "Early Bird", emoji: "🌅", description: "Booked a morning session before 8 AM.", requirement: "Book a session before 8 AM", isSpecial: true },
    { name: "ZonoFit Legend", emoji: "👑", description: "Completed the full 12-month ZonoFit journey.", requirement: "Complete Month 12 of the journey", unlockedAt: 155 },
  ];
  for (const b of badges) {
    await prisma.badge.create({ data: b });
  }

  console.log("Creating milestones...");
  await prisma.milestone.deleteMany();
  const milestones = [
    { title: "Starter", description: "You've taken the first step. That's the hardest one.", emoji: "🌱", targetCount: 1, rewardCredits: 10 },
    { title: "Beginner", description: "Building the foundation. Consistency is starting to form.", emoji: "🔥", targetCount: 8, rewardCredits: 10 },
    { title: "Consistent", description: "Three months in — you're part of the 20% who stick with it.", emoji: "💪", targetCount: 20, rewardCredits: 15 },
    { title: "Explorer", description: "You've tried multiple gyms. Fitness is becoming your lifestyle.", emoji: "🧭", targetCount: 35, rewardCredits: 15 },
    { title: "Committed", description: "Commitment is undeniable. You show up even when it's hard.", emoji: "🎯", targetCount: 50, rewardCredits: 20 },
    { title: "Half-Year Pro", description: "Six months. You've built something most people never will.", emoji: "🏅", targetCount: 65, rewardCredits: 20 },
    { title: "Warrior", description: "Challenges don't stop you — they define you.", emoji: "⚔️", targetCount: 80, rewardCredits: 25 },
    { title: "Athlete", description: "You train like an athlete. You think like one too.", emoji: "🏋️", targetCount: 95, rewardCredits: 25 },
    { title: "Veteran", description: "Nine months of proof that you are who you say you are.", emoji: "🛡️", targetCount: 110, rewardCredits: 30 },
    { title: "Elite", description: "You've crossed into territory most people dream about.", emoji: "⭐", targetCount: 125, rewardCredits: 30 },
    { title: "Champion", description: "Almost a year. Champions don't quit this close to the finish.", emoji: "🏆", targetCount: 140, rewardCredits: 40 },
    { title: "Legend", description: "12 months. You are proof that consistency beats everything.", emoji: "👑", targetCount: 155, rewardCredits: 50 },
  ];
  for (const m of milestones) {
    await prisma.milestone.create({ data: m });
  }

  console.log("Creating challenges...");
  await prisma.challenge.deleteMany();
  const challenges = [
    { title: "Week Warrior", description: "Complete 4 gym visits this week.", emoji: "⚡", targetCount: 4, rewardCredits: 20, type: "visits" },
    { title: "Gym Explorer", description: "Visit 3 different partner gyms this month.", emoji: "🧭", targetCount: 3, rewardCredits: 30, type: "gyms" },
    { title: "Consistency Champion", description: "Maintain a 7-day workout streak.", emoji: "🔥", targetCount: 7, rewardCredits: 50, type: "streak" },
  ];
  for (const c of challenges) {
    await prisma.challenge.create({ data: c });
  }

  console.log("\n🎉 Seed complete!");
  console.log(`   Plans: 3`);
  console.log(`   Gyms: ${gyms.length}`);
  console.log(`   Items: ${marketplaceItems.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
