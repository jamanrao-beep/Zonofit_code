import crypto from "crypto";
import prisma from "./prisma";

const REFERRAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRandomReferralCode(): string {
  let code = "ZONO-";
  for (let i = 0; i < 6; i++) {
    code += REFERRAL_CHARS[crypto.randomInt(REFERRAL_CHARS.length)];
  }
  return code;
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateRandomReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  return "ZONO-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}
