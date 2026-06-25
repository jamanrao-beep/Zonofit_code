import { useAuth } from "@clerk/clerk-expo";
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Canvas, Circle, RadialGradient, vec } from "@shopify/react-native-skia";

const { width } = Dimensions.get("window");

// ZonoFit brand palette
const C = {
  light: "#8CC63F",
  mid: "#68A03D",
  dark: "#4B8B3B",
  white: "#FFFFFF",
  whiteAlpha70: "rgba(255,255,255,0.70)",
  whiteAlpha40: "rgba(255,255,255,0.40)",
  whiteAlpha15: "rgba(255,255,255,0.15)",
};

// Minimum time to show the splash so the animation has room to breathe
const MIN_SPLASH_MS = 3000;

export default function SplashAnimationScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const mountTime = useRef(Date.now());
  const isSignedInRef = useRef(isSignedIn);

  // Sync latest auth state into a ref so the setTimeout callback
  // always reads the most recent value without re-creating the timer.
  useEffect(() => {
    isSignedInRef.current = isSignedIn;
  }, [isSignedIn]);

  // ─── Animation shared values ───────────────────────────────────────────────
  // Outer ring pulse
  const ring1Scale = useSharedValue(0.6);
  const ring1Opacity = useSharedValue(0);
  // Spinning decorative ring
  const spinRotation = useSharedValue(0);
  // Skia glow pulse
  const glowPulse = useSharedValue(0.7);
  // Logo container
  const logoScale = useSharedValue(0.55);
  const logoOpacity = useSharedValue(0);
  // Brand name
  const textTranslateY = useSharedValue(20);
  const textOpacity = useSharedValue(0);
  // Tagline
  const taglineOpacity = useSharedValue(0);
  // Bottom badge
  const badgeOpacity = useSharedValue(0);

  // ─── Kick off animation sequence on mount ─────────────────────────────────
  useEffect(() => {
    // Dismiss native splash as soon as our animated splash mounts
    SplashScreen.hideAsync();

    // Outer ring expands + fades
    ring1Opacity.value = withTiming(1, { duration: 400 });
    ring1Scale.value = withSpring(1, { damping: 12, stiffness: 80 });

    // Spinning outer decoration ring — slow continuous rotation
    spinRotation.value = withDelay(
      300,
      withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false)
    );

    // Skia glow pulse
    glowPulse.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Logo springs into view
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    logoScale.value = withDelay(
      200,
      withSpring(1, { damping: 14, stiffness: 90 })
    );

    // Brand name slides up
    textOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    textTranslateY.value = withDelay(
      700,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) })
    );

    // Tagline fades in
    taglineOpacity.value = withDelay(1050, withTiming(1, { duration: 500 }));

    // Bottom badge fades in
    badgeOpacity.value = withDelay(1400, withTiming(1, { duration: 600 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Navigate once Clerk is ready + minimum duration has elapsed ───────────
  useEffect(() => {
    if (!isLoaded) return;

    const elapsed = Date.now() - mountTime.current;
    const delay = Math.max(0, MIN_SPLASH_MS - elapsed);

    const timer = setTimeout(() => {
      if (isSignedInRef.current) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Animated styles ──────────────────────────────────────────────────────
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
    opacity: ring1Opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  const GLOW_SIZE = OUTER_RING_SIZE + 80;

  return (
    <View style={styles.container}>
      {/* Layered gradient effect ─ top highlight */}
      <View style={styles.gradientHighlight} />

      {/* Skia radial glow orb behind everything */}
      <View style={[styles.glowContainer, { width: GLOW_SIZE, height: GLOW_SIZE }]} pointerEvents="none">
        <Canvas style={{ width: GLOW_SIZE, height: GLOW_SIZE }}>
          <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2}>
            <RadialGradient
              c={vec(GLOW_SIZE / 2, GLOW_SIZE / 2)}
              r={GLOW_SIZE / 2}
              colors={["rgba(140,198,63,0.45)", "rgba(107,203,119,0.18)", "transparent"]}
              positions={[0, 0.5, 1]}
            />
          </Circle>
        </Canvas>
      </View>

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Spinning outer decoration ring */}
        <Animated.View style={[styles.spinRing, spinStyle]} />

        {/* Outer decorative ring */}
        <Animated.View style={[styles.outerRing, ringStyle]}>
          {/* Inner decorative ring */}
          <View style={styles.innerRing}>
            {/* Logo card */}
            <Animated.View style={[styles.logoCard, logoStyle]}>
              <Image
                /* eslint-disable-next-line @typescript-eslint/no-require-imports */
                source={require("@/assets/images/Zonofit logo.jpeg")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Brand name */}
        <Animated.Text style={[styles.brandName, textStyle]}>
          ZonoFit
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Your Flexible Fitness Network
        </Animated.Text>
      </View>

      {/* Bottom badge */}
      <Animated.View style={[styles.bottomBadge, badgeStyle]}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </Animated.View>
    </View>
  );
}

const LOGO_CARD_SIZE = 148;
const INNER_RING_SIZE = LOGO_CARD_SIZE + 28;
const OUTER_RING_SIZE = INNER_RING_SIZE + 28;
const SPIN_RING_SIZE = OUTER_RING_SIZE + 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  glowContainer: {
    position: "absolute",
    alignSelf: "center",
  },
  gradientHighlight: {
    ...StyleSheet.absoluteFill,
    top: 0,
    height: "55%",
    backgroundColor: C.light,
    opacity: 0.28,
    borderBottomLeftRadius: width / 1.2,
    borderBottomRightRadius: width / 1.2,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  spinRing: {
    position: "absolute",
    width: SPIN_RING_SIZE,
    height: SPIN_RING_SIZE,
    borderRadius: SPIN_RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    borderStyle: "dashed",
  },
  outerRing: {
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    borderRadius: OUTER_RING_SIZE / 2,
    backgroundColor: C.whiteAlpha15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  innerRing: {
    width: INNER_RING_SIZE,
    height: INNER_RING_SIZE,
    borderRadius: INNER_RING_SIZE / 2,
    backgroundColor: C.whiteAlpha40,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCard: {
    width: LOGO_CARD_SIZE,
    height: LOGO_CARD_SIZE,
    borderRadius: LOGO_CARD_SIZE * 0.25,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    // Android shadow
    elevation: 14,
    overflow: "visible",
  },
  logoImage: {
    width: LOGO_CARD_SIZE - 16,
    height: LOGO_CARD_SIZE - 16,
    borderRadius: (LOGO_CARD_SIZE - 16) * 0.22,
  },
  brandName: {
    fontSize: 44,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "500",
    color: C.whiteAlpha70,
    letterSpacing: 0.4,
  },
  bottomBadge: {
    position: "absolute",
    bottom: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.whiteAlpha40,
  },
  dotActive: {
    width: 22,
    backgroundColor: C.white,
  },
});
