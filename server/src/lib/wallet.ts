import { Prisma } from "@prisma/client";
import { createError } from "../middleware/errorHandler";

type Tx = Prisma.TransactionClient;

export async function decrementCredits(tx: Tx, userId: string, credits: number) {
  if (!Number.isInteger(credits) || credits < 0) {
    throw createError("Credit amount must be a whole number.", 400, "InvalidAmount");
  }

  if (credits === 0) {
    const wallet = await tx.creditWallet.findUnique({ where: { userId } });
    if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");
    return wallet;
  }

  const updated = await tx.creditWallet.updateMany({
    where: { userId, balance: { gte: credits } },
    data: { balance: { decrement: credits } },
  });
  if (updated.count !== 1) {
    throw createError("Insufficient credits.", 400, "InsufficientCredits");
  }

  const wallet = await tx.creditWallet.findUnique({ where: { userId } });
  if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");
  return wallet;
}

export async function decrementConvertibleCash(tx: Tx, userId: string, paise: number) {
  if (!Number.isInteger(paise) || paise < 0) {
    throw createError("Cash amount is invalid.", 400, "InvalidAmount");
  }
  if (paise === 0) {
    const wallet = await tx.creditWallet.findUnique({ where: { userId } });
    if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");
    return wallet;
  }

  const updated = await tx.creditWallet.updateMany({
    where: { userId, convertibleCashBalanceInPaise: { gte: paise } },
    data: { convertibleCashBalanceInPaise: { decrement: paise } },
  });
  if (updated.count !== 1) {
    throw createError("Insufficient convertible cash.", 400, "InsufficientCash");
  }
  const wallet = await tx.creditWallet.findUnique({ where: { userId } });
  if (!wallet) throw createError("Wallet not found.", 404, "WalletNotFound");
  return wallet;
}
