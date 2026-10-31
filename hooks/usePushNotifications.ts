import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { isRunningInExpoGo } from "expo";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { showInAppNotice } from "@/store/useInAppNoticeStore";

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: unknown | null;
  error: string | null;
}

type NotificationModule = {
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner: boolean;
      shouldShowList: boolean;
    }>;
  }) => void;
  setNotificationChannelAsync: (id: string, channel: Record<string, unknown>) => Promise<void>;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (options: { projectId?: string }) => Promise<{ data?: string }>;
  addNotificationReceivedListener: (listener: (notification: ReceivedNotification) => void) => { remove: () => void };
  addNotificationResponseReceivedListener: (listener: (response: NotificationResponseLike) => void) => { remove: () => void };
  getLastNotificationResponseAsync: () => Promise<NotificationResponseLike | null>;
  AndroidImportance: { MAX: number };
  AndroidNotificationVisibility: { PUBLIC: number };
};

type ReceivedNotification = {
  request?: { content?: { title?: string | null; body?: string | null } };
};

type NotificationResponseLike = {
  notification?: { date?: number; request?: { identifier?: string } };
};

const handledResponses = new Set<string>();

/**
 * Expo Go SDK 53+ prints a warning as soon as this package is imported, and
 * on Android it throws if a remote push token is requested. Never load it there.
 * A development or store build still loads it and registers the real token.
 */
function loadNotifications(): NotificationModule | null {
  if (Platform.OS === "web" || isRunningInExpoGo()) return null;
  try {
    return require("expo-notifications") as NotificationModule;
  } catch {
    return null;
  }
}

function responseIsFresh(response: NotificationResponseLike | null) {
  const date = response?.notification?.date;
  if (typeof date !== "number") return false;
  const ms = date < 1e12 ? date * 1000 : date;
  return Date.now() - ms < 60_000;
}

function responseKey(response: NotificationResponseLike | null) {
  return response?.notification?.request?.identifier ?? "";
}

export function usePushNotifications(): PushNotificationState {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const seenNoticeId = useRef<string | null>(null);
  const primed = useRef(false);
  const pushToken = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const Notifications = loadNotifications();
    let received: { remove: () => void } | null = null;
    let response: { remove: () => void } | null = null;

    const openNotifications = () => {
      router.push("/notifications" as never);
    };

    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          // The in-app card covers the foreground. The system banner is for
          // when ZonoFit is not the front app, and for the phone lock screen.
          shouldShowAlert: false,
          shouldShowBanner: false,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      registerForPushNotificationsAsync(Notifications)
        .then(async (nextToken) => {
          if (cancelled || !nextToken) return;
          pushToken.current = nextToken;
          const authToken = useAuthStore.getState().token;
          if (authToken) await sendTokenToBackend(nextToken, authToken);
        })
        .catch(() => {
          // Permission denied or no device token. The in-app card still works.
        });

      received = Notifications.addNotificationReceivedListener((notification) => {
        const title = notification.request?.content?.title?.trim();
        const body = notification.request?.content?.body?.trim();
        if (title && body) showInAppNotice({ title, body });
      });

      response = Notifications.addNotificationResponseReceivedListener((tap) => {
        const key = responseKey(tap);
        if (key) handledResponses.add(key);
        openNotifications();
      });

      Notifications.getLastNotificationResponseAsync()
        .then((last) => {
          if (cancelled || !responseIsFresh(last)) return;
          const key = responseKey(last);
          if (key && handledResponses.has(key)) return;
          if (key) handledResponses.add(key);
          openNotifications();
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      received?.remove();
      response?.remove();
    };
  }, [router]);

  useEffect(() => {
    const saved = pushToken.current;
    if (saved && token) {
      sendTokenToBackend(saved, token).catch(() => undefined);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      primed.current = false;
      seenNoticeId.current = null;
      return;
    }

    let cancelled = false;

    const lookForNewNotice = async () => {
      try {
        const data = await apiFetch("/api/users/notifications", { token, silent: true });
        const list = Array.isArray(data?.notifications) ? data.notifications : [];
        const newest = list[0] as { id?: string; title?: string; body?: string; isRead?: boolean } | undefined;
        if (!newest?.id || cancelled) return;
        if (!primed.current) {
          primed.current = true;
          seenNoticeId.current = newest.id;
          return;
        }
        if (newest.id !== seenNoticeId.current && newest.isRead === false && newest.title && newest.body) {
          showInAppNotice({ title: newest.title, body: newest.body });
        }
        seenNoticeId.current = newest.id;
      } catch {
        // The banner is optional when the phone is offline.
      }
    };

    lookForNewNotice();
    const timer = setInterval(lookForNewNotice, 30000);
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") lookForNewNotice();
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      appState.remove();
    };
  }, [token]);

  return { expoPushToken: pushToken.current, notification: null, error: null };
}

async function registerForPushNotificationsAsync(Notifications: NotificationModule) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "ZonoFit",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1F7A3F",
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data ?? null;
}

async function sendTokenToBackend(pushToken: string, authToken: string) {
  await apiFetch("/api/users/me", {
    method: "PATCH",
    token: authToken,
    silent: true,
    body: JSON.stringify({ expoPushToken: pushToken }),
  });
}
