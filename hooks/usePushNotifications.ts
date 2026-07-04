import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.log("expo-notifications is not available in Expo Go SDK 53+");
}

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: any | null;
  error: string | null;
}

export function usePushNotifications(): PushNotificationState {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const { token } = useAuthStore();

  useEffect(() => {
    if (!Notifications) return;

    registerForPushNotificationsAsync()
      .then(pushToken => {
        if (pushToken) {
          setExpoPushToken(pushToken);
          // Send token to backend if logged in
          if (token) {
            sendTokenToBackend(pushToken, token).catch(e => 
              console.error("Failed to send push token to backend", e)
            );
          }
        }
      })
      .catch(e => setError(e.message));

    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      // Handle notification tap
      console.log("Notification tapped:", response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [token]);

  return { expoPushToken, notification, error };
}

async function registerForPushNotificationsAsync() {
  if (!Notifications) {
    console.log("Push notifications not supported in this environment (Expo Go SDK 53+)");
    return null;
  }

  let token;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      throw new Error('Failed to get push token for push notification!');
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
    token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
  } else {
    // throw new Error('Must use physical device for Push Notifications');
    console.log("Must use physical device for Push Notifications");
  }

  return token?.data;
}

async function sendTokenToBackend(pushToken: string, authToken: string) {
  try {
    await apiFetch("/api/users/me", {
      method: "PATCH",
      token: authToken,
      body: JSON.stringify({ expoPushToken: pushToken }),
    });
  } catch (error) {
    console.error("Error saving push token to backend:", error);
  }
}
