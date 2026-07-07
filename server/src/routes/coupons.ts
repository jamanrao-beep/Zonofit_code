import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── GET /api/coupons/validate ────────────────────────────────────────────────
/**
 * Validates a marketing coupon by its code.
 * Query Params: ?code=STRING
 */
router.get("/validate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string;
    
    if (!code) {
      res.status(400).json({ error: "ValidationError", message: "Coupon code is required" });
      return;
    }

    const coupon = await prisma.marketingCoupon.findUnique({
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
  } catch (err: any) {
    res.status(500).json({ error: "ServerError", message: err.message });
  }
});

export default router;
