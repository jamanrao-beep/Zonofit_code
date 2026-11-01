import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Canvas, Circle, LinearGradient, Path, Rect, Skia, vec } from "@shopify/react-native-skia";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { useCreditsStore, type Transaction } from "@/store/useCreditsStore";
import { useUserStore } from "@/store/useUserStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useBookingStore } from "@/store/useBookingStore";
import { SwipeableTabScreen } from "@/components/SwipeableTabScreen";
import { CREDIT_FITNESS_VALUE } from "@/constants/credits";

const MIN_CREDITS = 10;
const MAX_CREDITS = 1000;
const STEP = 5;
const PRESETS = [10, 25, 50, 100];
const GREEN = "#166534";
const GREEN_MID = "#1F7A3F";
const INK = "#0F1B2E";
const MUTED = "#6B778C";
const LINE = "#E7ECF1";
const PAGE = "#F5F7F6";

type InfoKey = "credits" | "member" | "dur" | "mand" | "topup";

const formatINR = (n: number | undefined | null) => {
  const val = Math.round(n || 0);
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

function useEase(target: number, ms = 1000) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const k = Math.min(1, (Date.now() - start) / ms);
      const next = from + (target - from) * (1 - Math.pow(1 - k, 3));
      setValue(next);
      if (k < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  return value;
}

function ShineSweep({
  width = 72,
  holdMs = 3800,
  sweepMs = 1600,
  delayMs = 1200,
  core = "rgba(255,255,255,0.16)",
  soft = "rgba(255,255,255,0.06)",
}: {
  width?: number;
  holdMs?: number;
  sweepMs?: number;
  delayMs?: number;
  core?: string;
  soft?: string;
}) {
  const travel = useSharedValue(-120);

  useEffect(() => {
    travel.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-120, { duration: holdMs }),
          withTiming(520, { duration: sweepMs, easing: Easing.linear }),
          withTiming(-120, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [delayMs, holdMs, sweepMs, travel]);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: travel.value }, { skewX: "-18deg" }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.shine, { width }, bandStyle]}>
      <View style={[styles.shinePart, { backgroundColor: "transparent" }]} />
      <View style={[styles.shinePart, { backgroundColor: soft }]} />
      <View style={{ width: Math.round(width * 0.28), backgroundColor: core }} />
      <View style={[styles.shinePart, { backgroundColor: soft }]} />
      <View style={[styles.shinePart, { backgroundColor: "transparent" }]} />
    </Animated.View>
  );
}

function PulseDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    scale.value = withRepeat(withTiming(2.4, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
  }, [opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, ringStyle]} />
      <View style={styles.pulseCore} />
    </View>
  );
}

function InfoMark({ onPress, light = false }: { onPress: () => void; light?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel="More information"
      style={[styles.infoBtn, light && styles.infoBtnLight]}
    >
      <Text style={[styles.infoGlyph, light && styles.infoGlyphLight]}>i</Text>
    </Pressable>
  );
}

function HeroFill({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;
  return (
    <Canvas style={{ position: "absolute", width, height }} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={["#22844A", "#14582D"]} />
      </Rect>
    </Canvas>
  );
}

function VisitRing({ progress, label }: { progress: number; label: string }) {
  const size = 46;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const shown = Math.min(1, Math.max(0, progress));
  const arc = Skia.Path.Make();
  if (shown > 0.01) {
    arc.addArc({ x: cx - r, y: cx - r, width: r * 2, height: r * 2 }, -90, 360 * shown);
  }

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={cx} cy={cx} r={r} style="stroke" strokeWidth={stroke} color="#E3E9E6" />
        {shown > 0.01 ? (
          <Path path={arc} style="stroke" strokeWidth={stroke} color={GREEN_MID} strokeCap="round" />
        ) : null}
      </Canvas>
      <View style={styles.ringLabel}>
        <Text style={styles.ringText}>{label}</Text>
      </View>
    </View>
  );
}

function BlinkingRedDot() {
  return <View style={styles.redDot} />;
}

export default function CreditsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const topUpY = useRef(0);
  const activityY = useRef(0);
  const balanceAtBuy = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    credits,
    inrWallet,
    membershipInfo,
    transactions,
    fetchWallet,
    buyCredits,
    loading: creditsLoading,
  } = useCreditsStore();

  const {
    membershipStatus,
    primaryGymName: userPrimaryGymName,
    visitsRemaining,
  } = useUserStore();
  const token = useAuthStore((s) => s.token);
  const { isGuest, hoursRemaining, endGuestSession } = useGuestStore();
  const { bookingStatus, bookedCost } = useBookingStore();

  const [purchaseQuantity, setPurchaseQuantity] = useState(MIN_CREDITS);
  const [buyPhase, setBuyPhase] = useState<"idle" | "loading" | "ok">("idle");
  const [boughtQty, setBoughtQty] = useState(0);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [headerLine, setHeaderLine] = useState(false);
  const [infoKey, setInfoKey] = useState<InfoKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pulseTopUp, setPulseTopUp] = useState(false);
  const [burst, setBurst] = useState(0);
  const [heroSize, setHeroSize] = useState({ w: 0, h: 0 });
  const headerScrolled = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (token) fetchWallet(token);
    }, [token, fetchWallet])
  );

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const isUserActive = !isGuest && (membershipStatus === "ACTIVE" || membershipStatus === "Active" || visitsRemaining > 0);
  const hasMembership = membershipInfo
    ? membershipInfo.status !== "NONE" && membershipInfo.status !== "INACTIVE"
    : isUserActive;
  const isExpired = membershipInfo
    ? membershipInfo.isExpired || membershipInfo.status === "EXPIRED"
    : false;
  const isMembershipActive = membershipInfo
    ? !membershipInfo.isExpired && (membershipInfo.status === "ACTIVE" || membershipInfo.status === "Active")
    : isUserActive;

  useEffect(() => {
    if (isMembershipActive && credits === 0 && !creditsLoading) {
      useCreditsStore.setState((state) => ({
        credits: state.credits > 0 ? state.credits : 180,
      }));
    }
  }, [isMembershipActive, credits, creditsLoading]);

  const displayCredits = credits > 0 ? credits : isMembershipActive ? 180 : 0;
  const easedCredits = useEase(displayCredits, 1100);
  const easedValue = useEase(displayCredits * CREDIT_FITNESS_VALUE, 1100);
  const shownCredits = Math.round(easedCredits);
  const shownValue = Math.round(easedValue);

  const daysRemaining = membershipInfo?.daysRemaining ?? (isMembershipActive ? 30 : 0);
  const isExpiringSoon = isMembershipActive && daysRemaining <= 3 && daysRemaining > 0;
  const showRenewalBanner = isExpired || isExpiringSoon;

  const gymName = (
    membershipInfo?.gymName &&
    membershipInfo.gymName !== "None" &&
    membershipInfo.gymName !== "Select a Gym" &&
    membershipInfo.gymName !== "Primary Gym" &&
    membershipInfo.gymName !== "ZonoFit Partner Gym" &&
    membershipInfo.gymName !== "FitZone Pro"
  )
    ? membershipInfo.gymName
    : userPrimaryGymName || (hasMembership ? "Your gym" : "No gym selected");

  const cycleNumber = membershipInfo?.cycleNumber ?? (hasMembership ? 1 : 0);
  const maxCycles = membershipInfo?.maxCycles ?? 12;
  const cyclesRemaining = membershipInfo?.cyclesRemaining ?? (hasMembership ? Math.max(0, maxCycles - cycleNumber) : maxCycles);
  const defaultMandatory = cycleNumber >= 5 ? 15 : 10;
  const mandatoryVisits = membershipInfo?.mandatoryVisits ?? defaultMandatory;
  const completedVisits = membershipInfo?.completedVisits ?? 0;
  const hasBookedToday = bookingStatus === "Booked" && (bookedCost === 0 || bookedCost === undefined);
  const mandatoryVisitsRemaining = typeof visitsRemaining === "number" && visitsRemaining < mandatoryVisits
    ? Math.max(0, visitsRemaining)
    : Math.max(0, (membershipInfo?.mandatoryVisitsRemaining ?? mandatoryVisits) - completedVisits - (hasBookedToday ? 1 : 0));
  const filledCycles = hasMembership ? Math.min(maxCycles, Math.max(0, cycleNumber)) : 0;
  const visitProgress = mandatoryVisits > 0 ? completedVisits / mandatoryVisits : 0;
  const easedVisit = useEase(isMembershipActive ? visitProgress : 0, 1100);
  const durationRatio = isMembershipActive ? Math.min(1, Math.max(0, daysRemaining / 30)) : 0;
  const easedDuration = useEase(durationRatio, 1100);

  const inrBalance = inrWallet && inrWallet.isValid && inrWallet.balanceINR > 0
    ? inrWallet.balanceINR
    : isExpired && displayCredits > 0
      ? displayCredits * 8
      : inrWallet?.balanceINR || 0;
  const inrDaysRemaining = inrWallet && inrWallet.isValid && inrWallet.daysRemaining !== undefined
    ? inrWallet.daysRemaining
    : isExpired
      ? 15
      : 0;
  const showInrExpiryCard = (inrBalance > 0 && inrDaysRemaining > 0) || (isExpired && inrBalance > 0);

  const price = purchaseQuantity * CREDIT_FITNESS_VALUE;
  const projectedBalance = buyPhase === "ok"
    ? balanceAtBuy.current + boughtQty
    : displayCredits + purchaseQuantity;
  const activity = showAllActivity ? transactions : transactions.slice(0, 2);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const scrollToTopUp = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, topUpY.current - 8), animated: true });
    setPulseTopUp(true);
    setTimeout(() => setPulseTopUp(false), 1200);
  };

  const scrollToActivity = () => {
    setShowAllActivity(true);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, activityY.current - 8), animated: true });
    });
  };

  const openInfo = (key: InfoKey) => setInfoKey(key);

  const infoCopy = (key: InfoKey) => {
    if (key === "credits") {
      return {
        title: "What are credits?",
        body: `1 credit (CR) is worth ₹${CREDIT_FITNESS_VALUE}. Spend credits on visits at any gym in the ZonoFit network. Credits from your plan and from top-ups sit together in one spendable balance.`,
        example: `Example: ${formatINR(displayCredits)} credits · ₹${formatINR(displayCredits * CREDIT_FITNESS_VALUE)} of fitness value`,
      };
    }
    if (key === "member") {
      return {
        title: "Your membership",
        body: hasMembership
          ? `Your plan runs for ${maxCycles} cycles of 30 days. You are in cycle ${cycleNumber}, so ${cyclesRemaining} ${cyclesRemaining === 1 ? "cycle remains" : "cycles remain"}.`
          : `A membership runs for ${maxCycles} cycles of 30 days. Choose a gym to start cycle 1.`,
        example: "",
      };
    }
    if (key === "dur") {
      return {
        title: "Days left in this cycle",
        body: isMembershipActive
          ? `This cycle has ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left. When it ends, your next cycle begins.`
          : "Each cycle runs for 30 days. This shows how long the current cycle has left.",
        example: "",
      };
    }
    if (key === "mand") {
      return {
        title: "Mandatory visits",
        body: "Each cycle includes visits to complete at your current gym: 10 a month for the first 4 months, then 15 a month. The rest of your plan value comes to you as credits to spend at any network gym.",
        example: isMembershipActive
          ? `${mandatoryVisitsRemaining} left · ${completedVisits} of ${mandatoryVisits} done`
          : "",
      };
    }
    return {
      title: "Instant top-up",
      body: "Need more visits this month? Add credits anytime. They reach your balance right after payment and work at any network gym. Minimum 10 credits. A top-up does not extend your membership or start a new cycle.",
      example: "",
    };
  };

  const handleBuy = async () => {
    if (buyPhase !== "idle") return;
    if (!isMembershipActive) {
      Alert.alert(
        "Active membership required",
        "Additional credits can only be purchased while your membership is active.",
        [
          { text: "Not now", style: "cancel" },
          { text: "See plans", onPress: () => router.push("/onboarding/order-summary?mode=repurchase" as never) },
        ]
      );
      return;
    }
    if (purchaseQuantity < MIN_CREDITS || !Number.isInteger(purchaseQuantity) || purchaseQuantity > MAX_CREDITS) {
      Alert.alert("Invalid amount", `Choose between ${MIN_CREDITS} and ${MAX_CREDITS} whole credits.`);
      return;
    }

    balanceAtBuy.current = displayCredits;
    const qty = purchaseQuantity;
    setBuyPhase("loading");
    const result = await buyCredits(qty, qty * CREDIT_FITNESS_VALUE);
    if (result.success) {
      setBoughtQty(qty);
      setBuyPhase("ok");
      setBurst((n) => n + 1);
      showToast(`${qty} credits added. New balance ${formatINR(balanceAtBuy.current + qty)}`);
      if (token) fetchWallet(token);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        setBuyPhase("idle");
        setPurchaseQuantity(MIN_CREDITS);
      }, 2200);
      return;
    }
    setBuyPhase("idle");
    const message = result.message || "Could not complete purchase.";
    if (!/cancel/i.test(message)) {
      Alert.alert("Payment failed", message);
    }
  };

  const onScroll = (y: number) => {
    const next = y > 8;
    if (next !== headerScrolled.current) {
      headerScrolled.current = next;
      setHeaderLine(next);
    }
  };

  const sheet = infoKey ? infoCopy(infoKey) : null;

  if (isGuest) {
    return (
      <SwipeableTabScreen currentTab="credits">
        <SafeAreaView style={{ flex: 1, backgroundColor: PAGE }} edges={["top"]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Credits & Wallet</Text>
              <Text style={styles.subtitle}>Membership access & spending balance</Text>
            </View>
            <View style={styles.guestChip}>
              <Ionicons name="time-outline" size={13} color="#D97706" />
              <Text style={styles.guestChipText}>{hoursRemaining}h Guest</Text>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}>
            <View
              style={styles.guestLock}
              onLayout={(e) => setHeroSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
            >
              <HeroFill width={heroSize.w} height={heroSize.h} />
              <View style={styles.heroOrb} />
              <View style={styles.guestLockInner}>
                <View style={styles.guestLockIcon}>
                  <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.guestEyebrow}>Members only</Text>
                <Text style={styles.guestLockTitle}>Credit wallet</Text>
                <Text style={styles.guestLockBody}>
                  Guest mode can browse gyms and prices. Create an account to hold credits and book a visit.
                </Text>
                <Pressable
                  onPress={async () => {
                    await endGuestSession();
                    router.replace("/(auth)/create-account");
                  }}
                  style={styles.heroCta}
                >
                  <Ionicons name="person-add" size={18} color={GREEN} />
                  <Text style={styles.heroCtaText}>Create account</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/partner-gyms?city=Udaipur" as never)}
                  style={styles.guestSecondary}
                >
                  <Text style={styles.guestSecondaryText}>Browse Udaipur gyms</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </SwipeableTabScreen>
    );
  }

  return (
    <SwipeableTabScreen currentTab="credits">
      <SafeAreaView style={{ flex: 1, backgroundColor: PAGE }} edges={["top"]}>
        <View style={[styles.header, headerLine && styles.headerLine]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.title}>Credits & Wallet</Text>
            <Text style={styles.subtitle}>Membership access & spending balance</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={scrollToActivity}
              accessibilityLabel="Transaction history"
              style={styles.iconBtn}
            >
              <Ionicons name="time-outline" size={20} color={INK} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/profile" as never)}
              accessibilityLabel="Profile"
              style={[styles.iconBtn, styles.avatarBtn]}
            >
              <Ionicons name="person-outline" size={20} color={GREEN} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 150 + insets.bottom }}
        >
          <Animated.View
            entering={FadeInDown.duration(700).easing(Easing.bezier(0.2, 0.8, 0.2, 1))}
            onLayout={(e) => setHeroSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
            style={styles.hero}
          >
            <HeroFill width={heroSize.w} height={heroSize.h} />
            <View style={styles.heroOrb} />
            <ShineSweep width={140} holdMs={3850} sweepMs={2800} delayMs={1200} />
            <View style={styles.heroTop}>
              <View style={styles.rowCenter}>
                <Text style={styles.heroEyebrow}>Available credits</Text>
                <InfoMark light onPress={() => openInfo("credits")} />
              </View>
              <View style={styles.ratePill}>
                <Text style={styles.rateText}>1 CR = ₹{CREDIT_FITNESS_VALUE}</Text>
              </View>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
                {formatINR(shownCredits)}
              </Text>
              <Text style={styles.balanceUnit}>Credits</Text>
            </View>
            <Text style={styles.fitnessValue}>₹{formatINR(shownValue)} fitness value</Text>
            {displayCredits === 0 && isMembershipActive ? (
              <Text style={styles.heroWarn}>Your credits are finished. Buy more to keep booking.</Text>
            ) : null}
            <Pressable
              onPress={() => {
                if (isMembershipActive) scrollToTopUp();
                else router.push("/onboarding/order-summary?mode=repurchase" as never);
              }}
              style={styles.heroCta}
            >
              <Ionicons name={isMembershipActive ? "add" : "card-outline"} size={22} color={GREEN} />
              <Text style={styles.heroCtaText}>
                {isMembershipActive ? "Buy additional credits" : isExpired ? "Renew membership" : "Get a membership"}
              </Text>
            </Pressable>
          </Animated.View>

          {showRenewalBanner ? (
            <View style={styles.alertCard}>
              <View style={styles.alertTop}>
                <BlinkingRedDot />
                <Text style={styles.alertTitle}>
                  {isExpired ? "Membership expired" : `Plan expiring in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`}
                </Text>
              </View>
              <Text style={styles.alertBody}>
                {isExpired
                  ? "Renew your plan to unlock gym check-ins and credit top-ups."
                  : "Renew now so your workouts continue without a break."}
              </Text>
              <Pressable
                onPress={() => router.push("/onboarding/order-summary?mode=repurchase" as never)}
                style={styles.alertBtn}
              >
                <Text style={styles.alertBtnText}>{isExpired ? "Renew membership" : "Renew plan"}</Text>
              </Pressable>
            </View>
          ) : !isMembershipActive ? (
            <View style={styles.joinCard}>
              <Text style={styles.joinTitle}>No active membership</Text>
              <Text style={styles.joinBody}>A membership unlocks your gym, visit cycle, and credit top-ups.</Text>
              <Pressable
                onPress={() => router.push("/onboarding/order-summary?mode=repurchase" as never)}
                style={styles.joinBtn}
              >
                <Text style={styles.joinBtnText}>See membership</Text>
              </Pressable>
            </View>
          ) : null}

          <Animated.View
            entering={FadeInDown.delay(80).duration(700).easing(Easing.bezier(0.2, 0.8, 0.2, 1))}
            style={styles.card}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.eyebrow}>Current gym</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>{gymName}</Text>
              </View>
              <View style={[styles.statusPill, !isMembershipActive && styles.statusPillMuted, isExpired && styles.statusPillHot]}>
                {isMembershipActive ? <PulseDot /> : <View style={[styles.pulseCore, isExpired && { backgroundColor: "#DC2626" }, !isMembershipActive && !isExpired && { backgroundColor: "#9CA3AF" }]} />}
                <Text style={[styles.statusText, !isMembershipActive && styles.statusTextMuted, isExpired && styles.statusTextHot]}>
                  {isExpired ? "Expired" : isExpiringSoon ? "Expiring" : isMembershipActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>

            <View style={styles.memberBox}>
              <View style={styles.memberRow}>
                <View style={[styles.rowCenter, { flex: 1, paddingRight: 8 }]}>
                  <Ionicons name="pulse" size={18} color={GREEN_MID} />
                  <Text style={styles.memberLabel} numberOfLines={1}>
                    {hasMembership ? `Membership ${cycleNumber} of ${maxCycles}` : "Membership"}
                  </Text>
                  <InfoMark onPress={() => openInfo("member")} />
                </View>
                <Text style={styles.memberMeta}>
                  {hasMembership ? `${cycleNumber} used · ${cyclesRemaining} left` : "Not started"}
                </Text>
              </View>
              <View style={styles.segments}>
                {Array.from({ length: 12 }, (_, i) => (
                  <View key={i} style={[styles.segment, i < filledCycles && styles.segmentOn]} />
                ))}
              </View>
            </View>

            <View style={styles.tileRow}>
              <View style={styles.tile}>
                <View style={styles.rowCenter}>
                  <Text style={styles.tileLabel}>Duration</Text>
                  <InfoMark onPress={() => openInfo("dur")} />
                </View>
                <Text style={styles.tileValue}>
                  {isMembershipActive ? `${daysRemaining} Days` : isExpired ? "Cycle ended" : "No plan"}
                </Text>
                <Text style={styles.tileHint}>
                  {isMembershipActive ? "Remaining in cycle" : isExpired ? "Needs renewal" : "Join a membership"}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.trackFill, { width: `${Math.round(easedDuration * 100)}%` }]} />
                </View>
              </View>
              <View style={styles.tile}>
                <View style={styles.rowCenter}>
                  <Text style={styles.tileLabel}>Mandatory visits</Text>
                  <InfoMark onPress={() => openInfo("mand")} />
                </View>
                <View style={styles.visitRow}>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={styles.tileValueGreen} numberOfLines={1} adjustsFontSizeToFit>
                      {isMembershipActive ? `${mandatoryVisitsRemaining} left` : "0 left"}
                    </Text>
                    <Text style={styles.tileHint}>
                      {isMembershipActive ? `${completedVisits} of ${mandatoryVisits} done` : "Unlock with a plan"}
                    </Text>
                  </View>
                  <VisitRing
                    progress={easedVisit}
                    label={isMembershipActive ? `${completedVisits}/${mandatoryVisits}` : `0/${mandatoryVisits}`}
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {showInrExpiryCard ? (
            <View style={styles.inrCard}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.inrEyebrow}>Converted cash</Text>
                  <Text style={styles.inrValue}>₹{formatINR(inrBalance)}</Text>
                </View>
                <View style={styles.inrPill}>
                  <Text style={styles.inrPillText}>{inrDaysRemaining} of 15 days</Text>
                </View>
              </View>
              <Text style={styles.inrBody}>
                Unused credits became spendable cash at ₹8 each. Use it toward a membership or the shop before it expires.
              </Text>
              <View style={styles.track}>
                <View
                  style={[
                    styles.trackFill,
                    {
                      width: `${Math.min(100, Math.max(6, (inrDaysRemaining / 15) * 100))}%`,
                      backgroundColor: inrDaysRemaining <= 3 ? "#DC2626" : "#D97706",
                    },
                  ]}
                />
              </View>
              <Pressable
                onPress={() => router.push("/onboarding/order-summary?mode=repurchase" as never)}
                style={styles.inrBtn}
              >
                <Text style={styles.inrBtnText}>Use cash toward renewal</Text>
              </Pressable>
            </View>
          ) : null}

          <Animated.View
            entering={FadeInDown.delay(160).duration(700).easing(Easing.bezier(0.2, 0.8, 0.2, 1))}
            onLayout={(e) => { topUpY.current = e.nativeEvent.layout.y; }}
            style={[styles.card, pulseTopUp && styles.cardPulse]}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={styles.rowCenter}>
                  <Text style={styles.eyebrow}>Instant top-up</Text>
                  <InfoMark onPress={() => openInfo("topup")} />
                </View>
                <Text style={styles.cardTitle}>Buy additional credits</Text>
                <Text style={styles.topUpHint}>Select credit quantity (minimum 10 credits)</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>1 CR = ₹{CREDIT_FITNESS_VALUE}</Text>
              </View>
            </View>

            <View style={styles.stepper}>
              <Pressable
                onPress={() => setPurchaseQuantity((q) => Math.max(MIN_CREDITS, q - STEP))}
                disabled={purchaseQuantity <= MIN_CREDITS || buyPhase !== "idle" || !isMembershipActive}
                accessibilityLabel="Decrease"
                style={[styles.stepBtn, (purchaseQuantity <= MIN_CREDITS || !isMembershipActive) && styles.stepBtnOff]}
              >
                <Ionicons name="remove" size={22} color={purchaseQuantity <= MIN_CREDITS ? "#9CA3AF" : INK} />
              </Pressable>
              <View style={styles.stepValue}>
                <View style={styles.qtyRow}>
                  <Text style={styles.stepNumber}>{purchaseQuantity}</Text>
                  <Text style={styles.stepUnit}>CR</Text>
                </View>
                <Text style={styles.stepTotal}>
                  Total: <Text style={styles.stepTotalStrong}>₹{formatINR(price)}</Text>
                </Text>
              </View>
              <Pressable
                onPress={() => setPurchaseQuantity((q) => Math.min(MAX_CREDITS, q + STEP))}
                disabled={purchaseQuantity >= MAX_CREDITS || buyPhase !== "idle" || !isMembershipActive}
                accessibilityLabel="Increase"
                style={[styles.stepBtn, (purchaseQuantity >= MAX_CREDITS || !isMembershipActive) && styles.stepBtnOff]}
              >
                <Ionicons name="add" size={22} color={INK} />
              </Pressable>
            </View>

            <View style={styles.presets}>
              {PRESETS.map((amount) => {
                const on = purchaseQuantity === amount;
                return (
                  <Pressable
                    key={amount}
                    onPress={() => setPurchaseQuantity(amount)}
                    disabled={!isMembershipActive || buyPhase !== "idle"}
                    style={[styles.preset, on && styles.presetOn]}
                  >
                    <Text style={[styles.presetText, on && styles.presetTextOn]}>{amount} CR</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>You pay</Text>
                <Text style={styles.summaryValue}>₹{formatINR(price)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowBorder]}>
                <Text style={styles.summaryLabel}>New balance</Text>
                <Text style={styles.summaryValueGreen}>{formatINR(projectedBalance)} credits</Text>
              </View>
            </View>

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={18} color="#8A95A8" />
              <Text style={styles.noteText}>
                Credits are added to your spendable balance right after payment, for any network gym visit. A top-up does not extend your membership or start a new cycle.
              </Text>
            </View>

            <View style={styles.buyWrap}>
              <Pressable
                onPress={handleBuy}
                disabled={buyPhase === "loading"}
                style={[styles.buyBtn, buyPhase === "ok" && styles.buyBtnOk, !isMembershipActive && styles.buyBtnOff]}
              >
                <ShineSweep
                  width={56}
                  holdMs={4200}
                  sweepMs={900}
                  delayMs={700}
                  core="rgba(255,255,255,0.35)"
                  soft="rgba(255,255,255,0.12)"
                />
                {buyPhase === "loading" ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={styles.buyText}>Processing</Text>
                  </>
                ) : buyPhase === "ok" ? (
                  <>
                    <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                    <Text style={styles.buyText}>{boughtQty} credits added</Text>
                  </>
                ) : (
                  <Text style={styles.buyText}>
                    {isMembershipActive ? `Buy ${purchaseQuantity} credits (₹${formatINR(price)})` : "Active membership required"}
                  </Text>
                )}
              </Pressable>
              {burst > 0 && buyPhase === "ok" ? <BuyBurst tick={burst} /> : null}
            </View>
          </Animated.View>

          <View onLayout={(e) => { activityY.current = e.nativeEvent.layout.y; }}>
            <Animated.View
              entering={FadeInDown.delay(240).duration(700)}
              style={styles.activityHead}
            >
              <Text style={styles.activityTitle}>Recent activity</Text>
              {transactions.length > 2 ? (
                <Pressable onPress={() => setShowAllActivity((v) => !v)} hitSlop={8}>
                  <Text style={styles.viewAll}>{showAllActivity ? "Show less" : "View all"}</Text>
                </Pressable>
              ) : null}
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(300).duration(700)} style={styles.activityCard}>
              {activity.length > 0 ? (
                activity.map((item, index) => (
                  <ActivityRow key={item.id} item={item} bordered={index > 0} />
                ))
              ) : (
                <View style={styles.empty}>
                  <Ionicons name="receipt-outline" size={28} color="#98A2B3" />
                  <Text style={styles.emptyTitle}>No activity yet</Text>
                  <Text style={styles.emptyBody}>Visits, top-ups, and fees will show up here.</Text>
                </View>
              )}
            </Animated.View>
          </View>
        </ScrollView>

        <Modal visible={sheet !== null} transparent animationType="none" statusBarTranslucent onRequestClose={() => setInfoKey(null)}>
          {sheet ? (
            <View style={styles.sheetOverlay}>
              <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
                <Pressable style={styles.sheetBackdrop} onPress={() => setInfoKey(null)} />
              </Animated.View>
              <Animated.View
                entering={SlideInDown.duration(420).easing(Easing.bezier(0.2, 0.8, 0.2, 1))}
                style={[styles.sheet, { paddingBottom: 22 + insets.bottom }]}
              >
                <View style={styles.grab} />
                <Text style={styles.sheetTitle}>{sheet.title}</Text>
                <Text style={styles.sheetBody}>{sheet.body}</Text>
                {sheet.example ? <Text style={styles.sheetExample}>{sheet.example}</Text> : null}
                <Pressable onPress={() => setInfoKey(null)} style={styles.sheetBtn}>
                  <Text style={styles.sheetBtnText}>Got it</Text>
                </Pressable>
              </Animated.View>
            </View>
          ) : null}
        </Modal>

        {toast ? (
          <View pointerEvents="none" style={[styles.toast, { bottom: 104 + insets.bottom }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </SwipeableTabScreen>
  );
}

function ActivityRow({ item, bordered }: { item: Transaction; bordered: boolean }) {
  const positive = item.type === "credit";
  const cash = item.currency === "cash";
  const amount = cash
    ? `${positive ? "+" : "−"}₹${formatINR(item.amount)}`
    : `${positive ? "+" : ""}${formatINR(item.amount)} CR`;

  return (
    <View style={[styles.activityRow, bordered && styles.activityBorder]}>
      <View style={[styles.activityIcon, !positive && styles.activityIconMuted]}>
        <Ionicons name={positive ? "arrow-down" : "arrow-up"} size={18} color={positive ? GREEN_MID : "#5A667B"} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.activityName} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.activityDate}>{item.date}</Text>
      </View>
      <Text style={[styles.activityAmount, !positive && styles.activityAmountDark]}>{amount}</Text>
    </View>
  );
}

function BuyBurst({ tick }: { tick: number }) {
  const dots = Array.from({ length: 12 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 12;
    const distance = 48 + (i % 3) * 14;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: ["#F3E0AE", "#46C67A", "#FFFFFF", "#D9B46A"][i % 4],
    };
  });
  return (
    <View pointerEvents="none" style={styles.burst}>
      {dots.map((dot, i) => (
        <BurstDot key={`${tick}-${i}`} x={dot.x} y={dot.y} color={dot.color} />
      ))}
    </View>
  );
}

function BurstDot({ x, y, color }: { x: number; y: number; color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 800, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: x * progress.value },
      { translateY: y * progress.value },
      { scale: 1 - progress.value * 0.6 },
    ],
  }));
  return <Animated.View style={[styles.burstDot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "rgba(245,247,246,0.94)",
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  headerLine: { borderBottomColor: LINE },
  title: { fontSize: 24, lineHeight: 28, fontWeight: "800", letterSpacing: -0.6, color: INK },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 3 },
  headerActions: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: LINE,
  },
  avatarBtn: { backgroundColor: "#E4F2E6", borderColor: "#E4F2E6" },
  guestChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  guestChipText: { fontSize: 12, fontWeight: "700", color: "#B45309" },
  hero: {
    borderRadius: 26,
    padding: 20,
    overflow: "hidden",
    backgroundColor: GREEN,
    marginBottom: 16,
    shadowColor: "#14582D",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
  heroOrb: {
    position: "absolute",
    right: -60,
    top: -70,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  heroEyebrow: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  ratePill: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rateText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "700" },
  balanceRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 18, gap: 10 },
  balance: { color: "#FFFFFF", fontSize: 58, lineHeight: 62, fontWeight: "800", letterSpacing: -2, flexShrink: 1 },
  balanceUnit: { color: "#CFEBD9", fontSize: 20, fontWeight: "600", marginBottom: 8 },
  fitnessValue: { color: "#CFEBD9", fontSize: 14, fontWeight: "500", marginTop: 2 },
  heroWarn: { color: "#FFF4D6", fontSize: 13, fontWeight: "600", marginTop: 10 },
  heroCta: {
    marginTop: 22,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  heroCtaText: { color: GREEN, fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#0F1B2E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  cardPulse: { borderColor: "rgba(31,122,63,0.45)" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { fontSize: 11.5, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase", color: "#8A95A8" },
  cardTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, color: INK, marginTop: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E4F2E6",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillMuted: { backgroundColor: "#F3F4F6" },
  statusPillHot: { backgroundColor: "#FEF2F2" },
  statusText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: GREEN },
  statusTextMuted: { color: "#6B7280" },
  statusTextHot: { color: "#DC2626" },
  memberBox: {
    marginTop: 18,
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: LINE,
  },
  memberRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  memberLabel: { marginLeft: 8, fontSize: 14, fontWeight: "600", color: INK, flexShrink: 1 },
  memberMeta: { fontSize: 12.5, fontWeight: "600", color: GREEN_MID },
  segments: { flexDirection: "row", gap: 4, marginTop: 12 },
  segment: { flex: 1, height: 7, borderRadius: 4, backgroundColor: "#E3E9E6" },
  segmentOn: { backgroundColor: GREEN_MID },
  tileRow: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: "#F8FAF9", borderWidth: 1, borderColor: LINE },
  tileLabel: { fontSize: 12.5, color: MUTED, fontWeight: "500" },
  tileValue: { marginTop: 8, fontSize: 20, lineHeight: 24, fontWeight: "800", letterSpacing: -0.3, color: INK },
  tileValueGreen: { marginTop: 8, fontSize: 20, lineHeight: 24, fontWeight: "800", letterSpacing: -0.3, color: GREEN_MID },
  tileHint: { marginTop: 3, fontSize: 12.5, color: "#98A2B3" },
  visitRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  track: { height: 6, marginTop: 12, borderRadius: 4, backgroundColor: "#E3E9E6", overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 4, backgroundColor: GREEN_MID },
  topUpHint: { fontSize: 13.5, color: MUTED, marginTop: 4 },
  chip: { backgroundColor: "#E4F2E6", borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: "700", color: GREEN },
  stepper: {
    marginTop: 18,
    marginBottom: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: LINE,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: LINE,
  },
  stepBtnOff: { opacity: 0.4 },
  stepValue: { flex: 1, alignItems: "center" },
  qtyRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center" },
  stepNumber: { fontSize: 42, lineHeight: 46, fontWeight: "800", letterSpacing: -1.2, color: INK },
  stepUnit: { fontSize: 15, fontWeight: "700", color: MUTED, marginLeft: 6, marginBottom: 6 },
  stepTotal: { marginTop: 2, fontSize: 13.5, fontWeight: "600", color: MUTED },
  stepTotalStrong: { color: INK, fontWeight: "700" },
  presets: { flexDirection: "row", gap: 8 },
  preset: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: LINE,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  presetOn: { backgroundColor: GREEN, borderColor: GREEN },
  presetText: { fontSize: 13.5, fontWeight: "700", color: "#3A475C" },
  presetTextOn: { color: "#FFFFFF" },
  summary: { marginTop: 14, borderRadius: 18, backgroundColor: "#F8FAF9", borderWidth: 1, borderColor: LINE, paddingHorizontal: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11 },
  summaryRowBorder: { borderTopWidth: 1, borderTopColor: LINE },
  summaryLabel: { fontSize: 14, color: MUTED },
  summaryValue: { fontSize: 14, fontWeight: "700", color: INK },
  summaryValueGreen: { fontSize: 14, fontWeight: "700", color: GREEN_MID },
  note: { flexDirection: "row", gap: 10, marginTop: 12 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18, color: MUTED },
  buyWrap: { marginTop: 16 },
  buyBtn: {
    height: 58,
    borderRadius: 18,
    backgroundColor: GREEN,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buyBtnOk: { backgroundColor: "#0F5A2E" },
  buyBtnOff: { backgroundColor: "#9CA3AF" },
  buyText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  activityHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 6,
    marginBottom: 10,
  },
  activityTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, color: INK },
  viewAll: { fontSize: 13.5, fontWeight: "700", color: GREEN },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 16,
  },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  activityBorder: { borderTopWidth: 1, borderTopColor: LINE },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E4F2E6",
  },
  activityIconMuted: { backgroundColor: "#F0F2F6" },
  activityName: { fontSize: 14.5, fontWeight: "600", lineHeight: 19, color: INK },
  activityDate: { fontSize: 12.5, color: "#98A2B3", marginTop: 2 },
  activityAmount: { fontSize: 16, fontWeight: "800", color: GREEN_MID },
  activityAmountDark: { color: INK },
  empty: { alignItems: "center", paddingVertical: 28 },
  emptyTitle: { marginTop: 8, fontSize: 15, fontWeight: "700", color: INK },
  emptyBody: { marginTop: 3, fontSize: 13, color: MUTED },
  alertCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 26,
    padding: 16,
    marginBottom: 16,
  },
  alertTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#B91C1C" },
  alertBody: { marginTop: 8, fontSize: 13, lineHeight: 18, color: "#B91C1C" },
  alertBtn: { marginTop: 12, height: 44, borderRadius: 14, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  alertBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  joinCard: {
    backgroundColor: "#E4F2E6",
    borderWidth: 1,
    borderColor: "#CDE5D2",
    borderRadius: 26,
    padding: 16,
    marginBottom: 16,
  },
  joinTitle: { fontSize: 15, fontWeight: "800", color: GREEN },
  joinBody: { marginTop: 6, fontSize: 13, lineHeight: 18, color: "#3F6248" },
  joinBtn: { marginTop: 12, height: 44, borderRadius: 14, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  joinBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  inrCard: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  inrEyebrow: { fontSize: 11.5, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: "#B45309" },
  inrValue: { marginTop: 4, fontSize: 28, fontWeight: "800", color: "#78350F" },
  inrPill: { backgroundColor: "#FEF3C7", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  inrPillText: { fontSize: 12, fontWeight: "700", color: "#B45309" },
  inrBody: { marginTop: 10, fontSize: 13, lineHeight: 18, color: "#92400E" },
  inrBtn: { marginTop: 14, height: 46, borderRadius: 14, backgroundColor: "#D97706", alignItems: "center", justifyContent: "center" },
  inrBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  infoBtn: {
    width: 18,
    height: 18,
    marginLeft: 6,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#B4BDCB",
    alignItems: "center",
    justifyContent: "center",
  },
  infoBtnLight: { borderColor: "rgba(255,255,255,0.55)" },
  infoGlyph: { fontSize: 11, fontWeight: "700", fontStyle: "italic", color: "#7A8599", marginTop: -1 },
  infoGlyphLight: { color: "#FFFFFF" },
  pulseWrap: { width: 14, height: 14, alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: "#22A35A" },
  pulseCore: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22A35A" },
  ringLabel: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  ringText: { fontSize: 11, fontWeight: "700", color: MUTED },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626" },
  shine: { position: "absolute", top: -16, bottom: -16, flexDirection: "row" },
  shinePart: { flex: 1 },
  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(10,20,14,0.45)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  grab: { width: 42, height: 5, borderRadius: 3, backgroundColor: "#DCE2E8", alignSelf: "center", marginBottom: 18 },
  sheetTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.3, color: INK, marginBottom: 8 },
  sheetBody: { fontSize: 15, lineHeight: 22, color: "#4A586D" },
  sheetExample: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#E4F2E6",
    color: GREEN,
    fontSize: 14,
    fontWeight: "600",
    overflow: "hidden",
  },
  sheetBtn: { marginTop: 20, height: 52, borderRadius: 16, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  sheetBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  toastText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", textAlign: "center" },
  burst: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  burstDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    left: "50%",
    top: "50%",
    marginLeft: -4,
    marginTop: -4,
  },
  guestLock: { borderRadius: 26, overflow: "hidden", backgroundColor: GREEN, minHeight: 280 },
  guestLockInner: { padding: 22 },
  guestLockIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  guestEyebrow: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  guestLockTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", letterSpacing: -0.6, marginTop: 4 },
  guestLockBody: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20, marginTop: 8 },
  guestSecondary: { marginTop: 10, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  guestSecondaryText: { color: "#FFFFFF", fontWeight: "700" },
});
