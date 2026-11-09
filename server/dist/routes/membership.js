"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const membershipActivate_1 = require("../services/membershipActivate");
const payments_1 = require("../services/payments");
const notifications_1 = require("../services/notifications");
const router = (0, express_1.Router)();
/** Member responses keep the gym name. The GSTIN stays off the customer payload. */
function hideSupplierGstin(membership) {
    if (!membership.primaryGym)
        return membership;
    const { gstNumber: _gstNumber, ...primaryGym } = membership.primaryGym;
    return { ...membership, primaryGym };
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
    let completedVisits = Math.max(0, membership.completedVisits ?? 0);
    if ((membership.completedVisits ?? 0) < 0) {
        await prisma_1.default.membership.update({
            where: { id: membership.id },
            data: { completedVisits: 0 },
        });
        completedVisits = 0;
    }
    const mandatoryVisitsRemaining = Math.max(0, mandatoryVisits - completedVisits);
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
 * If card payments are not configured on the server, directly accepts and activates for testing.
 */
router.post("/create-order", auth_1.requireAuth, [
    (0, express_validator_1.body)("primaryGymId").isString().notEmpty().withMessage("A gym is required."),
    (0, express_validator_1.body)("gymName").optional().isString(),
    (0, express_validator_1.body)("planId").optional().isString(),
    (0, express_validator_1.body)("gymPlanId").optional().isString(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { primaryGymId, gymName, planId, gymPlanId } = req.body;
    try {
        const quote = await (0, membershipActivate_1.quotePaidMembership)(req.dbUserId, {
            primaryGymId,
            gymName,
            planId,
            gymPlanId,
        });
        // If Razorpay is not configured on the server, directly accept & activate for testing
        if (!(0, payments_1.isRazorpayConfigured)()) {
            const activationResult = await (0, membershipActivate_1.activatePaidMembership)(prisma_1.default, req.dbUserId, {
                primaryGymId: quote.gym.id,
                gymName: gymName || quote.gym.name,
                planId: quote.planId,
                gymPlanId: quote.gymPlanId,
            });
            await (0, notifications_1.sendPushNotification)(req.dbUserId, "Membership activated", `Your membership at ${activationResult.gym.name} is active! ${activationResult.initialVisits} primary visits and ${activationResult.remainingCreditsToAdd} credits added to your wallet.`).catch(() => { });
            res.status(200).json({
                directAccepted: true,
                success: true,
                message: "Membership activated directly for testing (card payments not configured).",
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
                amount: quote.pricePaise,
                currency: "INR",
                tax: quote.tax,
            });
            return;
        }
        const razorpay = (0, payments_1.getRazorpay)();
        const { keyId } = (0, payments_1.getRazorpayConfig)();
        const order = await razorpay.orders.create({
            amount: quote.pricePaise,
            currency: "INR",
            receipt: `mem_${Date.now()}`,
        });
        await prisma_1.default.paymentOrder.create({
            data: {
                userId: req.dbUserId,
                razorpayOrderId: order.id,
                amountPaise: quote.pricePaise,
                creditsToAdd: 0,
                cashToAddPaise: 0,
                purpose: "MEMBERSHIP",
                metaJson: JSON.stringify({
                    planId: quote.planId,
                    gymPlanId: quote.gymPlanId,
                    primaryGymId,
                    gymName: gymName || quote.gym.name,
                    tax: quote.tax,
                }),
                status: "CREATED",
            },
        });
        res.status(200).json({
            razorpayOrderId: order.id,
            keyId,
            amount: quote.pricePaise,
            currency: "INR",
            gymId: quote.gym.id,
            gymName: quote.gym.name,
            tax: quote.tax,
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
 * Confirms a payment and grants the membership.
 * In testing or when card payments are not configured, directly activates.
 */
router.post("/activate", auth_1.requireAuth, async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, directAccept, primaryGymId, gymName, planId, gymPlanId, } = req.body;
    try {
        if (!(0, payments_1.isRazorpayConfigured)() ||
            directAccept ||
            !razorpaySignature ||
            razorpayOrderId?.startsWith("mock_")) {
            // Direct accept mode for testing
            const targetGymId = primaryGymId || "83431d3a-313a-450c-b78e-62732160b6ef";
            const result = await (0, membershipActivate_1.activatePaidMembership)(prisma_1.default, req.dbUserId, {
                primaryGymId: targetGymId,
                gymName,
                planId,
                gymPlanId,
            });
            res.status(201).json({
                membership: hideSupplierGstin({
                    ...result.membership,
                    gymName: result.gym.name,
                    plan: result.membership.plan
                        ? { ...result.membership.plan, priceINR: result.membership.plan.priceInPaise / 100 }
                        : null,
                    cycleNumber: result.nextCycleNumber,
                    maxCycles: 12,
                }),
                newCreditBalance: result.wallet.balance,
                amount: result.pricePaise,
                tax: result.tax,
                message: "Membership activated (test mode direct accept).",
            });
            return;
        }
        if (!(0, payments_1.verifyCheckoutSignature)(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
            res.status(400).json({ error: "InvalidSignature", message: "Payment could not be verified." });
            return;
        }
        await (0, payments_1.fulfillPaymentOrder)({
            razorpayOrderId: razorpayOrderId,
            referenceId: razorpayPaymentId,
            userId: req.dbUserId,
        });
        const membership = await prisma_1.default.membership.findUnique({
            where: { userId: req.dbUserId },
            include: { plan: true, gymPlan: true, primaryGym: true },
        });
        const wallet = await prisma_1.default.creditWallet.findUnique({ where: { userId: req.dbUserId } });
        res.status(201).json({
            membership: membership
                ? hideSupplierGstin({
                    ...membership,
                    plan: membership.plan
                        ? { ...membership.plan, priceINR: membership.plan.priceInPaise / 100 }
                        : null,
                    cycleNumber: membership.cycleNumber,
                    maxCycles: 12,
                })
                : null,
            newCreditBalance: wallet?.balance ?? 0,
            message: "Membership activated.",
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