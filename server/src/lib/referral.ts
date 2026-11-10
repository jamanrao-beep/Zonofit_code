import crypto from "crypto";
import { launchReferralTaken } from "./launchReferral";
import prisma from "./prisma";

const REFERRAL_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRandomReferralCode(): string {
  let code = "ZONO-";
  for (let i = 0; i < 6; i++) {
    code += REFERRAL_CHARS[crypto.randomInt(REFERRAL_CHARS.length)];
  }
  return code;
}

async function referralCodeTaken(code: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  if (existing) return true;
  try {
    return await launchReferralTaken(code);
  } catch {
    return false;
  }
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateRandomReferralCode();
    if (!(await referralCodeTaken(code))) return code;
  }
  for (let i = 0; i < 5; i++) {
    const code = "ZONO-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    if (!(await referralCodeTaken(code))) return code;
  }
  return "ZONO-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}
