"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activatePaidMembership = activatePaidMembership;
exports.quotePaidMembership = quotePaidMembership;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function resolveGym(tx, primaryGymId, gymName) {
    if (UUID_RE.test(primaryGymId)) {
        const byId = await tx.gym.findFirst({ where: { id: primaryGymId, isActive: true } });
        if (byId)
            return byId;
    }
    const or = [
        { customGymId: primaryGymId },
        { name: primaryGymId },
    ];
    if (gymName && gymName.trim())
        or.push({ name: gymName.trim() });
    const gym = await tx.gym.findFirst({ where: { isActive: true, OR: or } });
    if (!gym) {
        throw (0, errorHandler_1.createError)("That gym is not on the live ZonoFit network.", 404, "GymNotFound");
    }
    return gym;
}
/**
 * Grants a paid membership cycle. Caller must already have confirmed payment.
 * Price and credit grant come from the database plan, never from the client.
 */
async function activatePaidMembership(tx, userId, input) {
    const existing = await tx.membership.findUnique({ where: { userId } });
    const now = new Date();
    const currentCycle = existing?.cycleNumber || 0;
    if (currentCycle >= 12) {
        throw (0, errorHandler_1.createError)("The 12 cycle membership limit has been reached.", 400, "CycleLimitReached");
    }
    if (existing && existing.status === "ACTIVE" && existing.endDate > now) {
        const daysLeft = Math.ceil((existing.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 3) {
            throw (0, errorHandler_1.createError)("An active membership can be renewed only in the last 3 days.", 400, "RenewalTooEarly");
        }
    }
    const gym = await resolveGym(tx, input.primaryGymId, input.gymName);
    const nextCycleNumber = currentCycle + 1;
    const baseDate = existing && existing.status === "ACTIVE" && existing.endDate > now ? existing.endDate : now;
    let planId = null;
    let gymPlanId = null;
    let pricePaise = 0;
    let durationDays = 30;
    if (input.gymPlanId) {
        const gymPlan = UUID_RE.test(input.gymPlanId)
            ? await tx.gymPlan.findFirst({ where: { id: input.gymPlanId, isActive: true, gymId: gym.id } })
            : null;
        if (!gymPlan)
            throw (0, errorHandler_1.createError)("Gym plan not found.", 404, "PlanNotFound");
        gymPlanId = gymPlan.id;
        pricePaise = gymPlan.priceInPaise;
        durationDays = gymPlan.billingCycle === "YEARLY" ? 365 : 30;
    }
    else if (input.planId) {
        const plan = UUID_RE.test(input.planId)
            ? await tx.membershipPlan.findFirst({ where: { id: input.planId, isActive: true } })
            : await tx.membershipPlan.findFirst({
                where: { isActive: true, name: input.planId },
            });
        if (!plan)
            throw (0, errorHandler_1.createError)("Membership plan not found.", 404, "PlanNotFound");
        planId = plan.id;
        pricePaise = plan.priceInPaise;
        durationDays = plan.durationDays || 30;
    }
    else {
        const gymPlan = await tx.gymPlan.findFirst({
            where: { gymId: gym.id, isActive: true },
            orderBy: { priceInPaise: "asc" },
        });
        if (gymPlan && gymPlan.priceInPaise > 0) {
            gymPlanId = gymPlan.id;
            pricePaise = gymPlan.priceInPaise;
            durationDays = gymPlan.billingCycle === "YEARLY" ? 365 : 30;
        }
        else if (gym.monthlyPrice && gym.monthlyPrice > 0) {
            pricePaise = gym.monthlyPrice * 100;
        }
    }
    if (pricePaise < 100) {
        throw (0, errorHandler_1.createError)("This gym does not have a payable membership price yet.", 400, "PriceNotConfigured");
    }
    const initialVisits = nextCycleNumber <= 4 ? 10 : 15;
    const membershipPrice = pricePaise / 100;
    const perVisitCost = Math.round(membershipPrice * 0.04);
    const remainingCreditsToAdd = Math.max(0, Math.round((membershipPrice - initialVisits * perVisitCost) / 10));
    const endDate = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const wallet = await tx.creditWallet.findUnique({ where: { userId } });
    if (!wallet)
        throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
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
async function quotePaidMembership(userId, input) {
    return prisma_1.default.$transaction(async (tx) => {
        const existing = await tx.membership.findUnique({ where: { userId } });
        const now = new Date();
        const currentCycle = existing?.cycleNumber || 0;
        if (currentCycle >= 12) {
            throw (0, errorHandler_1.createError)("The 12 cycle membership limit has been reached.", 400, "CycleLimitReached");
        }
        if (existing && existing.status === "ACTIVE" && existing.endDate > now) {
            const daysLeft = Math.ceil((existing.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft > 3) {
                throw (0, errorHandler_1.createError)("An active membership can be renewed only in the last 3 days.", 400, "RenewalTooEarly");
            }
        }
        const gym = await resolveGym(tx, input.primaryGymId, input.gymName);
        let planId = null;
        let gymPlanId = null;
        let pricePaise = 0;
        if (input.gymPlanId) {
            const gymPlan = UUID_RE.test(input.gymPlanId)
                ? await tx.gymPlan.findFirst({ where: { id: input.gymPlanId, isActive: true, gymId: gym.id } })
                : null;
            if (!gymPlan)
                throw (0, errorHandler_1.createError)("Gym plan not found.", 404, "PlanNotFound");
            gymPlanId = gymPlan.id;
            pricePaise = gymPlan.priceInPaise;
        }
        else if (input.planId) {
            const plan = UUID_RE.test(input.planId)
                ? await tx.membershipPlan.findFirst({ where: { id: input.planId, isActive: true } })
                : await tx.membershipPlan.findFirst({ where: { isActive: true, name: input.planId } });
            if (!plan)
                throw (0, errorHandler_1.createError)("Membership plan not found.", 404, "PlanNotFound");
            planId = plan.id;
            pricePaise = plan.priceInPaise;
        }
        else {
            const gymPlan = await tx.gymPlan.findFirst({
                where: { gymId: gym.id, isActive: true },
                orderBy: { priceInPaise: "asc" },
            });
            if (gymPlan && gymPlan.priceInPaise > 0) {
                gymPlanId = gymPlan.id;
                pricePaise = gymPlan.priceInPaise;
            }
            else if (gym.monthlyPrice && gym.monthlyPrice > 0) {
                pricePaise = gym.monthlyPrice * 100;
            }
        }
        if (pricePaise < 100) {
            throw (0, errorHandler_1.createError)("This gym does not have a payable membership price yet.", 400, "PriceNotConfigured");
        }
        return { pricePaise, gym, planId, gymPlanId };
    });
}
//# sourceMappingURL=membershipActivate.js.map