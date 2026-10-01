import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, StatusBar, Alert, Platform, Modal, TextInput, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";

export default function CreateAccountScreen() {
  const router = useRouter();
  const googleSignIn = useAuthStore(state => state.googleSignIn);
  const loading = useAuthStore(state => state.loading);
  const startGuestSession = useGuestStore(state => state.startGuestSession);

  const [guestLoading, setGuestLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const handleGoogleSignIn = () => {
    setShowGoogleModal(true);
  };

  const handleConfirmGoogleSignIn = async () => {
    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail) {
      Alert.alert("Google Account Required", "Please enter your Google account email to sign in.");
      return;
    }
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      Alert.alert("Invalid Email", "Please enter a valid Google email address (e.g. yourname@gmail.com).");
      return;
    }

    try {
      setGoogleSubmitting(true);
      await googleSignIn(cleanEmail, googleName.trim() || undefined);
      setShowGoogleModal(false);
      router.replace("/(tabs)");
    } catch (e: any) {
      console.warn("Google sign-in error:", e);
      Alert.alert("Sign-In Error", e?.message || "Failed to sign in with Google. Please try again or use mobile login.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleAppleSignIn = () => {
    Alert.alert(
      "Apple Sign-In",
      Platform.OS === "ios"
        ? "Apple Sign-In will be available with the next App Store update. Please continue with Google or Mobile Number."
        : "Apple Sign-In is only available on iOS devices. Please continue with Google or Mobile Number."
    );
  };

  const handleContinueAsGuest = async () => {
    try {
      setGuestLoading(true);
      await startGuestSession();
      router.replace("/(tabs)");
    } catch (e) {
      console.warn("Error starting guest session:", e);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            /* eslint-disable-next-line @typescript-eslint/no-require-imports */
            source={require("@/assets/Zonofit_final_logo.jpeg")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>One membership. Many experiences.</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#000" style={styles.btnIcon} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>

          <Pressable 
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          >
            <Ionicons name="logo-apple" size={22} color="#FFF" style={styles.btnIcon} />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </Pressable>
          
          <Pressable 
            style={styles.mobileButton}
            onPress={() => router.push("/(auth)/verify-number" as any)}
          >
            <Text style={styles.mobileButtonText}>Continue with Mobile Number</Text>
          </Pressable>

          {/* PRD Section 7: Guest Login Option */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.guestButton,
              pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              guestLoading && { opacity: 0.6 }
            ]}
            onPress={handleContinueAsGuest}
            disabled={guestLoading || loading}
          >
            <Ionicons name="compass-outline" size={20} color="#1F7A3E" style={styles.btnIcon} />
            <View style={{ alignItems: "center" }}>
              <Text style={styles.guestButtonText}>
                {guestLoading ? "Entering Guest Mode..." : "Continue as Guest"}
              </Text>
              <Text style={styles.guestSubtext}>Explore gyms & understand ZonoFit first</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing you agree to our <Text style={styles.linkText}>Terms</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
          </Text>
        </View>
      </View>

      {/* Google Account Sign-In Modal */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.googleIconCircle}>
                <Ionicons name="logo-google" size={24} color="#EA4335" />
              </View>
              <Text style={styles.modalTitle}>Sign In with Google</Text>
              <Text style={styles.modalSubtitle}>
                Enter your Google account to log into your personal ZonoFit profile.
              </Text>
            </View>

            <View style={styles.modalInputs}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Google Email Address *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="yourname@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={googleEmail}
                  onChangeText={setGoogleEmail}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Your Name (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#9CA3AF"
                  value={googleName}
                  onChangeText={setGoogleName}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalSubmitButton, googleSubmitting && { opacity: 0.6 }]}
                onPress={handleConfirmGoogleSignIn}
                disabled={googleSubmitting}
              >
                <Text style={styles.modalSubmitText}>
                  {googleSubmitting ? "Signing in..." : "Continue with this Account"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowGoogleModal(false)}
                disabled={googleSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  btnIcon: {
    position: "absolute",
    left: 20,
  },
  googleButton: {
    flexDirection: "row",
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  appleButton: {
    flexDirection: "row",
    height: 56,
    backgroundColor: "#111827",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  mobileButton: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  mobileButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerLabel: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  guestButton: {
    flexDirection: "row",
    height: 58,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  guestSubtext: {
    fontSize: 11,
    fontWeight: "500",
    color: "#166534",
    marginTop: 1,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  googleIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  modalInputs: {
    gap: 14,
    marginBottom: 20,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  modalActions: {
    gap: 10,
  },
  modalSubmitButton: {
    height: 54,
    backgroundColor: "#1F7A3E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCancelButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
});
