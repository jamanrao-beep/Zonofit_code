import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";

export interface BookingModalGym {
  id: string;
  name: string;
  address?: string;
  image?: string;
  cost: number;
  type?: string;
  rating?: number | string;
  distance?: number | string;
}

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedTime: string, selectedDate?: string) => Promise<void> | void;
  gym: BookingModalGym | null;
  isPrimaryGym: boolean;
  visitsRemaining: number;
  mandatoryVisitsTotal?: number;
  availableCredits: number;
  cashBalance?: number;
  loading?: boolean;
}

const TIME_SLOTS = ["6:00 AM", "7:30 AM", "9:00 AM", "5:00 PM", "6:30 PM", "8:00 PM"];

const INK = "#101c14";
const MUTE = "#7a8a7f";
const LINE = "#e3e9e4";
const GREEN = "#6bcb77";
const BRAND = "#1f7a3a";
const TINT = "#e9f6ec";
const SHEET = "#ffffff";
const AMBER = "#b7791f";
const ATINT = "#fff6e5";

const KNOW = [
  { icon: "time-outline" as const, title: "Only in your slot", body: "Visit is valid during the slot you book." },
  { icon: "close-outline" as const, title: "Be on time", body: "If your slot ends before check-in, the visit expires." },
  { icon: "card-outline" as const, title: "Show your pass", body: "Share your pass and desk code at the front desk." },
  { icon: "calendar-outline" as const, title: "One per day", body: "One active booking per gym each day." },
  { icon: "refresh-outline" as const, title: "Easy cancel", body: "Cancel more than 2 hours before. A flat 2 credit fee." },
  { icon: "shirt-outline" as const, title: "Gym etiquette", body: "Clean footwear and gym attire." },
];

interface DayChip {
  id: string;
  day: string;
  dateNum: number;
  month: string;
  iso: string;
}

interface SlotView {
  label: string;
  clock: string;
  period: string;
  endLabel: string;
  minutes: number;
}

function buildDates(): DayChip[] {
  const list: DayChip[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    list.push({
      id: d.toISOString().split("T")[0],
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      iso: d.toISOString(),
    });
  }
  return list;
}

function slotChoiceLabel(slot: { startTime?: string; endTime?: string }): string {
  const start = typeof slot.startTime === "string" ? slot.startTime.trim() : "";
  const end = typeof slot.endTime === "string" ? slot.endTime.trim() : "";
  if (!start) return "";
  if (!end || end.toLowerCase() === start.toLowerCase()) return start;
  return `${start} - ${end}`;
}

function clockMinutes(label: string): number | null {
  const match = label.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour = hours24 % 12 || 12;
  if (minutes === 0) return `${hour} ${period}`;
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function viewSlot(label: string): SlotView {
  const parts = label.split(/\s[-–—]\s/);
  const start = (parts[0] || label).trim();
  const end = parts[1]?.trim() || "";
  const match = start.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  const minutes = clockMinutes(start) ?? 12 * 60;
  return {
    label,
    clock: match ? `${Number(match[1])}:${match[2] || "00"}` : start,
    period: match ? match[3].toUpperCase() : "",
    endLabel: end,
    minutes,
  };
}

function cancelCutoff(slot: SlotView): string | null {
  const start = clockMinutes(`${slot.clock} ${slot.period}`);
  if (start === null) return null;
  const deadline = start - 120;
  const label = formatClock(deadline);
  return deadline < 0 ? `${label} the day before` : label;
}

function pairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export default function BookingModal({
  visible,
  onClose,
  onConfirm,
  gym,
  isPrimaryGym,
  visitsRemaining,
  mandatoryVisitsTotal = 10,
  availableCredits,
  cashBalance = 0,
  loading = false,
}: BookingModalProps) {
  const insets = useSafeAreaInsets();
  const [dates, setDates] = useState<DayChip[]>(() => buildDates());
  const [selectedDateId, setSelectedDateId] = useState(dates[0]?.id || "");
  const [slotSource, setSlotSource] = useState<string[]>(TIME_SLOTS);
  const [selectedTime, setSelectedTime] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setInternalLoading(false);
      return;
    }
    const next = buildDates();
    setDates(next);
    setSelectedDateId(next[0]?.id || "");
  }, [visible]);

  useEffect(() => {
    if (!visible || !gym?.id) return;
    let cancelled = false;
    setSlotSource(TIME_SLOTS);
    apiFetch(`/api/gyms/${encodeURIComponent(gym.id)}`, { silent: true })
      .then((data: { slots?: { startTime?: string; endTime?: string }[] }) => {
        if (cancelled || !Array.isArray(data?.slots)) return;
        const labels = data.slots.map((slot) => slotChoiceLabel(slot)).filter((label) => label.length > 0);
        if (labels.length > 0) setSlotSource(labels);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, gym?.id]);

  const isTimeSlotPassed = (slot: string, dateId: string) => {
    if (dateId !== dates[0]?.id) return false;
    const start = clockMinutes(slot.split(/\s[-–—]\s/)[0] || slot);
    if (start === null) return false;
    const now = new Date();
    return start <= now.getHours() * 60 + now.getMinutes();
  };

  const slots = useMemo(() => slotSource.map(viewSlot), [slotSource]);
  const morning = slots.filter((slot) => slot.minutes < 12 * 60);
  const evening = slots.filter((slot) => slot.minutes >= 12 * 60);
  const todayId = dates[0]?.id ?? "";

  useEffect(() => {
    const passed = (slot: string) => {
      if (selectedDateId !== todayId) return false;
      const start = clockMinutes(slot.split(/\s[-–—]\s/)[0] || slot);
      if (start === null) return false;
      const now = new Date();
      return start <= now.getHours() * 60 + now.getMinutes();
    };
    if (selectedTime && slotSource.includes(selectedTime) && !passed(selectedTime)) return;
    setSelectedTime(slotSource.find((slot) => !passed(slot)) || "");
  }, [selectedDateId, slotSource, todayId, selectedTime]);

  if (!visible || !gym) return null;

  const isCashVenue = gym.type === "turf" || gym.type === "sports";
  const creditCost = gym.cost || 8;
  const cashCost = creditCost * 8;
  const isMandatoryVisit = isPrimaryGym && visitsRemaining > 0;
  const visitTotal = Math.max(mandatoryVisitsTotal, visitsRemaining, 1);
  const visitsLeft = Math.max(0, Math.min(visitsRemaining, visitTotal));
  const hasInsufficientCredits = isCashVenue ? cashBalance < cashCost : !isMandatoryVisit && availableCredits < creditCost;
  const selected = slots.find((slot) => slot.label === selectedTime) || null;
  const selectedPassed = !selected || isTimeSlotPassed(selected.label, selectedDateId);
  const selectedDay = dates.find((day) => day.id === selectedDateId);
  const busy = loading || internalLoading;
  const creditsAfter = Math.max(0, availableCredits - creditCost);
  const cashAfter = Math.max(0, cashBalance - cashCost);

  const subtitle = (() => {
    if (!selected || selectedPassed || !selectedDay) return "Pick a time";
    const range = selected.endLabel ? `${selected.clock} ${selected.period} – ${selected.endLabel}` : `${selected.clock} ${selected.period}`.trim();
    const when = `${selectedDay.day} ${selectedDay.dateNum} ${selectedDay.month} · ${range}`;
    if (isMandatoryVisit || isCashVenue) return when;
    return `${when} · ${creditsAfter} credits left`;
  })();

  const buttonLabel = isMandatoryVisit
    ? "Confirm visit"
    : isCashVenue
      ? `Book with ₹${cashCost}`
      : `Book with ${creditCost} credits`;

  const cutoff = selected && !selectedPassed ? cancelCutoff(selected) : null;
  const comesBack = isMandatoryVisit ? "visit comes" : isCashVenue ? "booking comes" : "credits come";

  const handleConfirmPress = async () => {
    if (busy || hasInsufficientCredits || selectedPassed || !selected) return;
    const dateObj = dates.find((day) => day.id === selectedDateId);
    setInternalLoading(true);
    try {
      await onConfirm(selected.label, dateObj?.iso);
    } catch (err) {
      console.error("Booking confirm error:", err);
    } finally {
      setInternalLoading(false);
    }
  };

  const renderSlot = (slot: SlotView) => {
    const passed = isTimeSlotPassed(slot.label, selectedDateId);
    const on = selectedTime === slot.label && !passed;
    return (
      <Pressable
        key={slot.label}
        disabled={passed}
        onPress={() => setSelectedTime(slot.label)}
        style={[styles.slot, on && styles.slotOn, passed && styles.slotOff]}
      >
        <Text style={[styles.slotTime, passed && styles.slotStruck]}>
          {slot.clock}
          {slot.period ? <Text style={[styles.slotPeriod, on && styles.slotPeriodOn]}> {slot.period}</Text> : null}
        </Text>
        <Text style={[styles.slotMeta, on && styles.slotMetaOn]}>{passed ? "Passed" : slot.endLabel ? `to ${slot.endLabel}` : "Available"}</Text>
      </Pressable>
    );
  };

  const renderGroup = (title: string, icon: keyof typeof Ionicons.glyphMap, group: SlotView[]) => {
    if (group.length === 0) return null;
    return (
      <View>
        <View style={styles.group}>
          <Ionicons name={icon} size={18} color={MUTE} />
          <Text style={styles.groupText}>{title}</Text>
        </View>
        {pairs(group).map((row) => (
          <View key={row.map((slot) => slot.label).join("|")} style={styles.slotRow}>
            {row.map(renderSlot)}
            {row.length === 1 ? <View style={styles.slotSpacer} /> : null}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close booking" />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{isMandatoryVisit ? "Book your visit" : "Book an extra visit"}</Text>
              <Text style={styles.gymName} numberOfLines={1}>{gym.name}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close" hitSlop={8}>
              <Ionicons name="close" size={18} color={INK} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {isMandatoryVisit ? (
              <View style={styles.quota}>
                <View style={styles.quotaRow}>
                  <Text style={styles.quotaTitle}>Your monthly visits</Text>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>Included</Text>
                  </View>
                </View>
                <View style={styles.dots}>
                  {Array.from({ length: visitTotal }, (_, index) => (
                    <View key={index} style={[styles.dot, index >= visitsLeft && styles.dotUsed]} />
                  ))}
                </View>
                <Text style={styles.quotaNote}>
                  <Text style={styles.quotaStrong}>{visitsLeft} of {visitTotal}</Text> left this month
                </Text>
              </View>
            ) : (
              <View style={styles.wallet}>
                <View style={styles.walletOrb} />
                <View style={styles.quotaRow}>
                  <Text style={styles.walletLabel}>{isCashVenue ? "Your cash" : "Your credits"}</Text>
                  <Text style={[styles.walletLabel, styles.walletAside]} numberOfLines={1}>
                    {isPrimaryGym ? "Monthly visits complete" : "Credit visit"}
                  </Text>
                </View>
                <Text style={styles.walletBig}>
                  {isCashVenue ? `₹${cashBalance}` : availableCredits}
                  <Text style={styles.walletUnit}>{isCashVenue ? "" : " credits"}</Text>
                </Text>
                <View style={styles.walletRow}>
                  <View style={styles.walletChip}>
                    <Text style={styles.walletChipValue}>{isCashVenue ? `₹${cashCost}` : `${creditCost} credits`}</Text>
                    <Text style={styles.walletChipLabel}>this visit</Text>
                  </View>
                  <View style={styles.walletChip}>
                    <Text style={styles.walletChipValue}>{isCashVenue ? `₹${cashAfter}` : `${creditsAfter} credits`}</Text>
                    <Text style={styles.walletChipLabel}>left after</Text>
                  </View>
                </View>
                <Text style={styles.cheer}>
                  {isPrimaryGym
                    ? `You've finished all ${mandatoryVisitsTotal} monthly visits. Love the consistency. Train more whenever you like.`
                    : `This visit at ${gym.name} uses ${isCashVenue ? "your cash balance" : "your credits"}.`}
                </Text>
              </View>
            )}

            {hasInsufficientCredits ? (
              <Text style={styles.short}>
                {isCashVenue
                  ? `You need ₹${cashCost} in cash to book this visit.`
                  : `You need ${creditCost} credits. You have ${availableCredits}.`}
              </Text>
            ) : null}

            <Text style={styles.sec}>Date</Text>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.dateBleed}
              contentContainerStyle={styles.dateRow}
            >
              {dates.map((day) => {
                const on = selectedDateId === day.id;
                return (
                  <Pressable key={day.id} onPress={() => setSelectedDateId(day.id)} style={[styles.date, on && styles.dateOn]}>
                    <Text style={[styles.dateSmall, on && styles.dateOnText]}>{day.day}</Text>
                    <Text style={[styles.dateNum, on && styles.dateOnText]}>{day.dateNum}</Text>
                    <Text style={[styles.dateSmall, on && styles.dateOnMuted]}>{day.month}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sec}>Time</Text>
            {renderGroup("Morning", "sunny-outline", morning)}
            {renderGroup("Evening", "moon-outline", evening)}
            {morning.length + evening.length > 0 && morning.concat(evening).every((slot) => isTimeSlotPassed(slot.label, selectedDateId)) ? (
              <Text style={styles.passedNote}>Today's slots have passed. Pick another day.</Text>
            ) : null}

            <View style={styles.free}>
              <Ionicons name="shield-checkmark-outline" size={20} color={AMBER} />
              <Text style={styles.freeText}>
                {cutoff ? (
                  <>
                    Cancel before <Text style={styles.freeStrong}>{cutoff}</Text> and your {comesBack} back. A flat 2 credit fee applies.
                  </>
                ) : (
                  "Pick a time to see your cancellation window."
                )}
              </Text>
            </View>

            <Text style={styles.sec}>Good to know</Text>
            <View style={styles.rules}>
              {pairs(KNOW).map((row) => (
                <View key={row.map((rule) => rule.title).join("|")} style={styles.slotRow}>
                  {row.map((rule) => (
                    <View key={rule.title} style={styles.rule}>
                      <View style={styles.ruleIcon}>
                        <Ionicons name={rule.icon} size={18} color={BRAND} />
                      </View>
                      <Text style={styles.ruleTitle}>{rule.title}</Text>
                      <Text style={styles.ruleBody}>{rule.body}</Text>
                    </View>
                  ))}
                  {row.length === 1 ? <View style={styles.slotSpacer} /> : null}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.cta, { paddingBottom: 14 + insets.bottom }]}>
            <Pressable
              onPress={handleConfirmPress}
              disabled={busy || hasInsufficientCredits || selectedPassed}
              style={({ pressed }) => [
                styles.go,
                (hasInsufficientCredits || selectedPassed) && styles.goOff,
                pressed && !busy && styles.goPressed,
              ]}
            >
              {busy ? (
                <View style={styles.confirming}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.goText}>Confirming...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.goText}>{buttonLabel}</Text>
                  <Text style={styles.goSub}>{subtitle}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
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
    height: "86%",
    paddingHorizontal: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  grab: { width: 40, height: 4, borderRadius: 9, backgroundColor: LINE, alignSelf: "center", marginTop: 10 },
  head: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 22, letterSpacing: -0.5, fontWeight: "700", color: INK },
  gymName: { marginTop: 1, fontSize: 13, color: MUTE },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SHEET,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12 },
  quota: {
    backgroundColor: TINT,
    borderWidth: 1,
    borderColor: "rgba(107,203,119,0.4)",
    borderRadius: 20,
    padding: 16,
    marginTop: 6,
  },
  quotaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  quotaTitle: { fontSize: 15, fontWeight: "700", color: INK },
  pill: { backgroundColor: SHEET, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "600", color: BRAND },
  dots: { flexDirection: "row", gap: 6, marginTop: 12 },
  dot: { flex: 1, height: 6, borderRadius: 9, backgroundColor: GREEN },
  dotUsed: { backgroundColor: "rgba(107,203,119,0.28)" },
  quotaNote: { marginTop: 8, color: MUTE, fontSize: 13 },
  quotaStrong: { color: INK, fontWeight: "700" },
  wallet: {
    backgroundColor: BRAND,
    borderRadius: 20,
    padding: 18,
    marginTop: 6,
    overflow: "hidden",
  },
  walletOrb: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  walletLabel: { color: "#ffffff", opacity: 0.9, fontSize: 13 },
  walletAside: { flexShrink: 1, textAlign: "right" },
  walletBig: { color: "#ffffff", fontSize: 40, fontWeight: "700", letterSpacing: -1.5, marginTop: 6 },
  walletUnit: { fontSize: 15, fontWeight: "500", letterSpacing: 0, opacity: 0.85 },
  walletRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  walletChip: { flex: 1, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  walletChipValue: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  walletChipLabel: { color: "#ffffff", fontSize: 12, opacity: 0.9 },
  cheer: { color: "#ffffff", fontSize: 13, marginTop: 10, lineHeight: 18 },
  short: { marginTop: 10, color: "#b42318", fontSize: 13, fontWeight: "600" },
  sec: {
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: MUTE,
    fontWeight: "600",
    marginTop: 26,
    marginBottom: 12,
  },
  dateBleed: { marginHorizontal: -22 },
  dateRow: { paddingHorizontal: 22, gap: 10, paddingBottom: 4 },
  date: {
    width: 62,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: SHEET,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
  },
  dateOn: {
    backgroundColor: BRAND,
    borderColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateSmall: { fontSize: 12, color: MUTE },
  dateNum: { fontSize: 22, letterSpacing: -0.5, color: INK, fontWeight: "700", marginVertical: 2 },
  dateOnText: { color: "#ffffff" },
  dateOnMuted: { color: "#ffffff", opacity: 0.8 },
  group: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 6 },
  groupText: { color: MUTE, fontSize: 13, fontWeight: "600" },
  slotRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  slot: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: SHEET,
    borderWidth: 1,
    borderColor: LINE,
  },
  slotOn: { borderColor: BRAND, backgroundColor: TINT, borderWidth: 1.5 },
  slotOff: { opacity: 0.45, backgroundColor: "transparent" },
  slotTime: { fontSize: 20, letterSpacing: -0.5, fontWeight: "700", color: INK },
  slotStruck: { textDecorationLine: "line-through" },
  slotPeriod: { fontSize: 13, fontWeight: "600", color: MUTE },
  slotPeriodOn: { color: BRAND },
  slotMeta: { fontSize: 12.5, color: MUTE, marginTop: 2 },
  slotMetaOn: { color: BRAND },
  slotSpacer: { flex: 1 },
  passedNote: { color: AMBER, fontSize: 13, fontWeight: "600", marginTop: 4 },
  free: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: ATINT,
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
  },
  freeText: { flex: 1, color: AMBER, fontSize: 14, lineHeight: 20 },
  freeStrong: { color: INK, fontWeight: "700" },
  rules: { paddingBottom: 6 },
  rule: {
    flex: 1,
    backgroundColor: SHEET,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 18,
    padding: 14,
  },
  ruleIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: TINT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  ruleTitle: { fontSize: 14, fontWeight: "700", color: INK, lineHeight: 18 },
  ruleBody: { fontSize: 12.5, color: MUTE, marginTop: 3, lineHeight: 17 },
  cta: {
    marginHorizontal: -22,
    paddingHorizontal: 22,
    paddingTop: 16,
    backgroundColor: SHEET,
  },
  go: {
    height: 58,
    borderRadius: 18,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  goOff: { backgroundColor: "#9aa89c", shadowOpacity: 0, elevation: 0 },
  goPressed: { transform: [{ scale: 0.97 }] },
  goText: { color: "#ffffff", fontWeight: "600", fontSize: 16 },
  goSub: { color: "#ffffff", fontWeight: "500", opacity: 0.85, fontSize: 12.5, marginTop: 2 },
  confirming: { flexDirection: "row", alignItems: "center", gap: 8 },
});
