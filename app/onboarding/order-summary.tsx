import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { useAddressStore } from "@/store/useAddressStore";
import DeliveryAddressModal from "@/components/DeliveryAddressModal";

export default function OrderSummaryScreen() {
  const router = useRouter();
  const { completeOnboarding, loading } = useAuthStore();
  const { getSelectedAddress } = useAddressStore();
  const selectedAddress = getSelectedAddress();

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

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

    // Navigate to the 3-step Eligibility Verification flow before payment
    router.push("/onboarding/eligibility");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Order Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Selections */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Primary Gym</Text>
              <Text style={styles.value}>FitZone Pro</Text>
            </View>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Plan</Text>
              <Text style={styles.value}>Quarterly - 3 Months</Text>
            </View>
            {/* Disabled edit for plan since we skipped plan selection */}
            <Pressable>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {/* Delivery Address Section */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="location-sharp" size={18} color="#1F7A3E" style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeaderTitle}>Delivery & Billing Address</Text>
            </View>
            <Pressable onPress={() => setIsAddressModalOpen(true)}>
              <Text style={styles.editText}>{selectedAddress ? "Change" : "+ Add"}</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          {selectedAddress ? (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Text style={styles.addressName}>{selectedAddress.fullName}</Text>
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              </View>
              <Text style={styles.addressPhone}>+91 {selectedAddress.phoneNumber}</Text>
              <Text style={styles.addressText}>
                {selectedAddress.flatHouse}, {selectedAddress.areaStreet}
              </Text>
              {selectedAddress.landmark ? (
                <Text style={styles.addressLandmark}>Landmark: {selectedAddress.landmark}</Text>
              ) : null}
              <Text style={styles.addressLocation}>
                {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
              </Text>

              {selectedAddress.deliveryInstructions?.instructionsText ? (
                <View style={styles.instructionsBadge}>
                  <Ionicons name="information-circle-outline" size={14} color="#065F46" />
                  <Text style={styles.instructionsBadgeText} numberOfLines={1}>
                    {selectedAddress.deliveryInstructions.instructionsText}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Pressable
              style={styles.addAddressPrompt}
              onPress={() => setIsAddressModalOpen(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color="#1F7A3E" />
              <Text style={styles.addAddressPromptText}>Add your delivery address</Text>
            </Pressable>
          )}
        </View>

        {/* Pricing */}
        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹3,999</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>GST (18%)</Text>
            <Text style={styles.priceValue}>₹420</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹4,419</Text>
          </View>
        </View>

        {/* Included benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Included with your membership:</Text>
          
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color="#1F7A3E" />
            <Text style={styles.benefitText}>Multiple check-ins</Text>
          </View>
          
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color="#1F7A3E" />
            <Text style={styles.benefitText}>Partner gym access</Text>
          </View>
          
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color="#1F7A3E" />
            <Text style={styles.benefitText}>Flexible cancellations</Text>
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable 
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
          onPress={handleProceed}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? "Processing..." : "Proceed to Payment"}</Text>
        </Pressable>
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
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    height: 56,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  editText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F7A3E",
  },
  benefitsContainer: {
    paddingHorizontal: 8,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 15,
    color: "#4B5563",
    marginLeft: 12,
    fontWeight: "500",
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  addressName: {
    fontSize: 15,
    fontWeight: "700",
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
    fontWeight: "700",
    color: "#16A34A",
  },
  addressPhone: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 2,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  addressLandmark: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  addressLocation: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 4,
  },
  instructionsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  instructionsBadgeText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "500",
    marginLeft: 6,
    flex: 1,
  },
  addAddressPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  addAddressPromptText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F7A3E",
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
  primaryButton: {
    height: 56,
    backgroundColor: "#1F7A3E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

