"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
exports.sendPushNotificationToMany = sendPushNotificationToMany;
const expo_server_sdk_1 = require("expo-server-sdk");
const prisma_1 = __importDefault(require("../lib/prisma"));
// Create a new Expo SDK client
// optionally providing an access token if you have enabled push security
const expo = new expo_server_sdk_1.Expo();
async function sendPushNotification(userId, title, body, data) {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { expoPushToken: true },
        });
        if (!user || !user.expoPushToken) {
            console.log(`[PushService] User ${userId} has no push token.`);
            // Save notification to DB anyway so they can see it in app
            await saveNotification(userId, title, body);
            return;
        }
        if (!expo_server_sdk_1.Expo.isExpoPushToken(user.expoPushToken)) {
            console.error(`[PushService] Push token ${user.expoPushToken} is not a valid Expo push token`);
            return;
        }
        const messages = [
            {
                to: user.expoPushToken,
                sound: "default",
                title,
                body,
                data: data || {},
            },
        ];
        // The Expo push service accepts batches of notifications so
        // that you don't need to send 1000 requests to send 1000 notifications. We
        // recommend you batch your notifications to reduce the number of requests
        // and to compress them (notifications with similar content will get
        // compressed).
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log("[PushService] Ticket chunk:", ticketChunk);
            }
            catch (error) {
                console.error("[PushService] Error sending chunk:", error);
            }
        }
        // Save to DB
        await saveNotification(userId, title, body);
    }
    catch (error) {
        console.error(`[PushService] Failed to send notification to user ${userId}:`, error);
    }
}
async function sendPushNotificationToMany(userIds, title, body, data) {
    try {
        const users = await prisma_1.default.user.findMany({
            where: { id: { in: userIds }, expoPushToken: { not: null } },
            select: { id: true, expoPushToken: true },
        });
        const messages = [];
        for (const user of users) {
            if (user.expoPushToken && expo_server_sdk_1.Expo.isExpoPushToken(user.expoPushToken)) {
                messages.push({
                    to: user.expoPushToken,
                    sound: "default",
                    title,
                    body,
                    data: data || {},
                });
            }
            // Save to DB
            await saveNotification(user.id, title, body);
        }
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log("[PushService] Ticket chunk:", ticketChunk);
            }
            catch (error) {
                console.error("[PushService] Error sending chunk:", error);
            }
        }
    }
    catch (error) {
        console.error(`[PushService] Failed to send broadcast notification:`, error);
    }
}
async function saveNotification(userId, title, body) {
    try {
        await prisma_1.default.notification.create({
            data: {
                userId,
                title,
                body,
                type: "INFO",
            },
        });
    }
    catch (err) {
        console.error("[PushService] Failed to save notification to DB:", err);
    }
}
//# sourceMappingURL=notifications.js.map