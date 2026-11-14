import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { apiFetch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { promptGuestAccount } from "@/lib/guestAccount";

/** Keep this copy in sync with server/src/lib/earlyAccess.ts. */
const FEATURES = [
  {
    key: "ai-trainer",
    aliases: ["ai-trainer"],
    tab: "AI Trainer",
    title: "AI Trainer",
    description: "Your personal fitness AI is learning your habits to build the perfect routine.",
    options: ["Custom workout plans", "Progress insights", "Daily nudges"],
    more: "Help us shape your trainer",
    icon: "sparkles-outline" as const,
  },
  {
    key: "workout-buddy",
    aliases: ["workout-buddy", "buddy-program"],
    tab: "Workout Buddy",
    title: "Be a Workout Buddy",
    description: "Help others reach their fitness goals by being a reliable workout partner.",
    options: ["Find partners nearby", "Same gym and time", "Streaks together"],
    more: "Build your gym circle",
    icon: "people-outline" as const,
  },
  {
    key: "meal-scan",
    aliases: ["meal-scan"],
    tab: "Meal Scan",
    title: "Meal Scan",
    description: "Snap a photo of your food to instantly track calories and macros with Zono Vision.",
    options: ["Calories and macros", "Meal history", "Goal-based advice"],
    more: "Eat smarter, effortlessly",
    icon: "restaurant-outline" as const,
  },
  {
    key: "trainer-program",
    aliases: ["trainer-program", "find-trainer"],
    tab: "Become a Trainer",
    title: "Become a Trainer",
    description: "Earn cash by offering personalized training sessions to ZonoFit members.",
    options: ["Set my own price", "Get booked by members", "Weekly payouts"],
    more: "Turn skill into income",
    icon: "barbell-outline" as const,
  },
];

type Feature = (typeof FEATURES)[number];

type Draft = { choices: string[]; idea: string; ideaOpen: boolean };
type Saved = { spot: number; ideasShared: number; choices: string[]; idea: string };

const EMPTY_DRAFT: Draft = { choices: [], idea: "", ideaOpen: false };

function featureIndex(raw?: string) {
  const key = (raw ?? "").trim().toLowerCase();
  const index = FEATURES.findIndex((feature) => feature.key === key || feature.aliases.includes(key));
  return index < 0 ? 0 : index;
}

function PulseOrb({ icon }: { icon: Feature["icon"] }) {
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 2600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [ring]);

  const scale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] });
  const opacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={styles.orbWrap}>
      <Animated.View style={[styles.ring, { opacity, transform: [{ scale }] }]} />
      <View style={styles.orb}>
        <Ionicons name={icon} size={46} color={BRAND} />
      </View>
    </View>
  );
}

export default function ToolScreen() {
  const params = useLocalSearchParams<{ tool: string }>();
  const rawTool = Array.isArray(params.tool) ? params.tool[0] : params.tool;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((state) => state.token);
  const isGuest = useGuestStore((state) => state.isGuest);
  const endGuestSession = useGuestStore((state) => state.endGuestSession);

  const [cur, setCur] = useState(() => featureIndex(rawTool));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saved, setSaved] = useState<Record<string, Saved>>({});
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const ideaRef = useRef<TextInput>(null);
  const pop = useRef(new Animated.Value(0)).current;
  const loadGen = useRef(0);

  const feature = FEATURES[cur];
  const draft = drafts[feature.key] ?? EMPTY_DRAFT;
  const joined = saved[feature.key];
  const ready = draft.choices.length > 0 || draft.idea.trim().length > 0;

  useEffect(() => {
    setCur(featureIndex(rawTool));
  }, [rawTool]);

  useEffect(() => {
    tabScrollRef.current?.scrollTo({ x: Math.max(0, cur * 132 - 40), animated: true });
  }, [cur]);

  useFocusEffect(
    useCallback(() => {
      if (!token || isGuest) return undefined;
      const gen = loadGen.current;
      let live = true;
      apiFetch("/api/feedback/feature", { token, silent: true })
        .then((data) => {
          if (!live || gen !== loadGen.current || !Array.isArray(data?.entries)) return;
          const next: Record<string, Saved> = {};
          for (const entry of data.entries) {
            if (!entry || typeof entry.featureKey !== "string") continue;
            const spot = Number(entry.spot);
            next[entry.featureKey] = {
              spot: Number.isFinite(spot) && spot > 0 ? spot : 0,
              ideasShared: Number(entry.ideasShared) || 0,
              choices: Array.isArray(entry.choices) ? entry.choices.filter((item: unknown) => typeof item === "string") : [],
              idea: typeof entry.idea === "string" ? entry.idea : "",
            };
          }
          setSaved(next);
        })
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [token, isGuest])
  );

  useEffect(() => {
    if (!joined) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
  }, [joined, feature.key, pop]);

  const selectTab = (index: number) => {
    setCur(index);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const toggleChoice = (option: string) => {
    setDrafts((prev) => {
      const current = prev[feature.key] ?? EMPTY_DRAFT;
      const choices = current.choices.includes(option)
        ? current.choices.filter((item) => item !== option)
        : [...current.choices, option];
      return { ...prev, [feature.key]: { ...current, choices } };
    });
  };

  const openIdea = () => {
    setDrafts((prev) => {
      const current = prev[feature.key] ?? EMPTY_DRAFT;
      return { ...prev, [feature.key]: { ...current, ideaOpen: true } };
    });
    setTimeout(() => ideaRef.current?.focus(), 40);
  };

  const askForAccount = () => {
    promptGuestAccount(
      router,
      endGuestSession,
      "Create an account to join early access. Your vote is saved with your profile.",
    );
  };

  const submit = async () => {
    const idea = draft.idea.trim();
    if (draft.choices.length === 0 && !idea) return;
    if (!token || isGuest) {
      askForAccount();
      return;
    }
    setSubmitting(true);
    try {
      const note = [draft.choices.join(", "), idea].filter(Boolean).join(". ").slice(0, 180);
      const data = await apiPost(
        "/api/feedback/feature",
        { featureName: feature.key, choices: draft.choices, idea, comment: note },
        { token }
      );
      loadGen.current += 1;
      const spot = Number(data?.spot);
      setSaved((prev) => ({
        ...prev,
        [feature.key]: {
          spot: Number.isFinite(spot) && spot > 0 ? spot : 0,
          ideasShared: Number(data?.ideasShared) || draft.choices.length + (idea ? 1 : 0),
          choices: Array.isArray(data?.choices) ? data.choices : draft.choices,
          idea: typeof data?.idea === "string" ? data.idea : idea,
        },
      }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : "Could not save your early access vote.";
      Alert.alert("Couldn't join yet", message);
    } finally {
      setSubmitting(false);
    }
  };

  const rest = FEATURES.filter((item) => item.key !== feature.key && !saved[item.key]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      <View style={styles.top}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Pressable>
        <Text style={styles.topTitle}>Coming soon</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabBar}
      >
        {FEATURES.map((item, index) => {
          const on = index === cur;
          return (
            <Pressable key={item.key} onPress={() => selectTab(index)} style={[styles.tab, on && styles.tabOn]}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{item.tab}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: joined ? 36 : 150 }}
        >
          {joined ? (
            <View>
              <View style={styles.hero}>
                <Animated.View style={[styles.check, { transform: [{ scale: pop }] }]}>
                  <Ionicons name="checkmark" size={38} color="#ffffff" />
                </Animated.View>
                <Text style={[styles.title, styles.doneTitle]}>You're on the list.</Text>
                <Text style={styles.desc}>You'll be first to try {feature.title}.</Text>
              </View>

              <View style={styles.queue}>
                <View style={styles.queueCell}>
                  <Text style={styles.queueValue}>{joined.spot > 0 ? `#${joined.spot}` : "—"}</Text>
                  <Text style={styles.queueLabel}>Your spot</Text>
                </View>
                <View style={[styles.queueCell, styles.queueSplit]}>
                  <Text style={styles.queueValue}>{joined.ideasShared}</Text>
                  <Text style={styles.queueLabel}>Ideas shared</Text>
                </View>
              </View>

              <View style={styles.badge}>
                <Ionicons name="ribbon-outline" size={22} color={BRAND} />
                <View style={styles.badgeCopy}>
                  <Text style={styles.badgeTitle}>Founding Member badge unlocked</Text>
                  <Text style={styles.badgeBody}>Shows on your profile at launch.</Text>
                </View>
              </View>

              {rest.length > 0 ? (
                <View>
                  <Text style={styles.question}>Vote on what's next</Text>
                  <View style={styles.more}>
                    {rest.map((item) => (
                      <Pressable
                        key={item.key}
                        style={styles.moreRow}
                        onPress={() => selectTab(FEATURES.findIndex((candidate) => candidate.key === item.key))}
                      >
                        <View style={styles.moreIcon}>
                          <Ionicons name={item.icon} size={22} color={BRAND} />
                        </View>
                        <View style={styles.moreCopy}>
                          <Text style={styles.moreTitle}>{item.tab}</Text>
                          <Text style={styles.moreSub}>{item.more}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={MUTE} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View>
              <View style={styles.hero}>
                <PulseOrb icon={feature.icon} />
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Early access</Text>
                </View>
                <Text style={styles.title}>{feature.title}</Text>
                <Text style={styles.desc}>{feature.description}</Text>
              </View>

              <Text style={styles.question}>What would you love most?</Text>
              <View style={styles.chips}>
                {feature.options.map((option) => {
                  const on = draft.choices.includes(option);
                  return (
                    <Pressable key={option} onPress={() => toggleChoice(option)} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={openIdea}>
                <Text style={styles.idea}>+ Add your own idea</Text>
              </Pressable>
              {draft.ideaOpen || draft.idea.length > 0 ? (
                <TextInput
                  ref={ideaRef}
                  value={draft.idea}
                  onChangeText={(idea) =>
                    setDrafts((prev) => {
                      const current = prev[feature.key] ?? EMPTY_DRAFT;
                      return { ...prev, [feature.key]: { ...current, idea, ideaOpen: true } };
                    })
                  }
                  placeholder="Tell us what you'd like to see"
                  placeholderTextColor={MUTE}
                  multiline
                  maxLength={500}
                  underlineColorAndroid="transparent"
                  style={styles.ideaInput}
                />
              ) : null}
            </View>
          )}
        </ScrollView>

        {joined ? null : (
          <View style={[styles.cta, { paddingBottom: 14 + insets.bottom }]}>
            <Pressable
              onPress={submit}
              disabled={!ready || submitting}
              style={({ pressed }) => [
                styles.go,
                !ready && styles.goOff,
                ready && !submitting && pressed && styles.goPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={[styles.goText, !ready && styles.goTextOff]}>
                  {ready ? "Join early access" : "Pick what you'd love"}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BG = "#f5f8f4";
const CARD = "#ffffff";
const INK = "#0f1c14";
const MUTE = "#76867b";
const LINE = "#e2e9e3";
const BRAND = "#1f7a3a";
const TINT = "#e9f6ec";
const DEEP = "#0a3d25";

const styles = StyleSheet.create({
  top: {
    height: 52,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 15, fontWeight: "600", color: INK },
  topSpacer: { width: 40 },
  tabBar: { flexGrow: 0 },
  tabs: { paddingHorizontal: 22, paddingBottom: 4, gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  tabOn: { backgroundColor: DEEP, borderColor: DEEP },
  tabText: { fontSize: 13, fontWeight: "600", color: MUTE },
  tabTextOn: { color: "#ffffff" },
  hero: { alignItems: "center", marginTop: 34 },
  orbWrap: { width: 124, height: 124, alignItems: "center", justifyContent: "center" },
  orb: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: TINT,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 1.5,
    borderColor: "#6bcb77",
  },
  pill: {
    marginTop: 22,
    backgroundColor: TINT,
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  pillText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 12,
    fontSize: 32,
    lineHeight: 35,
    fontWeight: "700",
    letterSpacing: -1.1,
    color: INK,
    textAlign: "center",
  },
  doneTitle: { marginTop: 22 },
  desc: {
    marginTop: 10,
    paddingHorizontal: 6,
    color: MUTE,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  question: {
    marginTop: 38,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: INK,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  chipOn: { backgroundColor: TINT, borderColor: BRAND },
  chipText: { fontSize: 14, fontWeight: "500", color: INK },
  chipTextOn: { color: BRAND, fontWeight: "600" },
  idea: { marginTop: 16, fontSize: 14, fontWeight: "600", color: BRAND },
  ideaInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: CARD,
    padding: 14,
    minHeight: 92,
    fontSize: 15,
    color: INK,
    textAlignVertical: "top",
  },
  cta: {
    paddingTop: 14,
    paddingHorizontal: 22,
    backgroundColor: BG,
  },
  go: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    shadowColor: "#1f7a3a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  goOff: { backgroundColor: LINE, shadowOpacity: 0, elevation: 0 },
  goPressed: { transform: [{ scale: 0.97 }] },
  goText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  goTextOff: { color: MUTE },
  check: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1f7a3a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 26,
    elevation: 8,
  },
  queue: {
    marginTop: 24,
    flexDirection: "row",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 20,
    overflow: "hidden",
  },
  queueCell: { flex: 1, padding: 14 },
  queueSplit: { borderLeftWidth: 1, borderLeftColor: LINE },
  queueValue: { fontSize: 24, fontWeight: "700", letterSpacing: -0.8, color: BRAND },
  queueLabel: { marginTop: 2, fontSize: 12, color: MUTE },
  badge: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: TINT,
    borderRadius: 18,
    padding: 14,
  },
  badgeCopy: { flex: 1 },
  badgeTitle: { fontSize: 14, fontWeight: "700", color: INK },
  badgeBody: { fontSize: 13.5, color: INK, marginTop: 1 },
  more: { gap: 10 },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  moreIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: TINT,
    alignItems: "center",
    justifyContent: "center",
  },
  moreCopy: { flex: 1 },
  moreTitle: { fontSize: 15, fontWeight: "700", color: INK },
  moreSub: { fontSize: 12.5, color: MUTE, marginTop: 1 },
});
