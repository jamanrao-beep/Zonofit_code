import cron from "node-cron";
import { Expo } from "expo-server-sdk";
import prisma from "../lib/prisma";

const expo = new Expo();

export function initCronJobs() {
  console.log("Initializing cron jobs...");

  // Run every day at midnight (0 0 * * *)
  cron.schedule("0 0 * * *", async () => {
    console.log("[CRON] Running daily expiry checks...");
    try {
      await processMembershipExpiries();
      await processCashExpiries();
      console.log("[CRON] Daily checks completed successfully.");
    } catch (err) {
      console.error("[CRON] Error running daily checks:", err);
    }
  });
}

async function sendPushNotification(userId: string, title: string, body: string, data = {}) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) {
      return;
    }

    const messages = [{
      to: user.expoPushToken,
      sound: 'default' as const,
      title,
      body,
      data,
    }];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (error) {
    console.error("Error sending push notification to", userId, error);
  }
}

async function createNotification(userId: string, title: string, body: string, type: string) {
  // Save to database
  await (prisma as any).notification.create({
    data: { userId, title, body, type }
  });
  // Push to device
  await sendPushNotification(userId, title, body, { type });
}

async function processMembershipExpiries() {
  const now = new Date();
  
  // 1. Notify users whose membership expires in 3 days
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);
  
  const upcomingExpiries = await prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      endDate: {
        gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
        lt: new Date(threeDaysFromNow.setHours(23, 59, 59, 999))
      }
    }
  });

  for (const membership of upcomingExpiries) {
    await createNotification(
      membership.userId,
      "Membership Expiring Soon",
      "Your gym membership expires in 3 days! Any unused credits will be automatically converted to cash.",
      "WARNING"
    );
  }

  // 2. Process memberships that expired today
  const expiredMemberships = await prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      endDate: {
        lt: now
      }
    }
  });

  for (const membership of expiredMemberships) {
    let converted = false;
    let creditsToConvert = 0;
    let cashToAddPaise = 0;

    await prisma.$transaction(async (tx) => {
      // Mark membership as expired
      await tx.membership.update({
        where: { id: membership.id },
        data: { status: "EXPIRED" }
      });

      // Find wallet
      const wallet = await tx.creditWallet.findUnique({
        where: { userId: membership.userId }
      });

      if (wallet && wallet.balance > 0) {
        converted = true;
        creditsToConvert = wallet.balance;
        cashToAddPaise = creditsToConvert * 8 * 100; // ₹8 per credit
        
        const cashExpiry = new Date();
        cashExpiry.setDate(cashExpiry.getDate() + 15); // Expires in 15 days

        // Update wallet: clear credits, add cash, set expiry
        await (tx as any).creditWallet.update({
          where: { id: wallet.id },
          data: {
            balance: 0,
            convertibleCashBalanceInPaise: { increment: cashToAddPaise },
            cashExpiryDate: cashExpiry
          }
        });

        // Create transaction record
        await tx.creditTransaction.create({
          data: {
            userId: membership.userId,
            walletId: wallet.id,
            type: "CONVERSION",
            amount: -creditsToConvert,
            balanceAfter: 0,
            description: `Auto-converted ${creditsToConvert} credits to ₹${cashToAddPaise/100} cash on membership expiry.`
          }
        });
      }
    });

    if (converted) {
      await createNotification(
        membership.userId,
        "Credits Converted",
        `Your membership expired. ${creditsToConvert} credits were converted to ₹${cashToAddPaise/100} cash. This cash will expire in 15 days.`,
        "INFO"
      );
    }
  }
}

async function processCashExpiries() {
  const now = new Date();

  // 1. Notify users whose cash expires in 3 days
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const upcomingCashExpiries = await (prisma as any).creditWallet.findMany({
    where: {
      convertibleCashBalanceInPaise: { gt: 0 },
      cashExpiryDate: {
        gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
        lt: new Date(threeDaysFromNow.setHours(23, 59, 59, 999))
      }
    }
  });

  for (const wallet of upcomingCashExpiries) {
    await createNotification(
      wallet.userId,
      "Cash Expiring Soon",
      `Your converted cash balance of ₹${wallet.convertibleCashBalanceInPaise/100} will expire in 3 days!`,
      "WARNING"
    );
  }

  // 2. Process cash that expired today
  const expiredCashWallets = await (prisma as any).creditWallet.findMany({
    where: {
      convertibleCashBalanceInPaise: { gt: 0 },
      cashExpiryDate: {
        lt: now
      }
    }
  });

  for (const wallet of expiredCashWallets) {
    let expiredAmountPaise = wallet.convertibleCashBalanceInPaise;
    await prisma.$transaction(async (tx) => {
      // Zero out cash and remove expiry date
      await (tx as any).creditWallet.update({
        where: { id: wallet.id },
        data: {
          convertibleCashBalanceInPaise: 0,
          cashExpiryDate: null
        }
      });
    });

    await createNotification(
      wallet.userId,
      "Cash Expired",
      `Your converted cash balance of ₹${expiredAmountPaise/100} has expired and been removed from your wallet.`,
      "INFO"
    );
  }
}
