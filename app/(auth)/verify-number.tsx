import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";

export default function VerifyNumberScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; phone?: string; autoSend?: string }>();
  const isSignIn = params.mode === "signin";
  const { sendOTP, verifyOTP, loading, error, verificationPhone, user } = useAuthStore();
  
  const [step, setStep] = useState<"phone" | "otp">(
    params.autoSend === "1" && params.phone ? "otp" : "phone"
  );
  const [phone, setPhone] = useState(params.phone || verificationPhone || user?.phone || "");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [isOtpFocused, setIsOtpFocused] = useState(true);

  const hiddenInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === "otp" && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const handleSendOTP = async () => {
    const clean = phone.replace(/[^0-9]/g, "");
    if (clean.length !== 10) return;
    await sendOTP(clean, isSignIn);
    setCountdown(30);
    setOtpCode("");
    setStep("otp");
    setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 150);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    const clean = phone.replace(/[^0-9]/g, "") || verificationPhone;
    if (clean) {
      await sendOTP(clean, isSignIn);
      setCountdown(30);
      setOtpCode("");
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode;
    if (code.length < 4) return;
    
    const success = await verifyOTP(code, isSignIn);
    if (success) {
      const { isOnboarded } = useAuthStore.getState();
      if (isOnboarded) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/profile-details");
      }
    }
  };

  const handleOtpTextChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, "").slice(0, 4);
    setOtpCode(clean);
    if (clean.length === 4) {
      handleVerify(clean);
    }
  };

  if (step === "phone") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.content}>
          <View>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#111827" />
            </Pressable>

            <View style={styles.iconContainer}>
              <Ionicons name="call" size={32} color="#1F7A3E" />
            </View>

            <Text style={styles.title}>
              {isSignIn ? "Welcome Back" : "Mobile Number Required"}
            </Text>
            <Text style={styles.subtitle}>
              {isSignIn 
                ? "Enter your mobile number to sign in." 
                : "A verified mobile number is mandatory to activate your ZonoFit account and book gym sessions."}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.prefix}>🇮🇳 +91</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#9CA3AF"
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
                maxLength={10}
                autoFocus
                showSoftInputOnFocus={true}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <Pressable 
            style={[styles.primaryButton, (phone.length < 10 || loading) && styles.primaryButtonDisabled]} 
            onPress={handleSendOTP}
            disabled={phone.length < 10 || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send OTP</Text>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // OTP Step
  const targetPhone = phone || verificationPhone;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.content}>
        <View>
          <Pressable onPress={() => setStep("phone")} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>

          <View style={styles.otpIconContainer}>
            <View style={styles.phoneOutline}>
              <View style={styles.greenBubble}>
                <Ionicons name="chatbubble-ellipses" size={14} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>
            Enter the 4-digit code sent to <Text style={{ fontWeight: "700", color: "#111827" }}>+91 {targetPhone}</Text>
          </Text>

          <Pressable 
            style={styles.otpContainer}
            onPress={() => hiddenInputRef.current?.focus()}
          >
            {/* Native Invisible Master TextInput ensuring automatic seamless input and cursor flow */}
            <TextInput
              ref={hiddenInputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={4}
              value={otpCode}
              onChangeText={handleOtpTextChange}
              onFocus={() => setIsOtpFocused(true)}
              onBlur={() => setIsOtpFocused(false)}
              textContentType="oneTimeCode"
              autoFocus
              caretHidden
            />

            {[0, 1, 2, 3].map((index) => {
              const digit = otpCode[index] || "";
              const isActive = isOtpFocused && (
                otpCode.length === index || (index === 3 && otpCode.length === 4)
              );

              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    isActive ? styles.otpBoxActive : null,
                  ]}
                >
                  <Text style={styles.otpText}>{digit}</Text>
                </View>
              );
            })}
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {countdown > 0 ? (
            <Text style={styles.resendText}>
              Resend code in <Text style={{ color: '#1F7A3E', fontWeight: "700" }}>0:{countdown < 10 ? `0${countdown}` : countdown}</Text>
            </Text>
          ) : (
            <Pressable onPress={handleResend} style={{ alignItems: "center", marginBottom: 20 }}>
              <Text style={styles.resendActiveText}>Resend Code</Text>
            </Pressable>
          )}

          <Pressable 
            style={styles.testHintCard}
            onPress={() => {
              setOtpCode("1234");
              handleVerify("1234");
            }}
          >
            <Ionicons name="information-circle-outline" size={14} color="#047857" style={{ marginRight: 4 }} />
            <Text style={styles.testHintText}>Testing Code: Tap to autofill 1234</Text>
          </Pressable>
        </View>

        <Pressable 
          style={[styles.primaryButton, (otpCode.length < 4 || loading) && styles.primaryButtonDisabled]} 
          onPress={() => handleVerify(otpCode)}
          disabled={otpCode.length < 4 || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify & Continue</Text>
          )}
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
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  otpIconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  phoneOutline: {
    width: 48,
    height: 76,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1F7A3E",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  greenBubble: {
    position: "absolute",
    right: -12,
    top: -12,
    width: 28,
    height: 28,
    backgroundColor: "#1F7A3E",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 28,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "#1F7A3E",
    paddingBottom: 10,
    marginBottom: 20,
  },
  prefix: {
    fontSize: 18,
    fontWeight: "700",
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
    gap: 14,
    marginBottom: 24,
    justifyContent: "center",
    position: "relative",
  },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    zIndex: 10,
  },
  otpBox: {
    width: 58,
    height: 62,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxActive: {
    borderColor: "#1F7A3E",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  otpBoxFilled: {
    borderColor: "#1F7A3E",
    backgroundColor: "#F0FDF4",
  },
  otpText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  resendText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  resendActiveText: {
    fontSize: 14,
    color: "#1F7A3E",
    fontWeight: "700",
  },
  testHintCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginTop: 6,
  },
  testHintText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  primaryButton: {
    height: 54,
    backgroundColor: "#1F7A3E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
