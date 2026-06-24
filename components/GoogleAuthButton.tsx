import { useOAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { Pressable, Text } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export function GoogleAuthButton() {
    const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

    const onPress = useCallback(async () => {
        try {
            const { createdSessionId, setActive } = await startOAuthFlow();
            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                router.replace("/(tabs)");
            }
        } catch (err) {
            console.error("Google sign-in error", err);
        }
    }, [startOAuthFlow]);

    return (
        <Pressable
            onPress={onPress}
            className="h-11 border border-[#E9EBE6] bg-white rounded-2xl flex-row items-center justify-center gap-x-2"
        >
            <Text className="text-sm font-medium">Continue with Google</Text>
        </Pressable>
    );
}