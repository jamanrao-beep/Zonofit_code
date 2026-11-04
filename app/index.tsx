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
  const { isLoaded } = useAuthStore();
  const router = useRouter();

  const userMonth = useUserStore((s) => s.currentMonth);
  const membershipCycle = useCreditsStore((s) => s.membershipInfo?.cycleNumber);
  const cycleMonth = Math.max(1, Math.min(TOTAL_JOURNEY_MONTHS, membershipCycle || userMonth || 1));

  const { width: screenWidth } = Dimensions.get("window");
  // Scale for a 1080 artboard
  const artboardScale = Math.min(screenWidth, 440) / 1080;
  const u = (px: number) => px * artboardScale;

  // Master fade out of the entire splash screen
  const screenFadeAnim = useRef(new Animated.Value(1)).current;

  // 1. Tile Base Animation
  const tileScale = useRef(new Animated.Value(0.82)).current;
  const tileOpacity = useRef(new Animated.Value(0)).current;

  // 2. Part 1: Top Bar Animation (Sweeps from left)
  const part1TranslateX = useRef(new Animated.Value(-45)).current;
  const part1ScaleX = useRef(new Animated.Value(0.7)).current;
  const part1Opacity = useRef(new Animated.Value(0)).current;

  // 3. Part 2: Middle Hook Animation (Curves in from bottom-right)
  const part2TranslateX = useRef(new Animated.Value(30)).current;
  const part2TranslateY = useRef(new Animated.Value(40)).current;
  const part2Scale = useRef(new Animated.Value(0.72)).current;
  const part2Rotate = useRef(new Animated.Value(1)).current; // 1 -> 0 (8deg -> 0deg)
  const part2Opacity = useRef(new Animated.Value(0)).current;

  // 4. Part 3: Center Dot Animation (Drops from above with elastic bounce)
  const part3TranslateY = useRef(new Animated.Value(-48)).current;
  const part3Scale = useRef(new Animated.Value(0.35)).current;
  const part3Opacity = useRef(new Animated.Value(0)).current;

  // 5. Circular ripple on dot impact
  const rippleScale = useRef(new Animated.Value(1.0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  // 6. Wordmark letters staggered reveal
  const letterAnims = useMemo(
    () =>
      WORDMARK_CHARS.map(() => ({
        y: new Animated.Value(30),
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

  // 10. Final green circle screen flood
  const floodScale = useRef(new Animated.Value(0.001)).current;
  const floodOpacity = useRef(new Animated.Value(0)).current;

  const isNavigating = useRef(false);

  useEffect(() => {
    // Hide static splash immediately
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // ─── 3-Part Logo Master Choreography ───
  useEffect(() => {
    const timers: any[] = [];

    // [0ms - 400ms]: Green squircle tile scales in smoothly
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(tileOpacity, {
            toValue: 1,
            duration: 380,
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

    // [350ms - 750ms]: Part 1 — Top Bar sweeps in dynamically from left
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(part1Opacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(part1TranslateX, {
            toValue: 0,
            duration: 380,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            useNativeDriver: true,
          }),
          Animated.timing(part1ScaleX, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 350)
    );

    // [650ms - 1050ms]: Part 2 — Middle Hook curves in from bottom-right and snaps into place
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(part2Opacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(part2TranslateX, {
            toValue: 0,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(part2TranslateY, {
            toValue: 0,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(part2Scale, {
            toValue: 1,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.timing(part2Rotate, {
            toValue: 0,
            duration: 360,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 650)
    );

    // [1050ms - 1450ms]: Part 3 — Center Dot drops into the hook with elastic spring
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
            tension: 95,
            useNativeDriver: true,
          }),
          Animated.spring(part3Scale, {
            toValue: 1,
            friction: 5,
            tension: 95,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Circular ripple outward from the dot
          Animated.parallel([
            Animated.sequence([
              Animated.timing(rippleOpacity, {
                toValue: 0.85,
                duration: 90,
                useNativeDriver: true,
              }),
              Animated.timing(rippleOpacity, {
                toValue: 0,
                duration: 380,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(rippleScale, {
              toValue: 2.5,
              duration: 470,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();

          // Subtle whole-logo micro-punch impact
          Animated.sequence([
            Animated.timing(tileScale, {
              toValue: 1.035,
              duration: 130,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(tileScale, {
              toValue: 1.0,
              duration: 180,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 1050)
    );

    // [1600ms - 2000ms]: Wordmark letters staggered reveal
    timers.push(
      setTimeout(() => {
        const letterAnimations = letterAnims.map((item, index) =>
          Animated.sequence([
            Animated.delay(index * 38),
            Animated.parallel([
              Animated.timing(item.opacity, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
              }),
              Animated.timing(item.y, {
                toValue: 0,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
          ])
        );
        Animated.parallel(letterAnimations).start();
      }, 1600)
    );

    // [1950ms - 2250ms]: Tagline fade in
    timers.push(
      setTimeout(() => {
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, 1950)
    );

    // [2200ms - 2700ms]: 12-Segment Progress fills to current journey month
    timers.push(
      setTimeout(() => {
        const filled = Math.max(1, Math.min(cycleMonth, TOTAL_JOURNEY_MONTHS));
        const activeSegmentAnimations = segmentAnims.slice(0, filled).map((anim, index) =>
          Animated.sequence([
            Animated.delay(index * 80),
            Animated.timing(anim, {
              toValue: 1,
              duration: 120,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
          ])
        );
        Animated.parallel(activeSegmentAnimations).start();
      }, 2200)
    );

    // [2600ms - 2900ms]: Month label fade in
    timers.push(
      setTimeout(() => {
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, 2600)
    );

    // [3050ms - 3350ms]: Green flood expands smoothly from dot
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(floodOpacity, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(floodScale, {
            toValue: 30,
            duration: 320,
            easing: Easing.bezier(0.2, 0.8, 0.25, 1),
            useNativeDriver: true,
          }),
        ]).start();
      }, 3050)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [cycleMonth, letterAnims, segmentAnims]);

  // [3450ms]: Seamless navigation into app
  useEffect(() => {
    if (!isLoaded) return;

    const navTimer = setTimeout(() => {
      if (isNavigating.current) return;
      isNavigating.current = true;

      Animated.timing(screenFadeAnim, {
        toValue: 0,
        duration: 180,
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
    }, 3450);

    return () => clearTimeout(navTimer);
  }, [isLoaded, screenFadeAnim, router]);

  // Responsive squircle size
  const tileSize = u(410);

  // Hook rotation interpolation (8deg -> 0deg)
  const hookRotateInterpolation = part2Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "8deg"],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenFadeAnim }]}>
      <StatusBar style="dark" />

      <View style={styles.contentWrap}>
        {/* ─── The Animated 3-Part Logo ─── */}
        <Animated.View
          style={[
            styles.tileWrapper,
            {
              width: tileSize,
              height: tileSize,
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
                transform: [
                  { translateX: part1TranslateX },
                  { scaleX: part1ScaleX },
                ],
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
                transform: [
                  { translateX: part2TranslateX },
                  { translateY: part2TranslateY },
                  { scale: part2Scale },
                  { rotate: hookRotateInterpolation },
                ],
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

          {/* Impact Ripple Ring centered on the dot */}
          <Animated.View
            style={[
              styles.rippleRing,
              {
                top: (684 / 1024) * tileSize - u(26),
                left: (485 / 1040) * tileSize - u(26),
                width: u(52),
                height: u(52),
                borderRadius: u(26),
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />
        </Animated.View>

        {/* ─── Wordmark "Zonofit" with staggered letter rise ─── */}
        <View style={[styles.wordmarkClipBox, { height: u(118), marginTop: u(52) }]}>
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
              marginTop: u(20),
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
                      height: u(17),
                      borderRadius: u(9),
                    },
                  ]}
                >
                  {isFilled && (
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          borderRadius: u(9),
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
            <Text style={[styles.monthLabel, { fontSize: u(37) }]}>
              Month {cycleMonth} of {TOTAL_JOURNEY_MONTHS}
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* ─── Signature Green Screen Flood Transition ─── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.floodCircle,
          {
            width: u(120),
            height: u(120),
            borderRadius: u(60),
            opacity: floodOpacity,
            transform: [{ scale: floodScale }],
          },
        ]}
      />
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
    shadowColor: "#4A8A33",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 0,
  },
  rippleRing: {
    position: "absolute",
    borderWidth: 3,
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
  floodCircle: {
    position: "absolute",
    backgroundColor: "#248043",
  },
});
