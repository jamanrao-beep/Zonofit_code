import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { useAuthStore } from "@/store/useAuthStore";
import { Link, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

export default function SignUpScreen() {
    const {
        loading,
        error,
        pendingVerification,
        signUp: storeSignUp,
        verifyOTP: storeVerifyOTP,
        setError,
        setPendingVerification,
    } = useAuthStore();
    
    const router = useRouter();

    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
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

    const onSignUpPress = async () => {
        setError(null);
        await storeSignUp(username, phone);
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
            <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
                <View style={styles.bgDecorTopLeft} />
                <View style={styles.bgDecorBottomRight} />

                <View style={styles.mainCard}>
                    <View className="mb-6 items-center">
                        <Image
                            /* eslint-disable-next-line @typescript-eslint/no-require-imports */
                            source={require("@/assets/images/Zonofit logo.jpeg")}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text className="text-3xl font-bold tracking-tight text-[#1C2B16] text-center mt-4">
                            Verify Phone
                        </Text>
                        <Text className="text-sm text-[#6B8260] mt-2 text-center">
                            Enter the code sent to {formatPhoneNumber(phone)}
                        </Text>
                        <Text className="text-xs font-semibold text-[#0B6E4F] mt-2 text-center">
                            Test OTP: 123456
                        </Text>
                    </View>

                    {error ? (
                        <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4">
                            <Text className="text-red-600 text-xs font-medium text-center">{error}</Text>
                        </View>
                    ) : null}

                    <View className="space-y-4">
                        <View style={styles.inputContainer}>
                            <Feather name="lock" size={20} color="#0B6E4F" style={styles.inputIcon} />
                            <TextInput
                                keyboardType="number-pad"
                                value={code || ""}
                                onChangeText={setCode}
                                placeholder="Enter verification code"
                                placeholderTextColor="#A0A5A1"
                                style={styles.textInput}
                            />
                        </View>

                        <Pressable
                            onPress={onPressVerify}
                            disabled={loading || !code}
                            style={({ pressed }) => [
                                styles.primaryButton,
                                { opacity: pressed ? 0.9 : 1, marginTop: 16 },
                                (loading || !code) && { backgroundColor: "#108962", opacity: 0.7 }
                            ]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View style={styles.btnRow}>
                                    <Feather name="check" size={20} color="#FFFFFF" style={styles.btnIcon} />
                                    <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                                </View>
                            )}
                        </Pressable>

                        <Pressable
                            onPress={() => setPendingVerification(false)}
                            className="mt-4 py-2"
                        >
                            <Text className="text-sm font-semibold text-[#6B8260] text-center">
                                Back to Edit Phone
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
            <View style={styles.bgDecorTopLeft} />
            <View style={styles.bgDecorBottomRight} />

            <View style={styles.mainCard}>
                <View className="mb-6 items-center">
                    <Image
                        /* eslint-disable-next-line @typescript-eslint/no-require-imports */
                        source={require("@/assets/images/Zonofit logo.jpeg")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text className="text-3xl font-bold tracking-tight text-[#1C2B16] text-center mt-4">
                        Create Account
                    </Text>
                    <Text className="text-sm text-[#6B8260] mt-2 text-center">
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
                        <View style={styles.labelRow}>
                            <Feather name="user" size={16} color="#0B6E4F" />
                            <Text className="text-xs font-bold text-[#1C2B16] ml-2">
                                Username
                            </Text>
                        </View>
                        <View style={styles.inputContainer}>
                            <Feather name="user" size={20} color="#A0A5A1" style={styles.inputIcon} />
                            <TextInput
                                autoCapitalize="none"
                                value={username || ""}
                                onChangeText={setUsername}
                                placeholder="Choose a username"
                                placeholderTextColor="#A0A5A1"
                                style={styles.textInput}
                            />
                        </View>
                    </View>

                    <View className="mt-4">
                        <View style={styles.labelRow}>
                            <Feather name="phone" size={16} color="#0B6E4F" />
                            <Text className="text-xs font-bold text-[#1C2B16] ml-2">
                                Phone Number
                            </Text>
                        </View>
                        <View style={styles.inputContainer}>
                            <Feather name="phone" size={20} color="#A0A5A1" style={styles.inputIcon} />
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
                    </View>

                    <Pressable
                        onPress={onSignUpPress}
                        disabled={loading || !phone || !username}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            { opacity: pressed ? 0.9 : 1, marginTop: 24 },
                            (loading || !phone || !username) && { backgroundColor: "#108962", opacity: 0.7 }
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={styles.btnRow}>
                                <Feather name="send" size={18} color="#FFFFFF" style={styles.btnIcon} />
                                <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                            </View>
                        )}
                    </Pressable>
                </View>

                <View className="flex-row items-center my-6">
                    <View className="flex-1 h-[1px] bg-[#E9EBE6]" />
                    <Text className="text-xs font-bold text-[#A0A5A1] mx-4 uppercase tracking-wider">
                        OR
                    </Text>
                    <View className="flex-1 h-[1px] bg-[#E9EBE6]" />
                </View>

                <GoogleAuthButton />

                <View className="flex-row justify-center items-center mt-6">
                    <Text className="text-sm text-[#6B8260] font-medium">Already have an account? </Text>
                    <Link href={"/sign-in" as any} asChild>
                        <Pressable>
                            <Text className="text-sm font-bold text-[#0B6E4F]">Sign In</Text>
                        </Pressable>
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F2F8ED",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    bgDecorTopLeft: {
        position: "absolute",
        top: -50,
        left: -50,
        width: 200,
        height: 200,
        backgroundColor: "#E2F2D9",
        borderRadius: 100,
        opacity: 0.5,
    },
    bgDecorBottomRight: {
        position: "absolute",
        bottom: -50,
        right: -50,
        width: 300,
        height: 300,
        backgroundColor: "#E2F2D9",
        borderRadius: 150,
        opacity: 0.6,
    },
    mainCard: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 32,
        paddingHorizontal: 24,
        paddingVertical: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 3,
    },
    logo: {
        width: 54,
        height: 54,
        borderRadius: 12,
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        height: 52,
        backgroundColor: "#F4F8EF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5EBE0",
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        color: "#1C2B16",
        fontWeight: "500",
        fontSize: 15,
        height: "100%",
    },
    primaryButton: {
        height: 56,
        backgroundColor: "#0B6E4F",
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0B6E4F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    btnRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    btnIcon: {
        marginRight: 10,
    },
    primaryButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
});
