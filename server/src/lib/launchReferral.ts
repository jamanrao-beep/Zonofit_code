import prisma from "./prisma";

/** Tenths of a percent. 12.5% is 125. Only the prizes the challenge can keep. */
const ALLOWED_TENTHS = new Set([10, 20, 40, 80, 125, 160]);

export function rewardPercentTenths(reward: string): number | null {
  const match = /^(\d+(?:\.\d+)?)%\s*OFF$/i.exec(reward.trim());
  if (!match) return null;
  const tenths = Math.round(Number(match[1]) * 10);
  return ALLOWED_TENTHS.has(tenths) ? tenths : null;
}

export function percentFromTenths(tenths: number): number {
  return tenths / 10;
}

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "").slice(0, 32);
}

function isDuplicate(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const error = err as { code?: string; meta?: { code?: string | number }; message?: string };
  if (error.code === "P2002") return true;
  if (String(error.meta?.code ?? "") === "1062") return true;
  return /duplicate/i.test(error.message ?? "");
}

/** Notes the code the challenge showed, and the percent that goes with it. */
export async function noteLaunchReferralCode(input: {
  code: string;
  phone: string;
  percentTenths: number;
  reward: string;
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO launch_referral_codes (code, phone, percentTenths, reward)
    VALUES (${input.code}, ${input.phone}, ${input.percentTenths}, ${input.reward})
    ON DUPLICATE KEY UPDATE percentTenths = percentTenths
  `;
}

/** One percent for this code. Mixed percents are ignored. */
export async function findLaunchPercentTenths(code: string): Promise<number | null> {
  if (!code || code.length > 16) return null;
  const rows = await prisma.$queryRaw<Array<{ percentTenths: number | string }>>`
    SELECT DISTINCT percentTenths
    FROM launch_referral_codes
    WHERE code = ${code}
  `;
  if (rows.length !== 1) return null;
  const tenths = Number(rows[0]?.percentTenths);
  return ALLOWED_TENTHS.has(tenths) ? tenths : null;
}

export async function launchReferralTaken(code: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ code: string }>>`
    SELECT code FROM launch_referral_codes WHERE code = ${code} LIMIT 1
  `;
  return rows.length > 0;
}

export type ResolvedReferral =
  | { kind: "friend"; userId: string }
  | { kind: "launch"; code: string; percentTenths: number; percent: number }
  | { kind: "none" };

/** A member code wins when both exist. A challenge code is the percent noted for that code. */
export async function resolveReferral(raw: string): Promise<ResolvedReferral> {
  const code = normalizeReferralCode(raw);
  if (!code) return { kind: "none" };
  const friend = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
  if (friend) return { kind: "friend", userId: friend.id };
  const tenths = await findLaunchPercentTenths(code);
  if (tenths === null) return { kind: "none" };
  return { kind: "launch", code, percentTenths: tenths, percent: percentFromTenths(tenths) };
}

export async function launchReferralForUser(userId: string): Promise<{ code: string; percent: number } | null> {
  const rows = await prisma.$queryRaw<Array<{ code: string; percentTenths: number | string }>>`
    SELECT code, percentTenths
    FROM launch_referral_uses
    WHERE userId = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const tenths = Number(row.percentTenths);
  if (!ALLOWED_TENTHS.has(tenths)) return null;
  return { code: row.code, percent: percentFromTenths(tenths) };
}

/** One challenge code per member. A second insert does not replace the first. */
export async function noteLaunchReferralUse(userId: string, code: string, percentTenths: number): Promise<"ok" | "already"> {
  try {
    await prisma.$executeRaw`
      INSERT INTO launch_referral_uses (userId, code, percentTenths)
      VALUES (${userId}, ${code}, ${percentTenths})
    `;
    return "ok";
  } catch (err: unknown) {
    if (isDuplicate(err)) return "already";
    throw err;
  }
}
