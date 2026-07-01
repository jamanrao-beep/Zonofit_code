import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
}

export function usePushNotifications(): PushNotificationState {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  const { token } = useAuthStore();

  useEffect(() => {
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

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification tap
      console.log("Notification tapped:", response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [token]);

  return { expoPushToken, notification, error };
}

async function registerForPushNotificationsAsync() {
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
