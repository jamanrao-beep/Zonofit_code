import { useAuthStore } from "@/store/useAuthStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useUserStore } from "@/store/useUserStore";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const TOTAL_JOURNEY_MONTHS = 12;
// Hold duration so the user fully enjoys the assembled animation
const ANIMATION_HOLD_MS = 2900;
// Smooth fade out duration
const FADE_OUT_DURATION_MS = 380;

export default function SplashAnimationScreen() {
  const { isLoaded } = useAuthStore();
  const router = useRouter();

  const userMonth = useUserStore((s) => s.currentMonth);
  const membershipCycle = useCreditsStore((s) => s.membershipInfo?.cycleNumber);
  const cycleMonth = Math.max(1, Math.min(TOTAL_JOURNEY_MONTHS, membershipCycle || userMonth || 1));

  // Root screen fade out
  const screenFadeAnim = useRef(new Animated.Value(1)).current;

  // Squircle container animations
  const squircleScale = useRef(new Animated.Value(0.78)).current;
  const squircleOpacity = useRef(new Animated.Value(0)).current;

  // Phase 1 -> Phase 2 Logo assembly animations
  // Top slit is visible from start
  const topSlitOpacity = useRef(new Animated.Value(1)).current;
  const topSlitScaleX = useRef(new Animated.Value(0.4)).current;

  // Hook curves and draws in
  const hookOpacity = useRef(new Animated.Value(0)).current;
  const hookScale = useRef(new Animated.Value(0.3)).current;
  const hookTranslateY = useRef(new Animated.Value(-8)).current;

  // Center white dot pops in with spring bounce
  const dotScale = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;

  // Master icon image crossfade for pixel-perfect finishing
  const fullIconOpacity = useRef(new Animated.Value(0)).current;

  // Text animations
  const textTranslateY = useRef(new Animated.Value(14)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Journey Dashes & label
  const dashesOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  // 12 individual dash animations
  const dashAnims = useMemo(
    () => Array.from({ length: TOTAL_JOURNEY_MONTHS }, () => new Animated.Value(0)),
    []
  );

  const isNavigating = useRef(false);

  useEffect(() => {
    // Hide static splash immediately
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Multi-phase recreation of the animation video
  useEffect(() => {
    // ─── Phase 1: Squircle entrance with top slit (0ms - 450ms) ───
    Animated.parallel([
      Animated.timing(squircleOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(squircleScale, {
        toValue: 1,
        friction: 8,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(topSlitScaleX, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(dashesOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // ─── Phase 2: Logo Assembly (Hook sweeps in & Dot pops) (400ms - 900ms) ───
    const phase2Timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(hookOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(hookScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(hookTranslateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(120),
          Animated.parallel([
            Animated.timing(dotOpacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.spring(dotScale, {
              toValue: 1,
              friction: 5,
              tension: 90,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => {
        // Smoothly cross-fade master high-res icon
        Animated.timing(fullIconOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 420);

    // ─── Phase 3: Brand Text Slide Up & Reveal (850ms - 1300ms) ───
    const phase3Timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 850);

    // ─── Phase 4: Journey Dashes illuminate to current month (1300ms - 2000ms) ───
    const phase4Timer = setTimeout(() => {
      // Gentle card pulse like in video frame 00:03
      Animated.sequence([
        Animated.timing(squircleScale, {
          toValue: 1.04,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(squircleScale, {
          toValue: 1,
          duration: 240,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // Sequentially fill active journey months up to cycleMonth
      const activeDashAnimations = dashAnims.slice(0, cycleMonth).map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 180,
          delay: index * 60,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        })
      );

      Animated.parallel(activeDashAnimations).start(() => {
        // Fade in month label
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }, 1300);

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);
      clearTimeout(phase4Timer);
    };
  }, [cycleMonth, dashAnims]);

  // ─── Phase 5: Smooth Fade Out & Navigation ───
  useEffect(() => {
    if (!isLoaded) return;

    const navTimer = setTimeout(() => {
      if (isNavigating.current) return;
      isNavigating.current = true;

      // Smooth fade out of entire splash screen
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
        {/* ─── Animated Logo Squircle ─── */}
        <Animated.View
          style={[
            styles.squircle,
            {
              opacity: squircleOpacity,
              transform: [{ scale: squircleScale }],
            },
          ]}
        >
          {/* Base green background & top slit layer (Phase 1) */}
          <View style={styles.squircleInner}>
            {/* Top white capsule slit */}
            <Animated.View
              style={[
                styles.topSlit,
                {
                  opacity: topSlitOpacity,
                  transform: [{ scaleX: topSlitScaleX }],
                },
              ]}
            />

            {/* Middle hook curved arm (Phase 2 assembly) */}
            <Animated.View
              style={[
                styles.hookArm,
                {
                  opacity: hookOpacity,
                  transform: [
                    { scale: hookScale },
                    { translateY: hookTranslateY },
                  ],
                },
              ]}
            />

            {/* Bottom white dot (Phase 2 assembly) */}
            <Animated.View
              style={[
                styles.centerDot,
                {
                  opacity: dotOpacity,
                  transform: [{ scale: dotScale }],
                },
              ]}
            />
          </View>

          {/* Master high-res pixel-perfect icon overlay */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: fullIconOpacity },
            ]}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.masterIcon}
              resizeMode="cover"
            />
          </Animated.View>
        </Animated.View>

        {/* ─── Brand Title & Slogan ─── */}
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

        {/* ─── 12-Month Journey Indicator ─── */}
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
  squircle: {
    width: 142,
    height: 142,
    borderRadius: 36,
    overflow: "hidden",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
    backgroundColor: "#579D2D",
  },
  squircleInner: {
    width: "100%",
    height: "100%",
    backgroundColor: "#5EA533",
    position: "relative",
  },
  topSlit: {
    position: "absolute",
    top: 38,
    left: 34,
    width: 74,
    height: 12.5,
    borderRadius: 6.5,
    backgroundColor: "#FFFFFF",
  },
  hookArm: {
    position: "absolute",
    top: 59,
    left: 44,
    width: 54,
    height: 31,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  centerDot: {
    position: "absolute",
    top: 86,
    left: 58,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#FFFFFF",
  },
  masterIcon: {
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
    width: 24,
  },
  monthLabel: {
    marginTop: 12,
    fontSize: 13.5,
    fontWeight: "700",
    color: "#16A34A",
    letterSpacing: 0.3,
  },
});
