import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileDetailsScreen() {
  const router = useRouter();
  const { updateProfile, loading } = useAuthStore();

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [referral, setReferral] = useState("");

  const handleContinue = async () => {
    if (!name.trim()) return;
    
    await updateProfile({ name, dob, referral });
    // After profile is updated, we go to location permission
    router.replace("/onboarding/location");
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
          <View style={[styles.progressBar, { width: "33%" }]} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
        <View>
          <Text style={styles.title}>Tell Us About You</Text>
          <Text style={styles.subtitle}>Just a few details to get you started.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birthday <Text style={styles.optionalText}>(Optional)</Text></Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#9CA3AF"
                value={dob}
                onChangeText={setDob}
              />
              <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Have a referral code?</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter code"
                placeholderTextColor="#9CA3AF"
                value={referral}
                onChangeText={setReferral}
                autoCapitalize="characters"
              />
              <Pressable>
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable 
          style={[styles.primaryButton, (!name.trim() || loading) && styles.primaryButtonDisabled]} 
          onPress={handleContinue}
          disabled={!name.trim() || loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? "Saving..." : "Continue"}</Text>
        </Pressable>
      </KeyboardAvoidingView>
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
    justifyContent: "space-between",
    paddingBottom: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  optionalText: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  applyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F7A3E",
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
