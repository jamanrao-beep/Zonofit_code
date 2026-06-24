import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExploreScreen() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F3ED" }}>
            <View className="flex-1 items-center justify-center">
                <Text className="text-2xl font-bold">Profile</Text>
                <Text className="text-[#6B756E] mt-1">Real screen comes later</Text>
            </View>
        </SafeAreaView>
    );
}