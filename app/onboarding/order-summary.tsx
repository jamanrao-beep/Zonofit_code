import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  StatusBar, 
  Alert, 
  Switch, 
  Image,
  ActivityIndicator 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useAddressStore } from "@/store/useAddressStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useUserStore } from "@/store/useUserStore";
import DeliveryAddressModal from "@/components/DeliveryAddressModal";

export default function OrderSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    mode?: string; 
    isFirstTime?: string;
    gymName?: string;
    gymId?: string;
  }>();

  const { completeOnboarding, loading, token, user, isOnboarded } = useAuthStore();
  const { selectedGymName, selectedGymId } = useGuestStore();
  const { primaryGymName } = useUserStore();
  const { credits, inrWallet, membershipInfo, fetchWallet } = useCreditsStore();
  const { getSelectedAddress } = useAddressStore();
  const selectedAddress = getSelectedAddress();

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [useCredits, setUseCredits] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (token) {
      fetchWallet(token);
    }
  }, [token]);

  // Determine if the user is purchasing for the first time or repurchasing
  const isExplicitRepurchase = params.mode === "repurchase";
  const isExplicitPurchase = params.mode === "purchase" || params.isFirstTime === "true";
  const isRepurchaseMode = isExplicitRepurchase || (!isExplicitPurchase && Boolean(isOnboarded && user?.isOnboarded));
  const isFirstTime = !isRepurchaseMode;

  // Gym display details
  const displayGymName = params.gymName || primaryGymName || user?.primaryGym || selectedGymName || "Being Fitness";
  const gymInitial = displayGymName.trim().charAt(0).toUpperCase() || "B";
  const gymLocation = selectedAddress?.city ? `${selectedAddress.city} • 1.2 km` : "Udaipur • 1.2 km";

  // Financial values matching the spec
  const membershipTotal = 3000;
  const mandatoryVisitsCost = 1200;
  const mandatoryVisitsCount = 10;
  const mandatoryVisitPerUnit = 120;
  const walletCreditsValue = 1800;
  const walletCreditsCount = 180;

  // Previous credits calculation
  // First-time users have 0 previous credits
  // Repurchase users can apply their available credits with 20% conversion cut (₹8/credit)
  const availableCredits = isFirstTime 
    ? 0 
    : (credits > 0 ? credits : (inrWallet ? Math.round(inrWallet.balanceINR / 8) : 28));
  
  // 1 credit = ₹10, after 20% cut = ₹8 per credit
  // e.g. 28 credits * ₹10 * 0.8 = ₹224
  const creditDiscountINR = Math.round(availableCredits * 10 * 0.8);
  const effectiveCreditDeduction = (!isFirstTime && useCredits && availableCredits > 0) ? creditDiscountINR : 0;
  const finalPayableAmount = Math.max(0, membershipTotal - effectiveCreditDeduction);

  const handleProceed = async () => {
    if (!selectedAddress) {
      Alert.alert(
        "Delivery Address Required",
        "Please provide a delivery address to complete your order.",
        [
          { text: "Add Address", onPress: () => setIsAddressModalOpen(true) },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    if (isFirstTime) {
      // First-time registration flow: Proceed to Eligibility Verification
      router.push("/onboarding/eligibility" as any);
    } else {
      // Repurchase flow: Direct confirmation & activation
      setIsProcessing(true);
      try {
        Alert.alert(
          "Confirm Repurchase",
          `Proceed to pay ₹${finalPayableAmount.toLocaleString("en-IN")} for your Monthly Membership at ${displayGymName}?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => setIsProcessing(false) },
            {
              text: "Proceed",
              onPress: async () => {
                try {
                  const city = selectedAddress?.city || "Udaipur";
                  const gymId = params.gymId || selectedGymId || "g1";
                  await completeOnboarding(city, gymId, "Monthly");
                  if (token) {
                    await fetchWallet(token);
                  }
                  Alert.alert(
                    "Membership Repurchased!",
                    `Your monthly membership at ${displayGymName} has been activated. 10 mandatory visits and 180 wallet credits are ready.`,
                    [{ text: "Go to Home", onPress: () => router.replace("/(tabs)") }]
                  );
                } catch (e) {
                  Alert.alert("Repurchase Error", "Could not complete repurchase. Please try again.");
                } finally {
                  setIsProcessing(false);
                }
              }
            }
          ]
        );
      } catch (err) {
        setIsProcessing(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Dynamic Title based on First-Time Purchase vs Repurchase */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/onboarding/choose-gym");
            }
          }} 
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            {isFirstTime ? "Purchase Membership" : "Repurchase Membership"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isFirstTime 
              ? "Your gym. Your routine. Start your journey." 
              : "Your gym. Your routine. Keep going."}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Gym Card (Clean Card with Primary Gym Name - No Image Banner) */}
        <View style={styles.gymCard}>
          <View style={styles.gymInfoRow}>
            <View style={styles.gymMonogram}>
              <Text style={styles.gymMonogramText}>{gymInitial}</Text>
            </View>

            <View style={styles.gymTextDetails}>
              <View style={styles.gymNameRow}>
                <Text style={styles.gymNameText} numberOfLines={1}>
                  {displayGymName}
                </Text>
                <Ionicons 
                  name="checkmark-circle" 
                  size={16} 
                  color="#16A34A" 
                  style={{ marginLeft: 4 }} 
                />
              </View>
              <Text style={styles.gymLocationText}>
                📍 {gymLocation}
              </Text>
            </View>

            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>Your Primary Gym</Text>
            </View>
          </View>
        </View>

        {/* Plan Header Card */}
        <View style={styles.planCard}>
          <View style={styles.planHeaderRow}>
            <View>
              <Text style={styles.planTitle}>Monthly Membership</Text>
              <Text style={styles.planPrice}>₹3,000</Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>1 Month</Text>
            </View>
          </View>
          <Text style={styles.planSubtitle}>
            {isFirstTime 
              ? "Your gym. Your progress. Start your fitness experience." 
              : "Your gym. Your progress. Same great experience."}
          </Text>
        </View>

        {/* Breakdown Section: Mandatory Visits + Wallet Credits */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>How your membership breaks down</Text>

          <View style={styles.breakdownCard}>
            {/* Mandatory Visits Row */}
            <View style={styles.breakdownRow}>
              <View style={styles.iconBox}>
                <Ionicons name="calendar-outline" size={20} color="#166534" />
              </View>
              <View style={styles.breakdownDetails}>
                <Text style={styles.breakdownItemTitle}>Mandatory Visits</Text>
                <Text style={styles.breakdownItemSub}>
                  {mandatoryVisitsCount} visits (per month)
                </Text>
              </View>
              <View style={styles.breakdownPriceCol}>
                <Text style={styles.breakdownItemPrice}>
                  ₹{mandatoryVisitsCost.toLocaleString("en-IN")}
                </Text>
                <Text style={styles.breakdownPriceSub}>
                  (₹{mandatoryVisitPerUnit} per visit)
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Wallet Credits Row */}
            <View style={styles.breakdownRow}>
              <View style={styles.iconBox}>
                <Ionicons name="wallet-outline" size={20} color="#166534" />
              </View>
              <View style={styles.breakdownDetails}>
                <Text style={styles.breakdownItemTitle}>Wallet Credits</Text>
                <Text style={styles.breakdownItemSub}>
                  {walletCreditsCount} credits (added to your wallet)
                </Text>
              </View>
              <View style={styles.breakdownPriceCol}>
                <Text style={styles.breakdownItemPrice}>
                  ₹{walletCreditsValue.toLocaleString("en-IN")}
                </Text>
                <Text style={styles.breakdownPriceSub}>(₹10 per credit)</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Total Value Row */}
            <View style={styles.totalValueRow}>
              <Text style={styles.totalValueLabel}>Total Membership Value</Text>
              <Text style={styles.totalValueAmount}>
                ₹{membershipTotal.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* 
          ========================================================================
          "USE YOUR PREVIOUS CREDITS" SECTION:
          Only visible when repurchasing and the user actually has unused credits!
          Hidden for first-time registration because a new user has 0 previous credits.
          ========================================================================
        */}
        {!isFirstTime && availableCredits > 0 && (
          <View style={styles.previousCreditsCard}>
            <View style={styles.previousCreditsHeaderRow}>
              <View style={styles.creditsIconBox}>
                <Ionicons name="wallet-outline" size={20} color="#166534" />
              </View>
              <View style={styles.previousCreditsTextCol}>
                <Text style={styles.previousCreditsTitle}>Use your previous credits</Text>
                <Text style={styles.previousCreditsSub}>
                  Apply your existing wallet credits to reduce the amount you need to pay.
                </Text>
              </View>
              <Switch
                value={useCredits}
                onValueChange={setUseCredits}
                trackColor={{ false: "#E5E7EB", true: "#1F7A3E" }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            {useCredits && (
              <View style={styles.creditsSubCard}>
                <View style={styles.creditsSubCol}>
                  <Text style={styles.creditsSubLabel}>Available Credits</Text>
                  <Text style={styles.creditsSubValue}>{availableCredits} credits</Text>
                </View>

                <View style={styles.creditsVerticalDivider} />

                <View style={styles.creditsSubCol}>
                  <Text style={styles.creditsSubLabel}>Credit Value (after 20% cut)</Text>
                  <Text style={styles.creditsSubValue}>₹{creditDiscountINR}</Text>
                  <Text style={styles.creditsFormulaText}>
                    ({availableCredits} × ₹10 × 80%)
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Pricing Summary Calculation */}
        <View style={styles.pricingSummaryCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>Membership Total</Text>
            <Text style={styles.priceRowValue}>₹{membershipTotal.toLocaleString("en-IN")}</Text>
          </View>

          {!isFirstTime && effectiveCreditDeduction > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.creditDeductionLabel}>Less: Credit Amount</Text>
              <Text style={styles.creditDeductionValue}>
                - ₹{effectiveCreditDeduction.toLocaleString("en-IN")}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.payNowRow}>
            <Text style={styles.payNowLabel}>You Pay Now</Text>
            <Text style={styles.payNowAmount}>
              ₹{finalPayableAmount.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* Info Note Callout */}
        <View style={styles.infoCallout}>
          <Ionicons 
            name="information-circle-outline" 
            size={18} 
            color="#6B7280" 
            style={{ marginRight: 8, marginTop: 1 }} 
          />
          <Text style={styles.infoCalloutText}>
            {isFirstTime
              ? "Mandatory visits and wallet credits are separate benefits. 10 mandatory visits and 180 wallet credits will be credited to your account upon purchase."
              : "Mandatory visits and wallet credits are separate benefits. Using credits only reduces your payable amount. Your 10 mandatory visits will still be added to your account."}
          </Text>
        </View>

        {/* Delivery & Billing Address Card */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="location-sharp" size={17} color="#1F7A3E" style={{ marginRight: 6 }} />
              <Text style={styles.addressSectionTitle}>Delivery & Billing Address</Text>
            </View>
            <Pressable onPress={() => setIsAddressModalOpen(true)} hitSlop={8}>
              <Text style={styles.addressActionText}>
                {selectedAddress ? "Change" : "+ Add"}
              </Text>
            </Pressable>
          </View>

          {selectedAddress ? (
            <View style={styles.selectedAddressContainer}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                <Text style={styles.addressNameText}>{selectedAddress.fullName}</Text>
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              </View>
              <Text style={styles.addressPhoneText}>+91 {selectedAddress.phoneNumber}</Text>
              <Text style={styles.addressBodyText}>
                {selectedAddress.flatHouse}, {selectedAddress.areaStreet}
              </Text>
              {selectedAddress.landmark ? (
                <Text style={styles.addressLandmarkText}>
                  Landmark: {selectedAddress.landmark}
                </Text>
              ) : null}
              <Text style={styles.addressCityText}>
                {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
              </Text>
            </View>
          ) : (
            <Pressable
              style={styles.addAddressBox}
              onPress={() => setIsAddressModalOpen(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#1F7A3E" />
              <Text style={styles.addAddressPromptText}>Add your delivery address</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Footer */}
      <View style={styles.bottomFooter}>
        <Pressable 
          style={[styles.proceedButton, (loading || isProcessing) && styles.proceedButtonDisabled]} 
          onPress={handleProceed}
          disabled={loading || isProcessing}
        >
          {loading || isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.proceedButtonContent}>
              <Text style={styles.proceedButtonText}>Proceed to Pay</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </View>
          )}
        </Pressable>

        <View style={styles.securityRow}>
          <Ionicons name="lock-closed" size={12} color="#6B7280" />
          <Text style={styles.securityText}>Secure & 5% GST included</Text>
        </View>
      </View>

      {/* Delivery Address Modal */}
      <DeliveryAddressModal
        visible={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        initialAddress={selectedAddress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAF8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  gymCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    padding: 16,
  },
  primaryBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  primaryBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#166534",
  },
  gymInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gymMonogram: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1F7A3E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  gymMonogramText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  gymTextDetails: {
    flex: 1,
  },
  gymNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gymNameText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  gymLocationText: {
    fontSize: 12.5,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  planHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  planPrice: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  durationBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  durationBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#166534",
  },
  planSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    fontWeight: "500",
  },
  breakdownSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  breakdownDetails: {
    flex: 1,
  },
  breakdownItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  breakdownItemSub: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  breakdownPriceCol: {
    alignItems: "flex-end",
  },
  breakdownItemPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  breakdownPriceSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  totalValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
  },
  totalValueLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  totalValueAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  previousCreditsCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#22C55E",
  },
  previousCreditsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  creditsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  previousCreditsTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  previousCreditsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  previousCreditsSub: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 2,
    lineHeight: 15,
  },
  creditsSubCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  creditsSubCol: {
    flex: 1,
  },
  creditsSubLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  creditsSubValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginTop: 3,
  },
  creditsFormulaText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  creditsVerticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },
  pricingSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceRowLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  priceRowValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  creditDeductionLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  creditDeductionValue: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "800",
  },
  payNowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  payNowLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  payNowAmount: {
    fontSize: 24,
    fontWeight: "900",
    color: "#166534",
    letterSpacing: -0.3,
  },
  infoCallout: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 11.5,
    color: "#4B5563",
    lineHeight: 16,
    fontWeight: "500",
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  addressSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  addressActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  selectedAddressContainer: {
    paddingTop: 4,
  },
  addressNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16A34A",
  },
  addressPhoneText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 2,
    marginBottom: 3,
  },
  addressBodyText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  addressLandmarkText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  addressCityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 3,
  },
  addAddressBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  addAddressPromptText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F7A3E",
    marginLeft: 6,
  },
  bottomFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
  proceedButton: {
    height: 52,
    backgroundColor: "#166534",
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  proceedButtonDisabled: {
    opacity: 0.6,
  },
  proceedButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    gap: 4,
  },
  securityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
});
