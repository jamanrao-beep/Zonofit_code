import React from "react";
import { View, Text, StyleSheet, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function LocationScreen() {
  const router = useRouter();

  const handleAllowLocation = () => {
    // In a real app, this would request location permissions
    // For now, we just proceed to the next step
    router.push("/onboarding/select-city");
  };

  const handleManualEntry = () => {
    router.push("/onboarding/select-city");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Progress Bar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: "66%" }]} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          <View style={styles.mapCircle}>
            <Ionicons name="map" size={64} color="#9CA3AF" />
            <View style={styles.pin}>
              <Ionicons name="location" size={24} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Find Nearby Partner Gyms.</Text>
          <Text style={styles.subtitle}>We use your location to show gyms and experiences near you.</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable style={styles.primaryButton} onPress={handleAllowLocation}>
            <Text style={styles.primaryButtonText}>Allow Location</Text>
          </Pressable>
          
          <Pressable style={styles.secondaryButton} onPress={handleManualEntry}>
            <Text style={styles.secondaryButtonText}>Or enter city manually</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginLeft: -8,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    marginLeft: 16,
    marginRight: 32,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#1F7A3E",
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  illustrationContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  pin: {
    position: "absolute",
    top: -10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1F7A3E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  textContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
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
    paddingHorizontal: 20,
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
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
});
