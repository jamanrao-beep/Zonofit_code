import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

const TIME_SLOTS = [
  "6:00 AM",
  "7:30 AM",
  "9:00 AM",
  "5:00 PM",
  "6:30 PM",
  "8:00 PM",
];

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
  const dates = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 5; i++) {
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
  }, []);

  const [selectedDateId, setSelectedDateId] = useState(dates[0]?.id || "");
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[3]); // default 5:00 PM
  const [showRulesModal, setShowRulesModal] = useState(false);

  if (!visible || !gym) return null;

  const isCashVenue = gym.type === "turf" || gym.type === "sports";
  const cashCost = (gym.cost || 8) * 8;
  const isMandatoryVisit = isPrimaryGym && visitsRemaining > 0;
  const isCreditVisit = !isMandatoryVisit;

  const hasInsufficientCredits = isCashVenue
    ? cashBalance < cashCost
    : isCreditVisit && availableCredits < (gym.cost || 8);

  const handleConfirmPress = () => {
    if (loading || hasInsufficientCredits) return;
    const dateObj = dates.find((d) => d.id === selectedDateId);
    onConfirm(selectedTime, dateObj?.iso);
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />

          <View style={styles.modalContent}>
            {/* Header Close Bar */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.modalMainHeader}>
                  {isPrimaryGym
                    ? isMandatoryVisit
                      ? "Book Mandatory Visit"
                      : "Book with Credits"
                    : "Book Workout"}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              {/* ============================================================
                  CASE 1: PRIMARY GYM — MANDATORY VISIT (Mockup Screen 3)
                  ============================================================ */}
              {isPrimaryGym && isMandatoryVisit && (
                <View style={styles.visitOverviewCard}>
                  <View style={styles.visitOverviewTop}>
                    <View style={styles.visitIconWrapGreen}>
                      <Ionicons name="calendar-outline" size={20} color="#166534" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.visitOverviewTitle}>Mandatory Visit</Text>
                        <View style={styles.includedBadge}>
                          <Text style={styles.includedBadgeText}>Included</Text>
                        </View>
                      </View>
                      <Text style={styles.visitOverviewSub}>Your required monthly visit</Text>
                    </View>
                  </View>
                  <View style={styles.visitAvailableRow}>
                    <Text style={styles.visitAvailableText}>
                      <Text style={styles.boldGreen}>{visitsRemaining}</Text> of {mandatoryVisitsTotal} visits available
                    </Text>
                  </View>
                </View>
              )}

              {/* ============================================================
                  CASE 2: PRIMARY GYM — CREDIT VISIT (Mockup Screen 4)
                  ============================================================ */}
              {isPrimaryGym && !isMandatoryVisit && (
                <View style={[styles.visitOverviewCard, { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" }]}>
                  <View style={styles.visitOverviewTop}>
                    <View style={[styles.visitIconWrapGreen, { backgroundColor: "#FEF3C7" }]}>
                      <Ionicons name="flash" size={20} color="#B45309" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitOverviewTitle}>Credit Visit</Text>
                      <Text style={styles.visitOverviewSub}>
                        Use your ZonoFit credits for an additional workout
                      </Text>
                    </View>
                  </View>
                  <View style={styles.visitAvailableRow}>
                    <Text style={[styles.visitAvailableText, { color: "#92400E" }]}>
                      <Text style={[styles.boldGreen, { color: "#B45309" }]}>{availableCredits}</Text> credits available
                    </Text>
                  </View>
                </View>
              )}

              {/* ============================================================
                  CASE 3: OTHER GYM / VISITING ANOTHER CITY (Mockup Screen 5)
                  ============================================================ */}
              {!isPrimaryGym && (
                <View style={styles.otherGymContainer}>
                  {/* Gym Media Card */}
                  <View style={styles.otherGymCard}>
                    {gym.image ? (
                      <Image source={{ uri: gym.image }} style={styles.otherGymImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.otherGymImg, styles.otherGymImgFallback]}>
                        <Ionicons name="barbell" size={28} color="#1F7A3E" />
                      </View>
                    )}
                    <View style={styles.otherGymBadge}>
                      <Text style={styles.otherGymBadgeText}>Other Gym</Text>
                    </View>
                    
                    <View style={styles.otherGymDetails}>
                      <Text style={styles.otherGymName} numberOfLines={1}>{gym.name}</Text>
                      <View style={styles.otherGymMetaRow}>
                        {gym.rating ? (
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text style={styles.ratingText}>{gym.rating}</Text>
                          </View>
                        ) : null}
                        {gym.address ? (
                          <Text style={styles.metaAddress} numberOfLines={1}>• {gym.address}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Central Traveling Notice Banner (Mockup Screen 5 Banner) */}
                  <View style={styles.visitingCityBanner}>
                    <View style={styles.airplaneIconWrap}>
                      <Ionicons name="airplane" size={18} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitingCityTitle}>Visiting another city?</Text>
                      <Text style={styles.visitingCityDesc}>
                        You can use your ZonoFit credits at eligible gyms outside your primary gym area.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* SELECT DATE SECTION (Mockup Horizontal Date Pills) */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeader}>Select Date</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.dateScrollRow}
                >
                  {dates.map((d) => {
                    const isSelected = selectedDateId === d.id;
                    return (
                      <Pressable
                        key={d.id}
                        onPress={() => setSelectedDateId(d.id)}
                        style={[styles.dateCard, isSelected && styles.dateCardActive]}
                      >
                        <Text style={[styles.dateDayText, isSelected && styles.dateDayTextActive]}>
                          {d.day}
                        </Text>
                        <Text style={[styles.dateNumText, isSelected && styles.dateNumTextActive]}>
                          {d.dateNum}
                        </Text>
                        <Text style={[styles.dateMonthText, isSelected && styles.dateMonthTextActive]}>
                          {d.month}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* SELECT TIME SECTION (Mockup Time Slots Grid) */}
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionHeader}>Select Time</Text>
                <View style={styles.timeGrid}>
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setSelectedTime(slot)}
                        style={[styles.timeBtn, isSelected && styles.timeBtnActive]}
                      >
                        <Text style={[styles.timeBtnText, isSelected && styles.timeBtnTextActive]}>
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* MANDATORY VISIT GREEN NOTICE (Mockup Screen 3 Notice) */}
              {isPrimaryGym && isMandatoryVisit && (
                <View style={styles.mandatoryNoteBanner}>
                  <Ionicons name="shield-checkmark" size={18} color="#166534" style={{ marginTop: 2 }} />
                  <Text style={styles.mandatoryNoteText}>
                    This visit is already included in your membership and will be deducted when you check in.
                  </Text>
                </View>
              )}

              {/* COST LINE (For Credit / Other Gym Visited) */}
              {(!isPrimaryGym || !isMandatoryVisit) && (
                <View style={styles.costLineRow}>
                  <Text style={styles.costLineLabel}>Cost:</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="flash" size={16} color="#B45309" />
                    <Text style={styles.costLineValue}>
                      {isCashVenue ? `₹${cashCost} Cash` : `${gym.cost || 8} Credits`}
                    </Text>
                  </View>
                </View>
              )}

              {hasInsufficientCredits && (
                <View style={styles.insufficientBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.insufficientText}>
                    Insufficient credits in your wallet. Please buy credits to book this visit.
                  </Text>
                </View>
              )}

              {/* BOOKING RULES SUMMARY (4 Essential Points from user request) */}
              <View style={styles.rulesBox}>
                <View style={styles.rulesBoxHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="document-text-outline" size={15} color="#166534" />
                    <Text style={styles.rulesBoxTitle}>Booking Rules</Text>
                  </View>
                  <Pressable onPress={() => setShowRulesModal(true)} hitSlop={8}>
                    <Text style={styles.rulesBoxLink}>View all rules</Text>
                  </Pressable>
                </View>
                <View style={styles.rulePointsList}>
                  <Text style={styles.rulePointLine}>• <Text style={styles.boldRule}>QR Check-in:</Text> Scan QR at desk within 15m of arrival</Text>
                  <Text style={styles.rulePointLine}>• <Text style={styles.boldRule}>1 Active Booking:</Text> Max 1 booking per day allowed</Text>
                  <Text style={styles.rulePointLine}>• <Text style={styles.boldRule}>Cancellation:</Text> 100% refund up to 6 hrs prior</Text>
                  <Text style={styles.rulePointLine}>• <Text style={styles.boldRule}>Gym Protocol:</Text> Clean footwear & gym attire compulsory</Text>
                </View>
              </View>

              {/* PRIMARY ACTION BUTTON */}
              <Pressable
                onPress={handleConfirmPress}
                style={[
                  styles.primaryActionBtn,
                  hasInsufficientCredits && styles.primaryActionBtnDisabled,
                  loading && { opacity: 0.75 },
                ]}
                disabled={loading || hasInsufficientCredits}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>
                    {isPrimaryGym
                      ? isMandatoryVisit
                        ? "Book Mandatory Visit"
                        : "Book with Credits"
                      : "Book with Credits"}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Expanded Rules Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showRulesModal}
        onRequestClose={() => setShowRulesModal(false)}
      >
        <View style={styles.rulesOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setShowRulesModal(false)} />

          <View style={styles.rulesModalContent}>
            <View style={styles.rulesModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color="#166534" />
                <Text style={styles.rulesModalTitle}>ZonoFit Booking Rules</Text>
              </View>
              <Pressable onPress={() => setShowRulesModal(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color="#9CA3AF" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380, marginTop: 14 }}>
              <View style={styles.fullRuleItem}>
                <View style={styles.fullRuleIconWrap}>
                  <Ionicons name="qr-code-outline" size={20} color="#1F7A3E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullRuleHeading}>1. Mandatory QR Check-In</Text>
                  <Text style={styles.fullRuleDesc}>
                    When you arrive at the gym, open your active pass and scan the front desk QR code within 15 minutes of your arrival slot.
                  </Text>
                </View>
              </View>

              <View style={styles.fullRuleItem}>
                <View style={styles.fullRuleIconWrap}>
                  <Ionicons name="calendar-outline" size={20} color="#1F7A3E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullRuleHeading}>2. Single Active Booking Policy</Text>
                  <Text style={styles.fullRuleDesc}>
                    Members can hold only 1 active booking at a time across network gyms. Once checked in or cancelled, you can book your next session.
                  </Text>
                </View>
              </View>

              <View style={styles.fullRuleItem}>
                <View style={styles.fullRuleIconWrap}>
                  <Ionicons name="time-outline" size={20} color="#1F7A3E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullRuleHeading}>3. 6-Hour Cancellation Window</Text>
                  <Text style={styles.fullRuleDesc}>
                    Cancel at least 6 hours in advance for a 100% refund of your visit/credits. Cancellations within 6 hours are non-refundable.
                  </Text>
                </View>
              </View>

              <View style={styles.fullRuleItem}>
                <View style={styles.fullRuleIconWrap}>
                  <Ionicons name="shirt-outline" size={20} color="#1F7A3E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullRuleHeading}>4. Attire & Fitness Protocol</Text>
                  <Text style={styles.fullRuleDesc}>
                    Clean workout shoes and athletic attire are mandatory. Carry a workout towel and re-rack all equipment after use.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setShowRulesModal(false)}
              style={styles.rulesCloseBtn}
            >
              <Text style={styles.rulesCloseBtnText}>Got It</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitleWrap: {
    flex: 1,
  },
  modalMainHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollBody: {
    paddingBottom: 16,
  },

  // Primary Gym Overview Card (Screens 3 & 4)
  visitOverviewCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  visitOverviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  visitIconWrapGreen: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  visitOverviewTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  includedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  includedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  visitOverviewSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  visitAvailableRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  visitAvailableText: {
    fontSize: 13,
    color: "#166534",
    fontWeight: "600",
  },
  boldGreen: {
    fontWeight: "900",
  },

  // Other Gym (Screen 5)
  otherGymContainer: {
    marginBottom: 16,
  },
  otherGymCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    position: "relative",
  },
  otherGymImg: {
    width: "100%",
    height: 140,
    backgroundColor: "#E5E7EB",
  },
  otherGymImgFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  otherGymBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  otherGymBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  otherGymDetails: {
    padding: 14,
  },
  otherGymName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  otherGymMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  metaAddress: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },

  // Visiting City Banner
  visitingCityBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 16,
    padding: 14,
  },
  airplaneIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  visitingCityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
    marginBottom: 2,
  },
  visitingCityDesc: {
    fontSize: 11,
    color: "#0284C7",
    lineHeight: 16,
  },

  // Date Selector
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  dateScrollRow: {
    gap: 8,
  },
  dateCard: {
    width: 62,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  dateCardActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#1F7A3E",
  },
  dateDayText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 2,
  },
  dateDayTextActive: {
    color: "#166534",
    fontWeight: "700",
  },
  dateNumText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  dateNumTextActive: {
    color: "#1F7A3E",
  },
  dateMonthText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  dateMonthTextActive: {
    color: "#166534",
    fontWeight: "700",
  },

  // Time Grid
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeBtn: {
    width: "31%",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  timeBtnActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#1F7A3E",
  },
  timeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  timeBtnTextActive: {
    color: "#1F7A3E",
    fontWeight: "800",
  },

  // Mandatory note
  mandatoryNoteBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  mandatoryNoteText: {
    fontSize: 11,
    color: "#166534",
    lineHeight: 16,
    fontWeight: "500",
    flex: 1,
  },

  // Cost line
  costLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  costLineLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  costLineValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  insufficientBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  insufficientText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },

  // Rules Box
  rulesBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rulesBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rulesBoxTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
    textTransform: "uppercase",
  },
  rulesBoxLink: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  rulePointsList: {
    gap: 3,
  },
  rulePointLine: {
    fontSize: 10.5,
    color: "#475569",
    lineHeight: 15,
  },
  boldRule: {
    fontWeight: "700",
    color: "#1E293B",
  },

  // Primary Action Button
  primaryActionBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#1F7A3E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionBtnDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Rules Modal
  rulesOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  rulesModalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  rulesModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rulesModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  fullRuleItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  fullRuleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  fullRuleHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  fullRuleDesc: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
  },
  rulesCloseBtn: {
    marginTop: 14,
    height: 44,
    backgroundColor: "#1F7A3E",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rulesCloseBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
