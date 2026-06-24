import { useAuth, useUser } from "@clerk/clerk-expo";
import { Image, Text, View, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";

export default function ProfileScreen() {
    const { user, isLoaded: userLoaded } = useUser();
    const { signOut, isLoaded: authLoaded } = useAuth();

    if (!userLoaded || !authLoaded) {
        return (
            <SafeAreaView className="flex-1 bg-[#F0F3ED] items-center justify-center">
                <ActivityIndicator size="large" color="#6BCB77" />
            </SafeAreaView>
        );
    }

    const onSignOutPress = async () => {
        try {
            await signOut();
        } catch (err) {
            console.error("Sign out error", err);
        }
    };

    const formattedDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : "";

    return (
        <SafeAreaView className="flex-1 bg-[#F0F3ED] px-6">
            <View className="flex-1 justify-between py-8">
                {/* Profile Header */}
                <View className="items-center mt-6">
                    <View className="relative">
                        {user?.imageUrl ? (
                            <Image
                                source={{ uri: user.imageUrl }}
                                className="w-28 h-28 rounded-full border-4 border-white shadow-md"
                            />
                        ) : (
                            <View className="w-28 h-28 rounded-full bg-[#6BCB77]/20 border-4 border-white shadow-md items-center justify-center">
                                <MaterialIcons name="person" size={56} color="#6BCB77" />
                            </View>
                        )}
                        <View className="absolute bottom-1 right-1 bg-[#6BCB77] w-6 h-6 rounded-full border-2 border-white items-center justify-center">
                            <MaterialIcons name="check" size={12} color="#fff" />
                        </View>
                    </View>

                    <Text className="text-2xl font-bold text-[#1F2520] mt-4">
                        {user?.fullName || "Zonofit User"}
                    </Text>
                    <Text className="text-sm text-[#6B756E] mt-1">
                        {user?.primaryEmailAddress?.emailAddress}
                    </Text>
                </View>

                {/* Account Settings Card */}
                <View className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 my-8">
                    <Text className="text-sm font-bold text-[#1F2520] mb-4">Account Details</Text>

                    <View className="flex-row justify-between items-center py-3 border-b border-[#F5F7F4]">
                        <View className="flex-row items-center gap-x-3">
                            <MaterialIcons name="mail-outline" size={20} color="#6B756E" />
                            <Text className="text-sm font-medium text-[#6B756E]">Email</Text>
                        </View>
                        <Text className="text-sm font-semibold text-[#1F2520] max-w-[200px]" numberOfLines={1}>
                            {user?.primaryEmailAddress?.emailAddress}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center py-3 border-b border-[#F5F7F4]">
                        <View className="flex-row items-center gap-x-3">
                            <MaterialIcons name="date-range" size={20} color="#6B756E" />
                            <Text className="text-sm font-medium text-[#6B756E]">Member Since</Text>
                        </View>
                        <Text className="text-sm font-semibold text-[#1F2520]">
                            {formattedDate}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center py-3">
                        <View className="flex-row items-center gap-x-3">
                            <MaterialIcons name="verified-user" size={20} color="#6B756E" />
                            <Text className="text-sm font-medium text-[#6B756E]">Status</Text>
                        </View>
                        <Text className="text-sm font-semibold text-[#6BCB77]">Verified</Text>
                    </View>
                </View>

                {/* Log Out Button */}
                <Pressable
                    onPress={onSignOutPress}
                    className="h-12 bg-red-50 border border-red-200/50 rounded-2xl flex-row items-center justify-center gap-x-2 active:bg-red-100"
                    style={({ pressed }) => pressed && { opacity: 0.9 }}
                >
                    <MaterialIcons name="logout" size={18} color="#EF4444" />
                    <Text className="text-red-500 font-bold text-base">Sign Out</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}