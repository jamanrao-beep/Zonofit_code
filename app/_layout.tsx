import { tokenCache } from "@/lib/clerk";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { useRouter, useSegments, Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "../global.css";

// Keep the native splash visible until our animated splash takes over
SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === "(auth)";
    const inOnboarding = firstSegment === "onboarding";
    // segments is empty ([]) when we are on the root index screen (our splash)
    const isOnRoot = (segments as string[]).length === 0;

    // Don't redirect away from the animated splash screen or the onboarding screen.
    // index.tsx handles its own navigation after the animation finishes.
    if (isOnRoot || inOnboarding) return;

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/sign-in" as any);
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <AuthGate />
    </ClerkProvider>
  );
}