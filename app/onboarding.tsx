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

const { width } = Dimensions.get("window");

// ─── Brand palette ────────────────────────────────────────────────────────────
const C = {
  primary: "#0B6E4F", // The requested brand green
  greenLight: "#8CC63F",
  greenBg: "#EAF4DA",
  white: "#FFFFFF",
  offWhite: "#F7FAF3",
  textDark: "#1C2B16",
  textMid: "#3A5A2A",
  textLight: "#6B8260",
  purple: "#6B45C0",
  amber: "#D97706",
  bg: "#F2F8ED",      // Light greenish background from reference
  cardBg: "#FFFFFF",
  itemBg: "#F4F8EF",  // Very light green for grid items
};

// ─── Slide data ───────────────────────────────────────────────────────────────
interface Slide {
  id: string;
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
    headline: "Not just a gym.",
    subheadline: "An ecosystem.",
    body: "ZonoFit gives you flexible gym access, rewards for consistency, and tools to actually stay on track.",
    accentColor: C.primary,
    bgColor: C.bg,
    illustration: "ecosystem",
  },
  {
    id: "s2",
    headline: "Credits that work\nfor you.",
    body: "Never lose value from a missed workout.\nYour plan converts to ZonoFit Credits — usable at gyms, activities, and more.",
    accentColor: C.amber,
    bgColor: "#FFF8ED",
    illustration: "credits",
  },
  {
    id: "s3",
    headline: "Stay Consistent",
    subheadline: "Fitness is better together.",
    body: "Find workout buddies, earn rewards for streaks, and celebrate progress with a community that keeps you accountable.",
    accentColor: C.purple,
    bgColor: "#F5F0FF",
    illustration: "community",
  },
  {
    id: "s4",
    headline: "Set a goal.\nTrack it. Crush it.",
    body: "ZonoFit keeps you on timeline with visual progress, streaks, and milestone unlocks.",
    accentColor: C.primary,
    bgColor: C.offWhite,
    illustration: "goals",
  },
];

// ─── Illustration components ──────────────────────────────────────────────────

function EcosystemIllustration() {
  const items = [
    { emoji: "🏋️", title: "100+ Gyms", desc: "Access 100+ gyms anytime" },
    { emoji: "⚡", title: "Credits", desc: "Earn credits & unlock more" },
    { emoji: "📍", title: "Near You", desc: "Find top gyms near you" },
    { emoji: "🔥", title: "Streaks", desc: "Keep your streak alive" },
    { emoji: "🏅", title: "Badges", desc: "Earn badges for milestones" },
    { emoji: "📅", title: "Booking", desc: "Book your slot easily" },
  ];
  return (
    <View style={styles.illustrationContainer}>
      <View style={styles.illustrationCard}>
        <View style={styles.gridWrap}>
          {items.map((item) => (
            <View key={item.title} style={styles.gridItem}>
              <View style={styles.iconCircle}>
                <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
              </View>
              <Text style={styles.gridTitle}>{item.title}</Text>
              <Text style={styles.gridDesc}>{item.desc}</Text>
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
      <View style={styles.illustrationCardLegacy}>
        <View style={[styles.creditsBig, { backgroundColor: "#FFF3DC", borderColor: "#FBBF24" }]}>
          <Text style={{ fontSize: 32 }}>⚡</Text>
          <Text style={styles.creditsCount}>420</Text>
          <Text style={styles.creditsLabel}>ZonoFit Credits</Text>
          <Text style={styles.creditsValue}>≈ ₹4,200 Fitness Value</Text>
        </View>
        <View style={styles.creditsRow}>
          <View style={styles.creditsMini}>
            <Text style={styles.creditsMiniVal}>🏋️ 8</Text>
            <Text style={styles.creditsMiniLabel}>per visit</Text>
          </View>
          <View style={[styles.creditsMini, { backgroundColor: "#E8F5E9" }]}>
            <Text style={styles.creditsMiniVal}>₹80</Text>
            <Text style={styles.creditsMiniLabel}>value/visit</Text>
          </View>
          <View style={[styles.creditsMini, { backgroundColor: "#EDE9FE" }]}>
            <Text style={styles.creditsMiniVal}>♾️</Text>
            <Text style={styles.creditsMiniLabel}>no expiry</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function CommunityIllustration() {
  const avatars = ["🧑‍💼", "👩‍🦱", "🧑‍🦲", "👩‍🦰"];
  return (
    <View style={styles.illustrationContainer}>
      <View style={styles.illustrationCardLegacy}>
        {/* Streak bar */}
        <View style={[styles.communityStreak, { backgroundColor: "#F5F0FF" }]}>
          <Text style={{ fontSize: 24 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.communityStreakTitle}>14-Day Streak</Text>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={[styles.streakDot, { backgroundColor: i < 5 ? C.purple : "#DDD6FE" }]} />
              ))}
            </View>
          </View>
          <Text style={styles.communityStreakBadge}>🏅</Text>
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
      <View style={styles.illustrationCardLegacy}>
        <View style={styles.goalsMilestone}>
          <Text style={{ fontSize: 22 }}>👑</Text>
          <View>
            <Text style={styles.goalsMilestoneLabel}>Next Milestone</Text>
            <Text style={styles.goalsMilestoneValue}>50 Workouts</Text>
          </View>
          <View style={[styles.goalsMilestoneBadge, { backgroundColor: C.greenBg }]}>
            <Text style={{ color: C.primary, fontSize: 11, fontWeight: "700" }}>48 / 50</Text>
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

// ─── Main Onboarding Screen ───────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === slides.length - 1;
  const currentSlide = slides[activeIndex];

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentSlide.bgColor }]} edges={["top", "bottom"]}>
      {/* Decorative leaf background (simulated via absolute positioning) */}
      <View style={[styles.bgDecorTopLeft, { backgroundColor: currentSlide.bgColor === C.bg ? "#E2F2D9" : "rgba(255,255,255,0.4)" }]} />
      <View style={[styles.bgDecorBottomRight, { backgroundColor: currentSlide.bgColor === C.bg ? "#E2F2D9" : "rgba(255,255,255,0.4)" }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.wordmark}>
          <Image
            /* eslint-disable-next-line @typescript-eslint/no-require-imports */
            source={require("@/assets/images/Zonofit logo.jpeg")}
            style={styles.wordmarkLogo}
            resizeMode="contain"
          />
          <Text style={[styles.wordmarkText, { color: currentSlide.accentColor }]}>ZonoFit</Text>
        </View>

        {!isLast && (
          <Pressable onPress={() => router.replace("/sign-up" as any)} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {slides.map((slide) => {
          const IllComp = ILLUSTRATIONS[slide.illustration];
          return (
            <View key={slide.id} style={[styles.slide, { width }]}>
              <IllComp />
              <View style={styles.textBlock}>
                <Text style={styles.headline}>
                  {slide.headline}{" "}
                  {slide.subheadline && (
                    <Text style={[styles.subheadline, { color: slide.accentColor }]}>{slide.subheadline}</Text>
                  )}
                </Text>
                <Text style={styles.body}>{slide.body}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
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

        <Pressable
          onPress={goToNext}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: currentSlide.accentColor, shadowColor: currentSlide.accentColor, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.ctaText}>{isLast ? "Get Started" : "Next →"}</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/sign-in" as any)} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>
            Already a member? <Text style={[styles.loginLinkBold, { color: currentSlide.accentColor }]}>Log In</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_WIDTH = width - 40;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  
  // Fake Background Decors
  bgDecorTopLeft: {
    position: "absolute",
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    backgroundColor: "#E2F2D9",
    borderRadius: 100,
    opacity: 0.5,
  },
  bgDecorBottomRight: {
    position: "absolute",
    bottom: -100,
    right: -50,
    width: 300,
    height: 300,
    backgroundColor: "#E2F2D9",
    borderRadius: 150,
    opacity: 0.6,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
    zIndex: 10,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wordmarkLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  wordmarkText: {
    fontSize: 20,
    fontWeight: "800",
    color: C.primary,
    letterSpacing: -0.5,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 20,
  },
  skipText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textLight,
  },

  // Slide
  slide: {
    alignItems: "center",
  },

  // Illustration Shared
  illustrationContainer: {
    width: CARD_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 30,
  },
  illustrationCard: {
    width: "100%",
    backgroundColor: C.cardBg,
    borderRadius: 32,
    padding: 16,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    // Android
    elevation: 3,
  },
  illustrationCardLegacy: {
    width: "100%",
    borderRadius: 28,
    backgroundColor: "#fff",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  // Ecosystem grid
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%",
    backgroundColor: C.itemBg,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 4,
    textAlign: "center",
  },
  gridDesc: {
    fontSize: 10,
    color: C.textLight,
    textAlign: "center",
    lineHeight: 14,
  },

  // Credits Legacy
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

  // Community Legacy
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

  // Goals Legacy
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
    paddingHorizontal: 30,
    alignItems: "center",
  },
  headline: {
    fontSize: 34,
    fontWeight: "900",
    color: C.textDark,
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -1,
  },
  subheadline: {
    color: C.primary,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: C.textLight,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
    paddingHorizontal: 10,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: C.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#D1D5DB",
  },
  ctaButton: {
    width: "100%",
    height: 56,
    backgroundColor: C.primary,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  loginLink: {
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: C.textLight,
    fontWeight: "500",
  },
  loginLinkBold: {
    fontWeight: "700",
    color: C.primary,
  },
});
