import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
    const { signUp, setActive, isLoaded } = useSignUp();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onSignUpPress = async () => {
        if (!isLoaded) return;
        setError("");
        setLoading(true);

        try {
            await signUp.create({
                emailAddress: email,
                password,
            });

            await signUp.prepareEmailAddressVerification({
                strategy: "email_code",
            });

            setPendingVerification(true);
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.longMessage || "An error occurred during sign up.");
        } finally {
            setLoading(false);
        }
    };

    const onPressVerify = async () => {
        if (!isLoaded) return;
        setError("");
        setLoading(true);

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (completeSignUp.status === "complete") {
                await setActive({ session: completeSignUp.createdSessionId });
                router.replace("/(tabs)");
            } else {
                console.warn("Sign up status not complete:", completeSignUp.status);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.longMessage || "Verification failed. Check the code.");
        } finally {
            setLoading(false);
        }
    };

    if (pendingVerification) {
        return (
            <SafeAreaView className="flex-1 bg-[#F0F3ED] px-6 justify-center">
                <View className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
                    <View className="mb-6">
                        <Text className="text-3xl font-bold tracking-tight text-[#1F2520] text-center">
                            Verify Email
                        </Text>
                        <Text className="text-sm text-[#6B756E] mt-2 text-center">
                            Enter the code sent to {email}
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
                                value={code}
                                onChangeText={setCode}
                                placeholder="Enter code (e.g. 123456)"
                                placeholderTextColor="#A0A5A1"
                                className="h-12 px-4 bg-[#F5F7F4] rounded-2xl text-[#1F2520] font-medium border border-transparent focus:border-[#6BCB77] text-center text-lg tracking-widest"
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
                                Back to Edit Email
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
                        Create Account
                    </Text>
                    <Text className="text-sm text-[#6B756E] mt-2 text-center">
                        Sign up to get started with Zonofit
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
                            placeholder="Choose a secure password"
                            placeholderTextColor="#A0A5A1"
                            className="h-12 px-4 bg-[#F5F7F4] rounded-2xl text-[#1F2520] font-medium border border-transparent focus:border-[#6BCB77]"
                        />
                    </View>

                    <Pressable
                        onPress={onSignUpPress}
                        disabled={loading || !email || !password}
                        className={`h-12 rounded-2xl items-center justify-center mt-6 ${loading || !email || !password ? "bg-[#6BCB77]/65" : "bg-[#6BCB77]"
                            }`}
                        style={({ pressed }) => pressed && { opacity: 0.9 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold text-base">Sign Up</Text>
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
                    <Text className="text-sm text-[#6B756E]">Already have an account? </Text>
                    <Link href={"/sign-in" as any} asChild>
                        <Pressable>
                            <Text className="text-sm font-bold text-[#6BCB77]">Sign In</Text>
                        </Pressable>
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}
