import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Image, 
  StatusBar, 
  Alert, 
  Platform, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView,
  ScrollView,
  Keyboard
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { requestGoogleIdToken } from "@/lib/googleAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";

export default function CreateAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"signup" | "signin">(
    params.mode === "signin" ? "signin" : "signup"
  );

  const [phone, setPhone] = useState("");
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);

  const sendOTP = useAuthStore(state => state.sendOTP);
  const googleSignIn = useAuthStore(state => state.googleSignIn);
  const signInWithEmail = useAuthStore(state => state.signInWithEmail);
  const appleSignIn = useAuthStore(state => state.appleSignIn);
  const loading = useAuthStore(state => state.loading);
  const { startGuestSession, isGuest, endGuestSession } = useGuestStore();

  const [guestLoading, setGuestLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showAppleModal, setShowAppleModal] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailOtpStep, setEmailOtpStep] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (params.mode === "signin" || params.mode === "signup") {
      setMode(params.mode as "signup" | "signin");
    }
  }, [params.mode]);

  useEffect(() => {
    setEmailOtpStep(false);
    setEmailCode("");
    setResendIn(0);
  }, [mode]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // When a guest navigates here to create a full account, end guest session
  useEffect(() => {
    if (isGuest) {
      endGuestSession();
    }
  }, []);

  const handlePhoneSubmit = async () => {
    Keyboard.dismiss();
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      Alert.alert(
        "Invalid Mobile Number",
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    try {
      setOtpSending(true);
      const isSignIn = mode === "signin";

      // Verify if account already exists with this phone number
      const checkResult = await useAuthStore.getState().checkUserExists(cleanPhone);

      // SCENARIO 1: User is on "Create Account" (signup), but phone is already registered!
      if (!isSignIn && checkResult.phoneExists) {
        setOtpSending(false);
        Alert.alert(
          "Account Already Exists",
          `An account with mobile number +91 ${cleanPhone} is already registered.\n\nPlease Sign In to continue.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign In Instead",
              onPress: async () => {
                setMode("signin");
                try {
                  setOtpSending(true);
                  await sendOTP(cleanPhone, true);
                  router.push({
                    pathname: "/(auth)/verify-number",
                    params: { phone: cleanPhone, autoSend: "1", mode: "signin" },
                  } as any);
                } catch (err: any) {
                  Alert.alert("Sign In Error", err?.message || "Failed to send sign-in OTP.");
                } finally {
                  setOtpSending(false);
                }
              },
            },
          ]
        );
        return;
      }

      // SCENARIO 2: User is on "Sign In", but no account exists with this phone number!
      if (isSignIn && !checkResult.phoneExists) {
        setOtpSending(false);
        Alert.alert(
          "Account Not Found",
          `No account found with mobile number +91 ${cleanPhone}.\n\nPlease create an account to get started.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Create Account",
              onPress: async () => {
                setMode("signup");
                try {
                  setOtpSending(true);
                  await sendOTP(cleanPhone, false);
                  router.push({
                    pathname: "/(auth)/verify-number",
                    params: { phone: cleanPhone, autoSend: "1", mode: "signup" },
                  } as any);
                } catch (err: any) {
                  Alert.alert("Sign Up Error", err?.message || "Failed to send signup OTP.");
                } finally {
                  setOtpSending(false);
                }
              },
            },
          ]
        );
        return;
      }

      // Send OTP with the respective mode
      await sendOTP(cleanPhone, isSignIn);
      router.push({
        pathname: "/(auth)/verify-number",
        params: { phone: cleanPhone, autoSend: "1", mode },
      } as any);
    } catch (e: any) {
      Alert.alert("Error Sending OTP", e?.message || "Failed to send OTP code.");
    } finally {
      setOtpSending(false);
    }
  };

  const openSignedInScreen = (isOnboarded: boolean) => {
    if (isOnboarded) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/profile-details");
    }
  };

  const handleGoogleSignInPress = async () => {
    if (googleLoading || loading) return;
    try {
      setGoogleLoading(true);
      const idToken = await requestGoogleIdToken();
      const res = await googleSignIn(idToken);
      openSignedInScreen(Boolean(res?.isOnboarded));
    } catch (e: any) {
      Alert.alert("Google Sign-In", e?.message || "Could not sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    Keyboard.dismiss();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert("Email", "Enter a valid email address.");
      return;
    }
    if (password.length < 8 || password.length > 72) {
      Alert.alert("Password", "Use a password between 8 and 72 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      Alert.alert("Password", "Those passwords do not match.");
      return;
    }

    try {
      setEmailBusy(true);
      const result = await signInWithEmail({ email: trimmed, password, mode });
      if (result.otpRequired) {
        setEmailOtpStep(true);
        setEmailCode("");
        setResendIn(5 * 60);
        return;
      }
      openSignedInScreen(result.isOnboarded);
    } catch (e: any) {
      if (typeof e?.retryAfterSeconds === "number" && e.retryAfterSeconds > 0) {
        setEmailOtpStep(true);
        setResendIn(e.retryAfterSeconds);
      }
      Alert.alert(mode === "signup" ? "Create Account" : "Sign In", e?.message || "Could not continue with that email.");
    } finally {
      setEmailBusy(false);
    }
  };

  const handleEmailCodeSubmit = async () => {
    Keyboard.dismiss();
    if (!/^\d{4}$/.test(emailCode.trim())) {
      Alert.alert("Code", "Enter the 4-digit code from your email.");
      return;
    }
    try {
      setEmailBusy(true);
      const result = await signInWithEmail({
        email: email.trim().toLowerCase(),
        password,
        code: emailCode.trim(),
        mode,
      });
      if (result.otpRequired) return;
      openSignedInScreen(result.isOnboarded);
    } catch (e: any) {
      Alert.alert("Code", e?.message || "That code is not valid.");
    } finally {
      setEmailBusy(false);
    }
  };

  const handleAppleSignInPress = () => {
    if (appleLoading || loading) return;
    setShowAppleModal(true);
  };

  const handleConfirmAppleSignIn = async () => {
    try {
      setAppleLoading(true);
      setShowAppleModal(false);
      const res = await appleSignIn();
      const userPhone = useAuthStore.getState().user?.phone;
      if (!userPhone || userPhone.trim().length < 10) {
        // Mobile number is strictly mandatory for all members!
        router.replace("/(auth)/verify-number");
      } else if (res?.isOnboarded) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/profile-details");
      }
    } catch (e: any) {
      Alert.alert("Apple Sign-In", e?.message || "Failed to sign in with Apple.");
    } finally {
      setAppleLoading(false);
    }
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

  const isSignUp = mode === "signup";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Top bar with mode switcher & tour */}
          <View style={styles.topBar}>
            {/* Segmented Switcher */}
            <View style={styles.segmentContainer}>
              <Pressable 
                style={[styles.segmentBtn, isSignUp && styles.segmentBtnActive]}
                onPress={() => setMode("signup")}
              >
                <Text style={[styles.segmentText, isSignUp && styles.segmentTextActive]}>
                  Create Account
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.segmentBtn, !isSignUp && styles.segmentBtnActive]}
                onPress={() => setMode("signin")}
              >
                <Text style={[styles.segmentText, !isSignUp && styles.segmentTextActive]}>
                  Sign In
                </Text>
              </Pressable>
            </View>

            <Pressable 
              onPress={() => router.push("/intro" as any)}
              style={styles.tourBtn}
              accessibilityLabel="Tour ZonoFit Intro Screens"
            >
              <Ionicons name="sparkles" size={13} color="#1F7A3E" />
              <Text style={styles.tourText}>Tour</Text>
            </Pressable>
          </View>

          {/* Logo & Header */}
          <View style={styles.header}>
            <Image
              /* eslint-disable-next-line @typescript-eslint/no-require-imports */
              source={require("@/assets/Zonofit_final_logo.jpeg")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>
              {isSignUp ? "Create Your Account" : "Welcome Back"}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? "Use your mobile number, or set an email and password."
                : "Use your mobile number, or sign in with email."}
            </Text>
          </View>

          {/* ======================================================== */}
          {/* HERO SECTION: MOBILE NUMBER LOGIN (PRIORITIZED #1)       */}
          {/* ======================================================== */}
          <View style={styles.phoneSection}>
            <Pressable 
              style={[styles.phoneInputCard, phoneFocused && styles.phoneInputCardFocused]}
              onPress={() => phoneInputRef.current?.focus()}
              accessible={false}
            >
              <Pressable 
                style={styles.countryCodeBadge}
                onPress={() => phoneInputRef.current?.focus()}
              >
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </Pressable>
              <TextInput
                ref={phoneInputRef}
                style={styles.phoneInput}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#9CA3AF"
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                maxLength={10}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handlePhoneSubmit}
                showSoftInputOnFocus={true}
                editable={!otpSending}
                autoCorrect={false}
              />
              {phone.length > 0 && (
                <Pressable onPress={() => setPhone("")} style={styles.clearBtn} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </Pressable>
              )}
            </Pressable>

            {/* Primary Hero Button: Continue with OTP */}
            <Pressable 
              style={[
                styles.primaryOtpButton, 
                (phone.length !== 10 || otpSending) && styles.primaryOtpButtonDisabled
              ]}
              onPress={handlePhoneSubmit}
              disabled={phone.length !== 10 || otpSending}
            >
              {otpSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnRowContent}>
                  <Text style={styles.primaryOtpButtonText}>Continue with OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </Pressable>

            <Text style={styles.phoneSecurityNote}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#1F7A3E" /> Mobile verification is mandatory for gym check-in & passes
            </Text>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR USE EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.emailSection}>
            {emailOtpStep ? (
              <View>
                <Text style={styles.emailHint}>
                  Enter the 4-digit code sent to {email.trim().toLowerCase()}. It works for 10 minutes.
                </Text>
                <TextInput
                  style={styles.emailInput}
                  placeholder="4-digit code"
                  placeholderTextColor="#9CA3AF"
                  keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                  maxLength={4}
                  value={emailCode}
                  onChangeText={(text) => setEmailCode(text.replace(/[^0-9]/g, ""))}
                  editable={!emailBusy}
                  autoCorrect={false}
                />
                <Pressable
                  style={[styles.primaryOtpButton, (emailCode.length !== 4 || emailBusy) && styles.primaryOtpButtonDisabled]}
                  onPress={handleEmailCodeSubmit}
                  disabled={emailCode.length !== 4 || emailBusy}
                >
                  {emailBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryOtpButtonText}>Verify Email</Text>
                  )}
                </Pressable>
                <View style={styles.emailOtpActions}>
                  <Pressable
                    onPress={handleEmailSubmit}
                    disabled={emailBusy || resendIn > 0}
                  >
                    <Text style={[styles.emailActionText, (emailBusy || resendIn > 0) && styles.emailActionTextDisabled]}>
                      {resendIn > 0
                        ? `Resend OTP in ${Math.floor(resendIn / 60)}:${String(resendIn % 60).padStart(2, "0")}`
                        : "Resend OTP"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEmailOtpStep(false);
                      setEmailCode("");
                      setResendIn(0);
                    }}
                    disabled={emailBusy}
                  >
                    <Text style={styles.emailActionText}>Edit email</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.emailInput}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  editable={!emailBusy}
                />
                <TextInput
                  style={styles.emailInput}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={isSignUp ? "password-new" : "password"}
                  value={password}
                  onChangeText={setPassword}
                  editable={!emailBusy}
                />
                {isSignUp ? (
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Confirm password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password-new"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!emailBusy}
                  />
                ) : null}
                <Pressable
                  style={[styles.primaryOtpButton, emailBusy && styles.primaryOtpButtonDisabled]}
                  onPress={handleEmailSubmit}
                  disabled={emailBusy}
                >
                  {emailBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryOtpButtonText}>
                      {isSignUp ? "Create Account" : "Sign In"}
                    </Text>
                  )}
                </Pressable>
                <Text style={styles.emailHint}>
                  We email a 4-digit code before opening the account. Google sign-in does not ask for that code.
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialButtonsContainer}>
            {/* Google Button */}
            <Pressable 
              style={[styles.socialButton, (loading || googleLoading) && { opacity: 0.7 }]}
              onPress={handleGoogleSignInPress}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#EA4335" style={styles.socialBtnIcon} />
              ) : (
                <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.socialBtnIcon} />
              )}
              <Text style={styles.socialButtonText}>
                {googleLoading 
                  ? "Connecting..." 
                  : (isSignUp ? "Continue with Google" : "Sign in with Google")}
              </Text>
            </Pressable>

            {/* Apple Button */}
            <Pressable 
              style={[styles.socialButtonDark, (loading || appleLoading) && { opacity: 0.7 }]}
              onPress={handleAppleSignInPress}
              disabled={loading || appleLoading}
            >
              {appleLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={styles.socialBtnIcon} />
              ) : (
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.socialBtnIcon} />
              )}
              <Text style={styles.socialButtonDarkText}>
                {appleLoading 
                  ? "Connecting..." 
                  : (isSignUp ? "Continue with Apple" : "Sign in with Apple")}
              </Text>
            </Pressable>
          </View>

          {/* Guest Button */}
          <Pressable 
            style={({ pressed }) => [
              styles.guestButton,
              pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              guestLoading && { opacity: 0.6 }
            ]}
            onPress={handleContinueAsGuest}
            disabled={guestLoading || loading}
          >
            <Ionicons name="compass-outline" size={18} color="#1F7A3E" style={{ marginRight: 8 }} />
            <Text style={styles.guestButtonText}>
              {guestLoading ? "Entering Guest Mode..." : "Explore as Guest"}
            </Text>
          </Pressable>

          {/* Toggle between Sign Up and Sign In */}
          <View style={styles.loginRow}>
            <Text style={styles.loginRowText}>
              {isSignUp ? "Already have a ZonoFit account? " : "New to ZonoFit? "}
            </Text>
            <Pressable onPress={() => setMode(isSignUp ? "signin" : "signup")}>
              <Text style={styles.loginRowLink}>
                {isSignUp ? "Sign In" : "Create Account"}
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing you agree to our{" "}
              <Text 
                style={[styles.linkText, { textDecorationLine: "underline" }]}
                onPress={() => router.push({ pathname: "/content", params: { type: "terms_and_conditions", title: "Terms & Conditions" } } as any)}
              >
                Terms
              </Text>{" "}
              and{" "}
              <Text 
                style={[styles.linkText, { textDecorationLine: "underline" }]}
                onPress={() => router.push({ pathname: "/content", params: { type: "privacy_policy", title: "Privacy Policy" } } as any)}
              >
                Privacy Policy
              </Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ======================================================== */}
      {/* APPLE ID 1-TAP SHEET                                     */}
      {/* ======================================================== */}
      <Modal
        visible={showAppleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAppleModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowAppleModal(false)} />
          <View style={styles.sheetContent}>
            <View style={styles.handleBar} />

            <View style={styles.appleSheetHeader}>
              <View style={styles.appleIconBox}>
                <Ionicons name="logo-apple" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.sheetTitle}>Sign in with Apple</Text>
              <Text style={styles.sheetSubtitle}>
                Use your Apple ID to sign in securely to ZonoFit.
              </Text>
            </View>

            <Pressable 
              style={styles.appleConfirmBtn}
              onPress={handleConfirmAppleSignIn}
            >
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.appleConfirmText}>Continue with Apple ID</Text>
            </Pressable>

            <Pressable
              style={styles.sheetCancelBtn}
              onPress={() => setShowAppleModal(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  segmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#111827",
    fontWeight: "700",
  },
  tourBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  tourText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 16,
  },

  /* Hero Phone Section */
  phoneSection: {
    width: "100%",
    marginBottom: 18,
  },
  phoneInputCard: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  phoneInputCardFocused: {
    borderColor: "#1F7A3E",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  countryCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    marginRight: 10,
  },
  flagEmoji: {
    fontSize: 18,
    marginRight: 4,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  phoneInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  primaryOtpButton: {
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
  primaryOtpButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnRowContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryOtpButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  phoneSecurityNote: {
    fontSize: 11,
    fontWeight: "500",
    color: "#15803D",
    marginTop: 8,
    textAlign: "center",
  },
  emailSection: {
    width: "100%",
    marginBottom: 8,
  },
  emailInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  emailHint: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 10,
  },
  emailOtpActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emailActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  emailActionTextDisabled: {
    color: "#9CA3AF",
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerLabel: {
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },

  /* Social Buttons */
  socialButtonsContainer: {
    gap: 10,
    marginBottom: 12,
  },
  socialButton: {
    flexDirection: "row",
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  socialBtnIcon: {
    position: "absolute",
    left: 18,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  socialButtonDark: {
    flexDirection: "row",
    height: 50,
    backgroundColor: "#111827",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  socialButtonDarkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Guest Button */
  guestButton: {
    flexDirection: "row",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 12,
  },
  guestButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  loginRowText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  loginRowLink: {
    fontSize: 13,
    color: "#1F7A3E",
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: 4,
  },
  footerText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 16,
  },
  linkText: {
    color: "#6B7280",
    fontWeight: "600",
  },

  /* Bottom sheet styles (Apple ID) */
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  appleSheetHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  appleIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  accountList: {
    gap: 10,
    marginBottom: 16,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  accountEmail: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  anotherAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  addIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  anotherAccountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  customInputBox: {
    marginTop: 8,
    gap: 10,
  },
  sheetInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
  },
  sheetConfirmBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1F7A3E",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  appleConfirmBtn: {
    flexDirection: "row",
    height: 52,
    backgroundColor: "#111827",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  appleConfirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  sheetCancelBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
});
