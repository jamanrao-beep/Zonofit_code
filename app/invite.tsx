import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Share, ActivityIndicator, Animated } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { apiFetch } from "@/lib/api";
import { promptGuestAccount } from "@/lib/guestAccount";

const GOAL = 4;
const INK = "#101c14";
const MUTE = "#7a8a7f";
const LINE = "#e3e9e4";
const GREEN = "#58c878";
const GREEN_DARK = "#2a9d4d";
const TINT = "#eaf6ed";
const BG = "#f6f8f5";
const CARD = "#ffffff";

const NUDGES = [
  "Your first friend starts the streak",
  "Streak started. 3 more to go",
  "Halfway there. Don't stop now",
  "One friend away from a free month",
  "Unlocked. Your next month is free",
];

interface ReferralData {
  referralCode: string;
  joined: number;
  creditsEarned: number;
  toUnlock: number;
  worthRupees: number;
  monthReady: boolean;
  nextCycleStarted: boolean;
}

function formatInr(value: number): string {
  const amount = Math.max(0, Math.round(value));
  const text = String(amount);
  if (text.length <= 3) return text;
  const tail = text.slice(-3);
  const head = text.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${head},${tail}`;
}

function headline(joined: number, unlocked: boolean): { first: string; second: string } {
  if (unlocked) return { first: "Your month", second: "is free." };
  if (joined === 3) return { first: "So close.", second: "One more." };
  return { first: "Train a month", second: "on us." };
}

function ProgressRing({ filled }: { filled: number }) {
  const size = 224;
  const stroke = 10;
  const radius = 96;
  const dots = 26;
  const gap = 16;
  const nodes: React.ReactNode[] = [];

  for (let segment = 0; segment < GOAL; segment += 1) {
    const on = segment < filled;
    const start = -90 + segment * 90 + gap / 2;
    const sweep = 90 - gap;
    for (let dot = 0; dot < dots; dot += 1) {
      const angle = ((start + (dot / (dots - 1)) * sweep) * Math.PI) / 180;
      nodes.push(
        <View
          key={`${segment}-${dot}`}
          style={{
            position: "absolute",
            left: size / 2 + radius * Math.cos(angle) - stroke / 2,
            top: size / 2 + radius * Math.sin(angle) - stroke / 2,
            width: stroke,
            height: stroke,
            borderRadius: stroke / 2,
            backgroundColor: on ? GREEN : LINE,
          }}
        />
      );
    }
  }

  return <View style={{ width: size, height: size }}>{nodes}</View>;
}

export default function InviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((state) => state.token);
  const isGuest = useGuestStore((state) => state.isGuest);
  const endGuestSession = useGuestStore((state) => state.endGuestSession);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const [info, setInfo] = useState<ReferralData>({
    referralCode: "",
    joined: 0,
    creditsEarned: 0,
    toUnlock: GOAL,
    worthRupees: 0,
    monthReady: false,
    nextCycleStarted: false,
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringScale = useRef(new Animated.Value(1)).current;
  const painted = useRef(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!token) {
        if (alive) setLoading(false);
        return;
      }
      try {
        const data = await apiFetch("/api/users/referral", { token, silent: true });
        if (!alive || !data?.referralCode) return;
        const joined = Math.max(0, Math.min(GOAL, Math.round(Number(data.joined) || 0)));
        setInfo({
          referralCode: String(data.referralCode),
          joined,
          creditsEarned: Math.max(0, Math.round(Number(data.creditsEarned) || 0)),
          toUnlock: Math.max(0, Math.min(GOAL, Math.round(Number(data.toUnlock ?? GOAL - joined)))),
          worthRupees: Math.max(0, Math.round(Number(data.worthRupees) || 0)),
          monthReady: data.monthReady === true,
          nextCycleStarted: data.nextCycleStarted === true,
        });
      } catch (err) {
        console.log("[Referral] Could not load referral progress:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!painted.current) {
      painted.current = true;
      return;
    }
    ringScale.setValue(0.92);
    Animated.spring(ringScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [info.joined, loading, ringScale]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  };

  const needsAccount = !token || isGuest;
  const unlocked = info.monthReady && info.joined >= GOAL;
  const title = headline(info.joined, unlocked);
  const nudge = NUDGES[unlocked ? GOAL : info.joined] ?? NUDGES[0];
  const remainingLabel = unlocked ? "unlocked" : `${Math.max(0, GOAL - info.joined)} to go`;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/explore" as never);
  };

  const askForAccount = () => {
    promptGuestAccount(
      router,
      endGuestSession,
      "Create an account to get your own referral code. A shared stand-in code is not issued.",
    );
  };

  const copyCode = async () => {
    if (needsAccount) {
      askForAccount();
      return;
    }
    if (!info.referralCode) return;
    await Clipboard.setStringAsync(info.referralCode);
    showToast("Code copied");
  };

  const invite = async () => {
    if (needsAccount) {
      askForAccount();
      return;
    }
    if (loading || !info.referralCode) return;
    const link = `https://zonofit.com/?ref=${info.referralCode}`;
    const message = `Stop paying for a gym you don't use. On ZonoFit you pay per visit. Join with my code ${info.referralCode}: ${link}`;
    try {
      const result = await Share.share({ message });
      if (result.action === Share.dismissedAction) return;
    } catch {
      await Clipboard.setStringAsync(message);
      showToast("Invite copied");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      <View className="flex-row items-center justify-between" style={{ height: 48, paddingHorizontal: 22 }}>
        <Pressable
          onPress={goBack}
          accessibilityLabel="Back"
          className="items-center justify-center rounded-full"
          style={{ width: 40, height: 40, borderWidth: 1, borderColor: LINE, backgroundColor: CARD }}
        >
          <Ionicons name="chevron-back" size={18} color={INK} />
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: "600", color: INK, letterSpacing: 0.2 }}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 130 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center" style={{ marginTop: 18 }}>
          <Animated.View style={{ width: 224, height: 224, transform: [{ scale: ringScale }] }}>
            <ProgressRing filled={info.joined} />
            <View
              className="items-center justify-center"
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            >
              <Text style={{ fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: MUTE, fontWeight: "600" }}>
                Friends in
              </Text>
              <Text style={{ fontSize: 56, fontWeight: "700", letterSpacing: -2, lineHeight: 60, color: INK, marginVertical: 4 }}>
                {info.joined}
                <Text style={{ color: MUTE, fontWeight: "400", fontSize: 28, letterSpacing: 0 }}>/{GOAL}</Text>
              </Text>
              <Text style={{ fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: MUTE, fontWeight: "600" }}>
                {remainingLabel}
              </Text>
            </View>
          </Animated.View>

          <Text style={{ fontSize: 26, fontWeight: "700", letterSpacing: -0.7, lineHeight: 30, color: INK, textAlign: "center", marginTop: 26 }}>
            {title.first}
            {"\n"}
            {title.second}
          </Text>
          <Text style={{ marginTop: 10, color: MUTE, fontSize: 15 }}>
            {info.worthRupees > 0 ? (
              <>
                Worth <Text style={{ textDecorationLine: "line-through", opacity: 0.7 }}>₹{formatInr(info.worthRupees)}</Text>{" "}
                <Text style={{ color: GREEN_DARK, fontWeight: "700" }}>Free</Text>
              </>
            ) : (
              "A free month at your gym"
            )}
          </Text>
          <View style={{ marginTop: 18, backgroundColor: TINT, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 14 }}>
            <Text style={{ color: GREEN_DARK, fontWeight: "600", fontSize: 13 }}>{nudge}</Text>
          </View>
          {info.nextCycleStarted ? (
            <Text style={{ marginTop: 10, color: GREEN_DARK, fontWeight: "600", fontSize: 13 }}>
              A free month is already unlocked.
            </Text>
          ) : null}
        </View>

        <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 24, padding: 18, marginTop: 26 }}>
          <Text style={{ fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: MUTE, fontWeight: "600" }}>
            Your code
          </Text>
          <Pressable
            onPress={copyCode}
            className="flex-row items-center justify-between"
            style={{
              marginTop: 10,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 16,
              backgroundColor: BG,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: MUTE,
              minHeight: 56,
            }}
          >
            {loading ? (
              <ActivityIndicator color={GREEN} />
            ) : info.referralCode ? (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ flex: 1, fontSize: 19, letterSpacing: 2, fontWeight: "700", color: INK }}
              >
                {info.referralCode}
              </Text>
            ) : (
              <Text style={{ flex: 1, fontSize: 13, color: MUTE }}>
                {needsAccount ? "Your code appears after you create an account." : "Your code could not be loaded. Try again in a moment."}
              </Text>
            )}
            <Text style={{ fontSize: 13, color: GREEN_DARK, fontWeight: "600", marginLeft: 12 }}>Copy</Text>
          </Pressable>

          <View className="flex-row" style={{ marginTop: 14 }}>
            {[
              [loading ? "–" : String(info.joined), "Joined"],
              [loading ? "–" : String(info.creditsEarned), "Credits"],
              [loading ? "–" : String(info.toUnlock), "To unlock"],
            ].map(([value, label], index) => (
              <View
                key={label}
                className="flex-1 items-center"
                style={index > 0 ? { borderLeftWidth: 1, borderLeftColor: LINE } : undefined}
              >
                <Text style={{ fontSize: 20, fontWeight: "700", color: INK }}>{value}</Text>
                <Text style={{ fontSize: 12, color: MUTE }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 24, padding: 18, marginTop: 14 }}>
          <Text style={{ fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: MUTE, fontWeight: "600" }}>
            How it works
          </Text>
          {[
            "Share your code with a friend",
            "They join and complete a first visit",
            "4 friends in, your next month is free",
          ].map((step, index) => (
            <View
              key={step}
              className="flex-row items-center"
              style={{
                gap: 14,
                paddingVertical: 12,
                borderBottomWidth: index === 2 ? 0 : 1,
                borderBottomColor: LINE,
              }}
            >
              <View
                className="items-center justify-center"
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: TINT }}
              >
                <Text style={{ color: GREEN_DARK, fontWeight: "700", fontSize: 13 }}>{index + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: INK }}>{step}</Text>
            </View>
          ))}

          {termsOpen ? (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 12.5, color: MUTE, marginBottom: 5 }}>
                • A friend counts when their gym's monthly price is equal to or more than your primary gym's price.
              </Text>
              <Text style={{ fontSize: 12.5, color: MUTE, marginBottom: 5 }}>
                • You earn 5 credits for each friend's first visit.
              </Text>
              <Text style={{ fontSize: 12.5, color: MUTE }}>
                • The free month is worth up to your primary gym's monthly price.
              </Text>
            </View>
          ) : (
            <Pressable onPress={() => setTermsOpen(true)} className="self-center" style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 13, color: MUTE, textDecorationLine: "underline" }}>Terms</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 22,
          paddingTop: 16,
          paddingBottom: 16 + insets.bottom,
          backgroundColor: BG,
        }}
      >
        <Pressable
          onPress={invite}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: 18,
            backgroundColor: INK,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ color: BG, fontWeight: "600", fontSize: 16, letterSpacing: 0.2 }}>
            {needsAccount ? "Create an account" : "Invite a friend  "}
            {needsAccount ? null : <Text style={{ color: GREEN }}>get closer to free</Text>}
          </Text>
        </Pressable>
      </View>

      {toast ? (
        <View
          style={{
            position: "absolute",
            alignSelf: "center",
            top: insets.top + 8,
            backgroundColor: INK,
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: 99,
            zIndex: 9,
          }}
        >
          <Text style={{ color: BG, fontSize: 13, fontWeight: "600" }}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
