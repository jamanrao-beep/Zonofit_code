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
const router = (0, express_1.Router)();
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
    const completedVisits = membership.completedVisits || 0;
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
 * Confirms a Razorpay checkout and grants the membership once.
 * The client cannot choose the price or the credit grant.
 */
router.post("/activate", auth_1.requireAuth, [
    (0, express_validator_1.body)("razorpayOrderId").isString().notEmpty().withMessage("Payment order required."),
    (0, express_validator_1.body)("razorpayPaymentId").isString().notEmpty().withMessage("Payment id required."),
    (0, express_validator_1.body)("razorpaySignature").isString().notEmpty().withMessage("Payment signature required."),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    try {
        if (!(0, payments_1.verifyCheckoutSignature)(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
            res.status(400).json({ error: "InvalidSignature", message: "Payment could not be verified." });
            return;
        }
        await (0, payments_1.fulfillPaymentOrder)({
            razorpayOrderId,
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
                ? {
                    ...membership,
                    plan: membership.plan
                        ? { ...membership.plan, priceINR: membership.plan.priceInPaise / 100 }
                        : null,
                    cycleNumber: membership.cycleNumber,
                    maxCycles: 12,
                }
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