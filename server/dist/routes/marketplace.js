"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const couponMath_1 = require("../lib/couponMath");
const marketplaceItem_1 = require("../lib/marketplaceItem");
const marketplacePay_1 = require("../lib/marketplacePay");
const wallet_1 = require("../lib/wallet");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// ─── GET /api/marketplace/items ───────────────────────────────────────────────
/**
 * Returns all available marketplace items.
 */
router.get("/items", async (_req, res) => {
    const items = await prisma_1.default.marketplaceItem.findMany({
        orderBy: { createdAt: "desc" },
    });
    res.json(items.map((item) => (0, marketplaceItem_1.presentMarketplaceItem)(item)));
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
    res.json(orders.map((order) => ({ ...order, item: (0, marketplaceItem_1.presentMarketplaceItem)(order.item) })));
});
// ─── POST /api/marketplace/order ──────────────────────────────────────────────
/**
 * Place one shop order. The price is paid in credits only, at ₹8 per credit.
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
    try {
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
            const creditsNeeded = (0, marketplacePay_1.creditsForMarketplacePaise)(totalPaise);
            const currentWallet = await tx.creditWallet.findUnique({ where: { userId: req.dbUserId } });
            if (!currentWallet)
                throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
            if (currentWallet.balance < creditsNeeded) {
                throw (0, errorHandler_1.createError)(`This order is ₹${Math.round(totalPaise / 100)} and costs ${creditsNeeded} credits (1 credit = ₹${marketplacePay_1.MARKETPLACE_CREDIT_INR}). You have ${currentWallet.balance} credits.`, 400, "InsufficientCredits");
            }
            const wallet = await (0, wallet_1.decrementCredits)(tx, req.dbUserId, creditsNeeded);
            if (creditsNeeded > 0) {
                await tx.creditTransaction.create({
                    data: {
                        userId: req.dbUserId,
                        walletId: wallet.id,
                        type: "MARKETPLACE_SPEND",
                        amount: -creditsNeeded,
                        balanceAfter: wallet.balance,
                        description: `Shop order · ${quantity}x ${item.title} · ${creditsNeeded} credits`,
                    },
                });
            }
            const order = await tx.marketplaceOrder.create({
                data: {
                    userId: req.dbUserId,
                    itemId: item.id,
                    quantity,
                    totalPaise,
                    creditsSpent: creditsNeeded,
                    status: "PLACED",
                },
                include: { item: true },
            });
            return { order, creditsNeeded, newCreditBalance: wallet.balance };
        });
        res.status(201).json({
            success: true,
            order: { ...result.order, item: (0, marketplaceItem_1.presentMarketplaceItem)(result.order.item) },
            creditsUsed: result.creditsNeeded,
            newCreditBalance: result.newCreditBalance,
            message: `Ordered ${quantity}x ${result.order.item.title} for ${result.creditsNeeded} credits.`,
        });
    }
    catch (err) {
        if (err.statusCode) {
            res.status(err.statusCode).json({ error: err.code, message: err.message });
        }
        else {
            res.status(500).json({ error: "ServerError", message: err.message || "Failed to process order" });
        }
    }
});
// ─── POST /api/marketplace/checkout ───────────────────────────────────────────
/**
 * Place a cart of shop items. The price is paid in credits only, at ₹8 per credit.
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
    const { items, couponCode, address } = req.body;
    const cleanAddress = () => {
        const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
        const saved = {
            fullName: text(address?.fullName, 80),
            phoneNumber: text(address?.phoneNumber, 15),
            flatHouse: text(address?.flatHouse, 120),
            areaStreet: text(address?.areaStreet, 160),
            landmark: text(address?.landmark, 120),
            city: text(address?.city, 80),
            state: text(address?.state, 80),
            pincode: text(address?.pincode, 10),
        };
        if (!saved.fullName || !saved.flatHouse || !saved.city || !saved.pincode) {
            throw (0, errorHandler_1.createError)("Add a delivery address before checkout.", 400, "AddressRequired");
        }
        return saved;
    };
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
            const delivery = cleanAddress();
            const creditsNeeded = (0, marketplacePay_1.creditsForMarketplacePaise)(totalPaise);
            const currentWallet = await tx.creditWallet.findUnique({ where: { userId: req.dbUserId } });
            if (!currentWallet)
                throw (0, errorHandler_1.createError)("Wallet not found.", 404, "WalletNotFound");
            if (currentWallet.balance < creditsNeeded) {
                throw (0, errorHandler_1.createError)(`This order is ₹${Math.round(totalPaise / 100)} and costs ${creditsNeeded} credits (1 credit = ₹${marketplacePay_1.MARKETPLACE_CREDIT_INR}). You have ${currentWallet.balance} credits.`, 400, "InsufficientCredits");
            }
            const wallet = await (0, wallet_1.decrementCredits)(tx, req.dbUserId, creditsNeeded);
            if (creditsNeeded > 0) {
                const names = itemRecords.map((record) => `${record.quantity}x ${record.item.title}`).join(", ");
                await tx.creditTransaction.create({
                    data: {
                        userId: req.dbUserId,
                        walletId: wallet.id,
                        type: "MARKETPLACE_SPEND",
                        amount: -creditsNeeded,
                        balanceAfter: wallet.balance,
                        description: `Shop order · ₹${Math.round(totalPaise / 100)} · ${creditsNeeded} credits · ${names}`,
                    },
                });
            }
            const grossSum = itemRecords.reduce((sum, record) => sum + record.item.pricePaise * record.quantity, 0) || 1;
            let paiseLeft = totalPaise;
            let creditsLeft = creditsNeeded;
            const addressJson = JSON.stringify(delivery);
            const orders = [];
            for (let index = 0; index < itemRecords.length; index += 1) {
                const record = itemRecords[index];
                const last = index === itemRecords.length - 1;
                const gross = record.item.pricePaise * record.quantity;
                const linePaise = last ? paiseLeft : Math.min(paiseLeft, Math.round(totalPaise * (gross / grossSum)));
                const lineCredits = last ? creditsLeft : (totalPaise === 0 ? 0 : Math.min(creditsLeft, Math.round(creditsNeeded * (linePaise / totalPaise))));
                paiseLeft -= linePaise;
                creditsLeft -= lineCredits;
                orders.push(await tx.marketplaceOrder.create({
                    data: {
                        userId: req.dbUserId,
                        itemId: record.item.id,
                        quantity: record.quantity,
                        totalPaise: linePaise,
                        creditsSpent: lineCredits,
                        selectedSize: record.selectedSize,
                        selectedColor: record.selectedColor,
                        status: "PLACED",
                        addressJson,
                    },
                    include: { item: true },
                }));
            }
            return {
                orders,
                paymentBreakdown: {
                    totalPaise,
                    inrPaiseUsed: 0,
                    creditsUsed: creditsNeeded,
                    creditValueInr: marketplacePay_1.MARKETPLACE_CREDIT_INR,
                    creditsPaiseUsed: creditsNeeded * marketplacePay_1.MARKETPLACE_CREDIT_INR * 100,
                    onlinePaidPaise: 0,
                    newCreditBalance: wallet.balance,
                },
            };
        });
        res.status(201).json({
            success: true,
            orders: result.orders.map((order) => ({ ...order, item: (0, marketplaceItem_1.presentMarketplaceItem)(order.item) })),
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