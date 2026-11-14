import React, { useEffect, useRef, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Reanimated, { Easing as SheetEasing, FadeIn, SlideInDown } from "react-native-reanimated";

interface CancelBookingSheetProps {
  visible: boolean;
  isMandatory: boolean;
  refundCredits: number;
  onKeep: () => void;
  onConfirm: () => Promise<void> | void;
  /** Called after the success state has been shown. */
  onDone?: () => void;
}

type Phase = "ask" | "working" | "done" | "failed";

const LOADER_DELAY_MS = 250;
const SLOW_HINT_MS = 4000;
const SUCCESS_HOLD_MS = 1600;

function failureCopy(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  const technical = /fetch|network|timed out|aborted|canceled|cancelled|request failed/i.test(message);
  if (message && !technical) return message;
  return "Your booking is still active. Please try again.";
}

export default function CancelBookingSheet({
  visible,
  isMandatory,
  refundCredits,
  onKeep,
  onConfirm,
  onDone,
}: CancelBookingSheetProps) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("ask");
  const [hint, setHint] = useState("");
  const [failure, setFailure] = useState("Your booking is still active. Please try again.");
  const [busy, setBusy] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seenVisible = useRef(visible);
  const onConfirmRef = useRef(onConfirm);
  const onDoneRef = useRef(onDone);
  const onKeepRef = useRef(onKeep);
  onConfirmRef.current = onConfirm;
  onDoneRef.current = onDone;
  onKeepRef.current = onKeep;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  if (seenVisible.current !== visible) {
    seenVisible.current = visible;
    if (visible) {
      setPhase("ask");
      setHint("");
      setFailure("Your booking is still active. Please try again.");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (visible) return;
    clearTimers();
  }, [visible]);

  useEffect(() => {
    if (phase !== "working") return;
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [phase, spin]);

  useEffect(() => {
    if (phase !== "done") return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [phase, pop]);

  if (!visible) return null;

  const askCopy = isMandatory
    ? "Cancel is open until 2 hours before the visit. A flat 2 credits will be charged from your wallet. Your visit will be returned to your plan."
    : `Cancel is open until 2 hours before the visit. A flat 2 credits will be charged. ${refundCredits} credits will come back to your wallet.`;

  const doneCopy = isMandatory
    ? "Your visit is back in your plan. 2 credits charged."
    : refundCredits > 0
      ? `${refundCredits} credits are back in your wallet. 2 credits charged.`
      : "2 credits charged. Your booking is cancelled.";

  const dismiss = () => {
    if (busy) return;
    onKeepRef.current();
  };

  const run = () => {
    if (busy) return;
    setBusy(true);
    setHint("");
    setPhase("ask");
    clearTimers();

    const showLoader = setTimeout(() => setPhase("working"), LOADER_DELAY_MS);
    const showSlow = setTimeout(() => setHint("Still working. Hang tight."), SLOW_HINT_MS);
    timers.current.push(showLoader, showSlow);

    void (async () => {
      try {
        await onConfirmRef.current();
        clearTimers();
        setPhase("done");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const close = setTimeout(() => {
          setBusy(false);
          if (onDoneRef.current) onDoneRef.current();
          else onKeepRef.current();
        }, SUCCESS_HOLD_MS);
        timers.current.push(close);
      } catch (error) {
        clearTimers();
        setBusy(false);
        setFailure(failureCopy(error));
        setPhase("failed");
      }
    })();
  };

  const spinRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <Reanimated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={dismiss} />
        </Reanimated.View>

        <Reanimated.View
          entering={SlideInDown.duration(450).easing(SheetEasing.bezier(0.2, 0.9, 0.3, 1))}
          style={[styles.sheet, { paddingBottom: 26 + insets.bottom }]}
        >
          <View style={styles.grab} />

          {phase === "ask" ? (
            <View>
              <Text style={styles.title}>Cancel this booking?</Text>
              <Text style={styles.body}>{askCopy}</Text>
              <Pressable
                onPress={run}
                disabled={busy}
                style={({ pressed }) => [styles.btn, styles.redBtn, pressed && !busy && styles.pressed]}
              >
                <Text style={styles.redText}>Yes, cancel booking</Text>
              </Pressable>
              <Pressable
                onPress={dismiss}
                disabled={busy}
                style={({ pressed }) => [styles.btn, styles.keepBtn, pressed && !busy && styles.pressed]}
              >
                <Text style={styles.keepText}>Keep booking</Text>
              </Pressable>
            </View>
          ) : null}

          {phase === "working" ? (
            <Reanimated.View entering={FadeIn.duration(280)} style={styles.center}>
              <Animated.View style={[styles.ring, { transform: [{ rotate: spinRotate }] }]} />
              <Text style={styles.workingTitle}>Cancelling your booking</Text>
              <Text style={styles.hint}>{hint}</Text>
            </Reanimated.View>
          ) : null}

          {phase === "done" ? (
            <Reanimated.View entering={FadeIn.duration(280)} style={styles.center}>
              <Animated.View style={[styles.ok, { transform: [{ scale: pop }] }]}>
                <Ionicons name="checkmark" size={32} color="#ffffff" />
              </Animated.View>
              <Text style={styles.workingTitle}>Booking cancelled</Text>
              <Text style={styles.hint}>{doneCopy}</Text>
            </Reanimated.View>
          ) : null}

          {phase === "failed" ? (
            <Reanimated.View entering={FadeIn.duration(280)} style={styles.center}>
              <View style={styles.er}>
                <Text style={styles.erMark}>!</Text>
              </View>
              <Text style={styles.workingTitle}>Couldn't cancel right now</Text>
              <Text style={styles.hint}>{failure}</Text>
              <Pressable
                onPress={run}
                style={({ pressed }) => [styles.btn, styles.solidBtn, pressed && styles.pressed]}
              >
                <Text style={styles.solidText}>Try again</Text>
              </Pressable>
              <Pressable
                onPress={dismiss}
                style={({ pressed }) => [styles.btn, styles.keepBtn, pressed && styles.pressed]}
              >
                <Text style={styles.keepText}>Keep booking</Text>
              </Pressable>
            </Reanimated.View>
          ) : null}
        </Reanimated.View>
      </View>
    </Modal>
  );
}

const INK = "#0f1c14";
const MUTE = "#76867b";
const LINE = "#e2e9e3";
const BRAND = "#1f7a3a";
const TINT = "#e9f6ec";
const RED = "#c0382b";
const RED_TINT = "#fdecea";

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1, backgroundColor: "rgba(8,20,12,0.55)" },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 12,
    minHeight: 330,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 9,
    backgroundColor: LINE,
    alignSelf: "center",
    marginBottom: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: INK,
  },
  body: {
    color: MUTE,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 22,
  },
  btn: {
    alignSelf: "stretch",
    width: "100%",
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  redBtn: {
    borderWidth: 1.5,
    borderColor: "rgba(192,56,43,0.35)",
    backgroundColor: "#ffffff",
  },
  redText: { color: RED, fontSize: 16, fontWeight: "600" },
  keepBtn: {
    borderWidth: 1.5,
    borderColor: LINE,
    backgroundColor: "#ffffff",
  },
  keepText: { color: INK, fontSize: 16, fontWeight: "600" },
  solidBtn: { backgroundColor: BRAND, marginTop: 22 },
  solidText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  pressed: { transform: [{ scale: 0.97 }] },
  center: { alignItems: "center", paddingTop: 26 },
  ring: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: TINT,
    borderTopColor: BRAND,
  },
  workingTitle: {
    marginTop: 22,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: INK,
    textAlign: "center",
  },
  hint: {
    marginTop: 6,
    minHeight: 22,
    color: MUTE,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  ok: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },
  er: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: RED_TINT,
    alignItems: "center",
    justifyContent: "center",
  },
  erMark: { color: RED, fontSize: 30, fontWeight: "700", lineHeight: 34 },
});
