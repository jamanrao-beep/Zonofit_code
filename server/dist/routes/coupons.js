"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ─── GET /api/coupons/validate ────────────────────────────────────────────────
/**
 * Validates a marketing coupon by its code.
 * Query Params: ?code=STRING
 */
router.get("/validate", auth_1.requireAuth, async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) {
            res.status(400).json({ error: "ValidationError", message: "Coupon code is required" });
            return;
        }
        const coupon = await prisma_1.default.marketingCoupon.findUnique({
            where: { code: code.toUpperCase() }
        });
        if (!coupon) {
            res.status(404).json({ error: "NotFound", message: "Invalid coupon code" });
            return;
        }
        if (!coupon.isActive) {
            res.status(400).json({ error: "InvalidCoupon", message: "This coupon is no longer active" });
            return;
        }
        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            res.status(400).json({ error: "InvalidCoupon", message: "This coupon has expired" });
            return;
        }
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
            res.status(400).json({ error: "InvalidCoupon", message: "This coupon usage limit has been reached" });
            return;
        }
        res.json({
            success: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
            }
        });
    }
    catch (err) {
        res.status(500).json({ error: "ServerError", message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=coupons.js.map