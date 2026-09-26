import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();

// ─── GET /api/marketplace/items ───────────────────────────────────────────────
/**
 * Returns all available marketplace items.
 */
router.get("/items", async (req: Request, res: Response): Promise<void> => {
  const items = await prisma.marketplaceItem.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

// ─── GET /api/marketplace/orders ──────────────────────────────────────────────
/**
 * Returns the user's past marketplace orders.
 */
router.get("/orders", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const orders = await prisma.marketplaceOrder.findMany({
    where: { userId: req.dbUserId! },
    include: { item: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

// ─── POST /api/marketplace/order ──────────────────────────────────────────────
/**
 * Place an order for a marketplace item using converted cash balance.
 */
router.post(
  "/order",
  requireAuth,
  [
    body("itemId").isUUID().withMessage("Valid item ID required."),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { itemId, quantity } = req.body as { itemId: string; quantity: number };

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.marketplaceItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw createError("Item not found.", 404, "ItemNotFound");
      }
      if (!item.inStock) {
        throw createError("Item is out of stock.", 400, "ItemOutOfStock");
      }

      const totalPaise = item.pricePaise * quantity;

      const wallet = await tx.creditWallet.findUnique({
        where: { userId: req.dbUserId! },
      });

      if (!wallet) {
        throw createError("Wallet not found.", 404, "WalletNotFound");
      }

      const totalAvailableCash = wallet.convertibleCashBalanceInPaise + wallet.nonConvertibleCashBalanceInPaise;

      if (totalAvailableCash < totalPaise) {
        throw createError(
          `Insufficient cash balance. You need ₹${totalPaise / 100}, but you have ₹${
            totalAvailableCash / 100
          }. Convert credits or top up cash first.`,
          400,
          "InsufficientCash"
        );
      }

      let remainingToDeduct = totalPaise;
      let deductNonConvertible = 0;
      let deductConvertible = 0;

      if (wallet.nonConvertibleCashBalanceInPaise >= remainingToDeduct) {
        deductNonConvertible = remainingToDeduct;
      } else {
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
          userId: req.dbUserId!,
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
  }
);

// ─── POST /api/marketplace/checkout ───────────────────────────────────────────
/**
 * Place a bulk order for multiple marketplace items using converted cash balance.
 */
router.post(
  "/checkout",
  requireAuth,
  [
    body("items").isArray({ min: 1 }).withMessage("Items must be an array with at least 1 item."),
    body("items.*.itemId").isUUID().withMessage("Valid item ID required."),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { items, couponCode, creditsToUse = 0 } = req.body as { 
      items: { itemId: string; quantity: number }[]; 
      couponCode?: string;
      creditsToUse?: number;
    };

    try {
      const result = await prisma.$transaction(async (tx) => {
        let totalPaise = 0;
        const itemRecords = [];

        for (const orderItem of items) {
          const item = await tx.marketplaceItem.findUnique({
            where: { id: orderItem.itemId },
          });

          if (!item) {
            throw createError(`Item ${orderItem.itemId} not found.`, 404, "ItemNotFound");
          }
          if (!item.inStock) {
            throw createError(`Item ${item.title} is out of stock.`, 400, "ItemOutOfStock");
          }

          totalPaise += item.pricePaise * orderItem.quantity;
          itemRecords.push({ item, quantity: orderItem.quantity });
        }

        // Apply coupon if provided
        if (couponCode) {
          const coupon = await tx.marketingCoupon.findUnique({
            where: { code: couponCode.toUpperCase() }
          });

          if (!coupon) throw createError("Invalid coupon code", 404, "InvalidCoupon");
          if (!coupon.isActive) throw createError("Coupon is no longer active", 400, "InvalidCoupon");
          if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) throw createError("Coupon expired", 400, "InvalidCoupon");
          if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw createError("Coupon usage limit reached", 400, "InvalidCoupon");
          if (coupon.discountType === "CREDITS") throw createError("This coupon can only be used for gym bookings", 400, "InvalidCoupon");

          let discountPaise = 0;
          if (coupon.discountType === "PERCENTAGE") {
            discountPaise = Math.floor(totalPaise * (coupon.discountValue / 100));
          } else if (coupon.discountType === "RUPEES") {
            discountPaise = coupon.discountValue * 100;
          }

          totalPaise = Math.max(0, totalPaise - discountPaise);

          await tx.marketingCoupon.update({
            where: { id: coupon.id },
            data: { usageCount: { increment: 1 } }
          });
        }

        const wallet = await tx.creditWallet.findUnique({
          where: { userId: req.dbUserId! },
        });

        if (!wallet) {
          throw createError("Wallet not found.", 404, "WalletNotFound");
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

        // Deduct INR balance (nonConvertible first, then convertible)
        let remainingInrToDeduct = inrPaiseUsed;
        let deductNonConvertible = 0;
        let deductConvertible = 0;

        if (wallet.nonConvertibleCashBalanceInPaise >= remainingInrToDeduct) {
          deductNonConvertible = remainingInrToDeduct;
        } else {
          deductNonConvertible = wallet.nonConvertibleCashBalanceInPaise;
          deductConvertible = remainingInrToDeduct - deductNonConvertible;
        }

        await tx.creditWallet.update({
          where: { id: wallet.id },
          data: { 
            nonConvertibleCashBalanceInPaise: { decrement: deductNonConvertible },
            convertibleCashBalanceInPaise: { decrement: deductConvertible },
            balance: { decrement: actualCreditsToUse },
          },
        });

        const orders = await Promise.all(
          itemRecords.map(record =>
            tx.marketplaceOrder.create({
              data: {
                userId: req.dbUserId!,
                itemId: record.item.id,
                quantity: record.quantity,
                totalPaise: record.item.pricePaise * record.quantity,
              },
              include: { item: true },
            })
          )
        );

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
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.code, message: err.message });
      } else {
        res.status(500).json({ error: "ServerError", message: err.message || "Failed to process checkout" });
      }
    }
  }
);

export default router;
