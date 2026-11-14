import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Animated,
  Easing as RNEasing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AnimatedRe, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { InAppNoticeBanner } from "@/components/InAppNoticeBanner";
import { showInAppNotice, useInAppNoticeStore } from "@/store/useInAppNoticeStore";
import { afterPaint } from "@/lib/afterPaint";

interface BookingConfirmedModalProps {
  visible: boolean;
  gymName: string;
  gymAddress?: string;
  gymImage?: string;
  timeSlot: string;
  dateStr?: string;
  isMandatoryVisit?: boolean;
  mandatoryVisitsLeft?: number;
  totalMandatoryVisits?: number;
  creditsDeducted: number;
  remainingCredits: number;
  onViewPass: () => void;
  onDone: () => void;
}

const INK = "#0f1c14";
const MUTE = "#76867b";
const LINE = "#e2e9e3";
const GREEN = "#6bcb77";
const BRAND = "#1f7a3a";
const TINT = "#e9f6ec";
const SHEET = "#ffffff";
const TICKET = "#f5f8f4";
const CONFETTI = ["#6bcb77", "#1f7a3a", "#a7e8b0", "#ffffff", "#f3d77a"];

interface Clock {
  hour: number;
  minute: number;
  period: string;
}

function readClock(label: string): Clock | null {
  const match = label.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2] || 0),
    period: match[3].toUpperCase(),
  };
}

function clockText(clock: Clock, withPeriod: boolean): string {
  const minute = clock.minute === 0 ? "00" : String(clock.minute).padStart(2, "0");
  const time = `${clock.hour}:${minute}`;
  return withPeriod ? `${time} ${clock.period}` : time;
}

function formatSlot(label: string): string {
  const parts = label.split(/\s[-–—]\s/);
  const start = readClock(parts[0] || "");
  const end = parts[1] ? readClock(parts[1]) : null;
  if (!start) return label;
  if (!end) return clockText(start, true);
  if (start.period === end.period) return `${clockText(start, false)} – ${clockText(end, true)}`;
  return `${clockText(start, true)} – ${clockText(end, true)}`;
}

function cancelByLabel(label: string): string {
  const start = readClock((label.split(/\s[-–—]\s/)[0] || label).trim());
  if (!start) return "2 hrs before";
  let hour = start.hour % 12;
  if (start.period === "PM") hour += 12;
  let minutes = hour * 60 + start.minute - 120;
  const dayBefore = minutes < 0;
  if (dayBefore) minutes += 24 * 60;
  const hours24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 || 12;
  const clock = minute === 0 ? `${hour12} ${period}` : `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
  return dayBefore ? `${clock}, day before` : clock;
}

function formatDate(raw?: string): string {
  if (!raw || /^today$/i.test(raw.trim())) return "Today";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const now = new Date();
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return "Today";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function placeLine(address?: string): string {
  if (!address) return "Partner gym";
  if (/primary gym/i.test(address) && /home/i.test(address)) return "Primary gym · Home base";
  return address;
}

interface Piece {
  x: number;
  y: number;
  dx: number;
  rise: number;
  fall: number;
  spin: number;
  w: number;
  h: number;
  color: string;
}

function makeBurst(width: number, height: number): Piece[] {
  const pieces: Piece[] = [];
  const origins = [
    { x: width * 0.15, dir: 1 },
    { x: width * 0.85, dir: -1 },
  ];
  origins.forEach((origin) => {
    for (let i = 0; i < 23; i += 1) {
      const spread = (Math.random() - 0.2) * origin.dir;
      pieces.push({
        x: origin.x,
        y: height * 0.5,
        dx: spread * (70 + Math.random() * 120),
        rise: -(40 + Math.random() * 90),
        fall: 180 + Math.random() * 220,
        spin: (Math.random() - 0.5) * 420,
        w: 5 + Math.random() * 6,
        h: 3 + Math.random() * 4,
        color: CONFETTI[i % CONFETTI.length],
      });
    }
  });
  return pieces;
}

function ConfettiBurst({ width, height }: { width: number; height: number }) {
  const life = useMemo(() => new Animated.Value(0), []);
  const pieces = useMemo(() => makeBurst(width, height), [width, height]);

  useEffect(() => {
    const animation = Animated.timing(life, {
      toValue: 1,
      duration: 2000,
      easing: RNEasing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [life]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, index) => {
        const translateX = life.interpolate({ inputRange: [0, 1], outputRange: [0, piece.dx] });
        const translateY = life.interpolate({
          inputRange: [0, 0.28, 1],
          outputRange: [0, piece.rise, piece.fall],
        });
        const rotate = life.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${piece.spin}deg`],
        });
        const opacity = life.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={index}
            style={{
              position: "absolute",
              left: piece.x,
              top: piece.y,
              width: piece.w,
              height: piece.h,
              borderRadius: 1,
              backgroundColor: piece.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}

export default function BookingConfirmedModal({
  visible,
  gymName,
  gymAddress,
  timeSlot,
  dateStr = "Today",
  isMandatoryVisit = false,
  mandatoryVisitsLeft,
  creditsDeducted,
  remainingCredits,
  onViewPass,
  onDone,
}: BookingConfirmedModalProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const checkScale = useSharedValue(0);
  const ring = useSharedValue(0);
  const ringLate = useSharedValue(0);
  const [openingPass, setOpeningPass] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setOpeningPass(false);
  }

  useEffect(() => {
    if (!visible) {
      checkScale.value = 0;
      ring.value = 0;
      ringLate.value = 0;
      return;
    }
    checkScale.value = withDelay(450, withSpring(1, { damping: 9, stiffness: 160 }));
    ring.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false);
    ringLate.value = withDelay(
      1300,
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false)
    );
    const burst = setTimeout(() => setBurstKey((key) => key + 1), 550);
    const buzz = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, 550);
    return () => {
      clearTimeout(burst);
      clearTimeout(buzz);
    };
  }, [visible, checkScale, ring, ringLate]);

  useEffect(() => {
    if (!visible) return;
    useInAppNoticeStore.getState().pushCover();
    const timer = setTimeout(() => {
      showInAppNotice({
        title: "Booking Confirmed",
        body: `Your workout at ${gymName} on ${dateStr} at ${timeSlot} is confirmed.`,
      });
    }, 900);
    return () => {
      clearTimeout(timer);
      useInAppNoticeStore.getState().popCover();
    };
  }, [visible, gymName, dateStr, timeSlot]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - ring.value),
    transform: [{ scale: 0.75 + ring.value * 0.75 }],
  }));
  const ringLateStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - ringLate.value),
    transform: [{ scale: 0.75 + ringLate.value * 0.75 }],
  }));

  if (!visible) return null;

  const isMandatory = isMandatoryVisit || creditsDeducted === 0;
  const slotLabel = formatSlot(timeSlot);
  const cancelBy = cancelByLabel(timeSlot);
  const chip = isMandatory
    ? `Included in your plan${mandatoryVisitsLeft !== undefined ? `  ·  ${mandatoryVisitsLeft} visits left` : ""}`
    : `${creditsDeducted} credits used  ·  ${remainingCredits} credits left`;

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onDone}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onDone} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: 18 + insets.bottom, maxHeight: height * 0.92 }]}>
          <View style={styles.grab} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.badge}>
              <AnimatedRe.View style={[styles.ring, ringStyle]} />
              <AnimatedRe.View style={[styles.ring, ringLateStyle]} />
              <AnimatedRe.View style={[styles.check, checkStyle]}>
                <Ionicons name="checkmark" size={30} color="#ffffff" />
              </AnimatedRe.View>
            </View>
            <Text style={styles.title}>You're booked.</Text>
            <Text style={styles.sub}>See you at the gym.</Text>

            <View style={styles.ticket}>
              <View style={styles.gymRow}>
                <View style={styles.gymIcon}>
                  <Ionicons name="barbell-outline" size={22} color={BRAND} />
                </View>
                <View style={styles.gymCopy}>
                  <Text style={styles.gymName} numberOfLines={1}>{gymName}</Text>
                  <Text style={styles.gymPlace} numberOfLines={1}>{placeLine(gymAddress)}</Text>
                </View>
              </View>
              <View style={styles.when}>
                <View style={styles.whenCol}>
                  <Text style={styles.cap}>Date</Text>
                  <Text style={styles.whenValue}>{formatDate(dateStr)}</Text>
                </View>
                <View style={[styles.whenCol, styles.whenSplit]}>
                  <Text style={styles.cap}>Time slot</Text>
                  <Text style={styles.whenValue} numberOfLines={1}>{slotLabel}</Text>
                </View>
              </View>
            </View>

            <View style={styles.chip}>
              <Ionicons name="shield-checkmark-outline" size={15} color={BRAND} />
              <Text style={styles.chipText}>{chip}</Text>
            </View>

            <View style={styles.rules}>
              <View style={styles.rule}>
                <Ionicons name="time-outline" size={20} color={BRAND} />
                <Text style={styles.ruleTitle}>Be on time</Text>
                <Text style={styles.ruleBody}>Valid only in your slot</Text>
              </View>
              <View style={styles.rule}>
                <Ionicons name="phone-portrait-outline" size={20} color={BRAND} />
                <Text style={styles.ruleTitle}>Show your pass</Text>
                <Text style={styles.ruleBody}>Staff confirm at desk</Text>
              </View>
              <View style={styles.rule}>
                <Ionicons name="refresh-outline" size={20} color={BRAND} />
                <Text style={styles.ruleTitle}>Cancel by {cancelBy}</Text>
                <Text style={styles.ruleBody}>Flat 2 credit fee</Text>
              </View>
            </View>

            <Pressable
              disabled={openingPass}
              onPress={() => {
                if (openingPass) return;
                setOpeningPass(true);
                afterPaint(onViewPass);
              }}
              style={({ pressed }) => [styles.go, pressed && styles.goPressed, openingPass && styles.goBusy]}
            >
              <Ionicons name="ticket-outline" size={20} color="#ffffff" />
              <Text style={styles.goText}>{openingPass ? "Opening..." : "View pass"}</Text>
            </Pressable>
            <Pressable onPress={onDone} hitSlop={8} style={styles.back}>
              <Text style={styles.backText}>Back to home</Text>
            </Pressable>
          </ScrollView>
        </View>
        {burstKey > 0 ? <ConfettiBurst key={burstKey} width={width} height={height} /> : null}
        <InAppNoticeBanner overlay onOpen={onDone} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(8,20,12,0.55)" },
  sheet: {
    backgroundColor: SHEET,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingHorizontal: 22,
    zIndex: 6,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 9,
    backgroundColor: LINE,
    alignSelf: "center",
    marginBottom: 8,
  },
  scroll: { alignItems: "center", paddingTop: 28, paddingBottom: 6 },
  badge: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  ring: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: GREEN,
  },
  check: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    letterSpacing: -0.9,
    fontWeight: "700",
    color: INK,
    textAlign: "center",
  },
  sub: { color: MUTE, marginTop: 2, fontSize: 15, textAlign: "center" },
  ticket: {
    alignSelf: "stretch",
    marginTop: 20,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 22,
    backgroundColor: TICKET,
    overflow: "hidden",
  },
  gymRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  gymIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: TINT,
    alignItems: "center",
    justifyContent: "center",
  },
  gymCopy: { flex: 1 },
  gymName: { fontSize: 16.5, letterSpacing: -0.3, fontWeight: "700", color: INK },
  gymPlace: { fontSize: 13, color: MUTE, marginTop: 1 },
  when: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: LINE,
  },
  whenCol: { flex: 1, paddingVertical: 12, paddingHorizontal: 16 },
  whenSplit: { borderLeftWidth: 1, borderLeftColor: LINE },
  cap: {
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: MUTE,
    fontWeight: "600",
  },
  whenValue: { marginTop: 2, fontSize: 16, letterSpacing: -0.3, fontWeight: "700", color: INK },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14,
    maxWidth: "100%",
    backgroundColor: TINT,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 99,
  },
  chipText: { flexShrink: 1, color: BRAND, fontSize: 13, fontWeight: "600", textAlign: "center" },
  rules: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  rule: { flex: 1, alignItems: "center", paddingVertical: 4, paddingHorizontal: 2 },
  ruleTitle: { marginTop: 6, fontSize: 12.5, lineHeight: 16, fontWeight: "700", color: INK, textAlign: "center" },
  ruleBody: { marginTop: 1, fontSize: 11.5, lineHeight: 15, color: MUTE, textAlign: "center" },
  go: {
    alignSelf: "stretch",
    width: "100%",
    height: 56,
    borderRadius: 18,
    backgroundColor: BRAND,
    marginTop: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  goPressed: { transform: [{ scale: 0.97 }] },
  goBusy: { opacity: 0.85 },
  goText: { color: "#ffffff", fontWeight: "600", fontSize: 16 },
  back: { marginTop: 6, paddingVertical: 12, paddingHorizontal: 24 },
  backText: { color: MUTE, fontWeight: "600", fontSize: 14 },
});
