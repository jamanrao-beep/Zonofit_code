import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        console.warn("Sign in status not complete:", result.status);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.errors?.[0]?.longMessage || "An error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

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
              Email Address
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#A0A5A1"
              className="h-12 px-4 bg-[#F5F7F4] rounded-2xl text-[#1F2520] font-medium border border-transparent focus:border-[#6BCB77]"
            />
          </View>

          <View className="mt-4">
            <Text className="text-xs font-semibold text-[#1F2520] mb-1.5 ml-1">
              Password
            </Text>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#A0A5A1"
              className="h-12 px-4 bg-[#F5F7F4] rounded-2xl text-[#1F2520] font-medium border border-transparent focus:border-[#6BCB77]"
            />
          </View>

          <Pressable
            onPress={onSignInPress}
            disabled={loading || !email || !password}
            className={`h-12 rounded-2xl items-center justify-center mt-6 ${loading || !email || !password ? "bg-[#6BCB77]/65" : "bg-[#6BCB77]"
              }`}
            style={({ pressed }) => pressed && { opacity: 0.9 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Sign In</Text>
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
