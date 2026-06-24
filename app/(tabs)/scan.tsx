import { Text, View } from "react-native";

// Exists only so Expo Router knows "scan" is a tab. The tabPress listener
// above intercepts the tap before this ever renders.
export default function ScanTabPlaceholder() {
    return (
        <View className="flex-1 items-center justify-center bg-white">
            <Text>You shouldn't see this — scan opens as a modal.</Text>
        </View>
    );
}