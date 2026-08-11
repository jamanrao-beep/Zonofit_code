import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";

export default function VerifyNumberScreen() {
  const router = useRouter();
  const { sendOTP, verifyOTP, loading, error, verificationPhone } = useAuthStore();
  
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  
  const handleSendOTP = async () => {
    if (phone.length < 10) return;
    await sendOTP(phone);
    setStep("otp");
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 4) return;
    
    const success = await verifyOTP(code);
    if (success) {
      router.replace("/(auth)/profile-details");
    }
  };

  const updateOtp = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    // Auto-focus logic can be added here, but for simplicity we keep it basic
  };

  if (step === "phone") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
          <View>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#111827" />
            </Pressable>

            <View style={styles.iconContainer}>
              <Ionicons name="call" size={32} color="#1F7A3E" />
            </View>

            <Text style={styles.title}>Enter Your Number</Text>
            <Text style={styles.subtitle}>We will send a 4-digit code to verify.</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
                autoFocus
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <Pressable 
            style={[styles.primaryButton, (phone.length < 10 || loading) && styles.primaryButtonDisabled]} 
            onPress={handleSendOTP}
            disabled={phone.length < 10 || loading}
          >
            <Text style={styles.primaryButtonText}>{loading ? "Sending..." : "Continue"}</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // OTP Step (Exact Screen 7 from mockup)
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
        <View>
          <Pressable onPress={() => setStep("phone")} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>

          <View style={styles.otpIconContainer}>
            <View style={styles.phoneOutline}>
              <View style={styles.greenBubble} />
            </View>
          </View>

          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>We sent a 4-digit code to +91 {verificationPhone}</Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                style={styles.otpBox}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => updateOtp(text, index)}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.resendText}>Resend code in <Text style={{ color: '#1F7A3E' }}>0:59</Text></Text>
        </View>

        <Pressable 
          style={[styles.primaryButton, (otp.join("").length < 4 || loading) && styles.primaryButtonDisabled]} 
          onPress={handleVerify}
          disabled={otp.join("").length < 4 || loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? "Verifying..." : "Verify"}</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginLeft: -8,
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: "#F3FAF4",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  otpIconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  phoneOutline: {
    width: 48,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#1F7A3E",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  greenBubble: {
    position: "absolute",
    right: -10,
    top: -10,
    width: 24,
    height: 24,
    backgroundColor: "#1F7A3E",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "#E5E7EB",
    paddingBottom: 8,
    marginBottom: 24,
  },
  prefix: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  otpContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 32,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  resendText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 16,
    textAlign: "center",
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
