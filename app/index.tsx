import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  View,
} from "react-native";

const EASE_QUINT = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_BACK = Easing.bezier(0.34, 1.56, 0.64, 1);
const EASE_SHINE = Easing.bezier(0.65, 0, 0.35, 1);

const HOLD_MS = 3700;

/**
 * Opening splash. Same beat as the website: the green tile pops, the mark
 * slides together, a shine crosses it, then the name and tagline rise.
 */
export default function SplashAnimationScreen() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    PoppinsMedium: require("@/assets/fonts/Poppins-Medium.ttf"),
  });
  const fontReady = fontsLoaded || fontError != null;

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const vmin = Math.min(screenWidth, screenHeight) / 100;
  const tileSize = Math.min(screenWidth * 0.42, 230);
  const motion = tileSize / 230;
  const tileRadius = tileSize * (250 / 1017);
  const lift = Math.max(18, Math.min(34, 4 * vmin));
  const nameGap = Math.max(26, Math.min(48, 6 * vmin));
  const nameSize = Math.max(34, Math.min(52, 9 * vmin));
  const tagGap = Math.max(12, Math.min(18, 2.4 * vmin));
  const tagSize = Math.max(12, Math.min(15, 2.9 * vmin));
  const slideX = 260 * motion;
  const dropY = 40 * motion;
  const shineFrom = -900 * motion;
  const shineTo = 1400 * motion;
  const shineW = tileSize * (260 / 1017);
  const shineH = tileSize * 1.8;

  const [motionValues] = useState(() => ({
    groupY: new Animated.Value(lift),
    tileOpacity: new Animated.Value(0),
    tileScale: new Animated.Value(0.7),
    barOpacity: new Animated.Value(0),
    barX: new Animated.Value(-slideX),
    hookOpacity: new Animated.Value(0),
    hookX: new Animated.Value(-slideX),
    dotOpacity: new Animated.Value(0),
    dotY: new Animated.Value(-dropY),
    dotScale: new Animated.Value(0.01),
    shineX: new Animated.Value(shineFrom),
    nameOpacity: new Animated.Value(0),
    nameY: new Animated.Value(20),
    tagOpacity: new Animated.Value(0),
    tagY: new Animated.Value(10),
  }));
  const {
    groupY,
    tileOpacity,
    tileScale,
    barOpacity,
    barX,
    hookOpacity,
    hookX,
    dotOpacity,
    dotY,
    dotScale,
    shineX,
    nameOpacity,
    nameY,
    tagOpacity,
    tagY,
  } = motionValues;

  const nextRouteRef = useRef<string>("/(tabs)");
  const isNavigating = useRef(false);

  useEffect(() => {
    let cancelled = false;
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
        if (cancelled) return;
        if (guestStatus.isGuest) {
          nextRouteRef.current = guestStatus.isExpired ? "/guest-expired" : "/(tabs)";
        } else {
          nextRouteRef.current = "/intro";
        }
      } catch {
        nextRouteRef.current = "/(tabs)";
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!fontReady) return;

    const navigateNext = () => {
      if (isNavigating.current) return;
      isNavigating.current = true;
      router.replace((nextRouteRef.current || "/(tabs)") as never);
    };

    SplashScreen.hideAsync().catch(() => {});

    let reduced = false;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const finishAfter = (ms: number) => {
      timers.push(setTimeout(() => {
        if (alive) navigateNext();
      }, ms));
    };

    const play = () => {
      groupY.setValue(reduced ? 0 : lift);
      tileOpacity.setValue(reduced ? 1 : 0);
      tileScale.setValue(reduced ? 1 : 0.7);
      barOpacity.setValue(reduced ? 1 : 0);
      barX.setValue(reduced ? 0 : -slideX);
      hookOpacity.setValue(reduced ? 1 : 0);
      hookX.setValue(reduced ? 0 : -slideX);
      dotOpacity.setValue(reduced ? 1 : 0);
      dotY.setValue(reduced ? 0 : -dropY);
      dotScale.setValue(reduced ? 1 : 0.01);
      shineX.setValue(reduced ? shineTo : shineFrom);
      nameOpacity.setValue(reduced ? 1 : 0);
      nameY.setValue(reduced ? 0 : 20);
      tagOpacity.setValue(reduced ? 1 : 0);
      tagY.setValue(reduced ? 0 : 10);

      if (reduced) {
        finishAfter(700);
        return;
      }

      timers.push(setTimeout(() => {
        Animated.parallel([
          Animated.timing(tileOpacity, { toValue: 1, duration: 850, easing: EASE_QUINT, useNativeDriver: true }),
          Animated.timing(tileScale, { toValue: 1, duration: 850, easing: EASE_QUINT, useNativeDriver: true }),
        ]).start();
      }, 150));

      timers.push(setTimeout(() => {
        Animated.parallel([
          Animated.timing(barOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
          Animated.timing(barX, { toValue: 0, duration: 1200, easing: EASE_EXPO, useNativeDriver: true }),
        ]).start();
      }, 800));

      timers.push(setTimeout(() => {
        Animated.parallel([
          Animated.timing(hookOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
          Animated.timing(hookX, { toValue: 0, duration: 1200, easing: EASE_EXPO, useNativeDriver: true }),
        ]).start();
      }, 980));

      timers.push(setTimeout(() => {
        Animated.parallel([
          Animated.timing(dotOpacity, { toValue: 1, duration: 165, useNativeDriver: true }),
          Animated.timing(dotY, { toValue: 0, duration: 550, easing: EASE_BACK, useNativeDriver: true }),
          Animated.timing(dotScale, { toValue: 1, duration: 550, easing: EASE_BACK, useNativeDriver: true }),
        ]).start();
      }, 1400));

      timers.push(setTimeout(() => {
        Animated.timing(groupY, { toValue: 0, duration: 800, easing: EASE_QUINT, useNativeDriver: true }).start();
      }, 1950));

      timers.push(setTimeout(() => {
        Animated.parallel([
          Animated.timing(nameOpacity, { toValue: 1, duration: 800, easing: EASE_QUINT, useNativeDriver: true }),
          Animated.timing(nameY, { toValue: 0, duration: 800, easing: EASE_QUINT, useNativeDriver: true }),
        ]).start();
      }, 2200));

      timers.push(setTimeout(() => {
        Animated.timing(shineX, { toValue: shineTo, duration: 800, easing: EASE_SHINE, useNativeDriver: true }).start();
      }, 2250));

      timers.push(setTimeout(() => {
        Animated.parallel([
          Animated.timing(tagOpacity, { toValue: 1, duration: 800, easing: EASE_QUINT, useNativeDriver: true }),
          Animated.timing(tagY, { toValue: 0, duration: 800, easing: EASE_QUINT, useNativeDriver: true }),
        ]).start();
      }, 2700));

      finishAfter(HOLD_MS);
      finishAfter(HOLD_MS + 800);
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!alive) return;
        reduced = value;
        play();
      })
      .catch(() => {
        if (alive) play();
      });

    return () => {
      alive = false;
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [
    fontReady,
    router,
    barOpacity,
    barX,
    dotOpacity,
    dotScale,
    dotY,
    dropY,
    groupY,
    hookOpacity,
    hookX,
    lift,
    nameOpacity,
    nameY,
    shineFrom,
    shineTo,
    shineX,
    slideX,
    tagOpacity,
    tagY,
    tileOpacity,
    tileScale,
  ]);

  const fontFamily = fontsLoaded ? "PoppinsMedium" : undefined;

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel="Zonofit — loading">
      <StatusBar style="dark" />
      <Animated.View style={[styles.group, { transform: [{ translateY: groupY }] }]}>
        <Animated.View
          style={[
            styles.tileShadow,
            {
              width: tileSize,
              height: tileSize,
              borderRadius: tileRadius,
              opacity: tileOpacity,
              transform: [{ scale: tileScale }],
            },
          ]}
        >
          <View style={[styles.tileClip, { borderRadius: tileRadius }]}>
            <Image
              source={require("@/assets/images/logo_squircle_bg.png")}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: barOpacity, transform: [{ translateX: barX }] }]}
            >
              <Image
                source={require("@/assets/images/logo_part_top_bar.png")}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: hookOpacity, transform: [{ translateX: hookX }] }]}
            >
              <Image
                source={require("@/assets/images/logo_part_hook.png")}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: dotOpacity,
                  transformOrigin: "45.7% 66.8%",
                  transform: [{ translateY: dotY }, { scale: dotScale }],
                },
              ]}
            >
              <Image
                source={require("@/assets/images/logo_part_dot.png")}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shine,
                {
                  width: shineW,
                  height: shineH,
                  top: -tileSize * 0.3,
                  transform: [{ translateX: shineX }, { skewX: "-20deg" }],
                },
              ]}
            >
              <Canvas style={StyleSheet.absoluteFill}>
                <Rect x={0} y={0} width={shineW} height={shineH}>
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(shineW, 0)}
                    colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]}
                  />
                </Rect>
              </Canvas>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.name,
            {
              marginTop: nameGap,
              fontSize: nameSize,
              lineHeight: nameSize,
              letterSpacing: -0.015 * nameSize,
              fontFamily,
              fontWeight: fontsLoaded ? "normal" : "500",
              opacity: nameOpacity,
              transform: [{ translateY: nameY }],
            },
          ]}
        >
          Zonofit
        </Animated.Text>
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[
            styles.tagline,
            {
              marginTop: tagGap,
              fontSize: tagSize,
              lineHeight: tagSize * 1.3,
              letterSpacing: 0.14 * tagSize,
              fontFamily,
              fontWeight: fontsLoaded ? "normal" : "500",
              opacity: tagOpacity,
              transform: [{ translateY: tagY }],
            },
          ]}
        >
          Consistency over perfection
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  group: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 24,
  },
  tileShadow: {
    backgroundColor: "#33782d",
    shadowColor: "rgb(60, 110, 25)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  tileClip: {
    flex: 1,
    overflow: "hidden",
  },
  shine: {
    position: "absolute",
    left: 0,
  },
  name: {
    color: "#182812",
    textAlign: "center",
  },
  tagline: {
    color: "#6b7a62",
    textAlign: "center",
  },
});
