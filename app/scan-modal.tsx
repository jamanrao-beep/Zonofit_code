import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

// Placeholder — real scanning needs `expo-camera`, not added yet (per the
// "ask before installing" rule). Say the word and I'll wire it up here.
export default function ScanModal() {
    return (
        <View className="flex-1 items-center justify-center bg-black/90 px-6">
            <Text className="text-white text-lg font-semibold mb-2">QR Scanner</Text>
            <Text className="text-white/70 text-center mb-6">
                Camera view goes here once expo-camera is added.
            </Text>
            <Pressable onPress={() => router.back()} className="bg-white rounded-2xl px-6 py-3">
                <Text className="font-semibold">Close</Text>
            </Pressable>
        </View>
    );
}