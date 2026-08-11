import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";

export default function OrderSummaryScreen() {
  const router = useRouter();
  const { completeOnboarding, loading } = useAuthStore();

  const handleProceed = async () => {
    // Skipping actual payment step as per plan, just complete onboarding
    await completeOnboarding("Bangalore", "g1", "Quarterly");
    router.replace("/onboarding/welcome");
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
