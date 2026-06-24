import { tokenCache } from "@/lib/clerk";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { useRouter, useSegments, Slot } from "expo-router";
import { useEffect } from "react";
import "../global.css";

function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const inAuthGroup = (segments[0] as string) === "(auth)";
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
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!} tokenCache={tokenCache}>
      <AuthGate />
    </ClerkProvider>
  );
}