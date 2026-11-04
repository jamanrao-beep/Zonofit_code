import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useBookingStore } from "@/store/useBookingStore";
import { useGuestStore } from "@/store/useGuestStore";
import { InAppNoticeBanner } from "@/components/InAppNoticeBanner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useRouter, useSegments, Stack } from "expo-router";
import { isRunningInExpoGo } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, View } from "react-native";
import "../global.css";

// Expo Go prints this the moment expo-notifications is imported, and Android
// Expo Go throws if a remote token is requested. The hook never loads that
// module in Expo Go. This keeps a stray import from covering the screen.
if (isRunningInExpoGo()) {
  LogBox.ignoreLogs([
    "expo-notifications",
    "not fully supported in Expo Go",
    "was removed from Expo Go",
  ]);
}

// Keep the native splash visible until our animated splash takes over
SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { isLoaded, isSignedIn, isOnboarded, token } = useAuthStore();
  const { isGuest, isExpired: isGuestExpired } = useGuestStore();
  const segments = useSegments();
  const router = useRouter();
  usePushNotifications();

  useEffect(() => {
    if (isSignedIn && token) {
      useUserStore.getState().fetchProfile(token);
      useCreditsStore.getState().fetchWallet(token);
      useBookingStore.getState().fetchBookings(token);
    }
  }, [isSignedIn, token]);

  useEffect(() => {
    if (!isLoaded) return;

    const firstSegment = segments[0] as string | undefined;
    const secondSegment = (segments as string[])[1];
    const inAuthGroup = firstSegment === "(auth)";
    const inOnboarding = firstSegment === "onboarding";
    const inGuestExpired = firstSegment === "guest-expired";
    const inIntro = firstSegment === "intro";
    const inTabs = firstSegment === "(tabs)";
    // segments is empty ([]) or has "index" when on the root starting animation
    const isOnRoot = (segments as string[]).length === 0 || firstSegment === "index" || !firstSegment;

    const isViewingOnboardingGym = useAuthStore.getState().isViewingOnboardingGym;

    // Don't redirect away from the animated splash screen, onboarding, gym preview during onboarding, or intro screens.
    if (isOnRoot || inOnboarding || isViewingOnboardingGym || inIntro) return;

    if (isGuest && isGuestExpired) {
      if (!inGuestExpired) {
        router.replace("/guest-expired" as any);
      }
      return;
    }

    if (!isSignedIn && !isGuest && !inAuthGroup && !inGuestExpired) {
      router.replace("/(auth)/create-account" as any);
    } else if (isSignedIn && !isGuest) {
      const user = useAuthStore.getState().user;
      const hasPhone = !!(user?.phone && user.phone.trim().length >= 10);

      if (isOnboarded) {
        // Stay on sign-in long enough for the "You're signed in" step.
        // Continue on that screen sends them into the app.
        if (inAuthGroup && secondSegment !== "verify-number") {
          router.replace("/(tabs)");
        }
        return;
      }

      // Join collects mobile, email, name, and date of birth on create-account.
      // Leave that screen, profile details, and phone sign-in alone.
      if (inAuthGroup && (secondSegment === "create-account" || secondSegment === "profile-details" || secondSegment === "verify-number")) {
        return;
      }

      // Mobile number is strictly mandatory before the rest of the app
      if (!hasPhone) {
        router.replace("/(auth)/create-account" as any);
        return;
      }

      // Signed in with a verified phone, but profile/gym onboarding not finished
      if (inTabs) {
        const needsProfile = !user?.username || user.username === "ZonoFit Member" || user.username === "Google User";
        if (needsProfile) {
          router.replace("/(auth)/create-account" as any);
        } else {
          router.replace("/onboarding/select-city" as any);
        }
      }
    }
  }, [isLoaded, isSignedIn, isOnboarded, isGuest, isGuestExpired, segments]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="booking-pass" options={{ headerShown: false }} />
      </Stack>
      <InAppNoticeBanner />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    useAuthStore.getState().initialize();
    useGuestStore.getState().initializeGuest();
  }, []);

  return <AuthGate />;
}