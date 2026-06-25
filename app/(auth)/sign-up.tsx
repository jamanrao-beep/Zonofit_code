import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { useSignUp, useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
    const { signUp, setActive, isLoaded: isSignUpLoaded } = useSignUp();
    const { signIn, isLoaded: isSignInLoaded } = useSignIn();
    const router = useRouter();

    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
    const [pendingVerification, setPendingVerification] = useState(false);
    const [isSignInVerification, setIsSignInVerification] = useState(false);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const formatPhoneNumber = (input: string) => {
        const cleaned = input.replace(/\D/g, "");
        if (input.startsWith("+")) {
            return input;
        }
        if (cleaned.length === 10) {
            return `+91${cleaned}`;
        }
        return `+${cleaned}`;
    };

    const onSignUpPress = async () => {
        if (!isSignUpLoaded || !isSignInLoaded) return;
        setError("");
        setLoading(true);

        const formattedPhone = formatPhoneNumber(phone);

        try {
            await signUp.create({
                phoneNumber: formattedPhone,
                username: username || undefined,
            });

            await signUp.preparePhoneNumberVerification({
                strategy: "phone_code",
            });

            setIsSignInVerification(false);
            setPendingVerification(true);
        } catch (err: any) {
            console.error("Sign up error:", err);
            
            // Check if phone number is already registered
            if (err.errors?.[0]?.code === "form_identifier_exists") {
                try {
                    // Fallback to Sign In flow
                    const result = await signIn.create({
                        identifier: formattedPhone,
                    });

                    const phoneCodeFactor = result.supportedFirstFactors?.find(
                        (factor: any) => factor.strategy === "phone_code"
                    );

                    if (!phoneCodeFactor) {
                        throw new Error("Phone number sign-in is not supported on this account configuration.");
                    }

                    await signIn.prepareFirstFactor({
                        strategy: "phone_code",
                        phoneNumberId: (phoneCodeFactor as any).phoneNumberId,
                    });

                    setIsSignInVerification(true);
                    setPendingVerification(true);
                } catch (signInErr: any) {
                    console.error("Auto sign-in initialization error:", signInErr);
                    setError(signInErr.errors?.[0]?.longMessage || signInErr.message || "Phone number exists, and sign in failed.");
                }
            } else {
                setError(err.errors?.[0]?.longMessage || "An error occurred during sign up.");
            }
        } finally {
            setLoading(false);
        }
    };

    const onPressVerify = async () => {
        if (!isSignUpLoaded || !isSignInLoaded) return;
        setError("");
        setLoading(true);

        try {
            if (isSignInVerification) {
                // Verify sign-in OTP
                const completeSignIn = await signIn.attemptFirstFactor({
                    strategy: "phone_code",
                    code,
                });

                if (completeSignIn.status === "complete") {
                    await setActive({ session: completeSignIn.createdSessionId });
                    router.replace("/(tabs)");
                } else {
                    console.warn("Sign in status not complete:", completeSignIn.status);
                }
            } else {
                // Verify sign-up OTP
                const completeSignUp = await signUp.attemptPhoneNumberVerification({
                    code,
                });

                if (completeSignUp.status === "complete") {
                    await setActive({ session: completeSignUp.createdSessionId });
                    router.replace("/(tabs)");
                } else {
                    console.warn("Sign up status not complete:", completeSignUp.status);
                }
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
                            Verify Phone
                        </Text>
                        <Text className="text-sm text-[#6B756E] mt-2 text-center">
                            Enter the code sent to {formatPhoneNumber(phone)}
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
                            Username
                        </Text>
                        <TextInput
                            autoCapitalize="none"
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Choose a username"
                            placeholderTextColor="#A0A5A1"
                            className="h-12 px-4 bg-[#F5F7F4] rounded-2xl text-[#1F2520] font-medium border border-transparent focus:border-[#6BCB77]"
                        />
                    </View>

                    <View className="mt-4">
                        <Text className="text-xs font-semibold text-[#1F2520] mb-1.5 ml-1">
                            Phone Number
                        </Text>
                        <TextInput
                            autoCapitalize="none"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Enter phone number (e.g. 9876543210)"
                            placeholderTextColor="#A0A5A1"
                            className="h-12 px-4 bg-[#F5F7F4] rounded-2xl text-[#1F2520] font-medium border border-transparent focus:border-[#6BCB77]"
                        />
                    </View>

                    <Pressable
                        onPress={onSignUpPress}
                        disabled={loading || !phone || !username}
                        className={`h-12 rounded-2xl items-center justify-center mt-6 ${loading || !phone || !username ? "bg-[#6BCB77]/65" : "bg-[#6BCB77]"
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
