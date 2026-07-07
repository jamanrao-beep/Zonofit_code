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

    const { items } = req.body as { items: { itemId: string; quantity: number }[] };

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

        await tx.creditWallet.update({
          where: { id: wallet.id },
          data: { 
            nonConvertibleCashBalanceInPaise: { decrement: deductNonConvertible },
            convertibleCashBalanceInPaise: { decrement: deductConvertible }
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

        return orders;
      });

      res.status(201).json({
        success: true,
        orders: result,
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
