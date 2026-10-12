import React, { useState, useEffect } from "react";
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
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";

WebBrowser.maybeCompleteAuthSession();

export default function CreateAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"signup" | "signin">(
    params.mode === "signin" ? "signin" : "signup"
  );

  const [phone, setPhone] = useState("");
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  const sendOTP = useAuthStore(state => state.sendOTP);
  const googleSignIn = useAuthStore(state => state.googleSignIn);
  const appleSignIn = useAuthStore(state => state.appleSignIn);
  const loading = useAuthStore(state => state.loading);
  const { startGuestSession, isGuest, endGuestSession } = useGuestStore();

  const [guestLoading, setGuestLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  
  // 1-tap social chooser modal states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showAppleModal, setShowAppleModal] = useState(false);
  const [googleDialogMode, setGoogleDialogMode] = useState<"choose" | "type_new">("choose");
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");

  useEffect(() => {
    if (params.mode === "signin" || params.mode === "signup") {
      setMode(params.mode as "signup" | "signin");
    }
  }, [params.mode]);

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
      await sendOTP(cleanPhone);
      router.push({
        pathname: "/(auth)/verify-number",
        params: { phone: cleanPhone, autoSend: "1", mode }
      } as any);
    } catch (e: any) {
      Alert.alert("Error Sending OTP", e?.message || "Failed to send OTP code.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleGoogleSignInPress = async () => {
    if (googleLoading || loading) return;
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

    if (clientId) {
      try {
        setGoogleLoading(true);
        const redirectUri = Linking.createURL("oauth/google");
        const authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=token` +
          `&scope=${encodeURIComponent("openid email profile")}`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        if (result.type === "success" && result.url) {
          const hashIndex = result.url.indexOf("#");
          const paramsString =
            hashIndex !== -1
              ? result.url.substring(hashIndex + 1)
              : result.url.split("?")[1] || "";
          const urlParams = new URLSearchParams(paramsString);
          const accessToken = urlParams.get("access_token");

          if (accessToken) {
            const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userData = await userRes.json();
            if (userData?.email) {
              const res = await googleSignIn(userData.email, userData.name || userData.email.split("@")[0]);
              const userPhone = useAuthStore.getState().user?.phone;
              if (!userPhone || userPhone.trim().length < 10) {
                // Mobile number is strictly mandatory!
                router.replace("/(auth)/verify-number");
              } else if (res?.isOnboarded) {
                router.replace("/(tabs)");
              } else {
                router.replace("/(auth)/profile-details");
              }
              return;
            }
          }
        }
      } catch (e: any) {
        console.warn("[Google Sign-In]", e);
      } finally {
        setGoogleLoading(false);
      }
    } else {
      setGoogleDialogMode("choose");
      setCustomGoogleEmail("");
      setCustomGoogleName("");
      setShowGoogleModal(true);
    }
  };

  const handleSelectGoogleAccount = async (email: string, name: string) => {
    try {
      setGoogleLoading(true);
      setShowGoogleModal(false);
      const res = await googleSignIn(email, name);
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
      Alert.alert("Google Sign-In", e?.message || "Failed to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleConfirmCustomGoogleEmail = async () => {
    const trimmed = customGoogleEmail.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      Alert.alert("Invalid Email", "Please enter a valid Google / Gmail address.");
      return;
    }
    const derivedName = customGoogleName.trim() || trimmed.split("@")[0].replace(/[._]/g, " ");
    await handleSelectGoogleAccount(trimmed, derivedName);
    setCustomGoogleEmail("");
    setCustomGoogleName("");
    setGoogleDialogMode("choose");
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
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                ? "Enter your mobile number to get started." 
                : "Enter your registered mobile number to sign in."}
            </Text>
          </View>

          {/* ======================================================== */}
          {/* HERO SECTION: MOBILE NUMBER LOGIN (PRIORITIZED #1)       */}
          {/* ======================================================== */}
          <View style={styles.phoneSection}>
            <View style={[styles.phoneInputCard, phoneFocused && styles.phoneInputCardFocused]}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handlePhoneSubmit}
              />
              {phone.length > 0 && (
                <Pressable onPress={() => setPhone("")} style={styles.clearBtn} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </Pressable>
              )}
            </View>

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
      {/* NATIVE GOOGLE ACCOUNT CHOOSER (EXISTING & NEW MAIL TYPE) */}
      {/* ======================================================== */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowGoogleModal(false);
          setGoogleDialogMode("choose");
        }}
      >
        <Pressable 
          style={styles.googleDialogOverlay}
          onPress={() => {
            setShowGoogleModal(false);
            setGoogleDialogMode("choose");
          }}
        >
          <Pressable 
            style={styles.googleDialogCard} 
            onPress={(e) => e.stopPropagation()}
          >
            {googleDialogMode === "choose" ? (
              /* VIEW 1: SELECT EXISTING MAIL ACCOUNTS */
              <View>
                {/* App Logo */}
                <View style={styles.googleAppLogoContainer}>
                  <Image 
                    source={require("@/assets/Zonofit_final_logo.jpeg")} 
                    style={styles.googleAppLogo} 
                    resizeMode="cover"
                  />
                </View>

                {/* Title & Subtitle */}
                <Text style={styles.googleDialogTitle}>Choose an account</Text>
                <Text style={styles.googleDialogSubtitle}>to continue to ZonoFit</Text>

                {/* Existing Accounts List */}
                <ScrollView 
                  style={{ maxHeight: 280 }} 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.googleAccountList}>
                    {[
                      { name: "SARANSH PANDYA", email: "saranshpandya148@gmail.com", initial: "S", color: "#2E7D32" },
                      { name: "Saransh Pandya", email: "saranshp34@gmail.com", initial: "S", color: "#1976D2" },
                      { name: "rock star", email: "hacker692006@gmail.com", initial: "r", color: "#8D6E63" },
                      { name: "Rahul Jain", email: "rahulalkeshkumar@gmail.com", initial: "R", color: "#C2185B" },
                      { name: "EDU", email: "eduapp1256@gmail.com", initial: "E", color: "#0D47A1" },
                      { name: "Zono Fit", email: "zonofitofficial@gmail.com", initial: "Z", color: "#1B5E20" },
                    ].map((acc, index) => (
                      <Pressable
                        key={index}
                        style={({ pressed }) => [
                          styles.googleAccountRow,
                          pressed && { backgroundColor: "#F3F4F6" }
                        ]}
                        onPress={() => handleSelectGoogleAccount(acc.email, acc.name)}
                      >
                        <View style={[styles.googleAvatar, { backgroundColor: acc.color }]}>
                          <Text style={styles.googleAvatarText}>{acc.initial}</Text>
                        </View>
                        <View style={styles.googleAccountDetails}>
                          <Text style={styles.googleAccountName} numberOfLines={1}>
                            {acc.name}
                          </Text>
                          <Text style={styles.googleAccountEmail} numberOfLines={1}>
                            {acc.email}
                          </Text>
                        </View>
                      </Pressable>
                    ))}

                    {/* Option to Type New Mail */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.googleAddAccountRow,
                        pressed && { backgroundColor: "#F3F4F6" }
                      ]}
                      onPress={() => setGoogleDialogMode("type_new")}
                    >
                      <View style={styles.googleAddIconBox}>
                        <Ionicons name="person-add-outline" size={20} color="#5F6368" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.googleAddAccountText}>Add another account</Text>
                        <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Type a new Google email</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
            ) : (
              /* VIEW 2: TYPE NEW MAIL FORM */
              <View>
                <View style={styles.googleTypeNewHeader}>
                  <Pressable 
                    onPress={() => setGoogleDialogMode("choose")}
                    style={styles.googleBackIconBtn}
                    hitSlop={10}
                  >
                    <Ionicons name="arrow-back" size={20} color="#3C4043" />
                  </Pressable>
                  <Image 
                    source={require("@/assets/Zonofit_final_logo.jpeg")} 
                    style={styles.googleAppLogoSmall} 
                    resizeMode="cover"
                  />
                  <View style={{ width: 32 }} />
                </View>

                <Text style={styles.googleDialogTitle}>Sign in</Text>
                <Text style={styles.googleDialogSubtitle}>
                  Type your Google Account to continue to ZonoFit
                </Text>

                <View style={styles.googleInputGroup}>
                  <Text style={styles.inputFieldLabel}>Email address *</Text>
                  <TextInput
                    style={styles.googleInputField}
                    placeholder="e.g. name@gmail.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    value={customGoogleEmail}
                    onChangeText={setCustomGoogleEmail}
                  />
                </View>

                <View style={[styles.googleInputGroup, { marginTop: 12 }]}>
                  <Text style={styles.inputFieldLabel}>Full Name (Optional)</Text>
                  <TextInput
                    style={styles.googleInputField}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor="#9CA3AF"
                    value={customGoogleName}
                    onChangeText={setCustomGoogleName}
                  />
                </View>

                <View style={styles.googleTypeNewActionRow}>
                  <Pressable 
                    onPress={() => setGoogleDialogMode("choose")}
                    style={styles.googleBackTextBtn}
                  >
                    <Text style={styles.googleBackTextBtnLabel}>Back to accounts</Text>
                  </Pressable>

                  <Pressable 
                    onPress={handleConfirmCustomGoogleEmail}
                    style={[styles.googleNextBtn, !customGoogleEmail.trim() && { opacity: 0.5 }]}
                    disabled={!customGoogleEmail.trim()}
                  >
                    <Text style={styles.googleNextBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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

  /* Native Android Google Dialog Styles */
  googleDialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  googleDialogCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  googleAppLogoContainer: {
    alignItems: "center",
    marginBottom: 14,
  },
  googleAppLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  googleDialogTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#202124",
    textAlign: "center",
    marginBottom: 4,
  },
  googleDialogSubtitle: {
    fontSize: 13.5,
    color: "#5F6368",
    textAlign: "center",
    marginBottom: 16,
  },
  googleAccountList: {
    marginBottom: 4,
  },
  googleAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  googleAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  googleAvatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  googleAccountDetails: {
    flex: 1,
  },
  googleAccountName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#202124",
  },
  googleAccountEmail: {
    fontSize: 12,
    color: "#5F6368",
    marginTop: 1.5,
  },
  googleAddAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  googleAddIconBox: {
    width: 36,
    alignItems: "center",
    marginRight: 14,
  },
  googleAddAccountText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#202124",
  },
  /* View 2: Type New Mail Form Styles */
  googleTypeNewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  googleBackIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  googleAppLogoSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  googleInputGroup: {
    marginTop: 10,
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 5,
  },
  googleInputField: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  googleTypeNewActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  googleBackTextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  googleBackTextBtnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5F6368",
  },
  googleNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A73E8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  googleNextBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
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
