import { requestGoogleIdToken } from "@/lib/googleAuth";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text } from "react-native";

export function GoogleAuthButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const onPress = async () => {
        setLoading(true);
        try {
            const idToken = await requestGoogleIdToken();
            const res = await useAuthStore.getState().googleSignIn(idToken);
            if (useAuthStore.getState().isSignedIn) {
                if (res?.isOnboarded) {
                    router.replace("/(tabs)");
                } else {
                    router.replace("/(auth)/profile-details");
                }
            }
        } catch (err: any) {
            Alert.alert("Google Sign-In", err?.message || "Could not sign in with Google.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={loading}
            className="h-11 border border-[#E9EBE6] bg-white rounded-2xl flex-row items-center justify-center gap-x-2"
        >
            {loading ? (
                <ActivityIndicator size="small" color="#1F2520" />
            ) : (
                <Text className="text-sm font-medium">Continue with Google</Text>
            )}
        </Pressable>
    );
}