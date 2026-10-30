"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const couponMath_1 = require("../lib/couponMath");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// ─── GET /api/marketplace/items ───────────────────────────────────────────────
/**
 * Returns all available marketplace items.
 */
router.get("/items", async (req, res) => {
    const items = await prisma_1.default.marketplaceItem.findMany({
        orderBy: { createdAt: "desc" },
    });
    res.json(items);
});
// ─── GET /api/marketplace/orders ──────────────────────────────────────────────
/**
 * Returns the user's past marketplace orders.
 */
router.get("/orders", auth_1.requireAuth, async (req, res) => {
    const orders = await prisma_1.default.marketplaceOrder.findMany({
        where: { userId: req.dbUserId },
        include: { item: true },
        orderBy: { createdAt: "desc" },
    });
    res.json(orders);
});
// ─── POST /api/marketplace/order ──────────────────────────────────────────────
/**
 * Place an order for a marketplace item using converted cash balance.
 */
router.post("/order", auth_1.requireAuth, [
    (0, express_validator_1.body)("itemId").isUUID().withMessage("Valid item ID required."),
    (0, express_validator_1.body)("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { itemId, quantity } = req.body;
    const result = await prisma_1.default.$transaction(async (tx) => {
        const item = await tx.marketplaceItem.findUnique({
            where: { id: itemId },
        });
        if (!item) {
            throw (0, errorHandler_1.createError)("Item not found.", 404, "ItemNotFound");
        }
        if (!item.inStock) {
            throw (0, errorHandler_1.createError)("Item is out of stock.", 400, "ItemOutOfStock");
        }
        const totalPaise = item.pricePaise * quantity;
        const wallet = await tx.creditWallet.findUnique({
            where: { userId: req.dbUserId },
        });
        if (!wallet) {
            throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
        }
        const totalAvailableCash = wallet.convertibleCashBalanceInPaise + wallet.nonConvertibleCashBalanceInPaise;
        if (totalAvailableCash < totalPaise) {
            throw (0, errorHandler_1.createError)(`Insufficient cash balance. You need ₹${totalPaise / 100}, but you have ₹${totalAvailableCash / 100}. Convert credits or top up cash first.`, 400, "InsufficientCash");
        }
        let remainingToDeduct = totalPaise;
        let deductNonConvertible = 0;
        let deductConvertible = 0;
        if (wallet.nonConvertibleCashBalanceInPaise >= remainingToDeduct) {
            deductNonConvertible = remainingToDeduct;
        }
        else {
            deductNonConvertible = wallet.nonConvertibleCashBalanceInPaise;
            deductConvertible = remainingToDeduct - deductNonConvertible;
        }
        // Deduct cash from wallet
        await tx.creditWallet.update({
            where: { id: wallet.id },
            data: {
                nonConvertibleCashBalanceInPaise: { decrement: deductNonConvertible },
                convertibleCashBalanceInPaise: { decrement: deductConvertible }
            },
        });
        const order = await tx.marketplaceOrder.create({
            data: {
                userId: req.dbUserId,
                itemId: item.id,
                quantity,
                totalPaise,
            },
            include: { item: true },
        });
        return order;
    });
    res.status(201).json({
        success: true,
        order: result,
        message: `Successfully ordered ${quantity}x ${result.item.title}.`,
    });
});
// ─── POST /api/marketplace/checkout ───────────────────────────────────────────
/**
 * Place a bulk order for multiple marketplace items using converted cash balance.
 */
router.post("/checkout", auth_1.requireAuth, [
    (0, express_validator_1.body)("items").isArray({ min: 1 }).withMessage("Items must be an array with at least 1 item."),
    (0, express_validator_1.body)("items.*.itemId").isUUID().withMessage("Valid item ID required."),
    (0, express_validator_1.body)("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
    (0, express_validator_1.body)("items.*.selectedSize").optional({ nullable: true }).isString().isLength({ max: 80 }),
    (0, express_validator_1.body)("items.*.selectedColor").optional({ nullable: true }).isString().isLength({ max: 80 }),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ error: "ValidationError", details: errors.array() });
        return;
    }
    const { items, couponCode, creditsToUse = 0 } = req.body;
    const cleanOption = (value) => {
        if (typeof value !== "string")
            return null;
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    };
    try {
        const result = await prisma_1.default.$transaction(async (tx) => {
            let totalPaise = 0;
            const itemRecords = [];
            for (const orderItem of items) {
                const item = await tx.marketplaceItem.findUnique({
                    where: { id: orderItem.itemId },
                });
                if (!item) {
                    throw (0, errorHandler_1.createError)(`Item ${orderItem.itemId} not found.`, 404, "ItemNotFound");
                }
                if (!item.inStock) {
                    throw (0, errorHandler_1.createError)(`Item ${item.title} is out of stock.`, 400, "ItemOutOfStock");
                }
                totalPaise += item.pricePaise * orderItem.quantity;
                itemRecords.push({
                    item,
                    quantity: orderItem.quantity,
                    selectedSize: cleanOption(orderItem.selectedSize),
                    selectedColor: cleanOption(orderItem.selectedColor),
                });
            }
            // Apply coupon if provided
            if (couponCode) {
                const coupon = await tx.marketingCoupon.findUnique({
                    where: { code: couponCode.toUpperCase() }
                });
                if (!coupon)
                    throw (0, errorHandler_1.createError)("Invalid coupon code", 404, "InvalidCoupon");
                if (!coupon.isActive)
                    throw (0, errorHandler_1.createError)("Coupon is no longer active", 400, "InvalidCoupon");
                if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date())
                    throw (0, errorHandler_1.createError)("Coupon expired", 400, "InvalidCoupon");
                if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
                    throw (0, errorHandler_1.createError)("Coupon usage limit reached", 400, "InvalidCoupon");
                const discountPaise = (0, couponMath_1.marketplaceDiscountPaise)(coupon.discountType, coupon.discountValue, totalPaise);
                if (discountPaise === "credits-only") {
                    throw (0, errorHandler_1.createError)("This coupon can only be used for gym bookings", 400, "InvalidCoupon");
                }
                if (discountPaise === "unsupported") {
                    throw (0, errorHandler_1.createError)("This coupon cannot be used for marketplace checkout.", 400, "InvalidCoupon");
                }
                if (discountPaise <= 0) {
                    throw (0, errorHandler_1.createError)("This coupon does not reduce the order total.", 400, "InvalidCoupon");
                }
                totalPaise = Math.max(0, totalPaise - discountPaise);
                await tx.marketingCoupon.update({
                    where: { id: coupon.id },
                    data: { usageCount: { increment: 1 } }
                });
            }
            const wallet = await tx.creditWallet.findUnique({
                where: { userId: req.dbUserId },
            });
            if (!wallet) {
                throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
            }
            const totalAvailableCash = wallet.convertibleCashBalanceInPaise + wallet.nonConvertibleCashBalanceInPaise;
            // 1. STEP 1: Auto-apply INR Balance
            const inrPaiseUsed = Math.min(totalAvailableCash, totalPaise);
            const remainderAfterInrPaise = totalPaise - inrPaiseUsed;
            // 2. STEP 2: User-controlled credits (1 Credit = 1000 paise / ₹10)
            const creditValuePaise = 1000;
            const maxUsableCredits = Math.floor(remainderAfterInrPaise / creditValuePaise);
            const actualCreditsToUse = Math.min(Math.max(0, Number(creditsToUse) || 0), wallet.balance, maxUsableCredits);
            const creditsPaiseUsed = actualCreditsToUse * creditValuePaise;
            // 3. STEP 3: Remaining amount for payment gateway
            const onlinePaidPaise = remainderAfterInrPaise - creditsPaiseUsed;
            if (onlinePaidPaise > 0) {
                throw (0, errorHandler_1.createError)("This order is not fully covered by your cash and credits. Add funds before checkout.", 402, "PaymentRequired");
            }
            // Deduct INR balance (nonConvertible first, then convertible)
            let remainingInrToDeduct = inrPaiseUsed;
            let deductNonConvertible = 0;
            let deductConvertible = 0;
            if (wallet.nonConvertibleCashBalanceInPaise >= remainingInrToDeduct) {
                deductNonConvertible = remainingInrToDeduct;
            }
            else {
                deductNonConvertible = wallet.nonConvertibleCashBalanceInPaise;
                deductConvertible = remainingInrToDeduct - deductNonConvertible;
            }
            const updatedWallet = await tx.creditWallet.updateMany({
                where: {
                    id: wallet.id,
                    balance: { gte: actualCreditsToUse },
                    nonConvertibleCashBalanceInPaise: { gte: deductNonConvertible },
                    convertibleCashBalanceInPaise: { gte: deductConvertible },
                },
                data: {
                    nonConvertibleCashBalanceInPaise: { decrement: deductNonConvertible },
                    convertibleCashBalanceInPaise: { decrement: deductConvertible },
                    balance: { decrement: actualCreditsToUse },
                },
            });
            if (updatedWallet.count !== 1) {
                throw (0, errorHandler_1.createError)("Insufficient wallet balance.", 400, "InsufficientFunds");
            }
            const orders = await Promise.all(itemRecords.map(record => tx.marketplaceOrder.create({
                data: {
                    userId: req.dbUserId,
                    itemId: record.item.id,
                    quantity: record.quantity,
                    totalPaise: record.item.pricePaise * record.quantity,
                    selectedSize: record.selectedSize,
                    selectedColor: record.selectedColor,
                },
                include: { item: true },
            })));
            return {
                orders,
                paymentBreakdown: {
                    totalPaise,
                    inrPaiseUsed,
                    creditsUsed: actualCreditsToUse,
                    creditsPaiseUsed,
                    onlinePaidPaise,
                },
            };
        });
        res.status(201).json({
            success: true,
            orders: result.orders,
            breakdown: result.paymentBreakdown,
            message: `Successfully checked out ${items.length} items.`,
        });
    }
    catch (err) {
        if (err.statusCode) {
            res.status(err.statusCode).json({ error: err.code, message: err.message });
        }
        else {
            res.status(500).json({ error: "ServerError", message: err.message || "Failed to process checkout" });
        }
    }
});
exports.default = router;
//# sourceMappingURL=marketplace.js.map