import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Modal,
  Linking,
  Alert,
  TextInput,
  Animated,
  Easing,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGuestStore } from "@/store/useGuestStore";
import { useUserStore } from "@/store/useUserStore";
import { useAddressStore } from "@/store/useAddressStore";
import { apiFetch } from "@/lib/api";

export type OptionId = "new" | "other_gym" | "other_platform" | "returning";

type OptionItem = {
  id: OptionId;
  title: string;
  description: string;
};

const OPTIONS: OptionItem[] = [
  { id: "new", title: "New to this gym", description: "You've never been a member here." },
  { id: "other_gym", title: "Member of another gym", description: "Training at a non-partner gym, switching to us." },
  { id: "other_platform", title: "Member of another fitness app", description: "You hold or held a multi-gym pass elsewhere." },
  { id: "returning", title: "Returning after 12+ months", description: "Your membership here ended over a year ago." },
];

function declaration(id: OptionId, gymName: string) {
  if (id === "new") return "You're telling us you have never been a member of this gym.";
  if (id === "other_gym") return `You're telling us you have never been a member of ${gymName}.`;
  if (id === "other_platform") return `You're telling us you have never been a direct member of ${gymName}.`;
  return "You're telling us your last membership here ended at least 12 months ago.";
}

function phoneHref(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.length >= 8 ? `tel:${digits}` : "";
}

export default function EligibilityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    gymId?: string;
    gymName?: string;
    city?: string;
    address?: string;
    price?: string;
  }>();

  const selectedAddress = useAddressStore((state) => {
    if (state.selectedAddressId) {
      const found = state.addresses.find((item) => item.id === state.selectedAddressId);
      if (found) return found;
    }
    return state.addresses.find((item) => item.isDefault) || state.addresses[0] || null;
  });
  const selectedGymId = useGuestStore((state) => state.selectedGymId);
  const selectedGymName = useGuestStore((state) => state.selectedGymName);
  const primaryGymId = useUserStore((state) => state.primaryGymId);
  const primaryGymName = useUserStore((state) => state.primaryGymName);

  const currentGymId = params.gymId || selectedGymId || primaryGymId || "";
  const [liveName, setLiveName] = useState("");
  const [livePlace, setLivePlace] = useState("");
  const [livePhone, setLivePhone] = useState("");
  const [livePrice, setLivePrice] = useState("");

  const [selectedId, setSelectedId] = useState<OptionId | null>(null);
  const [previousGymName, setPreviousGymName] = useState("");
  const [previousPlatformName, setPreviousPlatformName] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const leaving = useRef(false);

  useEffect(() => {
    if (!currentGymId) return;
    let cancelled = false;
    apiFetch(`/api/gyms/${encodeURIComponent(currentGymId)}`, { silent: true })
      .then((data) => {
        if (cancelled || !data?.id) return;
        if (typeof data.name === "string") setLiveName(data.name);
        const place = [data.landmark, data.address].filter((part) => typeof part === "string" && part.trim()).join(", ");
        if (place) setLivePlace(place);
        else if (typeof data.city === "string") setLivePlace(data.city);
        if (typeof data.contactPhone === "string") setLivePhone(data.contactPhone);
        if (typeof data.monthlyPrice === "number" && data.monthlyPrice > 0) setLivePrice(String(data.monthlyPrice));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentGymId]);

  const gymName = liveName || params.gymName || selectedGymName || primaryGymName || "Your gym";
  const gymPlace = livePlace || params.address || (params.city ? params.city : "Udaipur");
  const initial = gymName.trim().charAt(0).toUpperCase() || "Z";
  const selected = OPTIONS.find((option) => option.id === selectedId) || null;

  const closeSheet = () => {
    setSheetOpen(false);
    setPolicyOpen(false);
  };

  const handleBack = () => {
    if (sheetOpen) {
      closeSheet();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/onboarding/choose-gym");
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (done) return true;
      if (rulesOpen) {
        setRulesOpen(false);
        return true;
      }
      if (sheetOpen) {
        closeSheet();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [done, rulesOpen, sheetOpen]);

  const callGym = () => {
    const href = phoneHref(livePhone);
    if (!href) {
      Alert.alert("No phone listed", `${gymName} has not added a front-desk number yet. Pick the option that is true for you.`);
      return;
    }
    Linking.openURL(href).catch(() => {
      Alert.alert("Call failed", "The phone app could not be opened.");
    });
  };

  const openCheck = () => {
    if (!selected) return;
    setAgreed(false);
    setPolicyOpen(false);
    setSheetOpen(true);
  };

  const shakeCheck = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const continueToPayment = () => {
    if (!selected || !agreed) {
      shakeCheck();
      return;
    }
    setSheetOpen(false);
    setDone(true);
    if (leaving.current) return;
    leaving.current = true;
    const city = selectedAddress?.city || params.city || "Udaipur";
    const price = params.price || livePrice;
    setTimeout(() => {
      router.push({
        pathname: "/onboarding/order-summary",
        params: {
          mode: "purchase",
          isFirstTime: "true",
          gymId: currentGymId || "gym-being-fit",
          gymName,
          city,
          address: gymPlace,
          price,
          eligibility: selected.id,
          previousGym: previousGymName.trim(),
          previousPlatform: previousPlatformName.trim(),
        },
      } as any);
    }, 700);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.top}>
        <View style={styles.logoRow}>
          <View style={styles.mark}>
            <Text style={styles.markText}>Z</Text>
          </View>
          <Text style={styles.logo}>Zonofit</Text>
        </View>
        <Pressable onPress={handleBack} hitSlop={10} disabled={done}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
      </View>

      {done ? (
        <View style={styles.done}>
          <View style={styles.tick}>
            <Ionicons name="checkmark" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.doneTitle}>You're in</Text>
          <Text style={styles.sub}>Taking you to payment</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Which one{"\n"}describes you?</Text>
          <Text style={styles.sub}>Pick the one that's true. Takes 10 seconds.</Text>

          <View style={styles.gym}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gymName} numberOfLines={1}>{gymName}</Text>
              <Text style={styles.gymPlace} numberOfLines={1}>{gymPlace}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Primary gym</Text>
            </View>
          </View>

          <View style={styles.opts} accessibilityRole="radiogroup">
            {OPTIONS.map((option, index) => {
              const on = selectedId === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setSelectedId(option.id)}
                  style={[styles.opt, on && styles.optOn]}
                >
                  <View style={[styles.num, on && styles.numOn]}>
                    <Text style={[styles.numText, on && styles.numTextOn]}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optTitle}>{option.title}</Text>
                    <Text style={styles.optDesc}>{option.description}</Text>
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]}>
                    {on ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.help}>
            Not sure which fits?{" "}
            <Text style={styles.helpLink} onPress={callGym}>Call the gym</Text>
          </Text>
          <Pressable onPress={() => setRulesOpen(true)} hitSlop={6}>
            <Text style={styles.rulesLink}>Eligibility rules</Text>
          </Pressable>
        </ScrollView>
      )}

      {!done && (
        <View style={styles.dock}>
          <View style={styles.prog}>
            <View style={[styles.bar, styles.barOn]} />
            <View style={[styles.bar, selected && styles.barOn]} />
            <View style={[styles.bar, sheetOpen && styles.barOn]} />
          </View>
          <Pressable
            onPress={openCheck}
            disabled={!selected}
            style={[styles.cta, !selected && styles.ctaOff]}
          >
            <Text style={styles.ctaText}>{selected ? "Continue" : "Select one to continue"}</Text>
          </Pressable>
          <Text style={styles.legal}>Zonofit is for people starting or restarting at a gym.</Text>
        </View>
      )}

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.modalFill}>
          <Pressable style={styles.scrim} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.grab} />
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.sheetTitle}>One honest check</Text>
              <Text style={styles.chosen}>
                You selected <Text style={styles.chosenStrong}>{selected?.title}</Text>
              </Text>

              <View style={styles.notice}>
                <Text style={styles.noticeLabel}>Please read</Text>
                <Text style={styles.noticeBig}>{selected ? declaration(selected.id, gymName) : ""}</Text>
                <Text style={styles.noticeBody}>
                  We may verify with <Text style={styles.noticeStrong}>{gymName}</Text>. If you were a member there and said otherwise, your refund is capped at 50%, and in some cases there may be no refund. Refunds arrive in 3–5 business days.
                </Text>
                <Pressable onPress={() => setPolicyOpen((open) => !open)} hitSlop={6}>
                  <Text style={styles.policyToggle}>{policyOpen ? "Hide refund policy" : "View refund policy"}</Text>
                </Pressable>
                {policyOpen && (
                  <View style={styles.policy}>
                    <Text style={styles.policyItem}>Wrong details, but never a member of this gym: full refund.</Text>
                    <Text style={styles.policyItem}>Prior member of this gym: refund capped at 50%.</Text>
                    <Text style={styles.policyItem}>Deliberate or repeated misreporting: no refund.</Text>
                  </View>
                )}
              </View>

              {selected?.id === "other_gym" && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Which gym did you train at before?</Text>
                  <TextInput
                    value={previousGymName}
                    onChangeText={setPreviousGymName}
                    placeholder="Optional. A local gym outside Zonofit."
                    placeholderTextColor="#5E6F63"
                    style={styles.input}
                  />
                </View>
              )}
              {selected?.id === "other_platform" && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Which fitness pass was it?</Text>
                  <TextInput
                    value={previousPlatformName}
                    onChangeText={setPreviousPlatformName}
                    placeholder="Optional. Another multi-gym pass."
                    placeholderTextColor="#5E6F63"
                    style={styles.input}
                  />
                </View>
              )}

              <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <Pressable style={styles.checkRow} onPress={() => setAgreed((value) => !value)}>
                  <View style={[styles.box, agreed && styles.boxOn]}>
                    {agreed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={styles.checkText}>
                    I confirm my membership details are true and I accept the refund terms above.
                  </Text>
                </Pressable>
              </Animated.View>

              <Pressable onPress={continueToPayment} style={[styles.cta, !agreed && styles.ctaOff]}>
                <Text style={styles.ctaText}>Confirm & continue to payment</Text>
              </Pressable>
              <Text style={styles.legal}>Secure, encrypted checkout</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={rulesOpen} transparent animationType="fade" onRequestClose={() => setRulesOpen(false)}>
        <View style={styles.modalFill}>
          <Pressable style={styles.scrim} onPress={() => setRulesOpen(false)} />
          <View style={styles.rulesCard}>
            <View style={styles.rulesHead}>
              <Text style={styles.sheetTitle}>Eligibility rules</Text>
              <Pressable onPress={() => setRulesOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#0F2417" />
              </Pressable>
            </View>
            <Text style={styles.rulesLabel}>Who can continue</Text>
            <Text style={styles.rulesBody}>Joining this partner gym for the first time.</Text>
            <Text style={styles.rulesBody}>Training at another gym, or holding another multi-gym pass, and switching here.</Text>
            <Text style={styles.rulesBody}>A membership at this gym that ended at least 12 months ago.</Text>
            <Text style={styles.rulesLabel}>Why we ask</Text>
            <Text style={styles.rulesBody}>
              The gym can check the answer. A wrong answer about a past membership at this gym changes the refund, which is why the next step asks you to confirm it.
            </Text>
            <Pressable onPress={() => setRulesOpen(false)} style={styles.cta}>
              <Text style={styles.ctaText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7F2" },
  top: {
    height: 44,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#2F7D1F",
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  logo: { fontSize: 20, fontWeight: "700", color: "#0F2417", letterSpacing: -0.4 },
  back: { color: "#5E6F63", fontSize: 14, fontWeight: "500", paddingVertical: 10, paddingHorizontal: 4 },
  scroll: { paddingHorizontal: 24, paddingBottom: 16 },
  title: {
    fontSize: 34,
    lineHeight: 37,
    fontWeight: "700",
    color: "#0F2417",
    letterSpacing: -1,
    marginTop: 26,
    marginBottom: 8,
  },
  sub: { color: "#5E6F63", fontSize: 16, lineHeight: 23, marginBottom: 20 },
  gym: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DFE6DB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#E6F2DF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#2F7D1F", fontSize: 17, fontWeight: "700" },
  gymName: { fontSize: 15, fontWeight: "700", color: "#0F2417" },
  gymPlace: { fontSize: 13, color: "#5E6F63", marginTop: 2 },
  tag: { backgroundColor: "#E6F2DF", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { color: "#2F7D1F", fontSize: 12, fontWeight: "600" },
  opts: { gap: 10 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DFE6DB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  optOn: { borderColor: "#2F7D1F", backgroundColor: "#E6F2DF" },
  num: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F5F7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  numOn: { backgroundColor: "#2F7D1F" },
  numText: { fontSize: 16, fontWeight: "700", color: "#5E6F63" },
  numTextOn: { color: "#FFFFFF" },
  optTitle: { fontSize: 16, fontWeight: "600", color: "#0F2417", lineHeight: 20 },
  optDesc: { fontSize: 13.5, color: "#5E6F63", marginTop: 2, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#DFE6DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: "#2F7D1F", borderColor: "#2F7D1F" },
  help: { color: "#5E6F63", fontSize: 14, marginTop: 16, marginBottom: 8 },
  helpLink: { color: "#2F7D1F", fontWeight: "600" },
  rulesLink: { color: "#2F7D1F", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  dock: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 8, backgroundColor: "#F5F7F2" },
  prog: { flexDirection: "row", gap: 6, marginBottom: 10 },
  bar: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#DFE6DB" },
  barOn: { backgroundColor: "#2F7D1F" },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2F7D1F",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaOff: { opacity: 0.35 },
  ctaText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  legal: { textAlign: "center", color: "#5E6F63", fontSize: 12, marginTop: 10, marginBottom: 2 },
  done: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  tick: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2F7D1F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  doneTitle: { fontSize: 28, fontWeight: "700", color: "#0F2417", marginBottom: 6 },
  modalFill: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(8,16,11,0.5)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 18,
    maxHeight: "92%",
  },
  grab: { width: 40, height: 4, borderRadius: 4, backgroundColor: "#DFE6DB", alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 26, lineHeight: 29, fontWeight: "700", color: "#0F2417", letterSpacing: -0.5 },
  chosen: { color: "#5E6F63", fontSize: 14, marginTop: 6, marginBottom: 16 },
  chosenStrong: { color: "#0F2417", fontWeight: "600" },
  notice: {
    backgroundColor: "#FFF6E3",
    borderWidth: 1.5,
    borderColor: "#F0D9A6",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  noticeLabel: {
    color: "#7A4B00",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  noticeBig: { color: "#7A4B00", fontSize: 15.5, fontWeight: "600", lineHeight: 22, marginBottom: 8 },
  noticeBody: { color: "#7A4B00", fontSize: 14.5, lineHeight: 21, marginBottom: 8 },
  noticeStrong: { fontWeight: "700" },
  policyToggle: { color: "#7A4B00", fontSize: 13.5, fontWeight: "600", textDecorationLine: "underline" },
  policy: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F0D9A6", gap: 4 },
  policyItem: { color: "#7A4B00", fontSize: 13.5, lineHeight: 19 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#0F2417", marginBottom: 6 },
  input: {
    backgroundColor: "#F5F7F2",
    borderWidth: 1.5,
    borderColor: "#DFE6DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: "#0F2417",
  },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingBottom: 18 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#5E6F63",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { backgroundColor: "#2F7D1F", borderColor: "#2F7D1F" },
  checkText: { flex: 1, fontSize: 15, lineHeight: 21, color: "#0F2417" },
  rulesCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
  },
  rulesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  rulesLabel: { fontSize: 13, fontWeight: "700", color: "#0F2417", marginTop: 8, marginBottom: 4 },
  rulesBody: { fontSize: 14, lineHeight: 20, color: "#5E6F63", marginBottom: 4 },
});
