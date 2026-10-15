import React, { useState } from "react";
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  Image, 
  Alert, 
  StyleSheet, 
  Dimensions,
  StatusBar,
  Modal,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useBookingStore } from "@/store/useBookingStore";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { 
  FALLBACK_NETWORK_GYMS, 
  getGymPolicies, 
  CANCELLATION_POLICY_NOTE, 
} from "@/constants/fallbackGyms";

const { width } = Dimensions.get("window");

export default function BookingPassScreen() {
  const router = useRouter();
  const { 
    bookingStatus, 
    bookingId, 
    bookedGymId, 
    bookedGymName, 
    bookedDate, 
    bookedTime, 
    bookedCost,
    cancelBooking,
    checkIn
  } = useBookingStore();
  const { primaryGymId, primaryGymName } = useUserStore();
  const [copied, setCopied] = useState(false);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  // Fallback gym resolution
  const matchedGym = FALLBACK_NETWORK_GYMS.find(
    (g) => 
      (bookedGymId && g.id.toLowerCase() === bookedGymId.toLowerCase()) ||
      (bookedGymName && g.name.toLowerCase() === bookedGymName.toLowerCase())
  );

  const displayGymName = bookedGymName || matchedGym?.name || primaryGymName || "Being Fitness";
  const displayAddress = matchedGym?.address || "City Center, Udaipur";
  const displayImage = matchedGym?.image || "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=600";
  
  // Safe clean booking ID
  const cleanId = String(bookingId || "ZF-784562");
  const displayBookingId = cleanId.startsWith("ZF-") 
    ? cleanId 
    : `ZF-${cleanId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "784562"}`;

  // Safe date display
  const getFormattedDate = () => {
    if (bookedDate) return bookedDate;
    try {
      return new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      }).format(new Date());
    } catch {
      const d = new Date();
      return `${d.getDate()} Oct ${d.getFullYear()}`;
    }
  };

  const displayDate = getFormattedDate();
  const displayTime = bookedTime || "7:00 PM";
  const isCostZero = bookedCost === 0 || bookedCost === undefined;
  const isPrimary = Boolean(
    (bookedGymId && primaryGymId && bookedGymId === primaryGymId) ||
    (bookedGymName && primaryGymName && bookedGymName.toLowerCase() === primaryGymName.toLowerCase()) ||
    isCostZero
  );

  // Gym policies
  const gymPolicies = getGymPolicies(matchedGym?.id || displayGymName);

  const handleCopyId = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert("Booking ID", `Booking ID: ${displayBookingId}`);
  };

  const handleCancelBooking = () => {
    if (isProcessingCancel) return;
    const isMandatory = isCostZero;
    const currentCredits = useCreditsStore.getState().credits;

    if (isMandatory && currentCredits < 2) {
      Alert.alert(
        "Cannot Cancel Booking",
        `Cancelling a mandatory visit requires a flat 2 Credits fee, but your wallet balance is only ${currentCredits} Credits.\n\nPlease buy credits to cancel this booking.`,
        [
          { text: "OK", style: "cancel" },
          { text: "Buy Credits", onPress: () => router.push("/credits") }
        ]
      );
      return;
    }

    const refundAmount = Math.max(0, (bookedCost || 8) - 2);
    const confirmMessage = isMandatory
      ? `Cancelling this booking will incur a flat 2 Credits fee from your wallet.\n\nYour 1 mandatory visit will be restored.\n\nDo you want to proceed?`
      : `Cancelling this booking will incur a flat 2 Credits fee.\n\nYou will receive a refund of ${refundAmount} Credits to your wallet.\n\nDo you want to proceed?`;

    Alert.alert(
      "Cancel Booking?",
      confirmMessage,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setIsProcessingCancel(true);
            try {
              await cancelBooking();
              setIsProcessingCancel(false);
              Alert.alert(
                "Booking Cancelled",
                isMandatory 
                  ? "Your booking was cancelled. 1 mandatory visit has been restored and flat 2 credits were deducted."
                  : `Your booking was cancelled. ${refundAmount} credits were refunded to your wallet (flat 2 credits fee applied).`,
                [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
              );
            } catch (err: any) {
              setIsProcessingCancel(false);
              Alert.alert("Cancellation Failed", err?.message || "Could not cancel booking.");
            }
          }
        }
      ]
    );
  };

  const hasActiveBooking = bookingStatus === "Booked" || bookingStatus === "Checked In" || bookingId !== null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>

        <Text style={styles.headerTitle}>Booking Pass</Text>

        <Pressable 
          onPress={() => router.replace("/(tabs)")}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <Ionicons name="home-outline" size={20} color="#111827" />
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
              <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Active Booking</Text>
            <Text style={styles.emptySubtitle}>
              You don't have an active workout booking right now. Book a slot at your primary gym or any network partner gym to generate your pass.
            </Text>
            <Pressable
              onPress={() => router.replace("/(tabs)/explore" as any)}
              style={styles.primaryActionButton}
            >
              <Text style={styles.primaryActionButtonText}>Book Today's Workout</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/booking-history" as any)}
              style={styles.secondaryActionButton}
            >
              <Text style={styles.secondaryActionButtonText}>View Booking History</Text>
            </Pressable>
          </View>
        ) : (
          /* Active Booking Pass Content */
          <>
            {/* Confirmed Banner Header */}
            <View style={styles.successBanner}>
              <View style={styles.successOuterCircle}>
                <View style={styles.successInnerCircle}>
                  <Ionicons name="checkmark" size={28} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.successTitle}>
                {bookingStatus === "Checked In" ? "Checked In Successfully!" : "Booking Confirmed!"}
              </Text>
              <Text style={styles.successSubtitle}>
                {bookingStatus === "Checked In" 
                  ? "Great workout! Stay consistent with your streak." 
                  : "Show this pass at the front desk to check in."}
              </Text>
            </View>

            {/* Ticket / Pass Card */}
            <View style={styles.ticketCard}>
              {/* Gym info row */}
              <View style={styles.gymRow}>
                <Image 
                  source={{ uri: displayImage }} 
                  style={styles.gymImage} 
                  resizeMode="cover"
                />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <View style={[styles.badgePill, isPrimary ? styles.primaryBadge : styles.partnerBadge]}>
                      <Text style={[styles.badgeText, isPrimary ? styles.primaryBadgeText : styles.partnerBadgeText]}>
                        {isPrimary ? "Primary Gym" : "Partner Gym"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.gymName} numberOfLines={1}>
                    {displayGymName}
                  </Text>
                  
                  <Text style={styles.gymAddress} numberOfLines={1}>
                    📍 {displayAddress}
                  </Text>
                </View>
              </View>

              {/* Dashed Separator / Ticket Notches */}
              <View style={styles.ticketDividerWrap}>
                <View style={styles.notchLeft} />
                <View style={styles.dashedLine} />
                <View style={styles.notchRight} />
              </View>

              {/* Date & Time pill banner */}
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeCol}>
                  <View style={styles.miniIconBox}>
                    <Ionicons name="calendar-outline" size={16} color="#16A34A" />
                  </View>
                  <View>
                    <Text style={styles.miniLabel}>DATE</Text>
                    <Text style={styles.miniValue}>{displayDate}</Text>
                  </View>
                </View>

                <View style={styles.verticalDivider} />

                <View style={styles.dateTimeCol}>
                  <View style={styles.miniIconBox}>
                    <Ionicons name="time-outline" size={16} color="#16A34A" />
                  </View>
                  <View>
                    <Text style={styles.miniLabel}>TIME SLOT</Text>
                    <Text style={styles.miniValue}>{displayTime}</Text>
                  </View>
                </View>
              </View>

              {/* Booking Details Metadata */}
              <View style={styles.metaContainer}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Booking Type</Text>
                  <Text style={styles.metaValue}>
                    {isCostZero ? "Mandatory Visit (Plan Included)" : `Credit Visit (${bookedCost || 8} Credits)`}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Booking ID</Text>
                  <Pressable onPress={handleCopyId} style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.bookingIdText}>{displayBookingId}</Text>
                    <Ionicons name={copied ? "checkmark" : "copy-outline"} size={13} color="#16A34A" style={{ marginLeft: 4 }} />
                  </Pressable>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>Entry Verification</Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={styles.greenDot} />
                    <Text style={styles.verifiedText}>
                      {bookingStatus === "Checked In" ? "Checked In" : "Confirmed • Ready for Entry"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Check-In CTA inside the pass */}
              {bookingStatus !== "Checked In" && (
                <Pressable
                  onPress={async () => {
                    await checkIn();
                    Alert.alert("Checked In!", "Front desk verification complete. Have a great workout!");
                  }}
                  style={styles.qrScanBtn}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.qrScanBtnText}>Verify Check-In at Front Desk</Text>
                </Pressable>
              )}
            </View>

            {/* Cancellation Notice Card */}
            <View style={styles.cancelNoticeCard}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" style={{ marginTop: 2, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelNoticeTitle}>Cancellation Policy</Text>
                <Text style={styles.cancelNoticeText}>{CANCELLATION_POLICY_NOTE}</Text>
              </View>
            </View>

            {/* Gym Rules Card */}
            <View style={styles.rulesCard}>
              <View style={styles.rulesHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="document-text-outline" size={16} color="#111827" style={{ marginRight: 6 }} />
                  <Text style={styles.rulesTitle}>{displayGymName} Rules</Text>
                </View>
                <View style={styles.rulesTag}>
                  <Text style={styles.rulesTagText}>Gym Guidelines</Text>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                {gymPolicies.map((policy, idx) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <Ionicons name="checkmark-circle" size={15} color="#16A34A" style={{ marginTop: 2, marginRight: 8 }} />
                    <Text style={styles.policyText}>{policy}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.rulesFooter}>
                <Text style={styles.rulesFooterText}>
                  * Please carry a clean gym towel, athletic shoes, and show this pass to front desk staff upon arrival.
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.bottomActions}>
              <Pressable
                onPress={() => router.push("/booking-history" as any)}
                style={styles.primaryActionButton}
              >
                <Text style={styles.primaryActionButtonText}>View Booking History</Text>
              </Pressable>

              {bookingStatus !== "Checked In" && (
                <Pressable
                  onPress={handleCancelBooking}
                  disabled={isProcessingCancel}
                  style={[styles.cancelBookingBtn, isProcessingCancel && { opacity: 0.6 }]}
                >
                  {isProcessingCancel ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <Text style={styles.cancelBookingBtnText}>Cancel This Booking</Text>
                  )}
                </Pressable>
              )}

              <Pressable
                onPress={() => router.replace("/(tabs)")}
                style={styles.backHomeBtn}
              >
                <Text style={styles.backHomeBtnText}>Back to Home</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Cancellation Loading HUD */}
      <Modal visible={isProcessingCancel} transparent animationType="fade">
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalCard}>
            <ActivityIndicator size="large" color="#1F7A3E" />
            <Text style={styles.loadingModalTitle}>Cancelling Booking...</Text>
            <Text style={styles.loadingModalSubtitle}>
              Processing cancellation & flat 2 credits fee. Please wait...
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 50,
  },

  // Empty state
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },

  // Success Banner
  successBanner: {
    alignItems: "center",
    marginBottom: 18,
  },
  successOuterCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  successInnerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  successSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },

  // Ticket Card
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
    overflow: "hidden",
  },
  gymRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
  },
  gymImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  primaryBadge: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  partnerBadge: {
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  primaryBadgeText: {
    color: "#166534",
  },
  partnerBadgeText: {
    color: "#1E40AF",
  },
  gymName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  gymAddress: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  // Ticket Divider
  ticketDividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    marginVertical: 4,
  },
  notchLeft: {
    width: 14,
    height: 28,
    backgroundColor: "#F9FAFB",
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    marginLeft: -1,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  notchRight: {
    width: 14,
    height: 28,
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: -1,
  },

  // Date Time Row
  dateTimeRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  dateTimeCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  miniIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  miniValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },

  // Meta details
  metaContainer: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaKey: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  bookingIdText: {
    fontSize: 12.5,
    fontFamily: "monospace",
    fontWeight: "800",
    color: "#16A34A",
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#16A34A",
    marginRight: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },

  // QR Scan Button
  qrScanBtn: {
    margin: 16,
    marginTop: 6,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  qrScanBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Cancellation notice
  cancelNoticeCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cancelNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  cancelNoticeText: {
    fontSize: 11.5,
    color: "#15803D",
    lineHeight: 16,
  },

  // Rules card
  rulesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  rulesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  rulesTag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rulesTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
  },
  policyText: {
    fontSize: 12,
    color: "#4B5563",
    flex: 1,
    lineHeight: 17,
  },
  rulesFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
  rulesFooterText: {
    fontSize: 10.5,
    color: "#9CA3AF",
    fontStyle: "italic",
    lineHeight: 15,
  },

  // Bottom action buttons
  bottomActions: {
    gap: 10,
  },
  primaryActionButton: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  primaryActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryActionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    width: "100%",
  },
  secondaryActionButtonText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
  cancelBookingBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBookingBtnText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
  backHomeBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  backHomeBtnText: {
    color: "#6B7280",
    fontSize: 12.5,
    fontWeight: "600",
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginTop: 16,
    textAlign: "center",
  },
  loadingModalSubtitle: {
    fontSize: 12.5,
    color: "#6B7280",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
});
