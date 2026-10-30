import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import { generateUniqueReferralCode } from "./referral";

type OwnerClient = Prisma.TransactionClient | PrismaClient;

/** Matches portal sign-in, which strips Gmail dots and +tags before lookup. */
function canonicalLoginEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const base = local.split("+")[0].replace(/\./g, "");
    return `${base}@gmail.com`;
  }
  return email;
}

export function cleanOwnerEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = canonicalLoginEmail(value.trim().toLowerCase());
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return null;
  return email;
}

export function cleanOwnerPassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < 8 || value.length > 72) return null;
  return value;
}

export async function createGymOwner(
  db: OwnerClient,
  input: { email: string; password: string; name: string },
) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const referralCode = await generateUniqueReferralCode();
  return db.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      systemRole: "GYM_OWNER",
      referralCode,
      wallet: {
        create: {
          balance: 0,
          convertibleCashBalanceInPaise: 0,
          nonConvertibleCashBalanceInPaise: 0,
        },
      },
    },
    select: { id: true, email: true, name: true },
  });
}

export async function updateGymOwnerLogin(
  db: OwnerClient,
  userId: string,
  input: { email?: string; password?: string; name?: string },
) {
  const data: { email?: string; passwordHash?: string; name?: string } = {};
  if (input.email) data.email = input.email;
  if (input.name) data.name = input.name;
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, 12);
  if (Object.keys(data).length === 0) {
    return db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
  }
  return db.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true },
  });
}
