import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Marketplace items...");

  // Delete existing items to avoid duplicates if run multiple times
  await prisma.marketplaceItem.deleteMany({});
  console.log("Cleared existing marketplace items.");

  const items = [
    {
      title: "Gold Standard 100% Whey",
      description: "Optimum Nutrition - Double Rich Chocolate, 2.27 kg.",
      pricePaise: 549900, // ₹5,499
      imageUrl: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=2070&auto=format&fit=crop", // Placeholder supplement
    },
    {
      title: "Biozyme Performance Whey",
      description: "MuscleBlaze - Rich Milk Chocolate, 1 kg.",
      pricePaise: 249900, // ₹2,499
      imageUrl: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?q=80&w=2070&auto=format&fit=crop", // Placeholder supplement
    },
    {
      title: "ZonoFit Premium Shaker",
      description: "Leak-proof 700ml shaker bottle with blending ball.",
      pricePaise: 29900, // ₹299
      imageUrl: "https://images.unsplash.com/photo-1622323049105-0453de2b4498?q=80&w=1974&auto=format&fit=crop", // Placeholder shaker
    },
    {
      title: "Yoga Flow Session",
      description: "Book a single Yoga Class at any premium partnered studio.",
      pricePaise: 35000, // ₹350
      imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2120&auto=format&fit=crop", // Yoga
    }
  ];

  for (const item of items) {
    const createdItem = await prisma.marketplaceItem.create({
      data: item,
    });
    console.log(`Created item: ${createdItem.title}`);
  }

  console.log("Marketplace seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
