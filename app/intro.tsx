import { useRouter } from "expo-router";
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

// Exact color palette matching the shared Lovable reference screens
const C = {
  primaryGreen: "#70B339", // Vibrant ZonoFit apple green for CTA and highlights
  primaryGreenDark: "#5E9B2D",
  lightGreenBg: "#F0FDF4",
  borderGreen: "#BBF7D0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  cardBorder: "#E2E8F0",
  dotInactive: "#E2E8F0",
  white: "#FFFFFF",
};

// ─── Slide 1: Animated Man with Orbiting Life Categories ───────────
function Slide1Illustration() {
  const angle = useSharedValue(0);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Circular motion for the central man ("make him round moving")
  const manAnimatedStyle = useAnimatedStyle(() => {
    const radius = 10;
    const tx = Math.cos(angle.value) * radius;
    const ty = Math.sin(angle.value) * radius;
    return {
      transform: [{ translateX: tx }, { translateY: ty }],
    };
  });

  // Gentle floating for the orbiting life pills
  const pillStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle.value + Math.PI / 4) * 6 },
      { translateY: Math.sin(angle.value + Math.PI / 4) * 6 },
    ],
  }));

  const pillStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle.value + (3 * Math.PI) / 4) * 6 },
      { translateY: Math.sin(angle.value + (3 * Math.PI) / 4) * 6 },
    ],
  }));

  const pillStyle3 = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle.value + (5 * Math.PI) / 4) * 6 },
      { translateY: Math.sin(angle.value + (5 * Math.PI) / 4) * 6 },
    ],
  }));

  const pillStyle4 = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle.value + (7 * Math.PI) / 4) * 6 },
      { translateY: Math.sin(angle.value + (7 * Math.PI) / 4) * 6 },
    ],
  }));

  return (
    <View style={styles.illContainer}>
      {/* Soft ambient background glow */}
      <View style={styles.ambientGlow} />

      {/* Floating Life Category Pills */}
      <Animated.View style={[styles.floatingPill, { top: 25, left: 35 }, pillStyle1]}>
        <Text style={styles.floatingPillText}>Work</Text>
      </Animated.View>

      <Animated.View style={[styles.floatingPill, { top: 40, right: 35 }, pillStyle2]}>
        <Text style={styles.floatingPillText}>Study</Text>
      </Animated.View>

      <Animated.View style={[styles.floatingPill, { bottom: 45, left: 40 }, pillStyle3]}>
        <Text style={styles.floatingPillText}>Family</Text>
      </Animated.View>

      <Animated.View style={[styles.floatingPill, { bottom: 30, right: 40 }, pillStyle4]}>
        <Text style={styles.floatingPillText}>Travel</Text>
      </Animated.View>

      {/* Animated Man Character */}
      <Animated.View style={[styles.manWrapper, manAnimatedStyle]}>
        <Image
          source={require("@/assets/images/onboarding-man.jpg")}
          style={styles.manImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

// ─── Slide 2: Traditional vs ZonoFit Comparison ───────────────────
function Slide2Illustration() {
  return (
    <View style={styles.illContainer}>
      <View style={styles.comparisonRow}>
        {/* Left: Traditional Card */}
        <View style={styles.tradCard}>
          <Text style={styles.tradTitle}>TRADITIONAL</Text>
          <View style={styles.tradGrid}>
            {Array.from({ length: 16 }).map((_, i) => (
              <View key={i} style={styles.tradBlock} />
            ))}
          </View>
          <Text style={styles.tradBottomText}>Unused value fades away</Text>
        </View>

        {/* Right: ZonoFit Card */}
        <View style={styles.zonoCard}>
          <Text style={styles.zonoTitle}>ZONOFIT</Text>
          
          {/* Top Credits Pill */}
          <View style={styles.zonoCreditsRow}>
            <View style={styles.zonoCreditIcon}>
              <Text style={styles.zonoCreditIconText}>C</Text>
            </View>
            <Text style={styles.zonoCreditsLabel}>Credits</Text>
          </View>

          {/* Dashed connector line */}
          <View style={styles.dashedBranch} />

          {/* 4 Feature Circles */}
          <View style={styles.zonoFeaturesGrid}>
            <View style={styles.zonoFeatureItem}>
              <View style={styles.zonoFeatureCircle}>
                <Ionicons name="barbell-outline" size={16} color="#70B339" />
              </View>
              <Text style={styles.zonoFeatureText}>Gym</Text>
            </View>

            <View style={styles.zonoFeatureItem}>
              <View style={styles.zonoFeatureCircle}>
                <Ionicons name="trophy-outline" size={16} color="#70B339" />
              </View>
              <Text style={styles.zonoFeatureText}>Sports</Text>
            </View>

            <View style={styles.zonoFeatureItem}>
              <View style={styles.zonoFeatureCircle}>
                <Ionicons name="leaf-outline" size={16} color="#70B339" />
              </View>
              <Text style={styles.zonoFeatureText}>Wellness</Text>
            </View>

            <View style={styles.zonoFeatureItem}>
              <View style={styles.zonoFeatureCircle}>
                <Ionicons name="sparkles-outline" size={16} color="#70B339" />
              </View>
              <Text style={styles.zonoFeatureText}>Experiences</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Slide 3: QR Check-in Phone Mockup ────────────────────────────
function Slide3Illustration() {
  return (
    <View style={styles.illContainer}>
      <View style={styles.phoneFrame}>
        {/* Speaker notch */}
        <View style={styles.phoneSpeaker} />

        {/* Screen Content */}
        <View style={styles.phoneInner}>
          <View style={styles.qrIconWrap}>
            <Ionicons name="qr-code" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.phoneTitle}>QR Check-in</Text>
          <Text style={styles.phoneSubtitle}>Scan and you're in</Text>

          {/* Mini phone screen dots */}
          <View style={styles.phoneDots}>
            <View style={styles.phoneDot} />
            <View style={styles.phoneDotActive} />
            <View style={styles.phoneDot} />
            <View style={styles.phoneDot} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Slide 4: Vertical Roadmap Timeline ───────────────────────────
function Slide4Illustration() {
  const steps = [
    { title: "Create Account", active: true },
    { title: "Choose Goal", active: false },
    { title: "Choose Primary Gym", active: false },
    { title: "Start Training", active: false },
    { title: "Stay Consistent", active: false },
  ];

  return (
    <View style={styles.illContainer}>
      <View style={styles.timelineCard}>
        {steps.map((step, idx) => (
          <View key={step.title} style={styles.timelineRow}>
            {/* Indicator + vertical connector */}
            <View style={styles.indicatorCol}>
              <View style={step.active ? styles.stepCircleActive : styles.stepCircleInactive}>
                {step.active && <View style={styles.stepCircleInner} />}
              </View>
              {idx < steps.length - 1 && <View style={styles.timelineLine} />}
            </View>
            {/* Step label */}
            <Text style={[styles.stepText, step.active && styles.stepTextActive]}>
              {step.title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Onboarding Screen ───────────────────────────────────────
export default function IntroScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === 3;

  const handleFinish = useCallback(() => {
    router.replace("/(auth)/create-account");
  }, [router]);

  const goToNext = useCallback(() => {
    if (isLast) {
      handleFinish();
      return;
    }
    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setActiveIndex(nextIndex);
  }, [isLast, activeIndex, handleFinish]);

  const onScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    if (index >= 0 && index <= 3) {
      setActiveIndex(index);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Slide Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* ── Slide 1 ── */}
        <View style={[styles.slide, { width }]}>
          <Slide1Illustration />
          <View style={styles.textBlock}>
            <Text style={styles.headline}>Fitness should fit your life.</Text>
            <Text style={styles.subheadline}>Not the other way around.</Text>
          </View>
        </View>

        {/* ── Slide 2 ── */}
        <View style={[styles.slide, { width }]}>
          <Slide2Illustration />
          <View style={styles.textBlock}>
            <Text style={styles.headline}>
              Stop paying for workouts{"\n"}you never use.
            </Text>
            <Text style={styles.subheadline}>
              Traditional memberships reward perfect{"\n"}consistency. Life isn't perfect.
            </Text>
          </View>
        </View>

        {/* ── Slide 3 ── */}
        <View style={[styles.slide, { width }]}>
          <Slide3Illustration />
          <View style={styles.textBlock}>
            <Text style={styles.headline}>
              One membership.{"\n"}Endless possibilities.
            </Text>
            <Text style={styles.subheadline}>
              Book workouts, earn value and explore{"\n"}partner gyms.
            </Text>

            {/* 2x2 Feature Checkmarks */}
            <View style={styles.checklistGrid}>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark" size={15} color="#70B339" style={{ marginRight: 6 }} />
                <Text style={styles.checkText}>Flexible Membership</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark" size={15} color="#70B339" style={{ marginRight: 6 }} />
                <Text style={styles.checkText}>Verified Partner Gyms</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark" size={15} color="#70B339" style={{ marginRight: 6 }} />
                <Text style={styles.checkText}>Seamless Booking</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark" size={15} color="#70B339" style={{ marginRight: 6 }} />
                <Text style={styles.checkText}>Smart Credit Wallet</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Slide 4 ── */}
        <View style={[styles.slide, { width }]}>
          <Slide4Illustration />
          <View style={styles.textBlock}>
            <Text style={styles.headline}>Ready to begin?</Text>
            <Text style={styles.subheadline}>
              Let's build a fitness journey that actually{"\n"}works for you.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Footer: Dots, Continue Button & Login Link ── */}
      <View style={styles.footer}>
        {/* 4 Pagination Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((i) => {
            const isActive = i === activeIndex;
            return (
              <Pressable
                key={i}
                onPress={() => {
                  scrollRef.current?.scrollTo({ x: i * width, animated: true });
                  setActiveIndex(i);
                }}
                hitSlop={10}
              >
                <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
              </Pressable>
            );
          })}
        </View>

        {/* Continue CTA Button */}
        <Pressable
          onPress={goToNext}
          style={({ pressed }) => [
            styles.continueBtn,
            { opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>

        {/* I already have an account */}
        <Pressable onPress={handleFinish} hitSlop={10} style={styles.accountLink}>
          <Text style={styles.accountLinkText}>I already have an account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.white,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 10,
  },
  illContainer: {
    height: 310,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  ambientGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(240, 253, 244, 0.7)",
  },

  // Slide 1: Animated Man
  manWrapper: {
    width: 170,
    height: 230,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  manImage: {
    width: "100%",
    height: "100%",
  },
  floatingPill: {
    position: "absolute",
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    zIndex: 20,
  },
  floatingPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
  },

  // Slide 2: Comparison Cards
  comparisonRow: {
    flexDirection: "row",
    gap: 14,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  tradCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  tradTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  tradGrid: {
    width: 112,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  tradBlock: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tradBottomText: {
    fontSize: 9.5,
    color: "#94A3B8",
    marginTop: 14,
    textAlign: "center",
  },

  zonoCard: {
    flex: 1,
    backgroundColor: "#F2FBF0",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#D1F2B0",
    padding: 16,
    alignItems: "center",
  },
  zonoTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4D8520",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  zonoCreditsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1F2B0",
  },
  zonoCreditIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#70B339",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  zonoCreditIconText: {
    color: C.white,
    fontSize: 11,
    fontWeight: "800",
  },
  zonoCreditsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  dashedBranch: {
    width: 60,
    height: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#A3E635",
    borderStyle: "dashed",
    marginVertical: 4,
  },
  zonoFeaturesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 120,
    gap: 8,
    justifyContent: "center",
  },
  zonoFeatureItem: {
    alignItems: "center",
    width: 54,
  },
  zonoFeatureCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1F2B0",
    marginBottom: 4,
  },
  zonoFeatureText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#334155",
  },

  // Slide 3: Phone Mockup
  phoneFrame: {
    width: 175,
    height: 245,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "#F1F5F9",
    backgroundColor: C.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    padding: 10,
    alignItems: "center",
  },
  phoneSpeaker: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 28,
  },
  phoneInner: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  qrIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#70B339",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  phoneTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 3,
  },
  phoneSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 20,
  },
  phoneDots: {
    flexDirection: "row",
    gap: 4,
  },
  phoneDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
  },
  phoneDotActive: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#70B339",
  },

  checklistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
    gap: 10,
    justifyContent: "center",
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "46%",
  },
  checkText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },

  // Slide 4: Vertical Timeline
  timelineCard: {
    width: "82%",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  indicatorCol: {
    alignItems: "center",
    marginRight: 16,
    width: 22,
  },
  stepCircleActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: "#70B339",
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#70B339",
  },
  stepCircleInactive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#C5E6A3",
    backgroundColor: C.white,
  },
  timelineLine: {
    width: 1.5,
    height: 24,
    backgroundColor: "#E2F0D5",
    marginVertical: 2,
  },
  stepText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 0,
  },
  stepTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },

  // Typography
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 10,
  },
  headline: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: 34,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 14,
    fontWeight: "400",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
  },

  // Footer & Buttons
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 10,
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#70B339",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#E2E8F0",
  },
  continueBtn: {
    width: "100%",
    height: 52,
    borderRadius: 26,
    backgroundColor: "#70B339",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#70B339",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  continueBtnText: {
    fontSize: 15.5,
    fontWeight: "700",
    color: C.white,
    letterSpacing: 0.2,
  },
  accountLink: {
    marginTop: 14,
    paddingVertical: 4,
  },
  accountLinkText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
});
