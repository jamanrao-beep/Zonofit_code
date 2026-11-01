import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

// Exactly 3.0 seconds duration for the cropped starting animation
const SPLASH_DURATION_MS = 3000;

export default function SplashAnimationScreen() {
  const { isLoaded, isSignedIn } = useAuthStore();
  const router = useRouter();
  const mountTime = useRef(Date.now());
  const isSignedInRef = useRef(isSignedIn);

  useEffect(() => {
    isSignedInRef.current = isSignedIn;
  }, [isSignedIn]);

  useEffect(() => {
    // Hide the native static splash immediately so the animated splash video displays
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const elapsed = Date.now() - mountTime.current;
    const delay = Math.max(0, SPLASH_DURATION_MS - elapsed);

    const timer = setTimeout(async () => {
      const { isOnboarded, user } = useAuthStore.getState();
      if (isSignedInRef.current) {
        if (isOnboarded) {
          router.replace("/(tabs)");
          return;
        } else {
          const phoneDigits = (user?.phone || "").replace(/\D/g, "");
          const needsProfile = phoneDigits.length < 10 || !user?.username || user.username === "ZonoFit Member" || user.username === "Google User";
          if (needsProfile) {
            router.replace("/(auth)/create-account" as any);
          } else {
            router.replace("/onboarding/select-city" as any);
          }
          return;
        }
      }

      const { initializeGuest } = useGuestStore.getState();
      const guestStatus = await initializeGuest();

      if (guestStatus.isGuest) {
        if (guestStatus.isExpired) {
          router.replace("/guest-expired" as any);
        } else {
          router.replace("/(tabs)");
        }
      } else {
        router.replace("/intro" as any);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  return (
    <View style={styles.container}>
      <ExpoImage
        source={require("@/assets/splash_animation.webp")}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        priority="high"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
});
