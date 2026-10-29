import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { createError } from "../middleware/errorHandler";

type Tx = Prisma.TransactionClient;

export interface MembershipActivationInput {
  planId?: string | null;
  gymPlanId?: string | null;
  primaryGymId: string;
  gymName?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveGym(tx: Tx, primaryGymId: string, gymName?: string | null) {
  if (UUID_RE.test(primaryGymId)) {
    const byId = await tx.gym.findFirst({ where: { id: primaryGymId, isActive: true } });
    if (byId) return byId;
  }

  const or: Prisma.GymWhereInput[] = [
    { customGymId: primaryGymId },
    { name: primaryGymId },
  ];
  if (gymName && gymName.trim()) or.push({ name: gymName.trim() });

  const gym = await tx.gym.findFirst({ where: { isActive: true, OR: or } });
  if (!gym) {
    throw createError("That gym is not on the live ZonoFit network.", 404, "GymNotFound");
  }
  return gym;
}

/**
 * Grants a paid membership cycle. Caller must already have confirmed payment.
 * Price and credit grant come from the database plan, never from the client.
 */
export async function activatePaidMembership(tx: Tx, userId: string, input: MembershipActivationInput) {
  const existing = await tx.membership.findUnique({ where: { userId } });
  const now = new Date();
  const currentCycle = existing?.cycleNumber || 0;

  if (currentCycle >= 12) {
    throw createError("The 12 cycle membership limit has been reached.", 400, "CycleLimitReached");
  }

  if (existing && existing.status === "ACTIVE" && existing.endDate > now) {
    const daysLeft = Math.ceil((existing.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 3) {
      throw createError("An active membership can be renewed only in the last 3 days.", 400, "RenewalTooEarly");
    }
  }

  const gym = await resolveGym(tx, input.primaryGymId, input.gymName);
  const nextCycleNumber = currentCycle + 1;
  const baseDate = existing && existing.status === "ACTIVE" && existing.endDate > now ? existing.endDate : now;

  let planId: string | null = null;
  let gymPlanId: string | null = null;
  let pricePaise = 0;
  let durationDays = 30;

  if (input.gymPlanId) {
    const gymPlan = UUID_RE.test(input.gymPlanId)
      ? await tx.gymPlan.findFirst({ where: { id: input.gymPlanId, isActive: true, gymId: gym.id } })
      : null;
    if (!gymPlan) throw createError("Gym plan not found.", 404, "PlanNotFound");
    gymPlanId = gymPlan.id;
    pricePaise = gymPlan.priceInPaise;
    durationDays = gymPlan.billingCycle === "YEARLY" ? 365 : 30;
  } else if (input.planId) {
    const plan = UUID_RE.test(input.planId)
      ? await tx.membershipPlan.findFirst({ where: { id: input.planId, isActive: true } })
      : await tx.membershipPlan.findFirst({
          where: { isActive: true, name: input.planId },
        });
    if (!plan) throw createError("Membership plan not found.", 404, "PlanNotFound");
    planId = plan.id;
    pricePaise = plan.priceInPaise;
    durationDays = plan.durationDays || 30;
  } else {
    const gymPlan = await tx.gymPlan.findFirst({
      where: { gymId: gym.id, isActive: true },
      orderBy: { priceInPaise: "asc" },
    });
    if (gymPlan && gymPlan.priceInPaise > 0) {
      gymPlanId = gymPlan.id;
      pricePaise = gymPlan.priceInPaise;
      durationDays = gymPlan.billingCycle === "YEARLY" ? 365 : 30;
    } else if (gym.monthlyPrice && gym.monthlyPrice > 0) {
      pricePaise = gym.monthlyPrice * 100;
    }
  }

  if (pricePaise < 100) {
    throw createError("This gym does not have a payable membership price yet.", 400, "PriceNotConfigured");
  }

  const initialVisits = nextCycleNumber <= 4 ? 10 : 15;
  const membershipPrice = pricePaise / 100;
  const perVisitCost = Math.round(membershipPrice * 0.04);
  const remainingCreditsToAdd = Math.max(0, Math.round((membershipPrice - initialVisits * perVisitCost) / 10));
  const endDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const wallet = await tx.creditWallet.findUnique({ where: { userId } });
  if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");

  const inrWalletDeductedPaise = 0;

  const membership = await tx.membership.upsert({
    where: { userId },
    create: {
      userId,
      planId,
      gymPlanId,
      status: "ACTIVE",
      startDate: now,
      endDate,
      primaryGymId: gym.id,
      primaryGymVisits: initialVisits,
      cycleNumber: nextCycleNumber,
      mandatoryVisits: initialVisits,
      completedVisits: 0,
    },
    update: {
      planId,
      gymPlanId,
      status: "ACTIVE",
      startDate: now,
      endDate,
      primaryGymId: gym.id,
      primaryGymVisits: initialVisits,
      cycleNumber: nextCycleNumber,
      mandatoryVisits: initialVisits,
      completedVisits: 0,
    },
    include: { plan: true, gymPlan: true, primaryGym: true },
  });

  const updatedWallet = await tx.creditWallet.update({
    where: { userId },
    data: { balance: { increment: remainingCreditsToAdd } },
  });

  await tx.creditTransaction.create({
    data: {
      userId,
      walletId: wallet.id,
      type: "MEMBERSHIP_GRANT",
      amount: remainingCreditsToAdd,
      balanceAfter: updatedWallet.balance,
      description: `Membership ${nextCycleNumber} of 12 activated — ${initialVisits} visits at ${gym.name}, ${remainingCreditsToAdd} credits added.`,
    },
  });

  return { membership, wallet: updatedWallet, remainingCreditsToAdd, initialVisits, gym, nextCycleNumber, inrWalletDeductedPaise, pricePaise };
}

/** Price and gym for a membership checkout. Does not grant access. */
export async function quotePaidMembership(userId: string, input: MembershipActivationInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.membership.findUnique({ where: { userId } });
    const now = new Date();
    const currentCycle = existing?.cycleNumber || 0;
    if (currentCycle >= 12) {
      throw createError("The 12 cycle membership limit has been reached.", 400, "CycleLimitReached");
    }
    if (existing && existing.status === "ACTIVE" && existing.endDate > now) {
      const daysLeft = Math.ceil((existing.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 3) {
        throw createError("An active membership can be renewed only in the last 3 days.", 400, "RenewalTooEarly");
      }
    }

    const gym = await resolveGym(tx, input.primaryGymId, input.gymName);
    let planId: string | null = null;
    let gymPlanId: string | null = null;
    let pricePaise = 0;

    if (input.gymPlanId) {
      const gymPlan = UUID_RE.test(input.gymPlanId)
        ? await tx.gymPlan.findFirst({ where: { id: input.gymPlanId, isActive: true, gymId: gym.id } })
        : null;
      if (!gymPlan) throw createError("Gym plan not found.", 404, "PlanNotFound");
      gymPlanId = gymPlan.id;
      pricePaise = gymPlan.priceInPaise;
    } else if (input.planId) {
      const plan = UUID_RE.test(input.planId)
        ? await tx.membershipPlan.findFirst({ where: { id: input.planId, isActive: true } })
        : await tx.membershipPlan.findFirst({ where: { isActive: true, name: input.planId } });
      if (!plan) throw createError("Membership plan not found.", 404, "PlanNotFound");
      planId = plan.id;
      pricePaise = plan.priceInPaise;
    } else {
      const gymPlan = await tx.gymPlan.findFirst({
        where: { gymId: gym.id, isActive: true },
        orderBy: { priceInPaise: "asc" },
      });
      if (gymPlan && gymPlan.priceInPaise > 0) {
        gymPlanId = gymPlan.id;
        pricePaise = gymPlan.priceInPaise;
      } else if (gym.monthlyPrice && gym.monthlyPrice > 0) {
        pricePaise = gym.monthlyPrice * 100;
      }
    }

    if (pricePaise < 100) {
      throw createError("This gym does not have a payable membership price yet.", 400, "PriceNotConfigured");
    }

    return { pricePaise, gym, planId, gymPlanId };
  });
}
