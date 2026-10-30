import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { requestGoogleIdToken } from "@/lib/googleAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";

const PHONE_OK = /^[6-9]\d{9}$/;
const CODE_LENGTH = 4;

function formatPhone(digits: string) {
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export default function VerifyNumberScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; autoSend?: string }>();
  const sendOTP = useAuthStore((state) => state.sendOTP);
  const verifyOTP = useAuthStore((state) => state.verifyOTP);
  const googleSignIn = useAuthStore((state) => state.googleSignIn);
  const startGuestSession = useGuestStore((state) => state.startGuestSession);

  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [phone, setPhone] = useState((params.phone || "").replace(/\D/g, "").slice(0, 10));
  const [phoneHint, setPhoneHint] = useState("");
  const [phoneBad, setPhoneBad] = useState(false);
  const [sending, setSending] = useState(false);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [codeHint, setCodeHint] = useState("");
  const [codeBad, setCodeBad] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [doneTitle, setDoneTitle] = useState("You're signed in");
  const [doneSub, setDoneSub] = useState("Taking you to gyms near you.");
  const [nextHref, setNextHref] = useState<"/(tabs)" | "/(auth)/create-account">("/(tabs)");
  const [focus, setFocus] = useState<string | null>(null);

  const boxRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  const sentOnce = useRef(false);
  const leaving = useRef(false);

  const phoneOk = PHONE_OK.test(phone);
  const code = digits.join("");

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (params.autoSend === "1" && phoneOk && !sentOnce.current) {
      sentOnce.current = true;
      void requestCode(phone);
    }
    // The number from the previous screen is sent once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "code") {
        changeNumber();
        return true;
      }
      if (step === "done") {
        finish();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  });

  const openSignedIn = (isOnboarded: boolean) => {
    setDoneTitle("You're signed in");
    setDoneSub(isOnboarded ? "Taking you to gyms near you." : "Next: finish your account.");
    setNextHref(isOnboarded ? "/(tabs)" : "/(auth)/create-account");
    setStep("done");
  };

  const requestCode = async (number: string) => {
    if (!PHONE_OK.test(number) || sending) return;
    setSending(true);
    setPhoneBad(false);
    setPhoneHint("");
    try {
      await sendOTP(number, true);
      setDigits(["", "", "", ""]);
      setCodeBad(false);
      setCodeHint("");
      setResendIn(30);
      setStep("code");
      setTimeout(() => boxRefs.current[0]?.focus(), 120);
    } catch (error: any) {
      const message = error?.message || "Couldn't send the code.";
      const missing = /not found|no user/i.test(message);
      setPhoneBad(true);
      setPhoneHint(missing ? "No account for this number yet. Create one below." : message);
    } finally {
      setSending(false);
    }
  };

  const changeNumber = () => {
    setStep("phone");
    setDigits(["", "", "", ""]);
    setCodeBad(false);
    setCodeHint("");
    setResendIn(0);
  };

  const resend = async () => {
    if (resendIn > 0 || sending) return;
    setSending(true);
    setCodeBad(false);
    try {
      await sendOTP(phone, true);
      setDigits(["", "", "", ""]);
      setResendIn(30);
      setCodeHint("New code sent.");
      boxRefs.current[0]?.focus();
    } catch (error: any) {
      setCodeBad(true);
      setCodeHint(error?.message || "Couldn't send a new code.");
    } finally {
      setSending(false);
    }
  };

  const writeDigits = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    setCodeBad(false);
    if (codeHint === "New code sent.") setCodeHint("");
    if (clean.length > 1) {
      const next = [...digits];
      clean.slice(0, CODE_LENGTH - index).split("").forEach((char, offset) => {
        next[index + offset] = char;
      });
      setDigits(next);
      const focusAt = Math.min(index + clean.length, CODE_LENGTH - 1);
      boxRefs.current[focusAt]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean.slice(-1);
    setDigits(next);
    if (clean && index < CODE_LENGTH - 1) boxRefs.current[index + 1]?.focus();
  };

  const onDigitKey = (index: number, key: string) => {
    if (key !== "Backspace" || digits[index] || index === 0) return;
    const next = [...digits];
    next[index - 1] = "";
    setDigits(next);
    boxRefs.current[index - 1]?.focus();
  };

  const signInWithCode = async () => {
    if (code.length !== CODE_LENGTH || verifying) return;
    setVerifying(true);
    setCodeBad(false);
    try {
      const ok = await verifyOTP(code, true);
      if (!ok) {
        setCodeBad(true);
        setCodeHint(useAuthStore.getState().error || "That code is not valid.");
        return;
      }
      openSignedIn(useAuthStore.getState().isOnboarded);
    } finally {
      setVerifying(false);
    }
  };

  const continueWithGoogle = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const idToken = await requestGoogleIdToken();
      const result = await googleSignIn(idToken);
      openSignedIn(Boolean(result?.isOnboarded));
    } catch (error: any) {
      const message = error?.message || "Google sign-in failed.";
      if (!/closed before/i.test(message)) {
        setPhoneBad(true);
        setPhoneHint(message);
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  const browseAsGuest = async () => {
    if (guestBusy || leaving.current) return;
    setGuestBusy(true);
    try {
      await useAuthStore.getState().signOut();
      await startGuestSession();
      setDoneTitle("Browsing as guest");
      setDoneSub("You can look around partner gyms.");
      setNextHref("/(tabs)");
      setStep("done");
    } catch (error: any) {
      setPhoneBad(true);
      setPhoneHint(error?.message || "Couldn't start a guest visit.");
      setGuestBusy(false);
    }
  };

  const finish = () => {
    if (leaving.current) return;
    leaving.current = true;
    router.replace(nextHref);
  };

  const onPhoneChange = (value: string) => {
    const next = value.replace(/\D/g, "").slice(0, 10);
    setPhone(next);
    const bad = next.length === 10 && !PHONE_OK.test(next);
    setPhoneBad(bad);
    setPhoneHint(bad ? "Indian mobile numbers start with 6, 7, 8 or 9." : "");
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.top}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>Z</Text>
            </View>
            <Text style={styles.logoText}>Zonofit</Text>
          </View>
          <Pressable onPress={browseAsGuest} hitSlop={8} disabled={guestBusy}>
            <Text style={styles.guestLink}>Browse as guest</Text>
          </Pressable>
        </View>

        <View style={styles.main}>
          {step === "phone" ? (
            <View>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.sub}>Sign in with your mobile number.</Text>
              <View style={[styles.field, focus === "phone" && styles.fieldFocus, phoneBad && styles.fieldBad]}>
                <Text style={styles.code}>🇮🇳 +91</Text>
                <TextInput
                  style={styles.phoneInput}
                  value={formatPhone(phone)}
                  keyboardType="number-pad"
                  maxLength={11}
                  placeholder="98765 43210"
                  placeholderTextColor="#8A978E"
                  autoFocus
                  onFocus={() => setFocus("phone")}
                  onBlur={() => setFocus(null)}
                  onChangeText={onPhoneChange}
                />
              </View>
              <Text style={[styles.hint, phoneBad && styles.hintBad]}>{phoneHint}</Text>
              <Pressable
                style={({ pressed }) => [styles.primary, (!phoneOk || sending) && styles.primaryDisabled, pressed && phoneOk && styles.pressed]}
                onPress={() => requestCode(phone)}
                disabled={!phoneOk || sending}
              >
                {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Get OTP</Text>}
              </Pressable>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
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
            </View>
          ) : null}

          {step === "code" ? (
            <View>
              <Pressable style={styles.back} onPress={changeNumber} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color="#5E6F63" />
                <Text style={styles.backText}>Change number</Text>
              </Pressable>
              <Text style={styles.title}>Enter the code</Text>
              <Text style={styles.sub}>We sent a 4-digit code to +91 {formatPhone(phone)}</Text>
              <View style={styles.otpRow}>
                {digits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(node) => {
                      boxRefs.current[index] = node;
                    }}
                    style={[styles.otpBox, codeBad && styles.otpBad, focus === `d${index}` && styles.otpFocus]}
                    value={digit}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? 4 : 1}
                    textContentType={index === 0 ? "oneTimeCode" : "none"}
                    onFocus={() => setFocus(`d${index}`)}
                    onBlur={() => setFocus(null)}
                    onChangeText={(value) => writeDigits(index, value)}
                    onKeyPress={({ nativeEvent }) => onDigitKey(index, nativeEvent.key)}
                  />
                ))}
              </View>
              <Text style={[styles.hint, codeBad && styles.hintBad]}>
                {codeBad ? codeHint : resendIn > 0 ? `${codeHint ? `${codeHint} ` : ""}Resend in ${resendIn}s` : codeHint}
                {!codeBad && resendIn <= 0 ? (
                  <Text style={styles.hintLink} onPress={resend}>
                    {codeHint ? " " : ""}Didn't get it? Resend code
                  </Text>
                ) : null}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.primary,
                  (code.length !== CODE_LENGTH || verifying) && styles.primaryDisabled,
                  pressed && code.length === CODE_LENGTH && styles.pressed,
                ]}
                onPress={signInWithCode}
                disabled={code.length !== CODE_LENGTH || verifying}
              >
                {verifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Sign in</Text>}
              </Pressable>
            </View>
          ) : null}

          {step === "done" ? (
            <View style={styles.done}>
              <View style={styles.tick}>
                <Ionicons name="checkmark" size={34} color="#FFFFFF" />
              </View>
              <Text style={styles.doneTitle}>{doneTitle}</Text>
              <Text style={styles.doneSub}>{doneSub}</Text>
              <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={finish}>
                <Text style={styles.primaryText}>Continue</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {step === "done" ? <View /> : (
          <Text style={styles.foot}>
            New to Zonofit?{" "}
            <Text style={styles.footLink} onPress={() => router.replace("/(auth)/create-account")}>
              Create account
            </Text>
          </Text>
        )}
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
  guestLink: { color: "#5E6F63", fontSize: 14, fontWeight: "500", paddingVertical: 10 },
  main: { flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 28 },
  title: { color: "#0F2417", fontSize: 36, lineHeight: 39, fontWeight: "700", letterSpacing: -1, marginBottom: 8 },
  sub: { color: "#5E6F63", fontSize: 16, lineHeight: 23, marginBottom: 26 },
  field: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#DFE6DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fieldFocus: { borderColor: "#2F7D1F" },
  fieldBad: { borderColor: "#B3261E" },
  code: {
    color: "#0F2417",
    fontWeight: "600",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: "#DFE6DB",
  },
  phoneInput: { flex: 1, color: "#0F2417", fontSize: 20, fontWeight: "500", letterSpacing: 0.4 },
  hint: { minHeight: 20, marginTop: 8, marginHorizontal: 4, color: "#5E6F63", fontSize: 13 },
  hintBad: { color: "#B3261E" },
  hintLink: { color: "#2F7D1F", fontWeight: "600" },
  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2F7D1F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryDisabled: { opacity: 0.35 },
  primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  pressed: { transform: [{ scale: 0.985 }] },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#DFE6DB" },
  dividerText: { color: "#5E6F63", fontSize: 13 },
  google: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#DFE6DB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleText: { color: "#0F2417", fontSize: 16, fontWeight: "600" },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16, alignSelf: "flex-start" },
  backText: { color: "#5E6F63", fontSize: 14, fontWeight: "500" },
  otpRow: { flexDirection: "row", gap: 8 },
  otpBox: {
    flex: 1,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#DFE6DB",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    color: "#0F2417",
    fontSize: 24,
    fontWeight: "700",
  },
  otpFocus: { borderColor: "#2F7D1F" },
  otpBad: { borderColor: "#B3261E" },
  done: { alignItems: "center", paddingVertical: 24 },
  tick: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2F7D1F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  doneTitle: { color: "#0F2417", fontSize: 30, lineHeight: 34, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  doneSub: { color: "#5E6F63", fontSize: 16, textAlign: "center", marginBottom: 8 },
  foot: { textAlign: "center", color: "#5E6F63", fontSize: 14, paddingHorizontal: 24 },
  footLink: { color: "#2F7D1F", fontWeight: "600" },
  legal: { textAlign: "center", color: "#5E6F63", fontSize: 12, marginTop: 6, marginBottom: 8, paddingHorizontal: 24 },
  legalLink: { color: "#0F2417", textDecorationLine: "underline" },
});
