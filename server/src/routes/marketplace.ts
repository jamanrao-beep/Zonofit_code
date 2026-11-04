import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { marketplaceDiscountPaise } from "../lib/couponMath";
import { presentMarketplaceItem } from "../lib/marketplaceItem";
import { creditsForMarketplacePaise, MARKETPLACE_CREDIT_INR } from "../lib/marketplacePay";
import { decrementCredits } from "../lib/wallet";
import { requireAuth } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();

// ─── GET /api/marketplace/items ───────────────────────────────────────────────
/**
 * Returns all available marketplace items.
 */
router.get("/items", async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await prisma.marketplaceItem.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(items.map((item) => presentMarketplaceItem(item)));
  } catch (err: any) {
    console.error("[marketplace] failed to fetch items:", err?.message || err);
    res.status(500).json({ error: "ServerError", message: "Failed to fetch items." });
  }
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
  res.json(orders.map((order) => ({ ...order, item: presentMarketplaceItem(order.item) })));
});

// ─── POST /api/marketplace/order ──────────────────────────────────────────────
/**
 * Place one shop order. The price is paid in credits only, at ₹8 per credit.
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

    try {
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
      const creditsNeeded = creditsForMarketplacePaise(totalPaise);
      const currentWallet = await tx.creditWallet.findUnique({ where: { userId: req.dbUserId! } });
      if (!currentWallet) throw createError("Wallet not found.", 404, "WalletNotFound");
      if (currentWallet.balance < creditsNeeded) {
        throw createError(
          `This order is ₹${Math.round(totalPaise / 100)} and costs ${creditsNeeded} credits (1 credit = ₹${MARKETPLACE_CREDIT_INR}). You have ${currentWallet.balance} credits.`,
          400,
          "InsufficientCredits",
        );
      }
      const wallet = await decrementCredits(tx, req.dbUserId!, creditsNeeded);
      if (creditsNeeded > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: req.dbUserId!,
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
          userId: req.dbUserId!,
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
      order: { ...result.order, item: presentMarketplaceItem(result.order.item) },
      creditsUsed: result.creditsNeeded,
      newCreditBalance: result.newCreditBalance,
      message: `Ordered ${quantity}x ${result.order.item.title} for ${result.creditsNeeded} credits.`,
    });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.code, message: err.message });
      } else {
        res.status(500).json({ error: "ServerError", message: err.message || "Failed to process order" });
      }
    }
  }
);

// ─── POST /api/marketplace/checkout ───────────────────────────────────────────
/**
 * Place a cart of shop items. The price is paid in credits only, at ₹8 per credit.
 */
router.post(
  "/checkout",
  requireAuth,
  [
    body("items").isArray({ min: 1 }).withMessage("Items must be an array with at least 1 item."),
    body("items.*.itemId").isUUID().withMessage("Valid item ID required."),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1."),
    body("items.*.selectedSize").optional({ nullable: true }).isString().isLength({ max: 80 }),
    body("items.*.selectedColor").optional({ nullable: true }).isString().isLength({ max: 80 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "ValidationError", details: errors.array() });
      return;
    }

    const { items, couponCode, address } = req.body as { 
      items: { itemId: string; quantity: number; selectedSize?: string; selectedColor?: string }[]; 
      couponCode?: string;
      address?: {
        fullName?: string;
        phoneNumber?: string;
        flatHouse?: string;
        areaStreet?: string;
        landmark?: string;
        city?: string;
        state?: string;
        pincode?: string;
      };
    };

    const cleanAddress = () => {
      const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
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
        throw createError("Add a delivery address before checkout.", 400, "AddressRequired");
      }
      return saved;
    };

    const cleanOption = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed ? trimmed.slice(0, 80) : null;
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

          if (!coupon) throw createError("Invalid coupon code", 404, "InvalidCoupon");
          if (!coupon.isActive) throw createError("Coupon is no longer active", 400, "InvalidCoupon");
          if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) throw createError("Coupon expired", 400, "InvalidCoupon");
          if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw createError("Coupon usage limit reached", 400, "InvalidCoupon");
          const discountPaise = marketplaceDiscountPaise(
            coupon.discountType,
            coupon.discountValue,
            totalPaise,
          );
          if (discountPaise === "credits-only") {
            throw createError("This coupon can only be used for gym bookings", 400, "InvalidCoupon");
          }
          if (discountPaise === "unsupported") {
            throw createError("This coupon cannot be used for marketplace checkout.", 400, "InvalidCoupon");
          }
          if (discountPaise <= 0) {
            throw createError("This coupon does not reduce the order total.", 400, "InvalidCoupon");
          }

          totalPaise = Math.max(0, totalPaise - discountPaise);

          await tx.marketingCoupon.update({
            where: { id: coupon.id },
            data: { usageCount: { increment: 1 } }
          });
        }

        const delivery = cleanAddress();
        const creditsNeeded = creditsForMarketplacePaise(totalPaise);
        const currentWallet = await tx.creditWallet.findUnique({ where: { userId: req.dbUserId! } });
        if (!currentWallet) throw createError("Wallet not found.", 404, "WalletNotFound");
        if (currentWallet.balance < creditsNeeded) {
          throw createError(
            `This order is ₹${Math.round(totalPaise / 100)} and costs ${creditsNeeded} credits (1 credit = ₹${MARKETPLACE_CREDIT_INR}). You have ${currentWallet.balance} credits.`,
            400,
            "InsufficientCredits",
          );
        }
        const wallet = await decrementCredits(tx, req.dbUserId!, creditsNeeded);
        if (creditsNeeded > 0) {
          const names = itemRecords.map((record) => `${record.quantity}x ${record.item.title}`).join(", ");
          await tx.creditTransaction.create({
            data: {
              userId: req.dbUserId!,
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
              userId: req.dbUserId!,
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
            creditValueInr: MARKETPLACE_CREDIT_INR,
            creditsPaiseUsed: creditsNeeded * MARKETPLACE_CREDIT_INR * 100,
            onlinePaidPaise: 0,
            newCreditBalance: wallet.balance,
          },
        };
      });

      res.status(201).json({
        success: true,
        orders: result.orders.map((order) => ({ ...order, item: presentMarketplaceItem(order.item) })),
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
