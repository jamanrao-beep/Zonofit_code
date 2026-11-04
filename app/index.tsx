import { useAuthStore } from "@/store/useAuthStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useUserStore } from "@/store/useUserStore";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const TOTAL_JOURNEY_MONTHS = 12;
const WORDMARK_CHARS = ["Z", "o", "n", "o", "f", "i", "t"];

export default function SplashAnimationScreen() {
  const router = useRouter();

  const userMonth = useUserStore((s) => s.currentMonth);
  const membershipCycle = useCreditsStore((s) => s.membershipInfo?.cycleNumber);
  const cycleMonth = Math.max(1, Math.min(TOTAL_JOURNEY_MONTHS, membershipCycle || userMonth || 1));

  const { width: screenWidth } = Dimensions.get("window");
  // Scale factor mapped from 1080 artboard to device screen
  const artboardScale = Math.min(screenWidth, 440) / 1080;
  const u = (px: number) => Math.round(px * artboardScale);

  // Screen-level smooth fade-out into app
  const screenFadeAnim = useRef(new Animated.Value(1)).current;

  // 1. Logo Squircle Tile
  const tileScale = useRef(new Animated.Value(0.85)).current;
  const tileOpacity = useRef(new Animated.Value(0)).current;

  // 2. Part 1: Top Bar (slides in from left)
  const part1TranslateX = useRef(new Animated.Value(-30)).current;
  const part1Opacity = useRef(new Animated.Value(0)).current;

  // 3. Part 2: Middle Hook (slides in smoothly from below)
  const part2TranslateY = useRef(new Animated.Value(25)).current;
  const part2Opacity = useRef(new Animated.Value(0)).current;

  // 4. Part 3: Center Dot (drops in from above with spring)
  const part3TranslateY = useRef(new Animated.Value(-30)).current;
  const part3Scale = useRef(new Animated.Value(0.4)).current;
  const part3Opacity = useRef(new Animated.Value(0)).current;

  // 5. Circular ripple on dot impact
  const rippleScale = useRef(new Animated.Value(1.0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  // 6. Wordmark letters staggered reveal
  const letterAnims = useMemo(
    () =>
      WORDMARK_CHARS.map(() => ({
        y: new Animated.Value(24),
        opacity: new Animated.Value(0),
      })),
    []
  );

  // 7. Tagline
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // 8. 12-Month Journey segments
  const segmentAnims = useMemo(
    () => Array.from({ length: TOTAL_JOURNEY_MONTHS }, () => new Animated.Value(0)),
    []
  );

  // 9. Month label
  const labelOpacity = useRef(new Animated.Value(0)).current;

  // Destination route pre-resolved on mount so navigation is instantaneous
  const nextRouteRef = useRef<string>("/(tabs)");
  const isNavigating = useRef(false);

  useEffect(() => {
    // Hide static splash immediately
    SplashScreen.hideAsync().catch(() => {});

    // Pre-resolve target route early in the background
    (async () => {
      try {
        const { isOnboarded, user, isSignedIn: signedIn } = useAuthStore.getState();
        if (signedIn) {
          if (isOnboarded) {
            nextRouteRef.current = "/(tabs)";
          } else {
            const phoneDigits = (user?.phone || "").replace(/\D/g, "");
            const needsProfile =
              phoneDigits.length < 10 ||
              !user?.username ||
              user.username === "ZonoFit Member" ||
              user.username === "Google User";
            nextRouteRef.current = needsProfile ? "/(auth)/create-account" : "/onboarding/select-city";
          }
          return;
        }

        const { initializeGuest } = useGuestStore.getState();
        const guestStatus = await initializeGuest();
        if (guestStatus.isGuest) {
          nextRouteRef.current = guestStatus.isExpired ? "/guest-expired" : "/(tabs)";
        } else {
          nextRouteRef.current = "/intro";
        }
      } catch {
        nextRouteRef.current = "/(tabs)";
      }
    })();
  }, []);

  const navigateNext = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.replace((nextRouteRef.current || "/(tabs)") as any);
  };

  // ─── Choreographed Splash Animation ───
  useEffect(() => {
    const timers: any[] = [];

    // [0ms - 380ms]: Green squircle tile scales in smoothly
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(tileOpacity, {
            toValue: 1,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(tileScale, {
            toValue: 1,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }),
        ]).start();
      }, 50)
    );

    // [380ms - 720ms]: Part 1 — Top Bar slides in from left
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(part1Opacity, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(part1TranslateX, {
            toValue: 0,
            duration: 320,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            useNativeDriver: true,
          }),
        ]).start();
      }, 380)
    );

    // [640ms - 980ms]: Part 2 — Middle Hook slides up smoothly
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(part2Opacity, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(part2TranslateY, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 640)
    );

    // [950ms - 1350ms]: Part 3 — Center Dot drops into the hook with elastic spring
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(part3Opacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.spring(part3TranslateY, {
            toValue: 0,
            friction: 5,
            tension: 90,
            useNativeDriver: true,
          }),
          Animated.spring(part3Scale, {
            toValue: 1,
            friction: 5,
            tension: 90,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Circular ripple outward from the dot
          Animated.parallel([
            Animated.sequence([
              Animated.timing(rippleOpacity, {
                toValue: 0.8,
                duration: 80,
                useNativeDriver: true,
              }),
              Animated.timing(rippleOpacity, {
                toValue: 0,
                duration: 360,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(rippleScale, {
              toValue: 2.2,
              duration: 440,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();

          // Gentle logo settle impact
          Animated.sequence([
            Animated.timing(tileScale, {
              toValue: 1.025,
              duration: 110,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(tileScale, {
              toValue: 1.0,
              duration: 160,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 950)
    );

    // [1500ms - 1900ms]: Wordmark letters staggered rise
    timers.push(
      setTimeout(() => {
        const letterAnimations = letterAnims.map((item, index) =>
          Animated.sequence([
            Animated.delay(index * 36),
            Animated.parallel([
              Animated.timing(item.opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(item.y, {
                toValue: 0,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
          ])
        );
        Animated.parallel(letterAnimations).start();
      }, 1500)
    );

    // [1850ms - 2150ms]: Tagline fade in
    timers.push(
      setTimeout(() => {
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, 1850)
    );

    // [2100ms - 2600ms]: 12-Segment Progress fills to current journey month
    timers.push(
      setTimeout(() => {
        const filled = Math.max(1, Math.min(cycleMonth, TOTAL_JOURNEY_MONTHS));
        const activeSegmentAnimations = segmentAnims.slice(0, filled).map((anim, index) =>
          Animated.sequence([
            Animated.delay(index * 70),
            Animated.timing(anim, {
              toValue: 1,
              duration: 110,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
          ])
        );
        Animated.parallel(activeSegmentAnimations).start();
      }, 2100)
    );

    // [2500ms - 2800ms]: Month label fade in
    timers.push(
      setTimeout(() => {
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, 2500)
    );

    // [3000ms - 3300ms]: Smooth, beautiful fade-out of splash screen into the app
    timers.push(
      setTimeout(() => {
        Animated.timing(screenFadeAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          navigateNext();
        });
      }, 3000)
    );

    // Safety fallback navigation after 3500ms
    timers.push(
      setTimeout(() => {
        navigateNext();
      }, 3500)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [cycleMonth, letterAnims, segmentAnims]);

  const tileSize = u(420);
  const tileRadius = u(102);

  // Dot position relative to squircle (dot center is at 46.6% width, 66.7% height)
  const dotCenterX = 0.466 * tileSize;
  const dotCenterY = 0.667 * tileSize;
  const rippleRadius = u(26);

  return (
    <Animated.View style={[styles.container, { opacity: screenFadeAnim }]}>
      <StatusBar style="dark" />

      <View style={styles.contentWrap}>
        {/* ─── The Animated 3-Part Logo Squircle ─── */}
        <Animated.View
          style={[
            styles.tileWrapper,
            {
              width: tileSize,
              height: tileSize,
              borderRadius: tileRadius,
              opacity: tileOpacity,
              transform: [{ scale: tileScale }],
            },
          ]}
        >
          {/* Base pristine green gradient squircle */}
          <Image
            source={require("@/assets/images/logo_squircle_bg.png")}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />

          {/* Part 1: Top Bar (Slanted wing) */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: part1Opacity,
                transform: [{ translateX: part1TranslateX }],
              },
            ]}
          >
            <Image
              source={require("@/assets/images/logo_part_top_bar.png")}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Part 2: Middle Hook (Curved arm) */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: part2Opacity,
                transform: [{ translateY: part2TranslateY }],
              },
            ]}
          >
            <Image
              source={require("@/assets/images/logo_part_hook.png")}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Part 3: Center Dot */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: part3Opacity,
                transform: [
                  { translateY: part3TranslateY },
                  { scale: part3Scale },
                ],
              },
            ]}
          >
            <Image
              source={require("@/assets/images/logo_part_dot.png")}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Impact Ripple Ring centered exactly on the dot */}
          <Animated.View
            style={[
              styles.rippleRing,
              {
                top: dotCenterY - rippleRadius,
                left: dotCenterX - rippleRadius,
                width: rippleRadius * 2,
                height: rippleRadius * 2,
                borderRadius: rippleRadius,
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />
        </Animated.View>

        {/* ─── Wordmark "Zonofit" with staggered letter rise ─── */}
        <View style={[styles.wordmarkClipBox, { height: u(118), marginTop: u(54) }]}>
          <View style={styles.wordmarkRow}>
            {WORDMARK_CHARS.map((char, index) => (
              <Animated.Text
                key={index}
                style={[
                  styles.wordmarkChar,
                  {
                    fontSize: u(92),
                    lineHeight: u(114),
                    opacity: letterAnims[index].opacity,
                    transform: [{ translateY: letterAnims[index].y }],
                  },
                ]}
              >
                {char}
              </Animated.Text>
            ))}
          </View>
        </View>

        {/* ─── Tagline "Consistency over perfection" ─── */}
        <Animated.Text
          style={[
            styles.brandSubtitle,
            {
              fontSize: u(43),
              marginTop: u(22),
              opacity: taglineOpacity,
            },
          ]}
        >
          Consistency over perfection
        </Animated.Text>

        {/* ─── 12-Month Journey Progress Segments ─── */}
        <View style={[styles.journeyContainer, { marginTop: u(64) }]}>
          <View style={[styles.dashesRow, { gap: u(14) }]}>
            {segmentAnims.map((anim, index) => {
              const isFilled = index < cycleMonth;
              const bgInterpolation = anim.interpolate({
                inputRange: [0, 1],
                outputRange: ["#DBE3D7", "#4A8A33"],
              });

              return (
                <View
                  key={index}
                  style={[
                    styles.dashTrack,
                    {
                      width: u(46),
                      height: u(16),
                      borderRadius: u(8),
                    },
                  ]}
                >
                  {isFilled && (
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          borderRadius: u(8),
                          backgroundColor: bgInterpolation,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* Current Month of 12 Label */}
          <Animated.View style={{ opacity: labelOpacity, marginTop: u(22) }}>
            <Text style={[styles.monthLabel, { fontSize: u(38) }]}>
              Month {cycleMonth} of {TOTAL_JOURNEY_MONTHS}
            </Text>
          </Animated.View>
        </View>
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
    paddingHorizontal: 20,
  },
  tileWrapper: {
    position: "relative",
    overflow: "hidden",
    shadowColor: "#4A8A33",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 0,
  },
  rippleRing: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
  },
  wordmarkClipBox: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkChar: {
    fontWeight: "800",
    color: "#1B2B20",
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    fontWeight: "500",
    color: "#6B7470",
    letterSpacing: 0.2,
  },
  journeyContainer: {
    alignItems: "center",
  },
  dashesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dashTrack: {
    backgroundColor: "#DBE3D7",
    overflow: "hidden",
  },
  monthLabel: {
    fontWeight: "700",
    color: "#6B7470",
    letterSpacing: 0.2,
  },
});
