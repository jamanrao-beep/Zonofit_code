const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding plans...");
  
  const starter = await prisma.membershipPlan.upsert({
    where: { name: "Starter" },
    update: {
      priceInPaise: 199900,
      monthlyCredits: 160,
      durationDays: 30,
      isActive: true,
    },
    create: {
      name: "Starter",
      tier: "BASIC",
      monthlyCredits: 160,
      priceInPaise: 199900,
      durationDays: 30,
      isActive: true,
      features: [
        "Access to standard partner gyms",
        "10 visits per 30-day cycle",
        "160 credits allocated monthly",
        "Unused credits convert to INR wallet"
      ]
    }
  });

  const premium = await prisma.membershipPlan.upsert({
    where: { name: "Premium" },
    update: {
      priceInPaise: 349900,
      monthlyCredits: 300,
      durationDays: 30,
      isActive: true,
    },
    create: {
      name: "Premium",
      tier: "STANDARD",
      monthlyCredits: 300,
      priceInPaise: 349900,
      durationDays: 30,
      isActive: true,
      features: [
        "Access to all partner gyms & studios",
        "18 visits per 30-day cycle",
        "300 credits allocated monthly",
        "Priority check-in access"
      ]
    }
  });

  const elite = await prisma.membershipPlan.upsert({
    where: { name: "Elite" },
    update: {
      priceInPaise: 499900,
      monthlyCredits: 450,
      durationDays: 30,
      isActive: true,
    },
    create: {
      name: "Elite",
      tier: "PREMIUM",
      monthlyCredits: 450,
      priceInPaise: 499900,
      durationDays: 30,
      isActive: true,
      features: [
        "Unlimited premium club access",
        "25 visits per 30-day cycle",
        "450 credits allocated monthly",
        "Complimentary recovery zone access"
      ]
    }
  });

  // Ensure at least one gym exists with proper credit cost
  let gym = await prisma.gym.findFirst({ where: { isActive: true } });
  if (!gym) {
    gym = await prisma.gym.create({
      data: {
        name: "FitZone Pro",
        description: "Premier fitness center in Udaipur",
        address: "100 Ft Road, Shobhagpura",
        city: "Udaipur",
        pincode: "313001",
        creditCost: 8,
        category: "STRENGTH",
        facilities: ["Strength Equipment", "Cardio Zone", "Steam Room", "Locker Room"],
        imageUrls: ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800"],
        rating: 4.8,
        totalRatings: 120,
        isVerified: true,
        isActive: true,
        totalSlots: 30,
      }
    });
  }

  console.log("Plans seeded successfully:", starter.name, premium.name, elite.name);
  console.log("Default gym:", gym.name, gym.id);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
