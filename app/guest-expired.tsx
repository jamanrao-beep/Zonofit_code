import React from "react";
import { View, Text, StyleSheet, Pressable, Image, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGuestStore } from "@/store/useGuestStore";

export default function GuestExpiredScreen() {
  const router = useRouter();
  const { clearGuestSession } = useGuestStore();

  const handleCreateAccount = async () => {
    await clearGuestSession();
    router.replace("/(auth)/create-account");
  };

  const handleLogin = async () => {
    await clearGuestSession();
    router.replace("/(auth)/verify-number" as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="hourglass-outline" size={44} color="#1F7A3E" />
          </View>
          
          <Text style={styles.title}>Your Guest Access Has Ended</Text>
          <Text style={styles.subtitle}>
            Create an account to continue exploring ZonoFit and access membership options across all partner gyms.
          </Text>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color="#1F7A3E" />
            <Text style={styles.infoText}>Keep exploring 100+ verified partner gyms</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color="#1F7A3E" />
            <Text style={styles.infoText}>Book visits and verify workouts with QR</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color="#1F7A3E" />
            <Text style={styles.infoText}>Earn credits and track your fitness progress</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={styles.primaryButton}
            onPress={handleCreateAccount}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </Pressable>

          <Pressable 
            style={styles.secondaryButton}
            onPress={handleLogin}
          >
            <Text style={styles.secondaryButtonText}>Log In to Existing Account</Text>
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
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  infoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    height: 56,
    backgroundColor: "#1F7A3E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 56,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
});
