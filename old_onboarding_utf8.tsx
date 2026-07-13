import { useRouter } from "expo-router";
import { useRef, useState } from "react";
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

const { width, height } = Dimensions.get("window");

// ΓöÇΓöÇΓöÇ Brand palette ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const C = {
  green: "#68A03D",
  greenLight: "#8CC63F",
  greenDark: "#4B8B3B",
  greenBg: "#EAF4DA",
  white: "#FFFFFF",
  offWhite: "#F7FAF3",
  textDark: "#1C2B16",
  textMid: "#3A5A2A",
  textLight: "#6B8260",
  navy: "#1A2B4A",
  purple: "#6B45C0",
  amber: "#D97706",
};

// ΓöÇΓöÇΓöÇ Slide data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
interface Slide {
  id: string;
  emoji: string;
  emojiSecondary?: string;
  headline: string;
  subheadline?: string;
  body: string;
  accentColor: string;
  bgColor: string;
  illustration: "ecosystem" | "credits" | "community" | "goals";
}

const slides: Slide[] = [
  {
    id: "s1",
    emoji: "≡ƒÅï∩╕Å",
    emojiSecondary: "ΓÜí",
    headline: "Not just a gym.",
    subheadline: "An ecosystem.",
    body: "ZonoFit gives you flexible gym access, rewards for consistency, and tools to actually stay on track.",
    accentColor: C.green,
    bgColor: "#F0F8E8",
    illustration: "ecosystem",
  },
  {
    id: "s2",
    emoji: "≡ƒÆ│",
    emojiSecondary: "≡ƒöÑ",
    headline: "Credits that work\nfor you.",
    body: "Never lose value from a missed workout.\nYour plan converts to ZonoFit Credits ΓÇö usable at gyms, activities, and more.",
    accentColor: C.amber,
    bgColor: "#FFF8ED",
    illustration: "credits",
  },
  {
    id: "s3",
    emoji: "≡ƒñ¥",
    headline: "Stay Consistent",
    subheadline: "Fitness is better together.",
    body: "Find workout buddies, earn rewards for streaks, and celebrate progress with a community that keeps you accountable.",
    accentColor: C.purple,
    bgColor: "#F5F0FF",
    illustration: "community",
  },
  {
    id: "s4",
    emoji: "≡ƒÄ»",
    headline: "Set a goal.\nTrack it. Crush it.",
    body: "ZonoFit keeps you on timeline with visual progress, streaks, and milestone unlocks.",
    accentColor: C.greenDark,
    bgColor: C.offWhite,
    illustration: "goals",
  },
];

// ΓöÇΓöÇΓöÇ Illustration components (pure RN, no images needed) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function EcosystemIllustration() {
  const items = [
    { emoji: "≡ƒÅï∩╕Å", label: "100+ Gyms" },
    { emoji: "ΓÜí", label: "Credits" },
    { emoji: "≡ƒôì", label: "Near You" },
    { emoji: "≡ƒöÑ", label: "Streaks" },
    { emoji: "≡ƒÅà", label: "Badges" },
    { emoji: "≡ƒôà", label: "Booking" },
  ];
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.illustrationCard, { backgroundColor: "#fff" }]}>
        <View style={styles.gridWrap}>
          {items.map((item) => (
            <View key={item.label} style={[styles.gridItem, { backgroundColor: C.greenBg }]}>
              <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
              <Text style={[styles.gridLabel, { color: C.textMid }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CreditsIllustration() {
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.illustrationCard, { backgroundColor: "#fff" }]}>
        <View style={[styles.creditsBig, { backgroundColor: "#FFF3DC", borderColor: "#FBBF24" }]}>
          <Text style={{ fontSize: 32 }}>ΓÜí</Text>
          <Text style={styles.creditsCount}>420</Text>
          <Text style={styles.creditsLabel}>ZonoFit Credits</Text>
          <Text style={styles.creditsValue}>Γëê Γé╣4,200 Fitness Value</Text>
        </View>
        <View style={styles.creditsRow}>
          <View style={styles.creditsMini}>
            <Text style={styles.creditsMiniVal}>≡ƒÅï∩╕Å 8</Text>
            <Text style={styles.creditsMiniLabel}>per visit</Text>
          </View>
          <View style={[styles.creditsMini, { backgroundColor: "#E8F5E9" }]}>
            <Text style={styles.creditsMiniVal}>Γé╣80</Text>
            <Text style={styles.creditsMiniLabel}>value/visit</Text>
          </View>
          <View style={[styles.creditsMini, { backgroundColor: "#EDE9FE" }]}>
            <Text style={styles.creditsMiniVal}>ΓÖ╛∩╕Å</Text>
            <Text style={styles.creditsMiniLabel}>no expiry</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function CommunityIllustration() {
  const avatars = ["≡ƒºæΓÇì≡ƒÆ╝", "≡ƒæ⌐ΓÇì≡ƒª▒", "≡ƒºæΓÇì≡ƒª▓", "≡ƒæ⌐ΓÇì≡ƒª░"];
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.illustrationCard, { backgroundColor: "#fff" }]}>
        {/* Streak bar */}
        <View style={[styles.communityStreak, { backgroundColor: "#F5F0FF" }]}>
          <Text style={{ fontSize: 24 }}>≡ƒöÑ</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.communityStreakTitle}>14-Day Streak</Text>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={[styles.streakDot, { backgroundColor: i < 5 ? C.purple : "#DDD6FE" }]} />
              ))}
            </View>
          </View>
          <Text style={styles.communityStreakBadge}>≡ƒÅà</Text>
        </View>

        {/* Avatars */}
        <View style={styles.communityAvatarRow}>
          {avatars.map((a, i) => (
            <View key={i} style={styles.communityAvatar}>
              <Text style={{ fontSize: 22 }}>{a}</Text>
            </View>
          ))}
          <View style={[styles.communityAvatar, { backgroundColor: C.purple }]}>
            <Text style={{ color: "white", fontSize: 10, fontWeight: "700" }}>+12</Text>
          </View>
        </View>
        <Text style={styles.communityAvatarLabel}>12 friends working out this week</Text>
      </View>
    </View>
  );
}

function GoalsIllustration() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const heights = [30, 45, 55, 70, 60, 85];
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.illustrationCard, { backgroundColor: "#fff" }]}>
        <View style={styles.goalsMilestone}>
          <Text style={{ fontSize: 22 }}>≡ƒææ</Text>
          <View>
            <Text style={styles.goalsMilestoneLabel}>Next Milestone</Text>
            <Text style={styles.goalsMilestoneValue}>50 Workouts</Text>
          </View>
          <View style={[styles.goalsMilestoneBadge, { backgroundColor: C.greenBg }]}>
            <Text style={{ color: C.green, fontSize: 11, fontWeight: "700" }}>48 / 50</Text>
          </View>
        </View>

        {/* Bar chart */}
        <View style={styles.goalsChart}>
          {months.map((m, i) => (
            <View key={m} style={styles.goalsBar}>
              <View style={[styles.goalsBarFill, { height: heights[i], backgroundColor: i === 5 ? C.greenLight : "#C8E6A8" }]} />
              <Text style={styles.goalsBarLabel}>{m}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const ILLUSTRATIONS: Record<Slide["illustration"], React.ComponentType> = {
  ecosystem: EcosystemIllustration,
  credits: CreditsIllustration,
  community: CommunityIllustration,
  goals: GoalsIllustration,
};

// ΓöÇΓöÇΓöÇ Main Onboarding Screen ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === slides.length - 1;

  const goToNext = () => {
    if (isLast) {
      router.replace("/sign-up" as any);
      return;
    }
    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setActiveIndex(nextIndex);
  };

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    setActiveIndex(index);
  };

  const currentSlide = slides[activeIndex];
  const Illustration = ILLUSTRATIONS[currentSlide.illustration];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentSlide.bgColor }]} edges={["top"]}>

      {/* Skip button ΓÇö top right */}
      {!isLast && (
        <Pressable
          onPress={() => router.replace("/sign-up" as any)}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* ZonoFit wordmark ΓÇö top left */}
      <View style={styles.wordmark}>
        <Image
          /* eslint-disable-next-line @typescript-eslint/no-require-imports */
          source={require("@/assets/images/Zonofit logo.jpeg")}
          style={styles.wordmarkLogo}
          resizeMode="contain"
        />
        <Text style={styles.wordmarkText}>ZonoFit</Text>
      </View>

      {/* Slide carousel ΓÇö horizontal scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {slides.map((slide, index) => {
          const IllComp = ILLUSTRATIONS[slide.illustration];
          return (
            <View key={slide.id} style={[styles.slide, { width }]}>
              {/* Illustration area */}
              <IllComp />

              {/* Text content */}
              <View style={styles.textBlock}>
                {/* Headline */}
                <Text style={styles.headline}>{slide.headline}</Text>
                {slide.subheadline ? (
                  <Text style={[styles.subheadline, { color: slide.accentColor }]}>
                    {slide.subheadline}
                  </Text>
                ) : null}

                {/* Body */}
                <Text style={styles.body}>{slide.body}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom: dots + CTA */}
      <View style={[styles.footer, { backgroundColor: currentSlide.bgColor }]}>
        {/* Pagination dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => {
                scrollRef.current?.scrollTo({ x: i * width, animated: true });
                setActiveIndex(i);
              }}
            >
              <View
                style={[
                  styles.dot,
                  i === activeIndex
                    ? [styles.dotActive, { backgroundColor: currentSlide.accentColor }]
                    : styles.dotInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* CTA button */}
        <Pressable
          onPress={goToNext}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: currentSlide.accentColor, opacity: pressed ? 0.88 : 1 },
          ]}
          accessibilityLabel={isLast ? "Let's Start" : "Next"}
        >
          <Text style={styles.ctaText}>{isLast ? "Let's Start ≡ƒÜÇ" : "Next ΓåÆ"}</Text>
        </Pressable>

        {/* Already a member link */}
        <Pressable
          onPress={() => router.replace("/sign-in" as any)}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>
            Already a member?{" "}
            <Text style={[styles.loginLinkBold, { color: currentSlide.accentColor }]}>Log In</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ΓöÇΓöÇΓöÇ Styles ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const CARD_WIDTH = width - 48;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // Header
  skipBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 20,
  },
  skipText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textLight,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingLeft: 24,
    gap: 8,
  },
  wordmarkLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  wordmarkText: {
    fontSize: 18,
    fontWeight: "800",
    color: C.greenDark,
    letterSpacing: 0.5,
  },

  // Slide
  slide: {
    alignItems: "center",
    paddingTop: 12,
  },

  // Illustration
  illustrationContainer: {
    width: CARD_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 24,
  },
  illustrationCard: {
    width: "100%",
    borderRadius: 28,
    padding: 20,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    // Android
    elevation: 4,
  },

  // Ecosystem grid
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  gridItem: {
    width: (CARD_WIDTH - 80) / 3,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  // Credits
  creditsBig: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  creditsCount: {
    fontSize: 40,
    fontWeight: "900",
    color: C.textDark,
    marginTop: 2,
  },
  creditsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textMid,
    marginTop: 2,
  },
  creditsValue: {
    fontSize: 11,
    color: C.textLight,
    marginTop: 2,
  },
  creditsRow: {
    flexDirection: "row",
    gap: 8,
  },
  creditsMini: {
    flex: 1,
    backgroundColor: "#FFF3DC",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  creditsMiniVal: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textDark,
  },
  creditsMiniLabel: {
    fontSize: 9,
    color: C.textLight,
    marginTop: 2,
    fontWeight: "600",
  },

  // Community
  communityStreak: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },
  communityStreakTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textDark,
  },
  communityStreakBadge: {
    fontSize: 22,
  },
  streakDot: {
    width: 22,
    height: 8,
    borderRadius: 4,
  },
  communityAvatarRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  communityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  communityAvatarLabel: {
    fontSize: 11,
    color: C.textLight,
    textAlign: "center",
    fontWeight: "600",
  },

  // Goals
  goalsMilestone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    backgroundColor: C.greenBg,
    borderRadius: 16,
    padding: 14,
  },
  goalsMilestoneLabel: {
    fontSize: 10,
    color: C.textLight,
    fontWeight: "600",
  },
  goalsMilestoneValue: {
    fontSize: 14,
    fontWeight: "800",
    color: C.textDark,
  },
  goalsMilestoneBadge: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  goalsChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 100,
  },
  goalsBar: {
    alignItems: "center",
    gap: 4,
  },
  goalsBarFill: {
    width: 28,
    borderRadius: 8,
  },
  goalsBarLabel: {
    fontSize: 9,
    color: C.textLight,
    fontWeight: "600",
  },

  // Text block
  textBlock: {
    paddingHorizontal: 28,
    paddingTop: 28,
    alignItems: "center",
  },
  headline: {
    fontSize: 30,
    fontWeight: "900",
    color: C.textDark,
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 2,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: C.textLight,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    alignItems: "center",
    gap: 0,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#D1D5DB",
  },
  ctaButton: {
    width: "100%",
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    // Android
    elevation: 5,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
  loginLink: {
    paddingVertical: 6,
  },
  loginLinkText: {
    fontSize: 14,
    color: C.textLight,
    fontWeight: "500",
  },
  loginLinkBold: {
    fontWeight: "800",
  },
});

