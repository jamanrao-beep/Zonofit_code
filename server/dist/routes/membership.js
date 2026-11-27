"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const taxDocuments_1 = require("../lib/taxDocuments");
const referralRewards_1 = require("../lib/referralRewards");
const membershipActivate_1 = require("../services/membershipActivate");
const payments_1 = require("../services/payments");
const plural_1 = require("../services/plural");
const notifications_1 = require("../services/notifications");
const router = (0, express_1.Router)();
/** Member responses keep the gym name. The GSTIN stays off the customer payload. */
function hideSupplierGstin(membership) {
    if (!membership.primaryGym)
        return membership;
    const { gstNumber: _gstNumber, ...primaryGym } = membership.primaryGym;
    return { ...membership, primaryGym };
}
/** Activates a cycle and redeems a free month in the same transaction. Visit math stays on the full price. */
async function activateAndMaybeRedeem(userId, input, freeMonthId) {
    return prisma_1.default.$transaction(async (tx) => {
        const activated = await (0, membershipActivate_1.activatePaidMembership)(tx, userId, input);
        if (freeMonthId) {
            const redeemed = await (0, referralRewards_1.redeemFreeMonth)(tx, userId, freeMonthId);
            if (!redeemed)
                console.warn("[referral] free month was not redeemed");
        }
        return activated;
    });
}
// ─── GET /api/membership/plans ────────────────────────────────────────────────
/**
 * Returns all active membership plans (public — no auth required).
 * Used on the membership selection screen.
 */
router.get("/plans", async (_req, res) => {
    const plans = await prisma_1.default.membershipPlan.findMany({
        where: { isActive: true },
        orderBy: { priceInPaise: "asc" },
    });
    res.json({
        plans: plans.map((p) => ({
            ...p,
            priceINR: p.priceInPaise / 100,
        })),
    });
});
// ─── GET /api/membership/me ───────────────────────────────────────────────────
/**
 * Returns the authenticated user's current membership.
 */
router.get("/me", auth_1.requireAuth, async (req, res) => {
    const membership = await prisma_1.default.membership.findUnique({
        where: { userId: req.dbUserId },
        include: {
            plan: true,
            primaryGym: { select: { id: true, name: true, city: true, address: true } }
        },
    });
    if (!membership) {
        res.json({ membership: null });
        return;
    }
    const now = new Date();
    const isExpired = membership.endDate < now || membership.status === "EXPIRED";
    const daysRemaining = isExpired
        ? 0
        : Math.ceil((membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const cycleNumber = membership.cycleNumber || 1;
    const maxCycles = 12;
    const cyclesRemaining = Math.max(0, maxCycles - cycleNumber);
    const mandatoryVisits = membership.mandatoryVisits || (cycleNumber <= 4 ? 10 : 15);
    const primaryGymVisits = typeof membership.primaryGymVisits === "number"
        ? membership.primaryGymVisits
        : mandatoryVisits;
    const verifiedVisitsCount = await prisma_1.default.booking.count({
        where: {
            userId: req.dbUserId,
            status: { in: ["CHECKED_IN", "COMPLETED"] },
        },
    });
    const completedVisits = Math.max(0, membership.completedVisits ?? 0, verifiedVisitsCount);
    const mandatoryVisitsRemaining = Math.max(0, primaryGymVisits);
    // PRD Rules:
    // 1. Repurchase allowed when membership is expired OR within 3 days of expiry AND cycleNumber < 12
    // 2. Buy additional credits allowed ONLY when membership is active
    const canRepurchase = (isExpired || daysRemaining <= 3) && cycleNumber < maxCycles;
    const isExpiringSoon = !isExpired && daysRemaining <= 3;
    const canBuyAdditionalCredits = !isExpired;
    res.json({
        membership: {
            ...membership,
            gymName: membership.primaryGym?.name || "ZonoFit Partner Gym",
            plan: membership.plan ? {
                ...membership.plan,
                priceINR: membership.plan.priceInPaise / 100,
            } : null,
            isExpired,
            isExpiringSoon,
            daysRemaining,
            cycleNumber,
            maxCycles,
            cyclesRemaining,
            mandatoryVisits,
            completedVisits,
            mandatoryVisitsRemaining,
            canRepurchase,
            canBuyAdditionalCredits,
        },
    });
});
// ─── POST /api/membership/create-order ───────────────────────────────────────
/**
 * Starts a membership payment. The price comes from the database plan.
 * A covered referral month activates here. Every other charge opens Pine Labs.
 */
router.post("/create-order", auth_1.requireAuth, [
    (0, express_validator_1.body)("primaryGymId").isString().notEmpty().withMessage("A gym is required."),
    (0, express_validator_1.body)("gymName").optional().isString(),
    (0, express_validator_1.body)("planId").optional().isString(),
    (0, express_validator_1.body)("gymPlanId").optional().isString(),
    (0, express_validator_1.body)("address").optional().isString(),
    (0, express_validator_1.body)("city").optional().isString(),
    (0, express_validator_1.body)("state").optional().isString(),
    (0, express_validator_1.body)("pincode").optional().isString(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { primaryGymId, gymName, planId, gymPlanId, address, city, state, pincode } = req.body;
    try {
        const quote = await (0, membershipActivate_1.quotePaidMembership)(req.dbUserId, {
            primaryGymId,
            gymName,
            planId,
            gymPlanId,
        });
        const offer = await (0, referralRewards_1.quotedFreeMonth)(req.dbUserId, quote.pricePaise);
        const chargePaise = offer.chargePaise;
        const tax = (0, taxDocuments_1.membershipTaxBranches)({
            grossPaise: chargePaise,
            gymGstRegistered: quote.gym.isGstRegistered === true,
        });
        const activationInput = {
            primaryGymId: quote.gym.id,
            gymName: gymName || quote.gym.name,
            planId: quote.planId,
            gymPlanId: quote.gymPlanId,
        };
        if (chargePaise === 0) {
            const activationResult = await activateAndMaybeRedeem(req.dbUserId, activationInput, offer.waiverPaise > 0 ? offer.freeMonthId : null);
            await (0, notifications_1.sendPushNotification)(req.dbUserId, "Membership activated", `Your membership at ${activationResult.gym.name} is active! ${activationResult.initialVisits} primary visits and ${activationResult.remainingCreditsToAdd} credits added to your wallet.`).catch(() => { });
            res.status(200).json({
                directAccepted: true,
                success: true,
                message: "Your free referral month is active.",
                membership: hideSupplierGstin({
                    ...activationResult.membership,
                    gymName: activationResult.gym.name,
                    plan: activationResult.membership.plan
                        ? {
                            ...activationResult.membership.plan,
                            priceINR: activationResult.membership.plan.priceInPaise / 100,
                        }
                        : null,
                    cycleNumber: activationResult.nextCycleNumber,
                    maxCycles: 12,
                }),
                newCreditBalance: activationResult.wallet.balance,
                gymId: activationResult.gym.id,
                gymName: activationResult.gym.name,
                amount: chargePaise,
                waiverPaise: offer.waiverPaise,
                currency: "INR",
                tax,
            });
            return;
        }
        if (!(0, plural_1.isPluralConfigured)()) {
            res.status(503).json({
                error: "PaymentsNotConfigured",
                message: "Card payments are not configured.",
            });
            return;
        }
        const merchantReference = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.dbUserId },
            select: { phone: true, email: true, name: true, address: true, city: true, state: true, pincode: true },
        });
        const customerAddress = address?.trim() || user?.address || undefined;
        const customerCity = city?.trim() || user?.city || undefined;
        const customerState = state?.trim() || user?.state || undefined;
        const customerPincode = pincode?.trim() || user?.pincode || undefined;
        if (address?.trim() || city?.trim() || pincode?.trim()) {
            await prisma_1.default.user.update({
                where: { id: req.dbUserId },
                data: {
                    ...(address?.trim() ? { address: address.trim() } : {}),
                    ...(city?.trim() ? { city: city.trim() } : {}),
                    ...(state?.trim() ? { state: state.trim() } : {}),
                    ...(pincode?.trim() ? { pincode: pincode.trim() } : {}),
                },
            }).catch(() => { });
        }
        const pluralOrder = await (0, plural_1.createPluralOrder)({
            merchantReference,
            amountPaise: chargePaise,
            userId: req.dbUserId,
            customerPhone: user?.phone || undefined,
            customerEmail: user?.email || undefined,
            customerName: user?.name || undefined,
            customerAddress,
            customerCity,
            customerState,
            customerPincode,
        });
        await prisma_1.default.paymentOrder.create({
            data: {
                userId: req.dbUserId,
                gatewayOrderId: pluralOrder.orderId,
                amountPaise: chargePaise,
                creditsToAdd: 0,
                cashToAddPaise: 0,
                purpose: "MEMBERSHIP",
                metaJson: JSON.stringify({
                    merchantReference,
                    gateway: "PLURAL",
                    planId: quote.planId,
                    gymPlanId: quote.gymPlanId,
                    primaryGymId,
                    gymName: gymName || quote.gym.name,
                    tax,
                    ...(offer.freeMonthId && offer.waiverPaise > 0
                        ? { freeMonthId: offer.freeMonthId, waiverPaise: offer.waiverPaise }
                        : {}),
                }),
                status: "CREATED",
            },
        });
        res.status(200).json({
            gateway: "PLURAL",
            orderId: pluralOrder.orderId,
            razorpayOrderId: pluralOrder.orderId,
            redirectUrl: pluralOrder.redirectUrl,
            amount: chargePaise,
            waiverPaise: offer.waiverPaise,
            currency: "INR",
            gymId: quote.gym.id,
            gymName: quote.gym.name,
            tax,
        });
    }
    catch (err) {
        const status = err.statusCode || err.status || 500;
        res.status(status).json({
            error: err.code || "MembershipOrderFailed",
            message: status === 503 ? err.message : err.message || "Could not start membership payment.",
        });
    }
});
// ─── POST /api/membership/activate ───────────────────────────────────────────
/**
 * Confirms a Pine Labs membership payment and returns the activated membership.
 * A missing or unpaid order does not grant access.
 */
router.post("/activate", auth_1.requireAuth, async (req, res) => {
    const orderLookupId = (req.body?.orderId || req.body?.razorpayOrderId);
    const gymName = typeof req.body?.gymName === "string" ? req.body.gymName : undefined;
    if (!orderLookupId || typeof orderLookupId !== "string") {
        res.status(400).json({
            error: "OrderRequired",
            message: "A Pine Labs payment is required before membership can start.",
        });
        return;
    }
    if (!(0, plural_1.isPluralConfigured)()) {
        res.status(503).json({
            error: "PaymentsNotConfigured",
            message: "Card payments are not configured.",
        });
        return;
    }
    try {
        const order = await prisma_1.default.paymentOrder.findFirst({
            where: {
                OR: [
                    { gatewayOrderId: orderLookupId },
                    { metaJson: { contains: orderLookupId } },
                ],
            },
        });
        if (!order) {
            res.status(404).json({ error: "OrderNotFound", message: "Payment order not found." });
            return;
        }
        if (order.userId !== req.dbUserId) {
            res.status(403).json({ error: "Forbidden", message: "This payment does not belong to you." });
            return;
        }
        if (order.purpose !== "MEMBERSHIP") {
            res.status(400).json({ error: "WrongOrder", message: "This payment is not a membership order." });
            return;
        }
        if (order.status !== "FULFILLED") {
            const paid = await (0, plural_1.confirmPluralPayment)(order.gatewayOrderId);
            if (!paid) {
                res.status(402).json({
                    error: "PaymentPending",
                    message: "Pine Labs has not confirmed this payment yet.",
                });
                return;
            }
            await (0, payments_1.fulfillPaymentOrder)({
                gatewayOrderId: order.gatewayOrderId,
                referenceId: paid.paymentId,
                paidPaise: paid.amountPaise,
                userId: req.dbUserId,
            });
        }
        const membership = await prisma_1.default.membership.findUnique({
            where: { userId: req.dbUserId },
            include: { plan: true, gymPlan: true, primaryGym: true },
        });
        const wallet = await prisma_1.default.creditWallet.findUnique({ where: { userId: req.dbUserId } });
        if (!membership) {
            res.status(400).json({
                error: "ActivationFailed",
                message: "Membership was not activated.",
            });
            return;
        }
        res.status(200).json({
            membership: hideSupplierGstin({
                ...membership,
                gymName: membership.primaryGym?.name || gymName,
                plan: membership.plan
                    ? { ...membership.plan, priceINR: membership.plan.priceInPaise / 100 }
                    : null,
                cycleNumber: membership.cycleNumber,
                maxCycles: 12,
            }),
            newCreditBalance: wallet?.balance ?? 0,
            message: "Membership activated successfully.",
        });
    }
    catch (err) {
        const status = err.statusCode || err.status || 500;
        res.status(status).json({
            error: err.code || "ActivationFailed",
            message: err.message || "Membership could not be activated.",
        });
    }
});
exports.default = router;
//# sourceMappingURL=membership.js.map