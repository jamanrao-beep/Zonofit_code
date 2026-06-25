import { useAuth, useUser } from "@clerk/clerk-expo";
import { Image, Text, View, Pressable, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";

export default function ProfileScreen() {
    const { user, isLoaded: userLoaded } = useUser();
    const { signOut, isLoaded: authLoaded } = useAuth();
    const router = useRouter();

    const { planName, membershipStatus, streak, totalWorkouts } = useUserStore();
    const { credits } = useCreditsStore();

    if (!userLoaded || !authLoaded) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4", alignItems: "center", justifyContent: "center" }}>
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

    const handleInvite = () => {
        Alert.alert(
            "Invite a Friend",
            "Referral system coming soon! Share ZonoFit with friends to earn bonus credits.",
            [{ text: "Got it" }]
        );
    };

    interface NavRowProps {
        icon: keyof typeof MaterialIcons.glyphMap;
        label: string;
        value?: string;
        onPress?: () => void;
        color?: string;
        showChevron?: boolean;
    }

    const NavRow = ({ icon, label, value, onPress, color = "#6B756E", showChevron = true }: NavRowProps) => (
        <Pressable
            onPress={onPress}
            className="flex-row items-center justify-between py-3.5 border-b border-[#F5F7F4] active:bg-[#F5F7F4]"
        >
            <View className="flex-row items-center gap-x-3">
                <View className="w-8 h-8 rounded-xl bg-[#F5F7F4] items-center justify-center">
                    <MaterialIcons name={icon} size={18} color={color} />
                </View>
                <Text className="text-sm font-semibold text-[#1F2520]">{label}</Text>
            </View>
            <View className="flex-row items-center gap-x-1">
                {value ? <Text className="text-xs text-[#6B756E] mr-1">{value}</Text> : null}
                {showChevron && <MaterialIcons name="chevron-right" size={18} color="#B0B5B0" />}
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Header */}
                <View className="px-5 pt-3 pb-2">
                    <Text className="text-2xl font-bold text-[#1F2520]">Profile</Text>
                </View>

                {/* Profile Hero */}
                <View className="mx-5 mt-3 mb-5 bg-white rounded-[28px] p-5 border border-black/5 shadow-sm">
                    <View className="flex-row items-center gap-x-4">
                        <View className="relative">
                            {user?.imageUrl ? (
                                <Image
                                    source={{ uri: user.imageUrl }}
                                    className="w-20 h-20 rounded-2xl"
                                />
                            ) : (
                                <View className="w-20 h-20 rounded-2xl bg-[#EAF7EC] items-center justify-center">
                                    <MaterialIcons name="person" size={36} color="#6BCB77" />
                                </View>
                            )}
                            <View className="absolute -bottom-1 -right-1 bg-[#6BCB77] w-6 h-6 rounded-full border-2 border-white items-center justify-center">
                                <MaterialIcons name="check" size={12} color="#fff" />
                            </View>
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-[#1F2520]" numberOfLines={1}>
                                {user?.fullName || "ZonoFit Member"}
                            </Text>
                            <Text className="text-xs text-[#6B756E] mt-0.5" numberOfLines={1}>
                                {user?.primaryEmailAddress?.emailAddress}
                            </Text>
                            <View className="flex-row items-center mt-2 gap-x-2">
                                <View className="bg-[#EAF7EC] px-2.5 py-0.5 rounded-full border border-[#D1F2D6]">
                                    <Text className="text-[#059669] text-[10px] font-bold">{planName}</Text>
                                </View>
                                <View className="bg-[#F5F7F4] px-2.5 py-0.5 rounded-full border border-black/5">
                                    <Text className="text-[#6B756E] text-[10px] font-semibold">Member since {formattedDate}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Quick stats */}
                    <View className="h-[1px] bg-black/5 mt-4 mb-3" />
                    <View className="flex-row justify-between">
                        <View className="items-center flex-1">
                            <Text className="text-base font-black text-[#1F2520]">{totalWorkouts}</Text>
                            <Text className="text-[10px] text-[#6B756E] mt-0.5">Total Visits</Text>
                        </View>
                        <View className="w-[1px] bg-black/5" />
                        <View className="items-center flex-1">
                            <Text className="text-base font-black text-[#1F2520]">{streak}</Text>
                            <Text className="text-[10px] text-[#6B756E] mt-0.5">Day Streak</Text>
                        </View>
                        <View className="w-[1px] bg-black/5" />
                        <View className="items-center flex-1">
                            <Text className="text-base font-black text-[#1F2520]">{credits}</Text>
                            <Text className="text-[10px] text-[#6B756E] mt-0.5">Credits</Text>
                        </View>
                    </View>
                </View>

                {/* Fitness Section */}
                <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">Fitness</Text>
                <View className="mx-5 bg-white rounded-[24px] px-4 border border-black/5 shadow-sm mb-4">
                    <NavRow
                        icon="timeline"
                        label="My Journey"
                        value="Explorer Stage"
                        onPress={() => router.push("/journey")}
                    />
                    <NavRow
                        icon="calendar-today"
                        label="Booking History"
                        onPress={() => router.push("/booking-history")}
                    />
                    <NavRow
                        icon="explore"
                        label="Discover Gyms"
                        onPress={() => router.push("/explore")}
                    />
                </View>

                {/* Membership Section */}
                <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">Membership</Text>
                <View className="mx-5 bg-white rounded-[24px] px-4 border border-black/5 shadow-sm mb-4">
                    <NavRow
                        icon="card-membership"
                        label="My Membership"
                        value={planName}
                        onPress={() => router.push("/membership")}
                    />
                    <NavRow
                        icon="account-balance-wallet"
                        label="Credits & Wallet"
                        value={`${credits} Credits`}
                        onPress={() => router.push("/credits")}
                    />
                </View>

                {/* Growth Section */}
                <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">Share & Earn</Text>
                <View className="mx-5 bg-white rounded-[24px] px-4 border border-black/5 shadow-sm mb-4">
                    <Pressable
                        onPress={handleInvite}
                        className="flex-row items-center justify-between py-3.5 active:bg-[#F5F7F4]"
                    >
                        <View className="flex-row items-center gap-x-3">
                            <View className="w-8 h-8 rounded-xl bg-[#EAF7EC] items-center justify-center">
                                <Ionicons name="gift-outline" size={18} color="#6BCB77" />
                            </View>
                            <View>
                                <Text className="text-sm font-semibold text-[#1F2520]">Invite a Friend</Text>
                                <Text className="text-[10px] text-[#6B756E] mt-0.5">Earn bonus credits for each referral</Text>
                            </View>
                        </View>
                        <View className="bg-[#EAF7EC] px-2.5 py-1 rounded-full border border-[#D1F2D6]">
                            <Text className="text-[#059669] text-[10px] font-bold">+50 Credits</Text>
                        </View>
                    </Pressable>
                </View>

                {/* Account Section */}
                <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">Account</Text>
                <View className="mx-5 bg-white rounded-[24px] px-4 border border-black/5 shadow-sm mb-5">
                    <NavRow
                        icon="mail-outline"
                        label="Email"
                        value={user?.primaryEmailAddress?.emailAddress?.substring(0, 20) + "..."}
                        showChevron={false}
                    />
                    <NavRow
                        icon="verified-user"
                        label="Verification Status"
                        value="Verified"
                        showChevron={false}
                        color="#6BCB77"
                    />
                </View>

                {/* Sign Out */}
                <View className="mx-5">
                    <Pressable
                        onPress={onSignOutPress}
                        className="h-12 bg-red-50 border border-red-200/50 rounded-2xl flex-row items-center justify-center gap-x-2 active:bg-red-100"
                    >
                        <MaterialIcons name="logout" size={18} color="#EF4444" />
                        <Text className="text-red-500 font-bold text-base">Sign Out</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}