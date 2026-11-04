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

/* ------------------------------------------------------------------------ */
/* Timeline (ms from mount) — measured from the 30 fps reference video      */
/* ------------------------------------------------------------------------ */
const SPLASH_TIMELINE = {
  tileIn: { start: 100, duration: 330 }, // tile fades in + scales 0.78 → 1
  barWipe: { start: 490, duration: 90 }, // F top bar wipes in L → R
  barSolid: { start: 490, duration: 260 }, // …translucent → solid
  hookDraw: { start: 600, duration: 110 }, // F lower hook draws on
  hookSolid: { start: 600, duration: 360 }, // snaps solid
  dotIn: { start: 1100, duration: 160 }, // dot drops in + scales up
  ringPulse: { start: 1300, duration: 450 }, // single ring ripple from the dot
  wordmarkIn: { start: 1740, duration: 220, stagger: 42 }, // letters rise from mask L → R
  taglineIn: { start: 2100, duration: 300 }, // tagline fades in
  segmentsIn: { start: 2580, step: 100, duration: 70 }, // segment fills
  labelIn: { start: 2950, duration: 250 }, // "Month X of 12" fades in
  tileOut: { start: 3270, duration: 150 }, // tile pales, F fades out
  flood: { start: 3310, duration: 270 }, // green circle grows out of the dot and floods screen
  complete: 3700, // onComplete navigation
} as const;

const WORDMARK_CHARS = ["Z", "o", "n", "o", "f", "i", "t"];

export default function SplashAnimationScreen() {
  const { isLoaded } = useAuthStore();
  const router = useRouter();

  const userMonth = useUserStore((s) => s.currentMonth);
  const membershipCycle = useCreditsStore((s) => s.membershipInfo?.cycleNumber);
  const cycleMonth = Math.max(1, Math.min(TOTAL_JOURNEY_MONTHS, membershipCycle || userMonth || 1));

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  // 1080 artboard scaling factor
  const artboardScale = Math.min(screenWidth, 480) / 1080;
  const u = (px: number) => px * artboardScale;

  // Root screen fade out
  const screenFadeAnim = useRef(new Animated.Value(1)).current;

  // 1. Tile animation
  const tileScale = useRef(new Animated.Value(0.78)).current;
  const tileOpacity = useRef(new Animated.Value(0)).current;

  // 2. Mark animations: Top bar
  const topBarScaleX = useRef(new Animated.Value(0)).current;
  const topBarOpacity = useRef(new Animated.Value(0)).current;

  // 3. Mark animations: Hook
  const hookScale = useRef(new Animated.Value(0.3)).current;
  const hookOpacity = useRef(new Animated.Value(0)).current;
  const hookTranslateY = useRef(new Animated.Value(-12)).current;

  // 4. Mark animations: Dot
  const dotScale = useRef(new Animated.Value(0.5)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const dotTranslateY = useRef(new Animated.Value(-24)).current;

  // 5. Dot ring ripple
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // 6. Master crisp icon cross-fade
  const fullIconOpacity = useRef(new Animated.Value(0)).current;

  // 7. Wordmark letters staggered rise
  const letterAnims = useMemo(
    () => WORDMARK_CHARS.map(() => ({
      y: new Animated.Value(36),
      opacity: new Animated.Value(0),
    })),
    []
  );

  // 8. Tagline fade in
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // 9. 12 Journey segments fill animations
  const segmentAnims = useMemo(
    () => Array.from({ length: TOTAL_JOURNEY_MONTHS }, () => new Animated.Value(0)),
    []
  );

  // 10. Month label
  const labelOpacity = useRef(new Animated.Value(0)).current;

  // 11. Green flood circle
  const floodScale = useRef(new Animated.Value(0.001)).current;
  const floodOpacity = useRef(new Animated.Value(0)).current;

  const isNavigating = useRef(false);

  useEffect(() => {
    // Hide static splash immediately
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Multi-phase recreation of the animation video
  useEffect(() => {
    const timers: any[] = [];

    // --- Step 1: Tile Entrance (100ms - 430ms) ---
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(tileOpacity, {
            toValue: 1,
            duration: SPLASH_TIMELINE.tileIn.duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(tileScale, {
            toValue: 1,
            duration: SPLASH_TIMELINE.tileIn.duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, SPLASH_TIMELINE.tileIn.start)
    );

    // --- Step 2: Top Bar Wipe In (490ms - 750ms) ---
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(topBarOpacity, {
            toValue: 1,
            duration: SPLASH_TIMELINE.barSolid.duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(topBarScaleX, {
            toValue: 1,
            duration: SPLASH_TIMELINE.barWipe.duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, SPLASH_TIMELINE.barWipe.start)
    );

    // --- Step 3: Lower Hook Draw (600ms - 960ms) ---
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(hookOpacity, {
            toValue: 1,
            duration: SPLASH_TIMELINE.hookSolid.duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(hookScale, {
            toValue: 1,
            duration: SPLASH_TIMELINE.hookDraw.duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(hookTranslateY, {
            toValue: 0,
            duration: SPLASH_TIMELINE.hookDraw.duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, SPLASH_TIMELINE.hookDraw.start)
    );

    // --- Step 4: Dot Drop In & Spring (1100ms - 1260ms) ---
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: SPLASH_TIMELINE.dotIn.duration,
            useNativeDriver: true,
          }),
          Animated.spring(dotScale, {
            toValue: 1,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.timing(dotTranslateY, {
            toValue: 0,
            duration: SPLASH_TIMELINE.dotIn.duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Cross-fade the pixel-perfect master icon
          Animated.timing(fullIconOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }).start();
        });
      }, SPLASH_TIMELINE.dotIn.start)
    );

    // --- Step 5: Ring Ripple around the Dot (1300ms - 1750ms) ---
    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ringOpacity, {
              toValue: 0.75,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ringScale, {
            toValue: 2.2,
            duration: SPLASH_TIMELINE.ringPulse.duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }, SPLASH_TIMELINE.ringPulse.start)
    );

    // --- Step 6: Wordmark "Zonofit" Staggered Rise (1740ms - 2050ms) ---
    timers.push(
      setTimeout(() => {
        const letterAnimations = letterAnims.map((item, index) =>
          Animated.sequence([
            Animated.delay(index * SPLASH_TIMELINE.wordmarkIn.stagger),
            Animated.parallel([
              Animated.timing(item.opacity, {
                toValue: 1,
                duration: SPLASH_TIMELINE.wordmarkIn.duration,
                useNativeDriver: true,
              }),
              Animated.timing(item.y, {
                toValue: 0,
                duration: SPLASH_TIMELINE.wordmarkIn.duration,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
          ])
        );
        Animated.parallel(letterAnimations).start();
      }, SPLASH_TIMELINE.wordmarkIn.start)
    );

    // --- Step 7: Tagline Fade In (2100ms - 2400ms) ---
    timers.push(
      setTimeout(() => {
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: SPLASH_TIMELINE.taglineIn.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, SPLASH_TIMELINE.taglineIn.start)
    );

    // --- Step 8: 12-Segment Progress Fill up to cycleMonth (2580ms - 2950ms) ---
    timers.push(
      setTimeout(() => {
        const filled = Math.max(1, Math.min(cycleMonth, TOTAL_JOURNEY_MONTHS));
        const activeSegmentAnimations = segmentAnims.slice(0, filled).map((anim, index) =>
          Animated.sequence([
            Animated.delay(index * SPLASH_TIMELINE.segmentsIn.step),
            Animated.timing(anim, {
              toValue: 1,
              duration: SPLASH_TIMELINE.segmentsIn.duration,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
          ])
        );
        Animated.parallel(activeSegmentAnimations).start();
      }, SPLASH_TIMELINE.segmentsIn.start)
    );

    // --- Step 9: "Month X of 12" Label Fade In (2950ms - 3200ms) ---
    timers.push(
      setTimeout(() => {
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: SPLASH_TIMELINE.labelIn.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, SPLASH_TIMELINE.labelIn.start)
    );

    // --- Step 10: Tile pales and Green Circle Flood (3270ms - 3650ms) ---
    timers.push(
      setTimeout(() => {
        Animated.timing(tileOpacity, {
          toValue: 0.55,
          duration: SPLASH_TIMELINE.tileOut.duration,
          useNativeDriver: true,
        }).start();
      }, SPLASH_TIMELINE.tileOut.start)
    );

    timers.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(floodOpacity, {
            toValue: 1,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(floodScale, {
            toValue: 28,
            duration: SPLASH_TIMELINE.flood.duration,
            easing: Easing.bezier(0.2, 0.8, 0.3, 1),
            useNativeDriver: true,
          }),
        ]).start();
      }, SPLASH_TIMELINE.flood.start)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [cycleMonth, letterAnims, segmentAnims]);

  // --- Step 11: Navigation on complete (3700ms) ---
  useEffect(() => {
    if (!isLoaded) return;

    const navTimer = setTimeout(() => {
      if (isNavigating.current) return;
      isNavigating.current = true;

      // Clean transition after green screen flood
      Animated.timing(screenFadeAnim, {
        toValue: 0,
        duration: 200,
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
    }, SPLASH_TIMELINE.complete);

    return () => clearTimeout(navTimer);
  }, [isLoaded, screenFadeAnim, router]);

  // Tile dimensions from reference artboard: 422x422 on 1080 artboard
  const tileSize = u(422);
  const tileRadius = u(100);

  return (
    <Animated.View style={[styles.container, { opacity: screenFadeAnim }]}>
      <StatusBar style="dark" />

      <View style={styles.contentWrap}>
        {/* ─── Animated Logo Tile ─── */}
        <Animated.View
          style={[
            styles.squircle,
            {
              width: tileSize,
              height: tileSize,
              borderRadius: tileRadius,
              opacity: tileOpacity,
              transform: [{ scale: tileScale }],
            },
          ]}
        >
          {/* Base green gradient background & vector layers */}
          <View style={styles.squircleInner}>
            {/* Top white capsule slit */}
            <Animated.View
              style={[
                styles.topSlit,
                {
                  top: u(114),
                  left: u(104),
                  width: u(215),
                  height: u(38),
                  borderRadius: u(19),
                  opacity: topBarOpacity,
                  transform: [{ scaleX: topBarScaleX }],
                },
              ]}
            />

            {/* Middle hook curved arm */}
            <Animated.View
              style={[
                styles.hookArm,
                {
                  top: u(176),
                  left: u(130),
                  width: u(160),
                  height: u(98),
                  borderTopRightRadius: u(46),
                  borderBottomRightRadius: u(46),
                  borderBottomLeftRadius: u(52),
                  opacity: hookOpacity,
                  transform: [
                    { scale: hookScale },
                    { translateY: hookTranslateY },
                  ],
                },
              ]}
            />

            {/* Bottom white dot */}
            <Animated.View
              style={[
                styles.centerDot,
                {
                  top: u(260),
                  left: u(174),
                  width: u(39),
                  height: u(39),
                  borderRadius: u(20),
                  opacity: dotOpacity,
                  transform: [
                    { scale: dotScale },
                    { translateY: dotTranslateY },
                  ],
                },
              ]}
            />

            {/* Concentric ring ripple from dot */}
            <Animated.View
              style={[
                styles.ringRipple,
                {
                  top: u(258),
                  left: u(172),
                  width: u(43),
                  height: u(43),
                  borderRadius: u(22),
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
          </View>

          {/* Master high-res razor-sharp icon crossfade */}
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

        {/* ─── Wordmark "Zonofit" with letter-by-letter rising reveal ─── */}
        <View style={[styles.wordmarkClipBox, { height: u(118), marginTop: u(54) }]}>
          <View style={styles.wordmarkRow}>
            {WORDMARK_CHARS.map((char, index) => (
              <Animated.Text
                key={index}
                style={[
                  styles.wordmarkChar,
                  {
                    fontSize: u(93),
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
              fontSize: u(44),
              marginTop: u(24),
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
            <Text style={[styles.monthLabel, { fontSize: u(38) }]}>
              Month {cycleMonth} of {TOTAL_JOURNEY_MONTHS}
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* ─── Signature Green Circle Screen Flood ─── */}
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
  squircle: {
    overflow: "hidden",
    shadowColor: "#4A8A33",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
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
    backgroundColor: "#FFFFFF",
  },
  hookArm: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
  centerDot: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
  ringRipple: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
  },
  masterIcon: {
    width: "100%",
    height: "100%",
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
