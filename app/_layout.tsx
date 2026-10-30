import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useBookingStore } from "@/store/useBookingStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useRouter, useSegments, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "../global.css";

// Keep the native splash visible until our animated splash takes over
SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { isLoaded, isSignedIn, isOnboarded, token } = useAuthStore();
  const { isGuest, isExpired: isGuestExpired } = useGuestStore();
  const segments = useSegments();
  const router = useRouter();

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
    const secondSegment = segments[1] as string | undefined;
    const inAuthGroup = firstSegment === "(auth)";
    const inOnboarding = firstSegment === "onboarding";
    const inGuestExpired = firstSegment === "guest-expired";
    const inIntro = firstSegment === "intro";
    const inTabs = firstSegment === "(tabs)";
    // segments is empty ([]) when we are on the root index screen (our splash)
    const isOnRoot = (segments as string[]).length === 0;

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="booking-pass" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    useAuthStore.getState().initialize();
    useGuestStore.getState().initializeGuest();
  }, []);

  return <AuthGate />;
}