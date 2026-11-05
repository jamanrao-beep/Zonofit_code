import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  rect,
  rrect,
  vec,
} from "@shopify/react-native-skia";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef } from "react";
import { AccessibilityInfo, Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const EASE_QUINT = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_BACK = Easing.bezier(0.34, 1.56, 0.64, 1);
const EASE_SHINE = Easing.bezier(0.65, 0, 0.35, 1);
const HOLD_MS = 3700;
const SKEW = (-20 * Math.PI) / 180;

const BAR_D =
  "M230,374 L232,377 L684,377 L685,376 L695,376 L713,372 L726,367 L737,361 L753,349 L765,336 L774,322 L782,303 L785,286 L784,285 L314,285 L305,286 L289,290 L270,299 L258,308 L248,318 L240,330 L232,350 L230,361Z";
const HOOK_D =
  "M708,438 L538,438 L537,439 L536,438 L535,439 L534,438 L533,439 L532,438 L531,439 L530,438 L529,439 L528,438 L527,439 L526,438 L525,439 L524,438 L515,439 L514,438 L513,439 L496,439 L461,445 L444,450 L420,460 L402,470 L372,492 L345,521 L331,542 L316,573 L309,595 L305,614 L304,629 L307,641 L311,649 L324,662 L340,669 L360,669 L369,666 L379,660 L387,653 L396,637 L399,618 L404,602 L413,584 L420,574 L437,557 L446,550 L472,537 L490,532 L504,530 L609,530 L619,529 L642,523 L659,515 L673,505 L687,491 L694,481 L704,461Z";
const DOT_D =
  "M460,632 L450,634 L439,639 L430,646 L424,653 L419,662 L416,672 L416,689 L418,697 L424,709 L436,721 L443,725 L455,729 L473,729 L483,726 L492,721 L504,709 L509,700 L512,691 L513,682 L512,671 L506,656 L502,650 L492,641 L475,633 L467,632 L461,633Z";

const DOT_CX = (416 + 513) / 2;
const DOT_CY = (632 + 729) / 2;

function svgPath(d: string) {
  const path = Skia.Path.MakeFromSVGString(d);
  if (!path) {
    throw new Error("Splash mark path could not be parsed");
  }
  return path;
}

/**
 * Opening splash. The mark is drawn inside the rounded tile, so the bar,
 * hook, and dot slide into place the same way they do on the website.
 */
export default function SplashAnimationScreen() {
  const router = useRouter();
  const routerRef = useRef(router);
  const [fontsLoaded] = useFonts({
    PoppinsMedium: require("@/assets/fonts/Poppins-Medium.ttf"),
  });

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const vmin = Math.min(screenWidth, screenHeight) / 100;
  const tileSize = Math.min(screenWidth * 0.42, 230);
  const unit = 1017 / tileSize;
  const tileRadius = tileSize * (250 / 1017);
  const lift = Math.max(18, Math.min(34, 4 * vmin));
  const nameGap = Math.max(26, Math.min(48, 6 * vmin));
  const nameSize = Math.max(34, Math.min(52, 9 * vmin));
  const tagGap = Math.max(12, Math.min(18, 2.4 * vmin));
  const tagSize = Math.max(12, Math.min(15, 2.9 * vmin));
  const slideX = -260 * unit;
  const dropY = -40 * unit;
  const shineFrom = -900 * unit;
  const shineTo = 1400 * unit;

  const paths = useMemo(
    () => ({ bar: svgPath(BAR_D), hook: svgPath(HOOK_D), dot: svgPath(DOT_D) }),
    []
  );
  const clip = useMemo(() => rrect(rect(0, 0, 1017, 1018), 250, 250), []);

  const groupY = useSharedValue(lift);
  const tileOpacity = useSharedValue(0);
  const tileScale = useSharedValue(0.7);
  const barOpacity = useSharedValue(0);
  const barX = useSharedValue(slideX);
  const hookOpacity = useSharedValue(0);
  const hookX = useSharedValue(slideX);
  const dotOpacity = useSharedValue(0);
  const dotY = useSharedValue(dropY);
  const dotScale = useSharedValue(0.01);
  const shineX = useSharedValue(shineFrom);
  const nameOpacity = useSharedValue(0);
  const nameY = useSharedValue(20);
  const tagOpacity = useSharedValue(0);
  const tagY = useSharedValue(10);

  const barTransform = useDerivedValue(() => [{ translateX: barX.value }]);
  const hookTransform = useDerivedValue(() => [{ translateX: hookX.value }]);
  const dotTransform = useDerivedValue(() => [
    { translateY: dotY.value },
    { scale: dotScale.value },
  ]);
  const shineTransform = useDerivedValue(() => [
    { translateX: shineX.value },
    { skewX: SKEW },
  ]);

  const groupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: groupY.value }],
  }));
  const tileStyle = useAnimatedStyle(() => ({
    opacity: tileOpacity.value,
    transform: [{ scale: tileScale.value }],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameY.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagY.value }],
  }));

  const nextRouteRef = useRef<string>("/(tabs)");
  const isNavigating = useRef(false);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

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

        const guestStatus = await useGuestStore.getState().initializeGuest();
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
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tracks = [
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
    ];

    const navigateNext = () => {
      if (!alive || isNavigating.current) return;
      isNavigating.current = true;
      routerRef.current.replace((nextRouteRef.current || "/(tabs)") as never);
    };

    SplashScreen.hideAsync().catch(() => {});

    const play = (reduced: boolean) => {
      if (!alive) return;
      if (reduced) {
        groupY.value = 0;
        tileOpacity.value = 1;
        tileScale.value = 1;
        barOpacity.value = 1;
        barX.value = 0;
        hookOpacity.value = 1;
        hookX.value = 0;
        dotOpacity.value = 1;
        dotY.value = 0;
        dotScale.value = 1;
        shineX.value = shineTo;
        nameOpacity.value = 1;
        nameY.value = 0;
        tagOpacity.value = 1;
        tagY.value = 0;
        timers.push(setTimeout(navigateNext, 700));
        return;
      }

      const quint = { duration: 800, easing: EASE_QUINT };
      tileOpacity.value = withDelay(150, withTiming(1, { duration: 850, easing: EASE_QUINT }));
      tileScale.value = withDelay(150, withTiming(1, { duration: 850, easing: EASE_QUINT }));

      barOpacity.value = withDelay(800, withTiming(1, { duration: 240 }));
      barX.value = withDelay(800, withTiming(0, { duration: 1200, easing: EASE_EXPO }));
      hookOpacity.value = withDelay(980, withTiming(1, { duration: 240 }));
      hookX.value = withDelay(980, withTiming(0, { duration: 1200, easing: EASE_EXPO }));

      dotOpacity.value = withDelay(1400, withTiming(1, { duration: 165 }));
      dotY.value = withDelay(1400, withTiming(0, { duration: 550, easing: EASE_BACK }));
      dotScale.value = withDelay(1400, withTiming(1, { duration: 550, easing: EASE_BACK }));

      groupY.value = withDelay(1950, withTiming(0, quint));
      nameOpacity.value = withDelay(2200, withTiming(1, quint));
      nameY.value = withDelay(2200, withTiming(0, quint));
      shineX.value = withDelay(2250, withTiming(shineTo, { duration: 800, easing: EASE_SHINE }));
      tagOpacity.value = withDelay(2700, withTiming(1, quint));
      tagY.value = withDelay(2700, withTiming(0, quint));

      timers.push(setTimeout(navigateNext, HOLD_MS));
      timers.push(setTimeout(navigateNext, HOLD_MS + 800));
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => play(reduced))
      .catch(() => play(false));

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      tracks.forEach((track) => cancelAnimation(track));
    };
  }, [
    barOpacity,
    barX,
    dotOpacity,
    dotScale,
    dotY,
    dropY,
    groupY,
    hookOpacity,
    hookX,
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
      <Animated.View style={[styles.group, groupStyle]}>
        <Animated.View
          style={[
            styles.tileShadow,
            tileStyle,
            { width: tileSize, height: tileSize, borderRadius: tileRadius },
          ]}
        >
          <Canvas style={{ width: tileSize, height: tileSize }}>
            <Group transform={[{ scaleX: tileSize / 1017 }, { scaleY: tileSize / 1018 }]}>
              <Group clip={clip}>
                <Rect x={0} y={0} width={1017} height={1018}>
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(0, 1018)}
                    colors={["#92bb2a", "#33782d"]}
                  />
                </Rect>
                <Group opacity={barOpacity} transform={barTransform}>
                  <Path path={paths.bar} color="#ffffff" />
                </Group>
                <Group opacity={hookOpacity} transform={hookTransform}>
                  <Path path={paths.hook} color="#f4f4f4" />
                </Group>
                <Group opacity={dotOpacity} origin={vec(DOT_CX, DOT_CY)} transform={dotTransform}>
                  <Path path={paths.dot} color="#ffffff" />
                </Group>
                <Group transform={shineTransform}>
                  <Rect x={0} y={-100} width={260} height={1300}>
                    <LinearGradient
                      start={vec(0, 0)}
                      end={vec(260, 0)}
                      colors={[
                        "rgba(255,255,255,0)",
                        "rgba(255,255,255,0.3)",
                        "rgba(255,255,255,0)",
                      ]}
                    />
                  </Rect>
                </Group>
              </Group>
            </Group>
          </Canvas>
        </Animated.View>

        <Animated.Text
          style={[
            styles.name,
            nameStyle,
            {
              marginTop: nameGap,
              fontSize: nameSize,
              lineHeight: nameSize,
              letterSpacing: -0.015 * nameSize,
              fontFamily,
              fontWeight: fontsLoaded ? "normal" : "500",
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
            tagStyle,
            {
              marginTop: tagGap,
              fontSize: tagSize,
              lineHeight: tagSize * 1.3,
              letterSpacing: 0.14 * tagSize,
              fontFamily,
              fontWeight: fontsLoaded ? "normal" : "500",
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
  name: {
    color: "#182812",
    textAlign: "center",
  },
  tagline: {
    color: "#6b7a62",
    textAlign: "center",
  },
});
