import React from "react";
import { View, Text, StyleSheet, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";

export default function WelcomeScreen() {
  const router = useRouter();
  
  const handleGoHome = () => {
    router.replace("/(tabs)");
  };
  
  const handleBookVisit = () => {
    // In a real app, this might go to a specific booking screen or pre-select the primary gym
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark" size={48} color="#1F7A3E" />
          </View>
          
          <Text style={styles.title}>Welcome to ZonoFit!</Text>
          <Text style={styles.subtitle}>Your membership is now active.</Text>
          
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Primary Gym Ready</Text>
                <Text style={styles.cardDetail}>FitZone Pro - Active</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.cardRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Membership Active</Text>
                <Text style={styles.cardDetail}>Quarterly Plan - 90 Days</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.cardRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Credits Available</Text>
                <Text style={styles.cardDetail}>₹800 in wallet balance</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.primaryButton} onPress={handleBookVisit}>
            <Text style={styles.primaryButtonText}>Book First Visit</Text>
          </Pressable>
          
          <Pressable style={styles.secondaryButton} onPress={handleGoHome}>
            <Text style={styles.secondaryButtonText}>Go to Home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
  },
  successIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F3FAF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    borderWidth: 8,
    borderColor: "#E6F4EA",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 40,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1F7A3E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
    marginLeft: 40, // aligns with text
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  primaryButton: {
    height: 56,
    backgroundColor: "#1F7A3E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
  },
});
