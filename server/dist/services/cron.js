"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = initCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const expo_server_sdk_1 = require("expo-server-sdk");
const otpStore_1 = require("../lib/otpStore");
const rateLimit_1 = require("../lib/rateLimit");
const prisma_1 = __importDefault(require("../lib/prisma"));
const settings_1 = require("./settings");
const expo = new expo_server_sdk_1.Expo();
function initCronJobs() {
    console.log("Initializing cron jobs...");
    // Drop email and phone codes 10 minutes after they expire, so unused rows do not stay.
    node_cron_1.default.schedule("*/10 * * * *", async () => {
        try {
            await (0, otpStore_1.purgeStaleOtps)();
            await (0, rateLimit_1.purgeExpiredRateLimits)();
        }
        catch (err) {
            console.error("[CRON] Could not clear old verification codes:", err);
        }
    });
    // Run every day at midnight (0 0 * * *)
    node_cron_1.default.schedule("0 0 * * *", async () => {
        console.log("[CRON] Running daily expiry checks...");
        try {
            await processMembershipExpiries();
            await processCashExpiries();
            await processGymPlanMonthlyCredits();
            console.log("[CRON] Daily checks completed successfully.");
        }
        catch (err) {
            console.error("[CRON] Error running daily checks:", err);
        }
    });
}
async function sendPushNotification(userId, title, body, data = {}) {
    try {
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user?.expoPushToken || !expo_server_sdk_1.Expo.isExpoPushToken(user.expoPushToken)) {
            return;
        }
        const messages = [{
                to: user.expoPushToken,
                sound: 'default',
                title,
                body,
                data,
            }];
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
        }
    }
    catch (error) {
        console.error("Error sending push notification to", userId, error);
    }
}
async function createNotification(userId, title, body, type) {
    // Save to database
    await prisma_1.default.notification.create({
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
    const upcomingExpiries = await prisma_1.default.membership.findMany({
        where: {
            status: "ACTIVE",
            endDate: {
                gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
                lt: new Date(threeDaysFromNow.setHours(23, 59, 59, 999))
            }
        }
    });
    for (const membership of upcomingExpiries) {
        await createNotification(membership.userId, "Membership Expiring Soon", "Your gym membership expires in 3 days! Any unused credits will be automatically converted to cash.", "WARNING");
    }
    // 2. Process memberships that expired today
    const expiredMemberships = await prisma_1.default.membership.findMany({
        where: {
            status: "ACTIVE",
            endDate: {
                lt: now
            }
        }
    });
    const settings = await (0, settings_1.getSystemSettings)();
    for (const membership of expiredMemberships) {
        let converted = false;
        let creditsToConvert = 0;
        let cashToAddPaise = 0;
        await prisma_1.default.$transaction(async (tx) => {
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
                cashToAddPaise = creditsToConvert * settings.creditConversionValue * 100;
                const cashExpiry = new Date();
                cashExpiry.setDate(cashExpiry.getDate() + settings.cashExpiryDays);
                // Update wallet: clear credits, add cash, set expiry
                await tx.creditWallet.update({
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
                        description: `Auto-converted ${creditsToConvert} credits to ₹${cashToAddPaise / 100} cash on membership expiry.`
                    }
                });
            }
        });
        if (converted) {
            await createNotification(membership.userId, "Credits Converted", `Your membership expired. ${creditsToConvert} credits were converted to ₹${cashToAddPaise / 100} cash. This cash will expire in ${settings.cashExpiryDays} days.`, "INFO");
        }
    }
}
async function processCashExpiries() {
    const now = new Date();
    // 1. Notify users whose cash expires in 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    const upcomingCashExpiries = await prisma_1.default.creditWallet.findMany({
        where: {
            convertibleCashBalanceInPaise: { gt: 0 },
            cashExpiryDate: {
                gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
                lt: new Date(threeDaysFromNow.setHours(23, 59, 59, 999))
            }
        }
    });
    for (const wallet of upcomingCashExpiries) {
        await createNotification(wallet.userId, "Cash Expiring Soon", `Your converted cash balance of ₹${wallet.convertibleCashBalanceInPaise / 100} will expire in 3 days!`, "WARNING");
    }
    // 2. Process cash that expired today
    const expiredCashWallets = await prisma_1.default.creditWallet.findMany({
        where: {
            convertibleCashBalanceInPaise: { gt: 0 },
            cashExpiryDate: {
                lt: now
            }
        }
    });
    for (const wallet of expiredCashWallets) {
        let expiredAmountPaise = wallet.convertibleCashBalanceInPaise;
        await prisma_1.default.$transaction(async (tx) => {
            // Zero out cash and remove expiry date
            await tx.creditWallet.update({
                where: { id: wallet.id },
                data: {
                    convertibleCashBalanceInPaise: 0,
                    cashExpiryDate: null
                }
            });
        });
        await createNotification(wallet.userId, "Cash Expired", `Your converted cash balance of ₹${expiredAmountPaise / 100} has expired and been removed from your wallet.`, "INFO");
    }
}
async function processGymPlanMonthlyCredits() {
    const now = new Date();
    // Find all ACTIVE memberships that have a gymPlanId
    const activeGymMemberships = await prisma_1.default.membership.findMany({
        where: {
            status: "ACTIVE",
            gymPlanId: { not: null },
        },
        include: {
            gymPlan: {
                include: { gym: true }
            }
        }
    });
    for (const membership of activeGymMemberships) {
        if (!membership.gymPlan || !membership.gymPlan.gym)
            continue;
        // Check if today is the renewal day (e.g. same day of the month as startDate)
        // For simplicity, we just check if it's the exact day of the month.
        // This isn't perfect for Feb 29th, but it suffices for this logic.
        const isRenewalDay = membership.startDate.getDate() === now.getDate() &&
            membership.startDate.getMonth() !== now.getMonth();
        if (isRenewalDay) {
            // Calculate months active
            const diffTime = Math.abs(now.getTime() - membership.startDate.getTime());
            const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
            const gymPlan = membership.gymPlan;
            if (!gymPlan || !gymPlan.gym)
                continue;
            const gym = gymPlan.gym;
            const cutDays = diffMonths <= gymPlan.initialPeriodMonths ? gymPlan.initialCutoffDays : gymPlan.subsequentCutoffDays;
            const netCreditDays = 30 - cutDays;
            const creditsToAdd = netCreditDays * gym.creditCost;
            if (creditsToAdd > 0) {
                await prisma_1.default.$transaction(async (tx) => {
                    const wallet = await tx.creditWallet.update({
                        where: { userId: membership.userId },
                        data: { balance: { increment: creditsToAdd } }
                    });
                    await tx.creditTransaction.create({
                        data: {
                            userId: membership.userId,
                            walletId: wallet.id,
                            type: "PURCHASE",
                            amount: creditsToAdd,
                            balanceAfter: wallet.balance,
                            description: `Monthly gym plan credits deposited for ${gymPlan.name}.`
                        }
                    });
                });
                await createNotification(membership.userId, "Monthly Credits Deposited", `Your monthly gym plan credits (${creditsToAdd}) have been deposited!`, "INFO");
            }
        }
    }
}
//# sourceMappingURL=cron.js.map