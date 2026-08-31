import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { useAddressStore } from "@/store/useAddressStore";

interface OptionItem {
  id: "new" | "returning" | "beginner";
  num: number;
  title: string;
  badge: string;
  description: string;
  bullets: string[];
}

const ELIGIBILITY_OPTIONS: OptionItem[] = [
  {
    id: "new",
    num: 1,
    title: "New to this gym",
    badge: "NEW",
    description: "You have never been a member of this selected gym before.",
    bullets: ["First-time member", "New to this gym"],
  },
  {
    id: "returning",
    num: 2,
    title: "Returning after a long break",
    badge: "12+ MONTHS",
    description:
      "You previously worked out at this gym, but your membership expired at least 12 months ago and you have not taken a new membership since.",
    bullets: ["Membership expired 12+ months ago", "No active/recent membership"],
  },
  {
    id: "beginner",
    num: 3,
    title: "Recent beginner",
    badge: "WITHIN 3 MONTHS",
    description:
      "You joined this gym within the last 3 months and are still considered a beginner at this gym.",
    bullets: ["Joined within the last 3 months", "Beginner at this gym"],
  },
];

export default function EligibilityScreen() {
  const router = useRouter();
  const { completeOnboarding, loading } = useAuthStore();
  const { getSelectedAddress } = useAddressStore();
  const selectedAddress = getSelectedAddress();

  // Current Step: 1 | 2 | 3
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 2 State
  const [selectedOptionId, setSelectedOptionId] = useState<"new" | "returning" | "beginner">("new");

  // Step 3 State: 3 mandatory checkboxes
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  // Policy Modals
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isContactGymModalOpen, setIsContactGymModalOpen] = useState(false);

  const selectedOption = ELIGIBILITY_OPTIONS.find((o) => o.id === selectedOptionId) || ELIGIBILITY_OPTIONS[0];

  const handleBack = () => {
    if (currentStep === 1) {
      router.back();
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleStep1Next = () => {
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  const handleStep3Finish = async () => {
    if (!check1 || !check2 || !check3) {
      Alert.alert(
        "Confirmation Required",
        "Please confirm all 3 statements regarding your responsibility to proceed."
      );
      return;
    }

    const city = selectedAddress?.city || "Bangalore";
    await completeOnboarding(city, "g1", "Quarterly");
    router.replace("/onboarding/welcome");
  };

  const isAllChecked = check1 && check2 && check3;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header with Back and Progress Indicators */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>

        {/* 3-segment progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressSegment, styles.segmentActive]} />
          <View
            style={[
              styles.progressSegment,
              currentStep >= 2 ? styles.segmentActive : styles.segmentInactive,
            ]}
          />
          <View
            style={[
              styles.progressSegment,
              currentStep >= 3 ? styles.segmentActive : styles.segmentInactive,
            ]}
          />
        </View>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ========================================================================= */}
        {/* SCREEN 1: ARE YOU ELIGIBLE? */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.title}>Are you eligible?</Text>
            <Text style={styles.subtitle}>Just one quick check before you continue.</Text>

            {/* Selected Gym Card */}
            <View style={styles.gymCard}>
              <Text style={styles.gymCardSectionLabel}>Selected Gym</Text>
              <View style={styles.gymCardRow}>
                <View style={styles.gymLogoBadge}>
                  <Text style={styles.gymLogoText}>A</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.gymName}>Gym A</Text>
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary Gym</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.gymLocation}>Udaipur, Rajasthan</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Policy Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark" size={20} color="#16A34A" style={{ marginTop: 2 }} />
              <Text style={styles.infoText}>
                ZonoFit works with gyms based on responsible, eligible memberships. Please confirm
                that you meet the criteria below.
              </Text>
            </View>

            {/* Amber Warning: PLEASE READ BEFORE CONTINUING */}
            <View style={styles.warningBox}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <View style={styles.amberIconCircle}>
                  <Text style={styles.amberIconText}>!</Text>
                </View>
                <Text style={styles.warningTitle}>PLEASE READ BEFORE CONTINUING</Text>
              </View>

              <Text style={styles.warningParagraph}>
                ZonoFit is designed for users who are genuinely starting or restarting their fitness
                journey at this gym.
              </Text>
              <Text style={styles.warningParagraph}>
                You are responsible for providing accurate information about your previous membership
                at this gym.
              </Text>
              <Text style={styles.warningParagraph}>
                If your eligibility information is later found to be incorrect, your ZonoFit
                membership may be affected and any refund will be processed according to ZonoFit's
                Refund Policy.
              </Text>

              <Pressable
                style={styles.linkRow}
                onPress={() => setIsRefundModalOpen(true)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="information-circle-outline" size={16} color="#B45309" />
                  <Text style={styles.linkText}>View Refund Policy</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B45309" />
              </Pressable>
            </View>

            {/* Bottom Criteria Notice */}
            <View style={styles.criteriaNoticeRow}>
              <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.criteriaNoticeTitle}>
                  You can join ZonoFit if ANY ONE of these applies,
                </Text>
                <Text style={styles.criteriaNoticeSubtitle}>
                  Please select the option that describes you.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: WHICH ONE DESCRIBES YOU? */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.title}>Which one describes you?</Text>
            <Text style={styles.subtitle}>Select anyone option that applies to you.</Text>

            {/* 3 Selectable Option Cards */}
            <View style={{ gap: 14, marginBottom: 20 }}>
              {ELIGIBILITY_OPTIONS.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setSelectedOptionId(opt.id)}
                  >
                    <View style={styles.optionCardHeader}>
                      <View style={styles.optionNumBadge}>
                        <Text style={styles.optionNumText}>{opt.num}</Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={styles.optionTitle}>{opt.title}</Text>
                          <View style={styles.optionTag}>
                            <Text style={styles.optionTagText}>{opt.badge}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Radio / Checkmark */}
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                    </View>

                    <Text style={styles.optionDescription}>{opt.description}</Text>

                    {/* Bullets */}
                    <View style={styles.bulletsContainer}>
                      {opt.bullets.map((bullet, idx) => (
                        <View key={idx} style={styles.bulletRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={isSelected ? "#16A34A" : "#9CA3AF"}
                          />
                          <Text style={styles.bulletText}>{bullet}</Text>
                        </View>
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Contact Gym Note */}
            <View style={styles.contactGymBox}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>💡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactGymTitle}>Not sure which one is right?</Text>
                  <Text style={styles.contactGymSubtitle}>
                    If you're unsure about your eligibility, please contact the gym before
                    continuing.
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.contactGymButton}
                onPress={() => setIsContactGymModalOpen(true)}
              >
                <Ionicons name="call-outline" size={16} color="#374151" />
                <Text style={styles.contactGymButtonText}>Contact Gym</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: ALMOST THERE! */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <View>
            {/* Top Success Badge */}
            <View style={styles.successIconWrapper}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
            </View>

            <Text style={[styles.title, { textAlign: "center" }]}>Almost there!</Text>
            <Text style={[styles.subtitle, { textAlign: "center", marginBottom: 20 }]}>
              Please confirm your responsibility as a user.
            </Text>

            {/* Selected Option Summary Card */}
            <View style={styles.selectedSummaryCard}>
              <Text style={styles.selectedSummaryLabel}>You selected</Text>
              <View style={styles.selectedSummaryContent}>
                <View style={styles.optionNumBadge}>
                  <Text style={styles.optionNumText}>{selectedOption.num}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.selectedSummaryTitle}>{selectedOption.title}</Text>
                  <Text style={styles.selectedSummaryDesc}>
                    {selectedOption.description}
                  </Text>
                </View>
              </View>
            </View>

            {/* Your Responsibility Checkboxes */}
            <View style={styles.responsibilityContainer}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
                <Text style={styles.responsibilityHeader}>Your responsibility</Text>
              </View>

              {/* Checkbox 1 */}
              <Pressable style={styles.checkboxItemRow} onPress={() => setCheck1(!check1)}>
                <View style={[styles.customCheckbox, check1 && styles.customCheckboxActive]}>
                  {check1 && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxItemText}>
                  I confirm that the information I have provided about my membership history at this
                  gym is accurate.
                </Text>
              </Pressable>

              {/* Checkbox 2 */}
              <Pressable style={styles.checkboxItemRow} onPress={() => setCheck2(!check2)}>
                <View style={[styles.customCheckbox, check2 && styles.customCheckboxActive]}>
                  {check2 && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxItemText}>
                  I understand that ZonoFit eligibility is based on the criteria shown above.
                </Text>
              </Pressable>

              {/* Checkbox 3 */}
              <Pressable style={styles.checkboxItemRow} onPress={() => setCheck3(!check3)}>
                <View style={[styles.customCheckbox, check3 && styles.customCheckboxActive]}>
                  {check3 && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxItemText}>
                  I understand that if my information is found to be incorrect, my membership may be
                  affected and any refund will be subject to the Refund Policy.
                </Text>
              </Pressable>
            </View>

            {/* Red Warning Card: What if I don't meet the criteria? */}
            <View style={styles.redWarningBox}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Ionicons name="warning" size={18} color="#DC2626" />
                <Text style={styles.redWarningTitle}>What if I don't meet the criteria?</Text>
              </View>
              <Text style={styles.redWarningText}>
                Your eligibility may be verified with the gym. If you are found to be ineligible
                after purchase, your membership may be cancelled or restricted.
              </Text>
              <Text style={[styles.redWarningText, { marginTop: 6 }]}>
                Any applicable refund will be calculated according to ZonoFit's Refund Policy.
              </Text>

              <Pressable
                style={styles.redLinkRow}
                onPress={() => setIsRefundModalOpen(true)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="information-circle-outline" size={15} color="#DC2626" />
                  <Text style={styles.redLinkText}>Read Refund Policy</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#DC2626" />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Action Section */}
      <View style={styles.bottomBar}>
        {currentStep === 1 && (
          <View>
            <Pressable
              style={styles.primaryActionButton}
              onPress={handleStep1Next}
            >
              <Text style={styles.primaryActionButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>
            <View style={styles.securityRow}>
              <Ionicons name="lock-closed-outline" size={13} color="#6B7280" />
              <Text style={styles.securityText}>Complete the steps above to continue</Text>
            </View>
          </View>
        )}

        {currentStep === 2 && (
          <View>
            <Pressable
              style={[
                styles.primaryActionButton,
                !selectedOptionId && styles.buttonDisabled,
              ]}
              onPress={handleStep2Next}
              disabled={!selectedOptionId}
            >
              <Text style={styles.primaryActionButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>
            <View style={styles.securityRow}>
              <Ionicons name="lock-closed-outline" size={13} color="#6B7280" />
              <Text style={styles.securityText}>Complete the steps above to continue</Text>
            </View>
          </View>
        )}

        {currentStep === 3 && (
          <View>
            <Pressable
              style={[
                styles.primaryActionButton,
                (!isAllChecked || loading) && styles.buttonDisabled,
              ]}
              onPress={handleStep3Finish}
              disabled={!isAllChecked || loading}
            >
              <Text style={styles.primaryActionButtonText}>
                {loading ? "Processing..." : "Continue to Payment"}
              </Text>
              {!loading && (
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              )}
            </Pressable>

            <View style={styles.securityRow}>
              <Ionicons name="lock-closed" size={13} color="#16A34A" />
              <Text style={[styles.securityText, { color: "#16A34A", fontWeight: "600" }]}>
                Secure & encrypted checkout
              </Text>
            </View>

            {/* Bottom Links */}
            <View style={styles.footerLinksRow}>
              <Pressable
                onPress={() => setIsRulesModalOpen(true)}
                style={styles.footerLinkItem}
              >
                <MaterialCommunityIcons name="file-document-outline" size={15} color="#4B5563" />
                <Text style={styles.footerLinkText}>Eligibility Rules</Text>
              </Pressable>

              <View style={styles.footerLinkDivider} />

              <Pressable
                onPress={() => setIsRefundModalOpen(true)}
                style={styles.footerLinkItem}
              >
                <MaterialCommunityIcons name="file-document-outline" size={15} color="#4B5563" />
                <Text style={styles.footerLinkText}>Refund Policy</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ========================================================================= */}
      {/* REFUND POLICY MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={isRefundModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRefundModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Refund & Eligibility Policy</Text>
              <Pressable onPress={() => setIsRefundModalOpen(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.modalSectionTitle}>1. Accurate Information Policy</Text>
              <Text style={styles.modalText}>
                ZonoFit members are required to honestly declare their previous membership status
                with the selected partner gym. Gym partners review and verify eligibility.
              </Text>

              <Text style={styles.modalSectionTitle}>2. Ineligibility & Cancellation</Text>
              <Text style={styles.modalText}>
                If a user is found to hold an active traditional membership or does not meet the
                selected eligibility criteria (e.g. was an active member within the last 12 months),
                the membership will be adjusted or refunded subject to partner validation.
              </Text>

              <Text style={styles.modalSectionTitle}>3. Processing Refunds</Text>
              <Text style={styles.modalText}>
                Refunds for verified ineligible sign-ups will be credited back to the original
                payment method or credit wallet in accordance with standard settlement timelines
                (typically 3–5 business days).
              </Text>
            </ScrollView>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setIsRefundModalOpen(false)}
            >
              <Text style={styles.modalCloseButtonText}>I Understand</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* ELIGIBILITY RULES MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={isRulesModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRulesModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ZonoFit Eligibility Rules</Text>
              <Pressable onPress={() => setIsRulesModalOpen(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.modalSectionTitle}>Who is eligible?</Text>
              <Text style={styles.modalText}>
                • Users joining a partner gym for the very first time.{"\n"}
                • Returning users whose previous membership expired at least 12 months ago.{"\n"}
                • Beginners who recently started at the gym within the past 3 months.
              </Text>

              <Text style={styles.modalSectionTitle}>Network Integrity</Text>
              <Text style={styles.modalText}>
                These rules ensure a fair and sustainable partnership between ZonoFit and our
                fitness network gyms, unlocking flexibility and credit-based freedom for members.
              </Text>
            </ScrollView>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setIsRulesModalOpen(false)}
            >
              <Text style={styles.modalCloseButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* CONTACT GYM MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={isContactGymModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsContactGymModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Gym Desk</Text>
              <Pressable onPress={() => setIsContactGymModalOpen(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>

            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <View style={styles.contactIconCircle}>
                <Ionicons name="call" size={32} color="#16A34A" />
              </View>
              <Text style={styles.contactGymModalTitle}>Gym A Desk</Text>
              <Text style={styles.contactGymModalPhone}>+91 98765 43210</Text>
              <Text style={styles.contactGymModalNote}>
                Operating Hours: 06:00 AM – 10:00 PM
              </Text>
            </View>

            <Pressable
              style={styles.callNowButton}
              onPress={() => {
                Linking.openURL("tel:+919876543210").catch(() => {});
                setIsContactGymModalOpen(false);
              }}
            >
              <Ionicons name="call" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.callNowButtonText}>Call Gym Desk</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 52,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 140,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  segmentActive: {
    backgroundColor: "#16A34A",
  },
  segmentInactive: {
    backgroundColor: "#E5E7EB",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 20,
  },

  // Screen 1: Gym Card
  gymCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  gymCardSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
  },
  gymCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gymLogoBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  gymLogoText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#22C55E",
  },
  gymName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginRight: 8,
  },
  primaryBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  gymLocation: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 4,
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoText: {
    fontSize: 13,
    color: "#166534",
    lineHeight: 18,
    marginLeft: 10,
    flex: 1,
  },

  // Warning Box (Amber)
  warningBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 20,
  },
  amberIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  amberIconText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.5,
  },
  warningParagraph: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 19,
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#FDE68A",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
    marginLeft: 6,
  },

  // Bottom Criteria Notice
  criteriaNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  criteriaNoticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  criteriaNoticeSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  // Screen 2: Options
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  optionCardSelected: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  optionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  optionNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  optionNumText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginRight: 8,
  },
  optionTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  radioCircleSelected: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  optionDescription: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12,
    marginLeft: 36,
  },
  bulletsContainer: {
    marginLeft: 36,
    gap: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bulletText: {
    fontSize: 13,
    color: "#374151",
    marginLeft: 6,
    fontWeight: "500",
  },

  // Contact Gym Box
  contactGymBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  contactGymTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  contactGymSubtitle: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 16,
    marginTop: 2,
    marginBottom: 12,
  },
  contactGymButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
  },
  contactGymButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 6,
  },

  // Screen 3: Almost there
  successIconWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  selectedSummaryCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  selectedSummaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  selectedSummaryContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  selectedSummaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  selectedSummaryDesc: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
    lineHeight: 18,
  },

  // Responsibility Section
  responsibilityContainer: {
    marginBottom: 20,
  },
  responsibilityHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  checkboxItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  customCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
    backgroundColor: "#FFFFFF",
  },
  customCheckboxActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  checkboxItemText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
    flex: 1,
  },

  // Red Warning Box
  redWarningBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginBottom: 20,
  },
  redWarningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
    marginLeft: 6,
  },
  redWarningText: {
    fontSize: 12,
    color: "#7F1D1D",
    lineHeight: 17,
  },
  redLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#FECACA",
  },
  redLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B91C1C",
    marginLeft: 6,
  },

  // Bottom Fixed Action Bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
  primaryActionButton: {
    height: 52,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  securityText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  footerLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  footerLinkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  footerLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    marginLeft: 4,
  },
  footerLinkDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#D1D5DB",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 12,
    marginBottom: 4,
  },
  modalText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
    marginBottom: 6,
  },
  modalCloseButton: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  contactIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  contactGymModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  contactGymModalPhone: {
    fontSize: 15,
    fontWeight: "600",
    color: "#16A34A",
    marginTop: 4,
  },
  contactGymModalNote: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  callNowButton: {
    flexDirection: "row",
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  callNowButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
