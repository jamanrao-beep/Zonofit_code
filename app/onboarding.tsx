import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const C = {
  primary: "#328B57", // Vibrant ZonoFit Green from reference
  lightGreen: "#EAF4DA",
  lightGreen2: "#D8EAC2",
  textDark: "#111827",
  textMid: "#4B5563",
  white: "#FFFFFF",
  dotsGrey: "#E5E7EB",
};

interface Slide {
  id: string;
  headlineLine1: string;
  headlineLine2: string;
  body: string;
  illustration: "fitness" | "money" | "anywhere" | "consistency";
}

const slides: Slide[] = [
  {
    id: "s1",
    headlineLine1: "Choose",
    headlineLine2: "Your Fitness",
    body: "One membership.\nMultiple gyms.\nEndless possibilities.",
    illustration: "fitness",
  },
  {
    id: "s2",
    headlineLine1: "Never Lose",
    headlineLine2: "Your Money",
    body: "Missed days become credits.\n\nCan't make it to the gym?\nYour unused workout days\nturn into credits you can use for\npartner gyms and other\nfitness experiences.",
    illustration: "money",
  },
  {
    id: "s3",
    headlineLine1: "Train",
    headlineLine2: "Anywhere",
    body: "Discover and book workouts\nat partner gyms across the city\nwhenever it suits your schedule.",
    illustration: "anywhere",
  },
  {
    id: "s4",
    headlineLine1: "Consistency",
    headlineLine2: "Pays Off",
    body: "Stay consistent, unlock\nrewards, and make every\nworkout count.",
    illustration: "consistency",
  },
];

// ─── Illustrations ─────────────────────────────────────────────────────────────

function FitnessIllustration() {
  return (
    <View style={styles.illContainer}>
      {/* Background buildings */}
      <View style={[styles.fitnessCard, { position: "absolute", top: 40, left: -20, transform: [{ scale: 0.8 }], backgroundColor: "#F3F4F6" }]}>
        <View style={[styles.gymPin, { backgroundColor: "#9CA3AF" }]}><Ionicons name="location" size={16} color="white" /></View>
        <Text style={[styles.fitnessCardText, { color: "#9CA3AF" }]}>GYM</Text>
      </View>
      <View style={[styles.fitnessCard, { position: "absolute", top: 80, right: 0, transform: [{ scale: 0.9 }], backgroundColor: "#F3F4F6" }]}>
        <View style={[styles.gymPin, { backgroundColor: "#9CA3AF" }]}><Ionicons name="location" size={16} color="white" /></View>
        <Text style={[styles.fitnessCardText, { color: "#9CA3AF" }]}>GYM</Text>
      </View>
      
      {/* Main building */}
      <View style={[styles.fitnessCard, { marginTop: -40 }]}>
        <View style={styles.gymPin}><Ionicons name="location" size={20} color="white" /></View>
        <Text style={styles.fitnessCardText}>GYM</Text>
      </View>

      {/* Character */}
      <View style={styles.personWrap}>
        <Text style={{ fontSize: 90 }}>🧍🏻‍♂️</Text>
        <View style={styles.bagTag}>
          <Text style={{ fontSize: 32 }}>👜</Text>
          <View style={styles.bagLogo}><Text style={{ color: "white", fontWeight: "bold", fontSize: 10 }}>Z</Text></View>
        </View>
      </View>
    </View>
  );
}

function MoneyIllustration() {
  return (
    <View style={styles.illContainer}>
      <View style={styles.moneyTop}>
        {/* Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader} />
          <View style={styles.calendarGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <View key={i} style={[styles.calSquare, i === 5 && styles.calSquareActive]}>
                {i === 5 && <Ionicons name="close" size={12} color="white" />}
              </View>
            ))}
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowWrap}>
          <Ionicons name="arrow-redo" size={24} color={C.lightGreen2} style={{ transform: [{ rotate: "45deg" }] }} />
        </View>

        {/* Wallet */}
        <View style={styles.walletCard}>
          <View style={styles.walletFlap} />
          <View style={styles.zCoin}>
            <Text style={styles.zCoinText}>Z</Text>
          </View>
          <Text style={styles.walletText}>Credits Added</Text>
        </View>
      </View>

      {/* 3 Pills */}
      <View style={styles.pillsRow}>
        <View style={styles.pill}>
          <Text style={styles.pillIcon}>🏋️</Text>
          <Text style={styles.pillText}>Partner{"\n"}Gyms</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillIcon}>🎾</Text>
          <Text style={styles.pillText}>Sports</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillIcon}>🌿</Text>
          <Text style={styles.pillText}>Wellness{"\n"}& More</Text>
        </View>
      </View>
    </View>
  );
}

function AnywhereIllustration() {
  return (
    <View style={styles.illContainer}>
      <View style={styles.phoneFrame}>
        <View style={styles.phoneNotch} />
        {/* Map pins */}
        <View style={[styles.phonePin, { top: 60, left: 20 }]}><Ionicons name="location" size={20} color="white" /></View>
        <View style={[styles.phonePin, { top: 160, left: 40 }]}><Ionicons name="location" size={20} color="white" /></View>
        <View style={[styles.phonePin, { top: 260, left: 25 }]}><Ionicons name="location" size={20} color="white" /></View>

        {/* Gym List */}
        <View style={styles.gymList}>
          {["Being Fitness", "Fitness Zone", "Rnold Fitness"].map((name, i) => (
            <View key={name} style={styles.phoneGymCard}>
              <View style={styles.phoneGymImg}>
                <Ionicons name="barbell" size={14} color="white" />
              </View>
              <View style={styles.phoneGymInfo}>
                <Text style={styles.phoneGymName}>{name}</Text>
                <Text style={styles.phoneGymDist}>{(1.2 + i * 1.2).toFixed(1)} km</Text>
                <Text style={styles.phoneGymRating}>⭐ {(4.8 - i * 0.1).toFixed(1)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function ConsistencyIllustration() {
  return (
    <View style={styles.illContainer}>
      <View style={styles.consistencyRow}>
        <View style={styles.flexPerson}>
          <Text style={{ fontSize: 90 }}>🧍🏻</Text>
          <Text style={{ fontSize: 40, position: "absolute", left: -25, top: 10, transform: [{ scaleX: -1 }] }}>💪🏼</Text>
        </View>
        
        <View style={styles.circleProgressWrap}>
          <View style={styles.circleTrack} />
          <View style={styles.circleFill} />
          <View style={styles.circleInner}>
            <View style={styles.trophyIcon}><Ionicons name="trophy" size={24} color="white" /></View>
            <Text style={styles.circleText}>Your{"\n"}Fitness{"\n"}Journey</Text>
          </View>
        </View>
      </View>

      <View style={styles.rewardsList}>
        <View style={styles.rewardPill}>
          <View style={[styles.rewardIconBg, { backgroundColor: "#E6F4EA" }]}>
            <Ionicons name="wallet" size={18} color={C.primary} />
          </View>
          <Text style={styles.rewardText}>Earn Credits</Text>
        </View>
        <View style={styles.rewardPill}>
          <View style={[styles.rewardIconBg, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="trophy" size={18} color="#D97706" />
          </View>
          <Text style={styles.rewardText}>Unlock Rewards</Text>
        </View>
        <View style={styles.rewardPill}>
          <View style={[styles.rewardIconBg, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="target" size={18} color="#2563EB" />
          </View>
          <Text style={styles.rewardText}>Reach Your Goals</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  return (
    <View style={styles.container}>
      {/* Decorative Blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />
      <View style={styles.blobMiddleRight} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.logoText}>ZonoFit.</Text>
        <View style={styles.topDots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.topDot,
                { backgroundColor: i <= activeIndex ? C.primary : C.dotsGrey },
              ]}
            />
          ))}
        </View>
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
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <View style={styles.textBlock}>
              <Text style={styles.headline}>
                {slide.headlineLine1}
                {"\n"}
                <Text style={{ color: C.primary }}>{slide.headlineLine2}</Text>
              </Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>

            <View style={styles.illustrationWrap}>
              {slide.illustration === "fitness" && <FitnessIllustration />}
              {slide.illustration === "money" && <MoneyIllustration />}
              {slide.illustration === "anywhere" && <AnywhereIllustration />}
              {slide.illustration === "consistency" && <ConsistencyIllustration />}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer Area */}
      <View style={styles.footerContainer}>
        {/* Pagination Dots */}
        <View style={[styles.pagination, { marginBottom: isLast ? 24 : 32 }]}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.pageDot,
                i === activeIndex ? styles.pageDotActive : null,
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        {!isLast ? (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, paddingTop: 16 }]}>
            <Pressable onPress={() => router.replace("/sign-up" as any)} style={styles.bottomBtnLeft}>
              <Text style={styles.bottomBtnText}>SKIP</Text>
            </Pressable>
            <Pressable onPress={goToNext} style={styles.bottomBtnRight}>
              <Text style={styles.bottomBtnText}>NEXT →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.lastPageFooter, { paddingBottom: insets.bottom + 20 }]}>
            <Pressable onPress={() => router.replace("/sign-up" as any)} style={styles.getStartedBtn}>
              <Text style={styles.getStartedText}>GET STARTED →</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/sign-in" as any)} style={styles.signInBtn}>
              <Text style={styles.signInText}>
                Already have an account? <Text style={styles.signInLink}>Sign In</Text>
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.white,
  },

  // Abstract Background Decor
  blobTopRight: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: C.lightGreen,
    opacity: 0.7,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: 50,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.lightGreen,
    opacity: 0.7,
  },
  blobMiddleRight: {
    position: "absolute",
    top: "40%",
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.lightGreen,
    opacity: 0.5,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    zIndex: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "800",
    color: C.textDark,
  },
  topDots: {
    flexDirection: "row",
    gap: 6,
  },
  topDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Slide Layout
  slide: {
    flex: 1,
  },
  textBlock: {
    paddingHorizontal: 30,
    paddingTop: 40,
    zIndex: 10,
  },
  headline: {
    fontSize: 38,
    fontWeight: "900",
    color: C.textDark,
    lineHeight: 44,
    letterSpacing: -1,
  },
  body: {
    fontSize: 15,
    fontWeight: "500",
    color: C.textMid,
    lineHeight: 24,
    marginTop: 20,
    paddingRight: 40,
  },

  illustrationWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  illContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  // --- Illustration 1: Fitness ---
  fitnessCard: {
    backgroundColor: C.white,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    width: 140,
  },
  gymPin: {
    backgroundColor: C.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    marginTop: -40, // pop out top
  },
  fitnessCardText: {
    fontSize: 22,
    fontWeight: "900",
    color: C.textDark,
    letterSpacing: 1,
  },
  personWrap: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  bagTag: {
    marginLeft: -10,
    marginTop: 30,
    alignItems: "center",
  },
  bagLogo: {
    position: "absolute",
    bottom: 5,
    backgroundColor: C.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // --- Illustration 2: Money ---
  moneyTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 40,
  },
  calendarCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    width: 110,
    height: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    overflow: "hidden",
  },
  calendarHeader: {
    height: 30,
    backgroundColor: C.primary,
  },
  calendarGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    gap: 6,
    justifyContent: "center",
    alignContent: "center",
  },
  calSquare: {
    width: 20,
    height: 20,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  calSquareActive: {
    backgroundColor: C.primary,
  },
  arrowWrap: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: C.lightGreen2,
    padding: 10,
    borderRadius: 30,
  },
  walletCard: {
    backgroundColor: C.primary,
    borderRadius: 16,
    width: 120,
    height: 90,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  walletFlap: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 30,
    backgroundColor: "#297A4A",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  zCoin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FBBF24",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  zCoinText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#B45309",
  },
  walletText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 20,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  pill: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: 90,
  },
  pillIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textDark,
    textAlign: "center",
  },

  // --- Illustration 3: Anywhere ---
  phoneFrame: {
    width: 220,
    height: 360,
    backgroundColor: "#F9FAFB",
    borderRadius: 36,
    borderWidth: 6,
    borderColor: "#E5E7EB",
    position: "relative",
    overflow: "hidden",
  },
  phoneNotch: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 80,
    height: 20,
    backgroundColor: "#E5E7EB",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  phonePin: {
    position: "absolute",
    backgroundColor: C.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gymList: {
    position: "absolute",
    right: -10,
    top: 100,
    gap: 12,
  },
  phoneGymCard: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 8,
    width: 140,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneGymImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  phoneGymInfo: {
    flex: 1,
  },
  phoneGymName: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textDark,
  },
  phoneGymDist: {
    fontSize: 9,
    color: C.textMid,
    marginTop: 2,
  },
  phoneGymRating: {
    fontSize: 9,
    color: "#D97706",
    fontWeight: "700",
    marginTop: 2,
  },

  // --- Illustration 4: Consistency ---
  consistencyRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
    marginBottom: 40,
    paddingRight: 20,
  },
  flexPerson: {
    marginRight: -20,
    zIndex: 10,
  },
  circleProgressWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  circleTrack: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 12,
    borderColor: "#E5E7EB",
  },
  circleFill: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 12,
    borderColor: C.primary,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    transform: [{ rotate: "-45deg" }],
  },
  circleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  trophyIcon: {
    backgroundColor: C.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  circleText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.textDark,
    textAlign: "center",
  },
  rewardsList: {
    width: "100%",
    gap: 12,
    alignItems: "center",
  },
  rewardPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    padding: 10,
    borderRadius: 30,
    width: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rewardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textDark,
  },

  // Footer / Pagination
  footerContainer: {
    width: "100%",
    alignItems: "center",
  },
  pagination: {
    flexDirection: "row",
    gap: 6,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.dotsGrey,
  },
  pageDotActive: {
    width: 24,
    backgroundColor: C.primary,
  },

  // Bottom Bar (Slides 1, 2, 3)
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: C.primary,
    paddingHorizontal: 30,
  },
  bottomBtnLeft: {
    paddingVertical: 20,
    paddingRight: 40,
  },
  bottomBtnRight: {
    paddingVertical: 20,
    paddingLeft: 40,
  },
  bottomBtnText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // Last Page Footer (Slide 4)
  lastPageFooter: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  getStartedBtn: {
    width: "100%",
    height: 56,
    backgroundColor: C.primary,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 0.5,
  },
  signInBtn: {
    paddingVertical: 8,
  },
  signInText: {
    fontSize: 14,
    color: C.textMid,
    fontWeight: "500",
  },
  signInLink: {
    color: C.primary,
    fontWeight: "700",
  },
});
