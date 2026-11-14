import crypto from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { sendPushNotification } from "../services/notifications";

type Db = Prisma.TransactionClient;

/** Friends who have to count before one membership charge is waived. */
export const REFERRAL_GOAL = 4;
/** Credits granted once, when a referred friend completes a first visit. */
export const REFERRAL_VISIT_CREDITS = 5;

const REWARD_PREFIX = "Referral reward: ";

export function friendQualifies(friendRupees: number, referrerRupees: number): boolean {
  return friendRupees > 0 && referrerRupees > 0 && friendRupees >= referrerRupees;
}

/** Paise taken off the next membership charge. Never more than the charge itself. */
export function waiverPaise(worthRupees: number, pricePaise: number): number {
  if (!Number.isInteger(worthRupees) || worthRupees <= 0) return 0;
  if (!Number.isInteger(pricePaise) || pricePaise <= 0) return 0;
  return Math.min(pricePaise, worthRupees * 100);
}

export interface ReferralProgressView {
  joined: number;
  toUnlock: number;
  creditsEarned: number;
  worthRupees: number;
  monthReady: boolean;
  nextCycleStarted: boolean;
}

/**
 * Ring numbers for one cycle of 4.
 * Redeemed months stay consumed so the next four friends start a new ring.
 * An open month with nobody toward the next cycle shows 4, unlocked.
 */
export function referralProgressView(input: {
  qualified: number;
  openMonths: number;
  redeemedMonths: number;
  creditsGranted: number;
  openWorthRupees: number;
  gymMonthlyRupees: number;
}): ReferralProgressView {
  const qualified = Math.max(0, Math.floor(input.qualified));
  const openMonths = Math.max(0, Math.floor(input.openMonths));
  const redeemedMonths = Math.max(0, Math.floor(input.redeemedMonths));
  const consumed = (redeemedMonths + openMonths) * REFERRAL_GOAL;
  const towardNext = Math.max(0, qualified - consumed);
  const joined = openMonths > 0 && towardNext === 0 ? REFERRAL_GOAL : Math.min(REFERRAL_GOAL, towardNext);
  const monthReady = openMonths > 0;
  const worthRupees = monthReady && input.openWorthRupees > 0
    ? Math.floor(input.openWorthRupees)
    : Math.max(0, Math.floor(input.gymMonthlyRupees));
  return {
    joined,
    toUnlock: Math.max(0, REFERRAL_GOAL - joined),
    creditsEarned: Math.max(0, Math.floor(input.creditsGranted)),
    worthRupees,
    monthReady,
    nextCycleStarted: monthReady && joined < REFERRAL_GOAL,
  };
}

export interface ReferralSettleResult {
  referrerId: string;
  creditsGranted: number;
  monthUnlocked: boolean;
  worthRupees: number;
}

function asNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function referralsEnabled(db: Db): Promise<boolean> {
  const settings = await db.systemSettings.findUnique({
    where: { id: "default" },
    select: { referralsEnabled: true },
  });
  return settings?.referralsEnabled !== false;
}

async function gymMonthlyRupees(db: Db, userId: string): Promise<number> {
  const membership = await db.membership.findUnique({
    where: { userId },
    select: { primaryGym: { select: { monthlyPrice: true } } },
  });
  const price = membership?.primaryGym?.monthlyPrice ?? 0;
  return price > 0 ? price : 0;
}

async function countQualified(db: Db, referrerId: string): Promise<number> {
  const rows = await db.$queryRaw<Array<{ n: bigint | number }>>`
    SELECT COUNT(*) AS n FROM referral_progress
    WHERE referrerId = ${referrerId} AND qualified = 1
  `;
  return asNumber(rows[0]?.n);
}

async function countFreeMonths(db: Db, userId: string): Promise<number> {
  const rows = await db.$queryRaw<Array<{ n: bigint | number }>>`
    SELECT COUNT(*) AS n FROM referral_free_months WHERE userId = ${userId}
  `;
  return asNumber(rows[0]?.n);
}

/** Inserts one open month per newly completed set of 4. Worth is frozen here. */
async function ensureFreeMonths(
  db: Db,
  referrerId: string,
  worthRupees: number,
): Promise<{ unlocked: boolean; worthRupees: number }> {
  if (!(await referralsEnabled(db))) return { unlocked: false, worthRupees: 0 };
  if (worthRupees <= 0) return { unlocked: false, worthRupees: 0 };
  const earned = Math.floor((await countQualified(db, referrerId)) / REFERRAL_GOAL);
  const existing = await countFreeMonths(db, referrerId);
  let unlocked = false;
  for (let cycle = existing + 1; cycle <= earned; cycle += 1) {
    const inserted = await db.$executeRaw`
      INSERT IGNORE INTO referral_free_months (id, userId, worthRupees, status, cycleNumber)
      VALUES (${crypto.randomUUID()}, ${referrerId}, ${worthRupees}, 'open', ${cycle})
    `;
    if (asNumber(inserted) > 0) unlocked = true;
  }
  return { unlocked, worthRupees: unlocked ? worthRupees : 0 };
}

async function bonusAlreadyPaid(db: Db, referrerId: string, friendName: string | null): Promise<boolean> {
  const description = `${REWARD_PREFIX}${friendName || "Friend"} completed their first gym visit.`;
  const row = await db.creditTransaction.findFirst({
    where: { userId: referrerId, type: "BONUS", description },
    select: { id: true },
  });
  return !!row;
}

/**
 * Records a referred friend's first visit once.
 * The friendId primary key is what stops a second credit grant.
 * Callers that already paid, before this table existed, must not call this.
 */
export async function settleFirstReferralVisit(
  db: Db,
  friend: { id: string; name: string | null; referredByUserId: string | null },
): Promise<ReferralSettleResult | null> {
  if (!friend.referredByUserId) return null;
  const referrerId = friend.referredByUserId;
  const enabled = await referralsEnabled(db);
  const referrerPrice = await gymMonthlyRupees(db, referrerId);
  const friendPrice = await gymMonthlyRupees(db, friend.id);
  const qualified = enabled && friendQualifies(friendPrice, referrerPrice) ? 1 : 0;
  const credits = enabled ? REFERRAL_VISIT_CREDITS : 0;

  const inserted = await db.$executeRaw`
    INSERT IGNORE INTO referral_progress
      (friendId, referrerId, creditsGranted, qualified, friendGymPrice, referrerGymPrice)
    VALUES (${friend.id}, ${referrerId}, ${credits}, ${qualified}, ${friendPrice}, ${referrerPrice})
  `;

  let granted = 0;
  if (asNumber(inserted) > 0) {
    if (credits > 0) {
      const wallet = await db.creditWallet.findUnique({ where: { userId: referrerId } });
      if (wallet) {
        const updated = await db.creditWallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: credits } },
        });
        await db.creditTransaction.create({
          data: {
            walletId: wallet.id,
            userId: referrerId,
            type: "BONUS",
            amount: credits,
            balanceAfter: updated.balance,
            description: `${REWARD_PREFIX}${friend.name || "Friend"} completed their first gym visit.`,
          },
        });
        granted = credits;
      } else {
        await db.$executeRaw`
          UPDATE referral_progress SET creditsGranted = 0 WHERE friendId = ${friend.id}
        `;
      }
    }
  } else if (qualified === 1) {
    await db.$executeRaw`
      UPDATE referral_progress
      SET qualified = 1, friendGymPrice = ${friendPrice}, referrerGymPrice = ${referrerPrice}
      WHERE friendId = ${friend.id} AND qualified = 0
    `;
  }

  const month = await ensureFreeMonths(db, referrerId, referrerPrice);
  return {
    referrerId,
    creditsGranted: granted,
    monthUnlocked: month.unlocked,
    worthRupees: month.worthRupees,
  };
}

async function recordHistoricalVisit(
  db: Db,
  friend: { id: string; referrerId: string },
  friendPrice: number,
  referrerPrice: number,
): Promise<void> {
  const qualified = friendQualifies(friendPrice, referrerPrice) ? 1 : 0;
  await db.$executeRaw`
    INSERT IGNORE INTO referral_progress
      (friendId, referrerId, creditsGranted, qualified, friendGymPrice, referrerGymPrice)
    VALUES (
      ${friend.id},
      ${friend.referrerId},
      ${REFERRAL_VISIT_CREDITS},
      ${qualified},
      ${friendPrice},
      ${referrerPrice}
    )
  `;
}

/** Fills progress for friends who already visited, without paying a reward twice. */
async function backfillReferralProgress(db: Db, referrerId: string): Promise<ReferralSettleResult[]> {
  if (!(await referralsEnabled(db))) return [];
  const notices: ReferralSettleResult[] = [];
  const missing = await db.$queryRaw<Array<{ id: string; name: string | null }>>`
    SELECT u.id AS id, u.name AS name
    FROM users u
    WHERE u.referredByUserId = ${referrerId}
      AND EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.userId = u.id AND b.status IN ('CHECKED_IN', 'COMPLETED')
      )
      AND NOT EXISTS (
        SELECT 1 FROM referral_progress p WHERE p.friendId = u.id
      )
  `;
  if (missing.length === 0) return [];

  const referrerPrice = await gymMonthlyRupees(db, referrerId);
  for (const friend of missing) {
    const friendPrice = await gymMonthlyRupees(db, friend.id);
    const alreadyPaid = await bonusAlreadyPaid(db, referrerId, friend.name);
    if (alreadyPaid) {
      await recordHistoricalVisit(db, { id: friend.id, referrerId }, friendPrice, referrerPrice);
    } else {
      const settled = await settleFirstReferralVisit(db, {
        id: friend.id,
        name: friend.name,
        referredByUserId: referrerId,
      });
      if (settled) notices.push(settled);
    }
  }
  return notices;
}

async function readProgress(db: Db, userId: string): Promise<ReferralProgressView> {
  const totals = await db.$queryRaw<Array<{ credits: bigint | number | null; qualified: bigint | number | null }>>`
    SELECT COALESCE(SUM(creditsGranted), 0) AS credits, COALESCE(SUM(qualified), 0) AS qualified
    FROM referral_progress
    WHERE referrerId = ${userId}
  `;
  const months = await db.$queryRaw<Array<{ openMonths: bigint | number | null; redeemedMonths: bigint | number | null }>>`
    SELECT
      COALESCE(SUM(status = 'open'), 0) AS openMonths,
      COALESCE(SUM(status = 'redeemed'), 0) AS redeemedMonths
    FROM referral_free_months
    WHERE userId = ${userId}
  `;
  const worth = await db.$queryRaw<Array<{ worthRupees: number | bigint }>>`
    SELECT worthRupees FROM referral_free_months
    WHERE userId = ${userId} AND status = 'open' AND worthRupees > 0
    ORDER BY cycleNumber ASC
    LIMIT 1
  `;
  return referralProgressView({
    qualified: asNumber(totals[0]?.qualified),
    creditsGranted: asNumber(totals[0]?.credits),
    openMonths: asNumber(months[0]?.openMonths),
    redeemedMonths: asNumber(months[0]?.redeemedMonths),
    openWorthRupees: asNumber(worth[0]?.worthRupees),
    gymMonthlyRupees: await gymMonthlyRupees(db, userId),
  });
}

export async function referralSnapshot(userId: string): Promise<ReferralProgressView> {
  const notices = await prisma.$transaction(async (tx) => {
    const settled = await backfillReferralProgress(tx, userId);
    const price = await gymMonthlyRupees(tx, userId);
    const month = await ensureFreeMonths(tx, userId, price);
    if (month.unlocked && !settled.some((row) => row.monthUnlocked)) {
      settled.push({
        referrerId: userId,
        creditsGranted: 0,
        monthUnlocked: true,
        worthRupees: month.worthRupees,
      });
    }
    return settled;
  });
  for (const notice of notices) notifyReferralReward(notice);
  return readProgress(prisma as unknown as Db, userId);
}

/** Auto-completed visits never pass the staff desk, so the reward is settled here. */
export async function settleReferralVisitIfNeeded(userId: string): Promise<void> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const friend = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, referredByUserId: true },
      });
      if (!friend?.referredByUserId) return null;
      const existing = await tx.$queryRaw<Array<{ friendId: string }>>`
        SELECT friendId FROM referral_progress WHERE friendId = ${friend.id} LIMIT 1
      `;
      if (existing.length > 0) return null;
      const visited = await tx.booking.count({
        where: { userId: friend.id, status: { in: ["CHECKED_IN", "COMPLETED"] } },
      });
      if (visited === 0) return null;
      return settleFirstReferralVisit(tx, friend);
    });
    notifyReferralReward(result);
  } catch {
    console.warn("[referral] visit reward was not settled");
  }
}

export function notifyReferralReward(result: ReferralSettleResult | null): void {
  if (!result) return;
  if (result.creditsGranted > 0) {
    sendPushNotification(
      result.referrerId,
      "Referral Bonus",
      "You earned 5 credits. Your referred friend just completed their first workout.",
    ).catch(() => {});
  }
  if (result.monthUnlocked) {
    const worth = result.worthRupees > 0 ? `, up to ₹${result.worthRupees.toLocaleString("en-IN")}` : "";
    sendPushNotification(
      result.referrerId,
      "Free month unlocked",
      `Your next month is free${worth}.`,
    ).catch(() => {});
  }
}

/**
 * A desk undo of the friend's only visit stops counting them toward a free month.
 * Credits already granted stay in the wallet.
 */
export async function noteReferralVisitUndone(db: Db, friendId: string): Promise<void> {
  try {
    const remaining = await db.booking.count({
      where: { userId: friendId, status: { in: ["CHECKED_IN", "COMPLETED"] } },
    });
    if (remaining > 0) return;
    const rows = await db.$queryRaw<Array<{ referrerId: string }>>`
      SELECT referrerId FROM referral_progress WHERE friendId = ${friendId} LIMIT 1
    `;
    const referrerId = rows[0]?.referrerId;
    if (!referrerId) return;
    await db.$executeRaw`
      UPDATE referral_progress SET qualified = 0 WHERE friendId = ${friendId}
    `;
    const keep = Math.floor((await countQualified(db, referrerId)) / REFERRAL_GOAL);
    await db.$executeRaw`
      DELETE FROM referral_free_months
      WHERE userId = ${referrerId} AND status = 'open' AND cycleNumber > ${keep}
    `;
  } catch {
    console.warn("[referral] undone visit was not updated");
  }
}

async function peekOpenFreeMonth(db: Db, userId: string): Promise<{ id: string; worthRupees: number } | null> {
  const rows = await db.$queryRaw<Array<{ id: string; worthRupees: number | bigint }>>`
    SELECT id, worthRupees FROM referral_free_months
    WHERE userId = ${userId} AND status = 'open' AND worthRupees > 0
    ORDER BY cycleNumber ASC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, worthRupees: asNumber(row.worthRupees) };
}

export async function quotedFreeMonth(userId: string, pricePaise: number): Promise<{
  freeMonthId: string | null;
  waiverPaise: number;
  chargePaise: number;
}> {
  const open = await peekOpenFreeMonth(prisma as unknown as Db, userId);
  if (!open) return { freeMonthId: null, waiverPaise: 0, chargePaise: pricePaise };
  const waiver = waiverPaise(open.worthRupees, pricePaise);
  if (waiver <= 0) return { freeMonthId: null, waiverPaise: 0, chargePaise: pricePaise };
  return { freeMonthId: open.id, waiverPaise: waiver, chargePaise: pricePaise - waiver };
}

export async function redeemFreeMonth(db: Db, userId: string, freeMonthId: string): Promise<boolean> {
  const updated = await db.$executeRaw`
    UPDATE referral_free_months
    SET status = 'redeemed', redeemedAt = CURRENT_TIMESTAMP(3)
    WHERE id = ${freeMonthId} AND userId = ${userId} AND status = 'open' AND worthRupees > 0
  `;
  return asNumber(updated) > 0;
}

/** Uses one open month after a membership activates. Returns the paise waived. */
export async function redeemOpenFreeMonth(db: Db, userId: string, pricePaise: number): Promise<number> {
  const open = await peekOpenFreeMonth(db, userId);
  if (!open) return 0;
  const waiver = waiverPaise(open.worthRupees, pricePaise);
  if (waiver <= 0) return 0;
  const redeemed = await redeemFreeMonth(db, userId, open.id);
  return redeemed ? waiver : 0;
}
