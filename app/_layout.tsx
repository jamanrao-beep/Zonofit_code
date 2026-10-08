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
      if (isOnboarded) {
        // Fully onboarded user shouldn't be in auth screens
        if (inAuthGroup) {
          router.replace("/(tabs)");
        }
      } else {
        // Signed in but onboarding is NOT completed:
        // Must complete profile details & gym selection before entering tabs!
        if (inTabs) {
          const user = useAuthStore.getState().user;
          const needsProfile = !user?.username || user.username === "ZonoFit Member" || user.username === "Google User";
          if (needsProfile) {
            router.replace("/(auth)/profile-details" as any);
          } else {
            router.replace("/onboarding/select-city" as any);
          }
        } else if (inAuthGroup) {
          // If already signed in, don't let them stay on login / verify screens; forward to profile details
          if (secondSegment === "create-account" || secondSegment === "verify-number") {
            router.replace("/(auth)/profile-details" as any);
          }
          // On profile-details: DO NOT redirect away! Allow them to enter their details.
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