import React, { useEffect } from "react";
import { 
  Modal, 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  Dimensions, 
  Image 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withDelay,
  withTiming
} from "react-native-reanimated";

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

const { width } = Dimensions.get("window");

export default function BookingConfirmedModal({
  visible,
  gymName,
  gymAddress,
  gymImage,
  timeSlot,
  dateStr = "Today",
  isMandatoryVisit = false,
  mandatoryVisitsLeft,
  totalMandatoryVisits = 10,
  creditsDeducted,
  remainingCredits,
  onViewPass,
  onDone,
}: BookingConfirmedModalProps) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 14, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 250 });
      checkScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 150 }));
    } else {
      scale.value = 0.6;
      opacity.value = 0;
      checkScale.value = 0;
    }
  }, [visible]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (!visible) return null;

  const isMandatory = isMandatoryVisit || creditsDeducted === 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDone}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDone} />

        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          {/* Confirmed Icon Header */}
          <View style={styles.header}>
            <View style={styles.glowRing}>
              <Animated.View style={[styles.checkCircle, checkAnimatedStyle]}>
                <Ionicons name="checkmark-sharp" size={38} color="#FFFFFF" />
              </Animated.View>
            </View>

            <Text style={styles.title}>Workout Booked! 🎉</Text>
            <Text style={styles.subtitle}>
              Your session is confirmed. Show your pass when you arrive at the gym.
            </Text>
          </View>

          {/* Ticket / Pass Summary Box */}
          <View style={styles.ticketBox}>
            <View style={styles.gymRow}>
              {gymImage ? (
                <Image 
                  source={{ uri: gymImage }} 
                  style={styles.gymThumbnail} 
                  resizeMode="cover" 
                />
              ) : (
                <View style={[styles.gymThumbnail, styles.gymThumbFallback]}>
                  <Ionicons name="barbell" size={24} color="#059669" />
                </View>
              )}

              <View style={styles.gymInfo}>
                <View style={styles.badgeRow}>
                  <View style={[
                    styles.confirmedBadge,
                    isMandatory ? { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" } : { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" }
                  ]}>
                    <Text style={[
                      styles.confirmedBadgeText,
                      isMandatory ? { color: "#166534" } : { color: "#B45309" }
                    ]}>
                      {isMandatory ? "MANDATORY PASS" : "CREDIT PASS"}
                    </Text>
                  </View>
                  <Text style={styles.dateLabel}>{dateStr}</Text>
                </View>
                <Text style={styles.gymName} numberOfLines={1}>{gymName}</Text>
                {gymAddress ? (
                  <Text style={styles.gymAddress} numberOfLines={1}>📍 {gymAddress}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.dashDivider} />

            {/* Slot & Booking Details */}
            <View style={styles.detailGrid}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>TIME SLOT</Text>
                <View style={styles.detailValueRow}>
                  <Ionicons name="time-outline" size={14} color="#111827" />
                  <Text style={styles.detailValue}>{timeSlot}</Text>
                </View>
              </View>

              <View style={styles.detailColRight}>
                <Text style={styles.detailLabel}>ENTRY METHOD</Text>
                <View style={styles.detailValueRow}>
                  <Ionicons name="card-outline" size={14} color="#059669" />
                  <Text style={[styles.detailValue, { color: "#059669" }]}>Pass at Desk</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Mandatory Visit vs Credit Deduction Banner */}
          {isMandatory ? (
            <View style={[styles.creditsBanner, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
              <View style={styles.creditDeductedRow}>
                <View style={[styles.lightningIconWrap, { backgroundColor: "#D1FAE5" }]}>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" />
                </View>
                <Text style={[styles.creditsDeductedText, { color: "#065F46" }]}>
                  <Text style={[styles.boldDeduction, { color: "#047857" }]}>Included in Membership</Text> • 0 Credits
                </Text>
              </View>
              <View style={[styles.remainingPill, { backgroundColor: "#FFFFFF", borderColor: "#A7F3D0" }]}>
                <Text style={styles.remainingLabel}>Mandatory Visits Left: </Text>
                <Text style={[styles.remainingVal, { color: "#059669" }]}>
                  {mandatoryVisitsLeft !== undefined ? `${mandatoryVisitsLeft} of ${totalMandatoryVisits}` : "Active"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.creditsBanner}>
              <View style={styles.creditDeductedRow}>
                <View style={styles.lightningIconWrap}>
                  <Ionicons name="flash" size={14} color="#D97706" />
                </View>
                <Text style={styles.creditsDeductedText}>
                  <Text style={styles.boldDeduction}>{creditsDeducted} Credits</Text> deducted from wallet
                </Text>
              </View>
              <View style={styles.remainingPill}>
                <Text style={styles.remainingLabel}>Remaining Balance: </Text>
                <Text style={styles.remainingVal}>{remainingCredits} Credits</Text>
              </View>
            </View>
          )}

          {/* Action CTAs */}
          <View style={styles.actions}>
            <Pressable 
              style={styles.primaryBtn}
              onPress={onViewPass}
            >
              <Ionicons name="ticket-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>View Pass</Text>
            </Pressable>

            <Pressable 
              style={styles.secondaryBtn}
              onPress={onDone}
            >
              <Text style={styles.secondaryBtnText}>Back to Home</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  glowRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#ECFDF5",
    borderWidth: 6,
    borderColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  checkCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#1F7A3E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  ticketBox: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  gymRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gymThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    marginRight: 12,
  },
  gymThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1FAE5",
  },
  gymInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  confirmedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confirmedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#166534",
    letterSpacing: 0.5,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  gymName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  gymAddress: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  dashDivider: {
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginVertical: 12,
  },
  detailGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailCol: {
    flex: 1,
  },
  detailColRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  detailValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  creditsBanner: {
    width: "100%",
    backgroundColor: "#FEF3C7",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 18,
  },
  creditDeductedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  lightningIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  creditsDeductedText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "500",
  },
  boldDeduction: {
    fontWeight: "800",
    color: "#B45309",
  },
  remainingPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  remainingLabel: {
    fontSize: 11,
    color: "#78350F",
    fontWeight: "500",
  },
  remainingVal: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1F7A3E",
  },
  actions: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    height: 50,
    backgroundColor: "#1F7A3E",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    width: "100%",
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
});
