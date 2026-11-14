import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  StatusBar,
  Animated,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { afterPaint } from "@/lib/afterPaint";
import { useAuthStore } from "@/store/useAuthStore";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import CancelBookingSheet from "@/components/CancelBookingSheet";
import { useBookingStore } from "@/store/useBookingStore";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { FALLBACK_NETWORK_GYMS } from "@/constants/fallbackGyms";
import { isBookingSlotPast } from "@/lib/bookingTime";

function getGymPrefix(gymName?: string | null): string {
  if (!gymName) return "BF";
  const words = gymName
    .trim()
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return "BF";
}

function formatPassDate(dateVal: Date | string | null | undefined): string {
  if (!dateVal) {
    const now = new Date();
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(now);
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return String(dateVal);
  }
}

function parseSlotStartEnd(timeSlot?: string | null): { start: string; end: string } {
  if (!timeSlot || typeof timeSlot !== "string") {
    return { start: "", end: "" };
  }
  const parts = timeSlot.split(/\s*[-–—]\s*/);
  return {
    start: parts[0]?.trim() || "",
    end: parts[1]?.trim() || "",
  };
}

export default function BookingPassScreen() {
  const router = useRouter();
  const {
    bookingStatus,
    bookingId,
    bookedGymId,
    bookedGymName,
    bookedDate,
    bookedVisitDateIso,
    bookedTime,
    bookedCost,
    bookedTokenNumber,
    bookedGymPrefix,
    cancelBooking,
  } = useBookingStore();

  const { primaryGymId, primaryGymName } = useUserStore();
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState<null | "history" | "book">(null);
  const openingLock = useRef<null | "history" | "book">(null);
  const [cancelPrompt, setCancelPrompt] = useState<{
    isMandatory: boolean;
    refundAmount: number;
  } | null>(null);

  const [pulseAnim] = useState(() => new Animated.Value(1));

  useFocusEffect(
    React.useCallback(() => {
      openingLock.current = null;
      setOpening(null);
      const token = useAuthStore.getState().token;
      if (token) useBookingStore.getState().fetchBookings(token, { force: true });
    }, [])
  );

  const openScreen = (key: "history" | "book", path: string, replace = false) => {
    if (openingLock.current) return;
    openingLock.current = key;
    setOpening(key);
    afterPaint(() => {
      if (replace) router.replace(path as never);
      else router.push(path as never);
    });
  };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulseAnim]);

  // Fallback gym resolution
  const matchedGym = FALLBACK_NETWORK_GYMS.find(
    (g) =>
      (bookedGymId && g.id.toLowerCase() === bookedGymId.toLowerCase()) ||
      (bookedGymName && g.name.toLowerCase() === bookedGymName.toLowerCase())
  );

  const displayGymName =
    bookedGymName || matchedGym?.name || primaryGymName || "Being Fitness";
  const displayAddress = matchedGym?.address || "Rao Ji Ka Hata, Udaipur";
  const displayImage =
    matchedGym?.image ||
    "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=600";

  // Desk code (ZF-XXXXXX)
  const deskTail = String(bookingId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6)
    .toUpperCase();
  const displayDeskCode = deskTail.length === 6 ? `ZF-${deskTail}` : "ZF-58E440";

  // Gym Prefix (BF, IP, etc.)
  const gymPrefix = bookedGymPrefix || getGymPrefix(displayGymName);

  // Daily sequential token number (e.g. 014, 001)
  const tokenNum =
    bookedTokenNumber ||
    (deskTail.length > 0 ? (parseInt(deskTail.replace(/\D/g, "") || "14", 10) % 999) + 1 : 14);
  const dailySeq = String(tokenNum).padStart(3, "0");

  // Formatted date in IST: "Tue, 3 Nov"
  const dateLabel = formatPassDate(bookedVisitDateIso || bookedDate);

  // Check-in slot start and end
  const slotRange = parseSlotStartEnd(bookedTime);

  const isCostZero = bookedCost === 0 || bookedCost === undefined;
  const isPrimary = Boolean(
    (bookedGymId && primaryGymId && bookedGymId === primaryGymId) ||
      (bookedGymName &&
        primaryGymName &&
        bookedGymName.toLowerCase() === primaryGymName.toLowerCase()) ||
      isCostZero
  );

  const handleCopyId = async () => {
    if (!displayDeskCode) return;
    try {
      await Clipboard.setStringAsync(displayDeskCode);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMaps = () => {
    const query = encodeURIComponent(`${displayGymName} ${displayAddress}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleCancelBooking = () => {
    const isMandatory = isCostZero;
    const currentCredits = useCreditsStore.getState().credits;

    if (isMandatory && currentCredits < 2) {
      Alert.alert(
        "Cannot Cancel Booking",
        `Cancelling a mandatory visit requires a flat 2 Credits fee, but your wallet balance is only ${currentCredits} Credits.\n\nPlease buy credits to cancel this booking.`,
        [
          { text: "OK", style: "cancel" },
          { text: "Buy Credits", onPress: () => router.push("/credits") },
        ]
      );
      return;
    }

    setCancelPrompt({
      isMandatory,
      refundAmount: Math.max(0, (bookedCost || 8) - 2),
    });
  };

  const confirmCancelBooking = async () => {
    const result = await cancelBooking();
    if (!result?.success) {
      throw new Error(result?.message || "Could not cancel booking.");
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const isPassed = isBookingSlotPast(
    bookedVisitDateIso || bookedDate,
    bookedTime
  );
  const hasActiveBooking =
    (bookingStatus === "Booked" || bookingStatus === "Checked In") && !isPassed;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* ─── Top Bar ─── */}
      <View style={styles.bar}>
        <Pressable
          onPress={handleGoBack}
          hitSlop={10}
          style={styles.ib}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>

        <Text style={styles.barTitle}>Booking Pass</Text>

        <Pressable
          onPress={() => router.replace("/(tabs)")}
          hitSlop={10}
          style={styles.ib}
          accessibilityLabel="Home"
        >
          <Ionicons name="home-outline" size={19} color="#111827" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasActiveBooking ? (
          /* Empty / No Active Booking State */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={38} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Active Booking</Text>
            <Text style={styles.emptySubtitle}>
              You do not have an active workout booking right now. Book a slot at
              your primary gym or any network partner gym to generate your
              pass.
            </Text>
            <Pressable
              disabled={opening !== null}
              onPress={() => openScreen("book", "/(tabs)/explore", true)}
              style={styles.priBtn}
            >
              <Text style={styles.priBtnText}>
                {opening === "book" ? "Opening..." : "Book Today's Workout"}
              </Text>
            </Pressable>
            <Pressable
              disabled={opening !== null}
              onPress={() => openScreen("history", "/booking-history")}
              style={styles.ghBtn}
            >
              <Text style={styles.ghBtnText}>
                {opening === "history" ? "Opening..." : "View Booking History"}
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Active Booking Pass Content */
          <>
            {/* ─── Confirmed Status Header (.ok) ─── */}
            <View style={styles.ok}>
              <View style={styles.ring}>
                <View style={styles.ringInner}>
                  <Ionicons name="checkmark" size={26} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.okTitle}>
                {bookingStatus === "Checked In"
                  ? "Checked In Successfully!"
                  : "Booking Confirmed!"}
              </Text>
              <Text style={styles.okSub}>
                {bookingStatus === "Checked In"
                  ? "Great workout! Keep your habit streak going."
                  : "Show this pass at the front desk to check in."}
              </Text>
            </View>

            {/* ─── Ticket Main Card (.card) ─── */}
            <View style={styles.card}>
              {/* Gym Row (.gym) */}
              <View style={styles.gymRow}>
                <Image
                  source={{ uri: displayImage }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>
                      {isPrimary ? "Primary Gym" : "Partner Gym"}
                    </Text>
                  </View>
                  <Text style={styles.gymTitle} numberOfLines={1}>
                    {displayGymName}
                  </Text>
                  <Text style={styles.gymArea} numberOfLines={1}>
                    {displayAddress}
                  </Text>
                </View>
              </View>

              {/* Get Directions Button */}
              <View style={styles.mapsWrap}>
                <Pressable onPress={handleOpenMaps} style={styles.mapsBtn}>
                  <Ionicons name="location" size={14} color="#15803D" />
                  <Text style={styles.mapsBtnText}>Get directions</Text>
                </Pressable>
              </View>

              {/* ─── The Token Number Panel (.token) ─── */}
              <View style={styles.tokenPanel}>
                <Text style={styles.tokenSmall}>TELL THE DESK YOUR NUMBER</Text>
                <Text style={styles.tokenPre}>{gymPrefix}</Text>
                <Text style={styles.tokenNum}>{dailySeq}</Text>
                <View style={styles.livePill}>
                  <Animated.View
                    style={[styles.dot, { opacity: pulseAnim }]}
                  />
                  <Text style={styles.liveText}>
                    {bookingStatus === "Checked In"
                      ? "Checked In · Workout Active"
                      : "Confirmed · Ready for Entry"}
                  </Text>
                </View>
              </View>

              {/* ─── Tear / Ticket Cutout Divider (.tear) ─── */}
              <View style={styles.tearWrap}>
                <View style={styles.notchLeft} />
                <View style={styles.dashedDivider} />
                <View style={styles.notchRight} />
              </View>

              {/* ─── Info Section (.info) ─── */}
              <View style={styles.infoSection}>
                {/* Date & Check-in Slot Grid (.dt) */}
                <View style={styles.dtGrid}>
                  <View style={styles.dtCol}>
                    <Text style={styles.dtSmall}>DATE</Text>
                    <Text style={styles.dtStrong}>{dateLabel}</Text>
                  </View>
                  <View style={[styles.dtCol, styles.dtColRight]}>
                    <Text style={styles.dtSmall}>CHECK-IN SLOT</Text>
                    {slotRange.end ? (
                      <View style={styles.slotRow}>
                        <Text style={styles.dtStrong}>{slotRange.start}</Text>
                        <Text style={styles.dtArrow}>→</Text>
                        <Text style={styles.dtStrong}>{slotRange.end}</Text>
                      </View>
                    ) : (
                      <Text style={styles.dtStrong}>{slotRange.start || "—"}</Text>
                    )}
                  </View>
                </View>

                {/* Booking Type Row */}
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Booking Type</Text>
                  <Text style={styles.rowVal}>
                    {isCostZero
                      ? "Mandatory Visit (Plan Included)"
                      : `Credit Visit (${bookedCost || 8} Credits)`}
                  </Text>
                </View>

                {/* Desk Code Row */}
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Desk code</Text>
                  <View style={styles.deskWrap}>
                    <Text style={styles.deskCodeText}>{displayDeskCode}</Text>
                    <Pressable
                      onPress={handleCopyId}
                      style={styles.cpBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.cpBtnText}>
                        {copied ? "Copied" : "Copy"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Entry Verification Row */}
                <View style={[styles.row, { borderBottomWidth: 0 }]}>
                  <Text style={styles.rowLabel}>Entry Verification</Text>
                  <View style={styles.verifyRow}>
                    <View style={styles.verifyDot} />
                    <Text style={styles.verifyText}>Staff confirms at desk</Text>
                  </View>
                </View>
              </View>

              {/* ─── Slot Rule Banner (.slotrule) ─── */}
              <View style={styles.slotrule}>
                <Ionicons
                  name="time-outline"
                  size={19}
                  color="#FFFFFF"
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.slotruleText}>
                  Check in anytime during your slot. Miss it and the visit is lost.
                </Text>
              </View>

              {/* ─── Gym Rules (.sec & .rules) ─── */}
              <View style={styles.secWrap}>
                <Text style={styles.secText}>Gym rules</Text>
                <View style={styles.secLine} />
              </View>

              <View style={styles.rulesGrid}>
                <View style={styles.ruleItem}>
                  <Ionicons name="footsteps-outline" size={22} color="#16A34A" />
                  <Text style={styles.ruleLabel}>Clean shoes</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons name="water-outline" size={22} color="#16A34A" />
                  <Text style={styles.ruleLabel}>Bring towel</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons name="barbell-outline" size={22} color="#16A34A" />
                  <Text style={styles.ruleLabel}>Re-rack weights</Text>
                </View>
                <View style={styles.ruleItem}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={22}
                    color="#16A34A"
                  />
                  <Text style={styles.ruleLabel}>Show this pass</Text>
                </View>
              </View>

              <Text style={styles.oneText}>
                <Text style={{ fontWeight: "700", color: "#111827" }}>
                  One booking
                </Text>{" "}
                per gym, per day.
              </Text>

              {/* ─── Cancellation Policy (.cancel) ─── */}
              <View style={styles.cancelBox}>
                <View style={styles.cancelHeader}>
                  <Ionicons
                    name="shield-checkmark"
                    size={17}
                    color="#16A34A"
                  />
                  <Text style={styles.cancelTitle}>Cancellation Policy</Text>
                </View>
                <Text style={styles.cancelBody}>
                  <Text style={{ fontWeight: "700", color: "#111827" }}>
                    Flat 2 credits, every time.{" "}
                  </Text>
                  Credit visit: 2 credits stay with ZonoFit, the rest returns.
                  Plan visit: 2 credits are taken from your wallet and the visit
                  returns to your plan.
                </Text>
              </View>

              {/* ─── Footer Tag (.tag) ─── */}
              <View style={styles.tagWrap}>
                <Text style={styles.tagText}>
                  <Text style={{ fontWeight: "800", color: "#16A34A" }}>
                    Pay for the workout,{" "}
                  </Text>
                  not the membership.
                </Text>
              </View>
            </View>

            {/* ─── Bottom Actions (.acts) ─── */}
            <View style={styles.acts}>
              <Pressable
                disabled={opening !== null}
                onPress={() => openScreen("history", "/booking-history")}
                style={styles.priBtn}
              >
                <Text style={styles.priBtnText}>
                  {opening === "history" ? "Opening..." : "View Booking History"}
                </Text>
              </Pressable>

              {bookingStatus !== "Checked In" && (
                <Pressable
                  onPress={handleCancelBooking}
                  style={styles.dngBtn}
                >
                  <Text style={styles.dngBtnText}>Cancel This Booking</Text>
                  <Text style={styles.dngBtnSub}>Flat 2-credit fee applies</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => router.replace("/(tabs)")}
                style={styles.ghBtn}
              >
                <Text style={styles.ghBtnText}>Back to Home</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Cancellation Sheet Modal */}
      {cancelPrompt && (
        <CancelBookingSheet
          visible={true}
          isMandatory={cancelPrompt.isMandatory}
          refundCredits={cancelPrompt.refundAmount}
          onConfirm={confirmCancelBooking}
          onKeep={() => setCancelPrompt(null)}
          onDone={() => {
            setCancelPrompt(null);
            router.replace("/(tabs)");
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F6FA",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  ib: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  barTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  ok: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
  },
  ring: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#E8F8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  okTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
    marginTop: 12,
    letterSpacing: -0.3,
  },
  okSub: {
    color: "#6B7280",
    fontSize: 14.5,
    marginTop: 3,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#0B3D26",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    overflow: "hidden",
  },
  gymRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: "#1F2937",
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F8EE",
    borderWidth: 1,
    borderColor: "#CAEFD7",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 99,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
  gymTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  gymArea: {
    fontSize: 13.5,
    color: "#6B7280",
    marginTop: 1,
  },
  mapsWrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginTop: -2,
  },
  mapsBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 99,
    backgroundColor: "#E8F8EE",
  },
  mapsBtnText: {
    color: "#15803D",
    fontSize: 13,
    fontWeight: "700",
  },
  tokenPanel: {
    marginHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#0B3D26",
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#0B3D26",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  tokenSmall: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.7)",
  },
  tokenPre: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 3.5,
    color: "#4ADE80",
    marginTop: 8,
  },
  tokenNum: {
    fontSize: 88,
    fontWeight: "800",
    lineHeight: 92,
    letterSpacing: -1,
    color: "#FFFFFF",
    marginTop: 2,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 99,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  liveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tearWrap: {
    position: "relative",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
    height: 24,
    justifyContent: "center",
  },
  dashedDivider: {
    borderTopWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    width: "100%",
  },
  notchLeft: {
    position: "absolute",
    left: -28,
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F6FA",
    zIndex: 10,
  },
  notchRight: {
    position: "absolute",
    right: -28,
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F6FA",
    zIndex: 10,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  dtGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    backgroundColor: "rgba(127,127,127,0.04)",
    marginBottom: 10,
  },
  dtCol: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dtColRight: {
    flex: 1.3,
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
  },
  dtSmall: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#6B7280",
  },
  dtStrong: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dtArrow: {
    color: "#16A34A",
    marginHorizontal: 4,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  rowLabel: {
    fontSize: 14.5,
    fontWeight: "500",
    color: "#6B7280",
  },
  rowVal: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#111827",
    textAlign: "right",
    flexShrink: 1,
  },
  deskWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deskCodeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#16A34A",
  },
  cpBtn: {
    backgroundColor: "#E8F8EE",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  cpBtnText: {
    color: "#15803D",
    fontWeight: "700",
    fontSize: 11.5,
  },
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  verifyText: {
    color: "#16A34A",
    fontWeight: "700",
    fontSize: 14,
  },
  slotrule: {
    marginHorizontal: 20,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#16A34A",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  slotruleText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  secWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  secText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  secLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  rulesGrid: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  ruleItem: {
    flex: 1,
    backgroundColor: "#E8F8EE",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  ruleLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#111827",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 14,
  },
  oneText: {
    paddingHorizontal: 22,
    paddingTop: 12,
    fontSize: 13,
    color: "#6B7280",
  },
  cancelBox: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#E8F8EE",
    borderWidth: 1,
    borderColor: "#CAEFD7",
  },
  cancelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cancelTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#15803D",
  },
  cancelBody: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: "#4B5563",
  },
  tagWrap: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  tagText: {
    fontSize: 12.5,
    color: "#6B7280",
  },
  acts: {
    marginTop: 16,
    gap: 10,
  },
  priBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  priBtnText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "700",
  },
  dngBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(217, 45, 32, 0.3)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
  },
  dngBtnText: {
    color: "#D92D20",
    fontSize: 15,
    fontWeight: "700",
  },
  dngBtnSub: {
    color: "#D92D20",
    fontSize: 11.5,
    fontWeight: "500",
    opacity: 0.85,
    marginTop: 2,
  },
  ghBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  ghBtnText: {
    color: "#6B7280",
    fontSize: 14.5,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    marginTop: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
});
