import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { requestGoogleIdToken } from "@/lib/googleAuth";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";

const PHONE_OK = /^[6-9]\d{9}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function digitsOnly(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function dobStatus(day: string, month: string, year: string): "incomplete" | "invalid" | "young" | "ok" {
  if (!day || !month || year.length < 4) return "incomplete";
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d ||
    y < 1900 ||
    date > today
  ) {
    return "invalid";
  }
  const adultOn = new Date(y + 18, m - 1, d);
  return adultOn <= new Date() ? "ok" : "young";
}

function isRealEmail(value?: string | null) {
  if (!value) return false;
  const email = value.trim().toLowerCase();
  return EMAIL_OK.test(email) && !email.endsWith("@zonofit.com");
}

export default function CreateAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const sendOTP = useAuthStore((state) => state.sendOTP);
  const verifyOTP = useAuthStore((state) => state.verifyOTP);
  const checkUserExists = useAuthStore((state) => state.checkUserExists);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const googleSignIn = useAuthStore((state) => state.googleSignIn);
  const { startGuestSession, isGuest, endGuestSession } = useGuestStore();

  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpOpen, setPhoneOtpOpen] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneHint, setPhoneHint] = useState("Needed for gym check-in and passes.");
  const [phoneBad, setPhoneBad] = useState(false);
  const [phoneResend, setPhoneResend] = useState(0);
  const [phoneBusy, setPhoneBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailFromGoogle, setEmailFromGoogle] = useState(false);
  const [emailOtpOpen, setEmailOtpOpen] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailHint, setEmailHint] = useState("For receipts and account recovery.");
  const [emailBad, setEmailBad] = useState(false);
  const [emailResend, setEmailResend] = useState(0);
  const [emailBusy, setEmailBusy] = useState(false);

  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [referralOpen, setReferralOpen] = useState(false);
  const [referral, setReferral] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralHint, setReferralHint] = useState("");
  const [referralBad, setReferralBad] = useState(false);
  const [referralBusy, setReferralBusy] = useState(false);

  const [googleBusy, setGoogleBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [done, setDone] = useState<{ title: string; sub: string } | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const prefilled = useRef(false);
  const leaving = useRef(false);

  useEffect(() => {
    if (params.mode === "signin") {
      router.replace({ pathname: "/(auth)/verify-number", params: { mode: "signin" } });
    }
  }, [params.mode, router]);

  useEffect(() => {
    if (isGuest) void endGuestSession();
  }, [endGuestSession, isGuest]);

  useEffect(() => {
    if (phoneResend <= 0) return;
    const timer = setTimeout(() => setPhoneResend((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [phoneResend]);

  useEffect(() => {
    if (emailResend <= 0) return;
    const timer = setTimeout(() => setEmailResend((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [emailResend]);

  useEffect(() => {
    if (!token || prefilled.current) return;
    prefilled.current = true;
    apiFetch("/api/users/me", { token, silent: true })
      .then((me) => {
        if (!me) return;
        const savedPhone = String(me.phone || "").replace(/\D/g, "").slice(-10);
        if (PHONE_OK.test(savedPhone)) {
          setPhone(savedPhone);
          setPhoneVerified(true);
          setPhoneHint("");
        }
        if (isRealEmail(me.email)) {
          setEmail(String(me.email).trim().toLowerCase());
          setEmailVerified(true);
          setEmailHint(user?.authMethod === "google" ? "Verified by Google. No code needed." : "");
          if (user?.authMethod === "google") setEmailFromGoogle(true);
        }
        if (me.name && me.name !== "ZonoFit Member" && me.name !== "Google User") {
          setName((current) => (current.trim().length > 1 ? current : me.name));
        }
        if (typeof me.dob === "string" && me.dob.includes("/")) {
          const [savedDay, savedMonth, savedYear] = me.dob.split("/");
          setDay(savedDay || "");
          setMonth(savedMonth || "");
          setYear(savedYear || "");
        }
        if (me.referralApplied) {
          setReferralOpen(true);
          setReferralApplied(true);
          setReferral("Applied");
        }
      })
      .catch(() => {});
  }, [token, user?.authMethod]);

  const birth = dobStatus(day, month, year);
  const nameOk = name.trim().length > 1;
  const phoneOk = PHONE_OK.test(phone);
  const emailOk = EMAIL_OK.test(email.trim().toLowerCase());
  const steps = useMemo(
    () => [phoneVerified, emailVerified, nameOk, birth === "ok"],
    [phoneVerified, emailVerified, nameOk, birth],
  );
  const stepsLeft = steps.filter((ready) => !ready).length;

  const dobHint =
    birth === "invalid"
      ? "That date doesn't look right."
      : birth === "young"
        ? "You need to be 18 or older to join."
        : "You need to be 18 or older.";

  const goSignIn = () => {
    router.push({ pathname: "/(auth)/verify-number", params: { mode: "signin" } });
  };

  const offerSignIn = (number: string) => {
    Alert.alert(
      "Account already exists",
      `+91 ${number} is already registered.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign in",
          onPress: () => {
            router.push({
              pathname: "/(auth)/verify-number",
              params: { mode: "signin", phone: number },
            });
          },
        },
      ],
    );
  };

  const sendPhoneCode = async () => {
    if (!phoneOk || phoneVerified || phoneBusy) return;
    setPhoneBusy(true);
    setPhoneBad(false);
    try {
      const mine = (user?.phone || "").replace(/\D/g, "").slice(-10) === phone;
      if (!mine) {
        const existing = await checkUserExists(phone);
        if (existing.phoneExists) {
          offerSignIn(phone);
          return;
        }
        await sendOTP(phone, false);
      } else {
        setPhoneVerified(true);
        setPhoneHint("");
        return;
      }
      setPhoneCode("");
      setPhoneOtpOpen(true);
      setPhoneResend(30);
      setPhoneHint(`Code sent to +91 ${phone}`);
    } catch (error: any) {
      setPhoneBad(true);
      setPhoneHint(error?.message || "Couldn't send the code.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const confirmPhone = async () => {
    if (phoneCode.length !== 4 || phoneBusy) return;
    setPhoneBusy(true);
    setPhoneBad(false);
    try {
      const sessionToken = useAuthStore.getState().token;
      const ok = await verifyOTP(phoneCode, false, { attachPhone: !!sessionToken });
      if (!ok) {
        setPhoneBad(true);
        setPhoneHint(useAuthStore.getState().error || "That code is not valid.");
        return;
      }
      setPhoneVerified(true);
      setPhoneOtpOpen(false);
      setPhoneResend(0);
      setPhoneHint("");
    } finally {
      setPhoneBusy(false);
    }
  };

  const sendEmailCode = async () => {
    if (!emailOk || emailVerified || emailBusy || emailFromGoogle) return;
    const sessionToken = useAuthStore.getState().token;
    if (!sessionToken) {
      setEmailBad(true);
      setEmailHint("Verify your mobile first.");
      return;
    }
    setEmailBusy(true);
    setEmailBad(false);
    try {
      await apiFetch("/api/auth/email-otp/send", {
        method: "POST",
        token: sessionToken,
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setEmailCode("");
      setEmailOtpOpen(true);
      setEmailResend(5 * 60);
      setEmailHint("Code sent to your email");
    } catch (error: any) {
      if (typeof error?.retryAfterSeconds === "number" && error.retryAfterSeconds > 0) {
        setEmailResend(error.retryAfterSeconds);
        setEmailOtpOpen(true);
      }
      setEmailBad(true);
      setEmailHint(error?.message || "Couldn't send the code.");
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmail = async () => {
    if (emailCode.length !== 4 || emailBusy) return;
    const sessionToken = useAuthStore.getState().token;
    if (!sessionToken) {
      setEmailHint("Verify your mobile first.");
      setEmailBad(true);
      return;
    }
    setEmailBusy(true);
    setEmailBad(false);
    try {
      await apiFetch("/api/auth/email-otp/verify", {
        method: "POST",
        token: sessionToken,
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: emailCode }),
      });
      setEmailVerified(true);
      setEmailOtpOpen(false);
      setEmailResend(0);
      setEmailHint("");
    } catch (error: any) {
      setEmailBad(true);
      setEmailHint(error?.message || "That code is not valid.");
    } finally {
      setEmailBusy(false);
    }
  };

  const applyReferral = async () => {
    const code = referral.trim().toUpperCase();
    if (!code || referralApplied || referralBusy) return;
    const sessionToken = useAuthStore.getState().token;
    if (!sessionToken) {
      setReferralBad(true);
      setReferralHint("Verify your mobile first, then apply the code.");
      return;
    }
    setReferralBusy(true);
    setReferralBad(false);
    try {
      await apiFetch("/api/users/referral/apply", {
        method: "POST",
        token: sessionToken,
        body: JSON.stringify({ code }),
      });
      setReferral(code);
      setReferralApplied(true);
      setReferralHint("");
    } catch (error: any) {
      setReferralBad(true);
      setReferralHint(error?.message || "That referral code isn't valid.");
    } finally {
      setReferralBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const idToken = await requestGoogleIdToken();
      const code = referralApplied ? referral.trim().toUpperCase() : undefined;
      const result = await googleSignIn(idToken, code);
      if (result?.isOnboarded) {
        router.replace("/(tabs)");
        return;
      }
      const signedIn = useAuthStore.getState().user;
      const googleEmail = signedIn?.email?.trim().toLowerCase() || "";
      if (isRealEmail(googleEmail)) {
        setEmail(googleEmail);
        setEmailVerified(true);
        setEmailFromGoogle(true);
        setEmailOtpOpen(false);
        setEmailBad(false);
        setEmailHint("Verified by Google. No code needed.");
      }
      const googleName = signedIn?.username || "";
      if (
        googleName &&
        googleName !== "Google User" &&
        googleName !== "ZonoFit Member" &&
        name.trim().length < 2
      ) {
        setName(googleName);
      }
      const savedPhone = (signedIn?.phone || "").replace(/\D/g, "").slice(-10);
      if (PHONE_OK.test(savedPhone)) {
        setPhone(savedPhone);
        setPhoneVerified(true);
        setPhoneHint("");
      }
    } catch (error: any) {
      const message = error?.message || "Google sign-in failed.";
      if (!/closed before/i.test(message)) {
        Alert.alert("Google", message);
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  const createAccount = async () => {
    if (stepsLeft > 0 || submitting || leaving.current) return;
    setSubmitting(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        dob: `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`,
      });
      leaving.current = true;
      setDone({ title: "Welcome to Zonofit", sub: "Next: pick your first gym." });
      setTimeout(() => router.replace("/onboarding/select-city"), 800);
    } catch (error: any) {
      Alert.alert("Couldn't create the account", error?.message || "Try again.");
      setSubmitting(false);
    }
  };

  const browseAsGuest = async () => {
    if (guestBusy || leaving.current) return;
    setGuestBusy(true);
    leaving.current = true;
    setDone({ title: "Browsing as guest", sub: "You can look around partner gyms." });
    try {
      await useAuthStore.getState().signOut();
      await startGuestSession();
    } catch {
      // The guest session still opens if sign-out already cleared the account.
    }
    setTimeout(() => router.replace("/(tabs)"), 700);
  };

  const boxStyle = (key: string, locked: boolean, bad: boolean) => [
    styles.box,
    focus === key && styles.boxFocus,
    locked && styles.boxLocked,
    bad && styles.boxBad,
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.top}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>Z</Text>
            </View>
            <Text style={styles.logoText}>Zonofit</Text>
          </View>
          <Pressable onPress={goSignIn} hitSlop={8}>
            <Text style={styles.signIn}>Sign in</Text>
          </Pressable>
        </View>

        {done ? (
          <View style={styles.done}>
            <View style={styles.tick}>
              <Ionicons name="checkmark" size={34} color="#FFFFFF" />
            </View>
            <Text style={styles.doneTitle}>{done.title}</Text>
            <Text style={styles.sub}>{done.sub}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Pay per visit.{"\n"}Not per month.</Text>
            <Text style={styles.sub}>Create your account in under a minute.</Text>

            <Pressable
              style={({ pressed }) => [styles.google, pressed && styles.pressed]}
              onPress={continueWithGoogle}
              disabled={googleBusy}
            >
              {googleBusy ? (
                <ActivityIndicator color="#0F2417" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or fill in your details</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mobile number</Text>
              <View style={boxStyle("phone", phoneVerified, phoneBad && !phoneVerified)}>
                <Text style={styles.code}>🇮🇳 +91</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  editable={!phoneVerified}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="10-digit number"
                  placeholderTextColor="#8A978E"
                  onFocus={() => setFocus("phone")}
                  onBlur={() => setFocus(null)}
                  onChangeText={(value) => {
                    setPhone(digitsOnly(value, 10));
                    setPhoneOtpOpen(false);
                    setPhoneCode("");
                    setPhoneBad(false);
                    setPhoneHint("Needed for gym check-in and passes.");
                  }}
                />
                {phoneVerified ? (
                  <Text style={styles.verified}>✓ Verified</Text>
                ) : (
                  <Pressable
                    style={[styles.chip, (!phoneOk || phoneBusy) && styles.chipDisabled]}
                    onPress={sendPhoneCode}
                    disabled={!phoneOk || phoneBusy}
                  >
                    <Text style={styles.chipText}>{phoneBusy && !phoneOtpOpen ? "..." : "Send OTP"}</Text>
                  </Pressable>
                )}
              </View>
              {phoneOtpOpen && !phoneVerified ? (
                <View style={[boxStyle("phoneCode", false, phoneBad), styles.otpBox]}>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    value={phoneCode}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="4-digit code"
                    placeholderTextColor="#8A978E"
                    textContentType="oneTimeCode"
                    onFocus={() => setFocus("phoneCode")}
                    onBlur={() => setFocus(null)}
                    onChangeText={(value) => setPhoneCode(digitsOnly(value, 4))}
                  />
                  <Pressable
                    style={[styles.chip, (phoneCode.length !== 4 || phoneBusy) && styles.chipDisabled]}
                    onPress={confirmPhone}
                    disabled={phoneCode.length !== 4 || phoneBusy}
                  >
                    <Text style={styles.chipText}>Verify</Text>
                  </Pressable>
                </View>
              ) : null}
              <Text style={[styles.hint, phoneBad && styles.hintBad]}>
                {phoneHint}
                {phoneOtpOpen && !phoneVerified && phoneResend > 0 ? `  Resend in ${phoneResend}s` : ""}
                {phoneOtpOpen && !phoneVerified && phoneResend <= 0 ? "  " : ""}
                {phoneOtpOpen && !phoneVerified && phoneResend <= 0 ? (
                  <Text style={styles.hintLink} onPress={sendPhoneCode}>Resend</Text>
                ) : null}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={boxStyle("email", emailVerified, emailBad && !emailVerified)}>
                <TextInput
                  style={styles.input}
                  value={email}
                  editable={!emailVerified}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="name@gmail.com"
                  placeholderTextColor="#8A978E"
                  onFocus={() => setFocus("email")}
                  onBlur={() => setFocus(null)}
                  onChangeText={(value) => {
                    if (emailFromGoogle) return;
                    setEmail(value.replace(/\s/g, ""));
                    setEmailVerified(false);
                    setEmailOtpOpen(false);
                    setEmailCode("");
                    setEmailBad(false);
                    setEmailHint("For receipts and account recovery.");
                  }}
                />
                {emailVerified ? (
                  <Text style={styles.verified}>✓ Verified</Text>
                ) : (
                  <Pressable
                    style={[styles.chip, (!emailOk || emailBusy) && styles.chipDisabled]}
                    onPress={sendEmailCode}
                    disabled={!emailOk || emailBusy}
                  >
                    <Text style={styles.chipText}>{emailBusy && !emailOtpOpen ? "..." : "Verify"}</Text>
                  </Pressable>
                )}
              </View>
              {emailOtpOpen && !emailVerified ? (
                <View style={[boxStyle("emailCode", false, emailBad), styles.otpBox]}>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    value={emailCode}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="4-digit code"
                    placeholderTextColor="#8A978E"
                    textContentType="oneTimeCode"
                    onFocus={() => setFocus("emailCode")}
                    onBlur={() => setFocus(null)}
                    onChangeText={(value) => setEmailCode(digitsOnly(value, 4))}
                  />
                  <Pressable
                    style={[styles.chip, (emailCode.length !== 4 || emailBusy) && styles.chipDisabled]}
                    onPress={confirmEmail}
                    disabled={emailCode.length !== 4 || emailBusy}
                  >
                    <Text style={styles.chipText}>Confirm</Text>
                  </Pressable>
                </View>
              ) : null}
              <Text style={[styles.hint, emailBad && styles.hintBad]}>
                {emailHint}
                {emailOtpOpen && !emailVerified && emailResend > 0
                  ? `  Resend in ${emailResend >= 60 ? `${Math.ceil(emailResend / 60)}m` : `${emailResend}s`}`
                  : ""}
                {emailOtpOpen && !emailVerified && emailResend <= 0 ? (
                  <Text style={styles.hintLink} onPress={sendEmailCode}> Resend</Text>
                ) : null}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <View style={boxStyle("name", false, false)}>
                <TextInput
                  style={styles.input}
                  value={name}
                  autoCapitalize="words"
                  placeholder="As on your ID"
                  placeholderTextColor="#8A978E"
                  onFocus={() => setFocus("name")}
                  onBlur={() => setFocus(null)}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date of birth</Text>
              <View style={styles.dobRow}>
                <View style={[boxStyle("day", false, birth === "invalid" || birth === "young"), styles.dobBox]}>
                  <TextInput
                    ref={dayRef}
                    style={styles.dobInput}
                    value={day}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="DD"
                    placeholderTextColor="#8A978E"
                    onFocus={() => setFocus("day")}
                    onBlur={() => setFocus(null)}
                    onChangeText={(value) => {
                      const next = digitsOnly(value, 2);
                      setDay(next);
                      if (next.length === 2) monthRef.current?.focus();
                    }}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace" && !day) dayRef.current?.focus();
                    }}
                  />
                </View>
                <View style={[boxStyle("month", false, birth === "invalid" || birth === "young"), styles.dobBox]}>
                  <TextInput
                    ref={monthRef}
                    style={styles.dobInput}
                    value={month}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                    placeholderTextColor="#8A978E"
                    onFocus={() => setFocus("month")}
                    onBlur={() => setFocus(null)}
                    onChangeText={(value) => {
                      const next = digitsOnly(value, 2);
                      setMonth(next);
                      if (next.length === 2) yearRef.current?.focus();
                    }}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace" && !month) dayRef.current?.focus();
                    }}
                  />
                </View>
                <View style={[boxStyle("year", false, birth === "invalid" || birth === "young"), styles.yearBox]}>
                  <TextInput
                    ref={yearRef}
                    style={styles.dobInput}
                    value={year}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="YYYY"
                    placeholderTextColor="#8A978E"
                    onFocus={() => setFocus("year")}
                    onBlur={() => setFocus(null)}
                    onChangeText={(value) => setYear(digitsOnly(value, 4))}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace" && !year) monthRef.current?.focus();
                    }}
                  />
                </View>
              </View>
              <Text style={[styles.hint, (birth === "invalid" || birth === "young") && styles.hintBad]}>{dobHint}</Text>
            </View>

            <View style={styles.field}>
              {referralOpen ? (
                <>
                  <View style={boxStyle("referral", referralApplied, referralBad)}>
                    <TextInput
                      style={styles.input}
                      value={referral}
                      editable={!referralApplied}
                      autoCapitalize="characters"
                      placeholder="Enter code"
                      placeholderTextColor="#8A978E"
                      onFocus={() => setFocus("referral")}
                      onBlur={() => setFocus(null)}
                      onChangeText={(value) => {
                        setReferral(value.toUpperCase());
                        setReferralApplied(false);
                        setReferralBad(false);
                        setReferralHint("");
                      }}
                    />
                    <Pressable
                      style={[styles.chip, (referralApplied || referralBusy || !referral.trim()) && styles.chipDisabled]}
                      onPress={applyReferral}
                      disabled={referralApplied || referralBusy || !referral.trim()}
                    >
                      <Text style={styles.chipText}>{referralApplied ? "Applied" : "Apply"}</Text>
                    </Pressable>
                  </View>
                  {referralHint ? <Text style={[styles.hint, referralBad && styles.hintBad]}>{referralHint}</Text> : null}
                </>
              ) : (
                <Pressable onPress={() => setReferralOpen(true)} hitSlop={6}>
                  <Text style={styles.referralLink}>Have a referral code?</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        )}

        {done ? null : (
          <View style={styles.dock}>
            <View style={styles.progress}>
              {steps.map((on, index) => (
                <View key={index} style={[styles.bar, on && styles.barOn]} />
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.cta,
                (stepsLeft > 0 || submitting) && styles.ctaDisabled,
                pressed && stepsLeft === 0 && styles.pressed,
              ]}
              onPress={createAccount}
              disabled={stepsLeft > 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaText}>
                  {stepsLeft > 0 ? `${stepsLeft} ${stepsLeft === 1 ? "step" : "steps"} left` : "Create account"}
                </Text>
              )}
            </Pressable>
            <Text style={styles.legal}>
              By continuing you agree to our{" "}
              <Text
                style={styles.legalLink}
                onPress={() =>
                  router.push({ pathname: "/content", params: { type: "terms_and_conditions", title: "Terms & Conditions" } } as any)
                }
              >
                Terms
              </Text>
              {" "}and{" "}
              <Text
                style={styles.legalLink}
                onPress={() =>
                  router.push({ pathname: "/content", params: { type: "privacy_policy", title: "Privacy Policy" } } as any)
                }
              >
                Privacy Policy
              </Text>
              .
            </Text>
            <Pressable onPress={browseAsGuest} disabled={guestBusy}>
              <Text style={styles.guest}>Explore as guest</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7F2" },
  top: {
    height: 44,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#2F7D1F",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  logoText: { color: "#0F2417", fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  signIn: { color: "#5E6F63", fontSize: 14, fontWeight: "500", paddingVertical: 10, paddingHorizontal: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 12 },
  title: {
    marginTop: 26,
    marginBottom: 8,
    color: "#0F2417",
    fontSize: 34,
    lineHeight: 37,
    fontWeight: "700",
    letterSpacing: -1,
  },
  sub: { color: "#5E6F63", fontSize: 16, lineHeight: 23, marginBottom: 22 },
  google: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#DFE6DB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleText: { color: "#0F2417", fontSize: 16, fontWeight: "600" },
  pressed: { transform: [{ scale: 0.985 }] },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#DFE6DB" },
  dividerText: { color: "#5E6F63", fontSize: 13 },
  field: { marginBottom: 16 },
  label: { color: "#0F2417", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  box: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#DFE6DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  boxFocus: { borderColor: "#2F7D1F" },
  boxLocked: { backgroundColor: "#E6F2DF", borderColor: "transparent" },
  boxBad: { borderColor: "#B3261E" },
  otpBox: { marginTop: 8 },
  code: {
    color: "#0F2417",
    fontWeight: "600",
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: "#DFE6DB",
  },
  input: { flex: 1, minWidth: 0, color: "#0F2417", fontSize: 17, fontWeight: "500", paddingVertical: 12 },
  otpInput: { textAlign: "center", letterSpacing: 4, fontWeight: "600" },
  chip: { backgroundColor: "#E6F2DF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: "#2F7D1F", fontSize: 14, fontWeight: "600" },
  verified: { color: "#2F7D1F", fontSize: 13, fontWeight: "600" },
  hint: { color: "#5E6F63", fontSize: 13, marginTop: 6, marginHorizontal: 2 },
  hintBad: { color: "#B3261E" },
  hintLink: { color: "#2F7D1F", fontWeight: "600" },
  dobRow: { flexDirection: "row", gap: 8 },
  dobBox: { flex: 1 },
  yearBox: { flex: 1.5 },
  dobInput: {
    flex: 1,
    textAlign: "center",
    color: "#0F2417",
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 14,
  },
  referralLink: { color: "#2F7D1F", fontSize: 14, fontWeight: "600", paddingVertical: 4 },
  dock: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: "#F5F7F2",
  },
  progress: { flexDirection: "row", gap: 6, marginBottom: 10 },
  bar: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#DFE6DB" },
  barOn: { backgroundColor: "#2F7D1F" },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2F7D1F",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.35 },
  ctaText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  legal: { textAlign: "center", color: "#5E6F63", fontSize: 12, marginTop: 8, marginBottom: 2 },
  legalLink: { color: "#0F2417", textDecorationLine: "underline" },
  guest: { textAlign: "center", color: "#0F2417", fontSize: 15, fontWeight: "600", paddingVertical: 12 },
  done: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  tick: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2F7D1F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  doneTitle: { color: "#0F2417", fontSize: 28, fontWeight: "700", marginBottom: 6, textAlign: "center" },
});
