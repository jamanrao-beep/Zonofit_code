import { useAuthStore } from "@/store/useAuthStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useUserStore } from "@/store/useUserStore";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

const TOTAL_JOURNEY_MONTHS = 12;
// Total splash sequence duration before smooth fade-out starts
const ANIMATION_HOLD_MS = 2500;
// Smooth fade out duration
const FADE_OUT_DURATION_MS = 380;

export default function SplashAnimationScreen() {
  const { isLoaded, isSignedIn } = useAuthStore();
  const router = useRouter();

  const userMonth = useUserStore((s) => s.currentMonth);
  const membershipCycle = useCreditsStore((s) => s.membershipInfo?.cycleNumber);
  const cycleMonth = Math.max(1, Math.min(TOTAL_JOURNEY_MONTHS, membershipCycle || userMonth || 1));

  // Animation values
  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(0.72)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(14)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dashesOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  // Individual dash animations for sequential filling
  const dashAnims = useMemo(
    () => Array.from({ length: TOTAL_JOURNEY_MONTHS }, () => new Animated.Value(0)),
    []
  );

  const isNavigating = useRef(false);

  useEffect(() => {
    // Hide native splash immediately so the animated splash displays
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Main entrance animation
  useEffect(() => {
    // 1. Icon pop and fade in
    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Text slide up and fade in
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 280);

    // 3. Dashes fade in
    const dashesTimer = setTimeout(() => {
      Animated.timing(dashesOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      // Sequentially illuminate active journey months up to cycleMonth
      const activeDashAnimations = dashAnims.slice(0, cycleMonth).map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 180,
          delay: index * 55,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        })
      );

      Animated.parallel(activeDashAnimations).start(() => {
        // Fade in month label after active dashes illuminate
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }, 550);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(dashesTimer);
    };
  }, [cycleMonth, dashAnims]);

  // Navigate after animation hold + smooth fade out
  useEffect(() => {
    if (!isLoaded) return;

    const navTimer = setTimeout(() => {
      if (isNavigating.current) return;
      isNavigating.current = true;

      // Smooth fade out of the entire splash screen
      Animated.timing(screenFadeAnim, {
        toValue: 0,
        duration: FADE_OUT_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(async () => {
        const { isOnboarded, user, isSignedIn: signedIn } = useAuthStore.getState();

        if (signedIn) {
          if (isOnboarded) {
            router.replace("/(tabs)");
            return;
          } else {
            const phoneDigits = (user?.phone || "").replace(/\D/g, "");
            const needsProfile =
              phoneDigits.length < 10 ||
              !user?.username ||
              user.username === "ZonoFit Member" ||
              user.username === "Google User";
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
      });
    }, ANIMATION_HOLD_MS);

    return () => clearTimeout(navTimer);
  }, [isLoaded, screenFadeAnim, router]);

  return (
    <Animated.View style={[styles.container, { opacity: screenFadeAnim }]}>
      <StatusBar style="dark" />

      <View style={styles.contentWrap}>
        {/* Crisp high-resolution Zonofit app icon squircle */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: iconOpacity,
              transform: [{ scale: iconScale }],
            },
          ]}
        >
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.iconImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Brand name & slogan */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>Zonofit</Text>
          <Text style={styles.brandSubtitle}>Consistency over perfection</Text>
        </Animated.View>

        {/* 12-Month Journey Dash Indicator */}
        <Animated.View style={[styles.journeyContainer, { opacity: dashesOpacity }]}>
          <View style={styles.dashesRow}>
            {dashAnims.map((anim, index) => {
              const isActive = index < cycleMonth;
              const isCurrent = index === cycleMonth - 1;

              const bgInterpolation = anim.interpolate({
                inputRange: [0, 1],
                outputRange: ["#E5E7EB", "#16A34A"],
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.dash,
                    isCurrent && styles.dashCurrent,
                    isActive
                      ? { backgroundColor: bgInterpolation }
                      : { backgroundColor: "#E5E7EB" },
                  ]}
                />
              );
            })}
          </View>

          {/* Current Month of 12 Label */}
          <Animated.View style={{ opacity: labelOpacity }}>
            <Text style={styles.monthLabel}>
              Month {cycleMonth} of {TOTAL_JOURNEY_MONTHS}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 36,
    overflow: "hidden",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: "#FFFFFF",
  },
  iconImage: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    marginTop: 22,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.8,
  },
  brandSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 6,
    letterSpacing: -0.2,
  },
  journeyContainer: {
    alignItems: "center",
    marginTop: 28,
  },
  dashesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dash: {
    width: 17,
    height: 5,
    borderRadius: 3,
  },
  dashCurrent: {
    width: 22,
  },
  monthLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
    letterSpacing: 0.4,
  },
});
