import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Marketplace items...");

  // Delete existing items and orders to avoid duplicates if run multiple times
  await prisma.marketplaceOrder.deleteMany({});
  await prisma.marketplaceItem.deleteMany({});
  console.log("Cleared existing marketplace items and orders.");

  const items = [
    {
      title: "Gold Standard 100% Whey",
      description: "Optimum Nutrition - Double Rich Chocolate, 2.27 kg.",
      pricePaise: 549900, // ₹5,499
      imageUrl: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=2070&auto=format&fit=crop", 
    },
    {
      title: "Biozyme Performance Whey",
      description: "MuscleBlaze - Rich Milk Chocolate, 1 kg.",
      pricePaise: 249900, // ₹2,499
      imageUrl: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?q=80&w=2070&auto=format&fit=crop", 
    },
    {
      title: "ZonoFit Premium Shaker",
      description: "Leak-proof 700ml shaker bottle with blending ball.",
      pricePaise: 29900, // ₹299
      imageUrl: "https://images.unsplash.com/photo-1622323049105-0453de2b4498?q=80&w=1974&auto=format&fit=crop",
    },
    {
      title: "Pro Boxing Gloves (12oz)",
      description: "Everlast Pro Style Training Boxing Gloves. Ideal for heavy bag workouts.",
      pricePaise: 185000, // ₹1,850
      imageUrl: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=2070&auto=format&fit=crop", 
    },
    {
      title: "Kookaburra Cricket Bat",
      description: "English Willow Grade 2. Lightweight with great pickup.",
      pricePaise: 1240000, // ₹12,400
      imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2067&auto=format&fit=crop", 
    },
    {
      title: "Yonex Badminton Racquet",
      description: "Voltric Z-Force II. Stiff flex and heavy balance for smashes.",
      pricePaise: 450000, // ₹4,500
      imageUrl: "https://images.unsplash.com/photo-1611689342806-0863700ce1e4?q=80&w=2070&auto=format&fit=crop", 
    },
    {
      title: "Premium Yoga Mat",
      description: "Anti-slip 6mm thick TPE Yoga Mat with alignment lines.",
      pricePaise: 89900, // ₹899
      imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?q=80&w=2080&auto=format&fit=crop", 
    },
    {
      title: "Under Armour Gym Duffle",
      description: "Undeniable Signature Duffle Bag. Water-resistant finish.",
      pricePaise: 219900, // ₹2,199
      imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1974&auto=format&fit=crop", 
    },
    {
      title: "Men's Compression T-Shirt",
      description: "ZonoFit Dri-FIT Compression Gear. Navy Blue, Size L.",
      pricePaise: 79900, // ₹799
      imageUrl: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1974&auto=format&fit=crop", 
    },
    {
      title: "Creatine Monohydrate 250g",
      description: "Micronized pure creatine for muscle strength.",
      pricePaise: 85000, // ₹850
      imageUrl: "https://images.unsplash.com/photo-1627489812610-85fbfd4d12c9?q=80&w=1974&auto=format&fit=crop", 
    },
    {
      title: "Women's High-Waist Leggings",
      description: "Squat-proof seamless activewear. Available in Black/Grey.",
      pricePaise: 119900, // ₹1,199
      imageUrl: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=1974&auto=format&fit=crop", 
    },
    {
      title: "Heavy Jump Rope",
      description: "Weighted skipping rope for intense cardio and boxing training.",
      pricePaise: 49900, // ₹499
      imageUrl: "https://images.unsplash.com/photo-1518342416997-c250ce7b22bc?q=80&w=2070&auto=format&fit=crop", 
    },
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
