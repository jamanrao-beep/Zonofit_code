import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

/**
 * Run this on the Hostinger machine after ADMIN_PASSWORD is set in server/.env.
 * It updates the stored hash. It does not print the password.
 */
async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < 12 || password.toLowerCase().includes("password")) {
    console.error("Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 12 characters.");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.error("No user exists for ADMIN_EMAIL.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, systemRole: "ADMIN" },
  });
  console.log("Updated the admin password hash.");
}

main()
  .catch((err) => {
    console.error("Could not update the admin password.");
    console.error(err instanceof Error ? err.message : "Unknown error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
