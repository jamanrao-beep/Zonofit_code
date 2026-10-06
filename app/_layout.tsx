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
  const { isLoaded, isSignedIn, token } = useAuthStore();
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
    const inAuthGroup = firstSegment === "(auth)";
    const inOnboarding = firstSegment === "onboarding";
    const inGuestExpired = firstSegment === "guest-expired";
    const inIntro = firstSegment === "intro";
    // segments is empty ([]) when we are on the root index screen (our splash)
    const isOnRoot = (segments as string[]).length === 0;

    const isViewingOnboardingGym = useAuthStore.getState().isViewingOnboardingGym;

    // Don't redirect away from the animated splash screen, onboarding, or intro screens.
    // index.tsx handles its own navigation after the animation finishes.
    if (isOnRoot || inOnboarding || isViewingOnboardingGym || inIntro) return;

    if (isGuest && isGuestExpired) {
      if (!inGuestExpired) {
        router.replace("/guest-expired" as any);
      }
      return;
    }

    if (!isSignedIn && !isGuest && !inAuthGroup && !inGuestExpired) {
      router.replace("/(auth)/create-account" as any);
    } else if (isSignedIn && !isGuest && inAuthGroup) {
      // Only redirect fully signed-in users away from auth pages.
      // Guests navigating to auth (to create an account) should NOT be redirected back.
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn, isGuest, isGuestExpired, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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