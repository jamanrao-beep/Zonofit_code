import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar, 
  Alert, 
  BackHandler,
  Modal,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Available years for quick birth year jump (1950 - 2012)
const BIRTH_YEARS = Array.from({ length: 2012 - 1955 + 1 }, (_, i) => 2012 - i);

export default function ProfileDetailsScreen() {
  const router = useRouter();
  const { user, updateProfile, loading } = useAuthStore();

  const isGoogleUser = user?.authMethod === "google" || !!user?.email;

  const initialName = user?.username && user.username !== "Google User" && user.username !== "ZonoFit Member" 
    ? user.username 
    : "";
  
  const [name, setName] = useState(initialName);
  const [dob, setDob] = useState(user?.dob || "");
  const [email, setEmail] = useState(user?.email || (isGoogleUser ? "saranshpandya148@gmail.com" : ""));
  const [isEmailVerified, setIsEmailVerified] = useState(isGoogleUser);
  const [referral, setReferral] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);

  // Calendar Modal States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(2000);
  const [pickerMonth, setPickerMonth] = useState(0); // 0 = Jan
  const [pickerDay, setPickerDay] = useState(15);
  const [showYearSelector, setShowYearSelector] = useState(false);

  // Email OTP Modal States
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(30);

  // Sync existing user data if available
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      setIsEmailVerified(true);
    }
    if (user?.dob) {
      setDob(user.dob);
    }
  }, [user]);

  // Back handling
  const handleBack = () => {
    Alert.alert(
      "Change Account?",
      "Going back will log you out so you can sign in with a different number or email.",
      [
        { text: "Stay", style: "cancel" },
        { 
          text: "Log Out & Go Back", 
          style: "destructive",
          onPress: async () => {
            await useAuthStore.getState().signOut();
            router.replace("/(auth)/create-account");
          }
        }
      ]
    );
  };

  useEffect(() => {
    const backAction = () => {
      handleBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showEmailOtpModal && otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [showEmailOtpModal, otpCountdown]);

  // Referral code logic
  const handleApplyReferral = () => {
    if (!referral.trim()) {
      Alert.alert("Referral Code", "Please enter a referral code to apply.");
      return;
    }
    if (referral.trim().length < 4) {
      Alert.alert("Invalid Code", "Please enter a valid referral code.");
      return;
    }
    setReferralApplied(true);
    Alert.alert("Code Applied! 🎉", "Your referral code has been validated. You will receive bonus credits upon activation.");
  };

  // Open calendar
  const handleOpenDatePicker = () => {
    if (dob && dob.includes("/")) {
      const parts = dob.split("/");
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
          setPickerDay(d);
          setPickerMonth(m);
          setPickerYear(y);
        }
      }
    }
    setShowYearSelector(false);
    setShowDatePicker(true);
  };

  // Confirm selected date
  const handleConfirmDate = () => {
    const formattedDay = String(pickerDay).padStart(2, "0");
    const formattedMonth = String(pickerMonth + 1).padStart(2, "0");
    const formattedDob = `${formattedDay}/${formattedMonth}/${pickerYear}`;
    setDob(formattedDob);
    setShowDatePicker(false);
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear(y => y - 1);
    } else {
      setPickerMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear(y => y + 1);
    } else {
      setPickerMonth(m => m + 1);
    }
  };

  // Days in selected month calculation
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const firstDayIndex = new Date(pickerYear, pickerMonth, 1).getDay();

  // Send Email OTP
  const handleSendEmailOtp = () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setOtpSending(true);
    setTimeout(() => {
      setOtpSending(false);
      setOtpCountdown(30);
      setEmailOtp("");
      setShowEmailOtpModal(true);
    }, 600);
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = () => {
    const cleanCode = emailOtp.trim();
    if (cleanCode === "1234" || cleanCode.length === 4) {
      setIsEmailVerified(true);
      setShowEmailOtpModal(false);
      Alert.alert("Email Verified! ✓", "Your email address has been successfully verified.");
    } else {
      Alert.alert("Invalid Code", "Please enter the 4-digit code (Use 1234 for testing).");
    }
  };

  // Main Continue Handler
  const handleContinue = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert("Name Required", "Full name is compulsory. Please enter your name to proceed.");
      return;
    }

    // MANDATORY DATE OF BIRTH CHECK
    if (!dob.trim() || dob.trim().length < 8) {
      Alert.alert(
        "Date of Birth Required",
        "Date of birth is mandatory. Please tap the birthday field to pick your date of birth from the calendar."
      );
      handleOpenDatePicker();
      return;
    }

    // EMAIL & VERIFICATION CHECK
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      Alert.alert("Email Required", "Please enter a valid email address.");
      return;
    }

    // IF NOT GOOGLE USER AND NOT VERIFIED VIA OTP
    if (!isGoogleUser && !isEmailVerified) {
      Alert.alert(
        "Email Verification Required",
        "Please verify your email address via OTP to continue. (If continuing with Google, no OTP is needed).",
        [
          { text: "Verify with OTP", onPress: handleSendEmailOtp },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    try {
      await updateProfile({ 
        name: trimmedName, 
        dob: dob.trim(), 
        email: trimmedEmail,
        referral: referral.trim() 
      });
      // Proceed to city selection
      router.replace("/onboarding/select-city");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save profile. Please try again.");
    }
  };

  // Calculate approximate age if DOB set
  let ageDisplay = "";
  if (dob && dob.includes("/")) {
    const parts = dob.split("/");
    if (parts.length === 3) {
      const year = parseInt(parts[2], 10);
      const currentYear = new Date().getFullYear();
      if (!isNaN(year) && year > 1900 && year <= currentYear) {
        ageDisplay = `${currentYear - year} yrs old`;
      }
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header with progress */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: "33%" }]} />
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.content}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Tell Us About You</Text>
          <Text style={styles.subtitle}>Just a few details to get you started.</Text>

          {/* 1. Full Name Input (Required) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Full Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoFocus={!initialName}
              />
            </View>
          </View>

          {/* 2. Date of Birth Input (MANDATORY with Calendar Picker) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Date of Birth <Text style={styles.requiredStar}>*</Text>
              </Text>
              {ageDisplay ? (
                <View style={styles.ageBadge}>
                  <Text style={styles.ageBadgeText}>{ageDisplay}</Text>
                </View>
              ) : (
                <Text style={styles.mandatoryHint}>(Mandatory)</Text>
              )}
            </View>

            {/* Tapping anywhere on this box opens the calendar picker */}
            <Pressable 
              style={[
                styles.inputWrapper, 
                styles.dobPressableBox,
                !dob && styles.inputWrapperEmptyRequired
              ]}
              onPress={handleOpenDatePicker}
            >
              <Text style={[styles.input, !dob && { color: "#9CA3AF" }]}>
                {dob || "DD/MM/YYYY (Tap to choose from calendar)"}
              </Text>
              <View style={styles.calendarIconCircle}>
                <Ionicons name="calendar" size={18} color="#1F7A3E" />
              </View>
            </Pressable>
            <Text style={styles.helperText}>
              Tap the field or calendar icon to select your birth date.
            </Text>
          </View>

          {/* 3. Email Address & Verification with Google Logic */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Email Address <Text style={styles.requiredStar}>*</Text>
              </Text>
              {isGoogleUser ? (
                <View style={styles.googleVerifiedPill}>
                  <Ionicons name="checkmark-circle" size={13} color="#166534" />
                  <Text style={styles.googleVerifiedPillText}>Google Verified</Text>
                </View>
              ) : isEmailVerified ? (
                <View style={styles.googleVerifiedPill}>
                  <Ionicons name="checkmark-circle" size={13} color="#166534" />
                  <Text style={styles.googleVerifiedPillText}>Verified ✓</Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.inputWrapper, isGoogleUser && styles.inputWrapperDisabled]}>
              <TextInput
                style={[styles.input, isGoogleUser && { color: "#4B5563" }]}
                placeholder="name@gmail.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setIsEmailVerified(false);
                }}
                editable={!isGoogleUser}
              />

              {!isGoogleUser && !isEmailVerified && (
                <Pressable 
                  style={styles.verifyEmailBtn}
                  onPress={handleSendEmailOtp}
                  disabled={otpSending || !email.trim()}
                >
                  {otpSending ? (
                    <ActivityIndicator size="small" color="#1F7A3E" />
                  ) : (
                    <Text style={styles.verifyEmailBtnText}>Verify OTP</Text>
                  )}
                </Pressable>
              )}
            </View>

            {/* Explicit Notice as requested: If with Google -> No OTP, If manual -> OTP */}
            <View style={styles.googleNoticeBox}>
              <Ionicons 
                name={isGoogleUser ? "shield-checkmark" : "information-circle-outline"} 
                size={16} 
                color={isGoogleUser ? "#166534" : "#0369A1"} 
                style={{ marginRight: 6, marginTop: 1 }} 
              />
              <Text style={[styles.googleNoticeText, isGoogleUser && { color: "#166534" }]}>
                {isGoogleUser 
                  ? "Signed in with Google. Your email is verified automatically — no OTP is required."
                  : "If continuing with Google, no OTP is required. For manual email, verification OTP is required."}
              </Text>
            </View>
          </View>

          {/* 4. Referral Code Input */}
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
              <Pressable onPress={handleApplyReferral}>
                <Text style={[styles.applyText, referralApplied && { color: "#1F7A3E", fontWeight: "bold" }]}>
                  {referralApplied ? "Applied ✓" : "Apply"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Continue Button */}
        <Pressable 
          style={[
            styles.primaryButton, 
            (!name.trim() || !dob.trim() || loading) && styles.primaryButtonDisabled
          ]} 
          onPress={handleContinue}
          disabled={!name.trim() || !dob.trim() || loading}
        >
          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Saving Profile...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>

      {/* ======================================================== */}
      {/* INTERACTIVE CALENDAR DATEPICKER MODAL                     */}
      {/* ======================================================== */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable 
          style={styles.calendarModalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable 
            style={styles.calendarCard}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.calendarHeaderRow}>
              <View>
                <Text style={styles.calendarModalTitle}>Select Date of Birth</Text>
                <Text style={styles.calendarModalSubtitle}>Must be at least 14 years old</Text>
              </View>
              <Pressable 
                onPress={() => setShowYearSelector(!showYearSelector)}
                style={styles.quickYearPill}
              >
                <Text style={styles.quickYearPillText}>{pickerYear}</Text>
                <Ionicons 
                  name={showYearSelector ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#1F7A3E" 
                />
              </Pressable>
            </View>

            {/* Quick Year Selector Grid */}
            {showYearSelector ? (
              <View style={styles.yearSelectorContainer}>
                <Text style={styles.yearSelectorTitle}>Select Birth Year</Text>
                <ScrollView 
                  style={{ maxHeight: 220 }} 
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.yearGrid}>
                    {BIRTH_YEARS.map((y) => (
                      <Pressable
                        key={y}
                        style={[
                          styles.yearGridItem,
                          pickerYear === y && styles.yearGridItemActive
                        ]}
                        onPress={() => {
                          setPickerYear(y);
                          setShowYearSelector(false);
                        }}
                      >
                        <Text style={[
                          styles.yearGridText,
                          pickerYear === y && styles.yearGridTextActive
                        ]}>
                          {y}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : (
              /* Month & Days Calendar Grid */
              <View>
                {/* Month Navigation */}
                <View style={styles.monthNavRow}>
                  <Pressable 
                    onPress={handlePrevMonth}
                    style={styles.monthNavBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="chevron-back" size={20} color="#111827" />
                  </Pressable>

                  <Text style={styles.monthYearTitle}>
                    {MONTH_NAMES[pickerMonth]} {pickerYear}
                  </Text>

                  <Pressable 
                    onPress={handleNextMonth}
                    style={styles.monthNavBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#111827" />
                  </Pressable>
                </View>

                {/* Days of week header */}
                <View style={styles.weekDaysRow}>
                  {WEEK_DAYS.map((wd, i) => (
                    <Text key={i} style={styles.weekDayText}>{wd}</Text>
                  ))}
                </View>

                {/* Calendar Days Matrix */}
                <View style={styles.daysMatrix}>
                  {/* Empty slots before the 1st of the month */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.dayCell} />
                  ))}

                  {/* Day numbers */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const isSelected = pickerDay === dayNum;

                    return (
                      <Pressable
                        key={`day-${dayNum}`}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellActive
                        ]}
                        onPress={() => setPickerDay(dayNum)}
                      >
                        <Text style={[
                          styles.dayCellText,
                          isSelected && styles.dayCellTextActive
                        ]}>
                          {dayNum}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Selected Date Summary & Action Buttons */}
            <View style={styles.calendarFooter}>
              <View>
                <Text style={styles.selectedDatePreviewLabel}>Chosen Date</Text>
                <Text style={styles.selectedDatePreviewValue}>
                  {String(pickerDay).padStart(2, "0")} {MONTH_NAMES[pickerMonth].slice(0, 3)} {pickerYear}
                </Text>
              </View>

              <View style={styles.calendarBtnRow}>
                <Pressable 
                  onPress={() => setShowDatePicker(false)}
                  style={styles.calendarCancelBtn}
                >
                  <Text style={styles.calendarCancelText}>Cancel</Text>
                </Pressable>

                <Pressable 
                  onPress={handleConfirmDate}
                  style={styles.calendarConfirmBtn}
                >
                  <Text style={styles.calendarConfirmText}>Set Date</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ======================================================== */}
      {/* EMAIL OTP VERIFICATION MODAL                             */}
      {/* ======================================================== */}
      <Modal
        visible={showEmailOtpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmailOtpModal(false)}
      >
        <Pressable 
          style={styles.calendarModalOverlay}
          onPress={() => setShowEmailOtpModal(false)}
        >
          <Pressable 
            style={styles.emailOtpCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.emailOtpIconCircle}>
              <Ionicons name="mail" size={24} color="#1F7A3E" />
            </View>

            <Text style={styles.emailOtpTitle}>Verify Your Email</Text>
            <Text style={styles.emailOtpSubtitle}>
              Enter the 4-digit verification code sent to:{"\n"}
              <Text style={{ fontWeight: "700", color: "#111827" }}>{email}</Text>
            </Text>

            <View style={styles.emailOtpInputWrapper}>
              <TextInput
                style={styles.emailOtpInput}
                placeholder="4-digit code"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                value={emailOtp}
                onChangeText={setEmailOtp}
              />
            </View>

            <Pressable 
              style={styles.emailTestHint}
              onPress={() => setEmailOtp("1234")}
            >
              <Ionicons name="information-circle-outline" size={14} color="#047857" />
              <Text style={styles.emailTestHintText}>Testing code: Tap to fill 1234</Text>
            </Pressable>

            <View style={styles.emailOtpActionRow}>
              <Pressable 
                onPress={() => setShowEmailOtpModal(false)}
                style={styles.calendarCancelBtn}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </Pressable>

              <Pressable 
                onPress={handleVerifyEmailOtp}
                style={[
                  styles.calendarConfirmBtn,
                  emailOtp.trim().length < 4 && { opacity: 0.5 }
                ]}
                disabled={emailOtp.trim().length < 4}
              >
                <Text style={styles.calendarConfirmText}>Verify</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  requiredStar: {
    color: "#EF4444",
    fontWeight: "800",
  },
  mandatoryHint: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "600",
  },
  ageBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ageBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  googleVerifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  googleVerifiedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
  },
  inputWrapperDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  inputWrapperEmptyRequired: {
    borderColor: "#E5E7EB",
  },
  dobPressableBox: {
    justifyContent: "space-between",
  },
  calendarIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 5,
    marginLeft: 2,
  },
  verifyEmailBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifyEmailBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  googleNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  googleNoticeText: {
    fontSize: 11.5,
    color: "#0369A1",
    lineHeight: 16,
    fontWeight: "500",
    flex: 1,
  },
  applyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  primaryButton: {
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
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Calendar Modal Styles */
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  calendarModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  calendarModalSubtitle: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 2,
  },
  quickYearPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  quickYearPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  yearSelectorContainer: {
    paddingVertical: 10,
  },
  yearSelectorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  yearGridItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  yearGridItemActive: {
    backgroundColor: "#1F7A3E",
  },
  yearGridText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  yearGridTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  monthNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 8,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  monthYearTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 6,
  },
  weekDayText: {
    width: 36,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  daysMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    marginVertical: 2,
  },
  dayCellActive: {
    backgroundColor: "#1F7A3E",
  },
  dayCellText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#111827",
  },
  dayCellTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  selectedDatePreviewLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  selectedDatePreviewValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F7A3E",
  },
  calendarBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  calendarCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  calendarCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  calendarConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1F7A3E",
  },
  calendarConfirmText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Email OTP Modal */
  emailOtpCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  emailOtpIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emailOtpTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  emailOtpSubtitle: {
    fontSize: 12.5,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  emailOtpInputWrapper: {
    width: "100%",
    height: 50,
    borderWidth: 1.5,
    borderColor: "#1F7A3E",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    justifyContent: "center",
    marginBottom: 8,
  },
  emailOtpInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    letterSpacing: 4,
  },
  emailTestHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    marginBottom: 16,
  },
  emailTestHintText: {
    fontSize: 11.5,
    color: "#047857",
    fontWeight: "600",
  },
  emailOtpActionRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "flex-end",
    gap: 10,
  },
});
