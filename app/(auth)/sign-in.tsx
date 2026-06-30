import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { useAuthStore } from "@/store/useAuthStore";
import { Link, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const {
    loading,
    error,
    pendingVerification,
    signIn: storeSignIn,
    verifyOTP: storeVerifyOTP,
    setError,
    setPendingVerification,
  } = useAuthStore();
  
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  // Reset store error and verification state on screen mount
  useEffect(() => {
    setError(null);
    setPendingVerification(false);
  }, []);

  const formatPhoneNumber = (input: string) => {
    const cleaned = (input || "").replace(/\D/g, "");
    if (input && input.startsWith("+")) {
      return input;
    }
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return `+${cleaned}`;
  };

  const onSignInPress = async () => {
    setError(null);
    await storeSignIn(phone);
  };

  const onPressVerify = async () => {
    setError(null);
    const success = await storeVerifyOTP(code);
    if (success) {
      router.replace("/(tabs)");
    }
  };

  if (pendingVerification) {
    return (
      <SafeAreaView className="flex-1 bg-[#F0F3ED] px-6 justify-center">
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
          <View className="mb-6">
            <Text className="text-3xl font-bold tracking-tight text-[#1F2520] text-center">
              Verify Phone
            </Text>
            <Text className="text-sm text-[#6B756E] mt-2 text-center">
              Enter the code sent to {formatPhoneNumber(phone)}
            </Text>
            <Text className="text-xs font-semibold text-[#6BCB77] mt-2 text-center">
              Test OTP: 123456
            </Text>
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4">
              <Text className="text-red-600 text-xs font-medium text-center">{error}</Text>
            </View>
          ) : null}

          <View className="space-y-4">
            <View>
              <Text className="text-xs font-semibold text-[#1F2520] mb-1.5 ml-1">
                Verification Code
              </Text>
              <TextInput
                keyboardType="number-pad"
                value={code || ""}
                onChangeText={setCode}
                placeholder="Enter code (e.g. 123456)"
                placeholderTextColor="#A0A5A1"
                style={styles.otpInput}
              />
            </View>

            <Pressable
              onPress={onPressVerify}
              disabled={loading || !code}
              className={`h-12 rounded-2xl items-center justify-center mt-6 ${loading || !code ? "bg-[#6BCB77]/65" : "bg-[#6BCB77]"
                }`}
              style={({ pressed }) => pressed && { opacity: 0.9 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Verify & Sign In</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setPendingVerification(false)}
              className="mt-4 py-2"
            >
              <Text className="text-sm font-semibold text-[#6B756E] text-center">
                Back to Edit Phone
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F0F3ED] px-6 justify-center">
      <View className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
        <View className="mb-6">
          <Text className="text-3xl font-bold tracking-tight text-[#1F2520] text-center">
            Welcome Back
          </Text>
          <Text className="text-sm text-[#6B756E] mt-2 text-center">
            Sign in to your Zonofit account
          </Text>
        </View>

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4">
            <Text className="text-red-600 text-xs font-medium text-center">{error}</Text>
          </View>
        ) : null}

        <View className="space-y-4">
          <View>
            <Text className="text-xs font-semibold text-[#1F2520] mb-1.5 ml-1">
              Phone Number
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="phone-pad"
              value={phone || ""}
              onChangeText={setPhone}
              placeholder="Enter phone number (e.g. 9876543210)"
              placeholderTextColor="#A0A5A1"
              style={styles.textInput}
            />
          </View>

          <Pressable
            onPress={onSignInPress}
            disabled={loading || !phone}
            className={`h-12 rounded-2xl items-center justify-center mt-6 ${loading || !phone ? "bg-[#6BCB77]/65" : "bg-[#6BCB77]"
              }`}
            style={({ pressed }) => pressed && { opacity: 0.9 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Send Verification Code</Text>
            )}
          </Pressable>
        </View>

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-[1px] bg-[#E9EBE6]" />
          <Text className="text-xs font-medium text-[#6B756E] mx-4 uppercase tracking-wider">
            or
          </Text>
          <View className="flex-1 h-[1px] bg-[#E9EBE6]" />
        </View>

        <GoogleAuthButton />

        <View className="flex-row justify-center items-center mt-8">
          <Text className="text-sm text-[#6B756E]">Don't have an account? </Text>
          <Link href={"/sign-up" as any} asChild>
            <Pressable>
              <Text className="text-sm font-bold text-[#6BCB77]">Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  textInput: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: "#F5F7F4",
    borderRadius: 16,
    color: "#1F2520",
    fontWeight: "500",
    borderWidth: 1,
    borderColor: "transparent",
    fontSize: 15,
  },
  otpInput: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: "#F5F7F4",
    borderRadius: 16,
    color: "#1F2520",
    fontWeight: "500",
    borderWidth: 1,
    borderColor: "transparent",
    textAlign: "center",
    fontSize: 18,
    letterSpacing: 6,
  },
});
