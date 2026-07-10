import { useAuthStore } from "@/store/useAuthStore";
import { Image, Text, View, Pressable, ActivityIndicator, ScrollView, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { colors } from "@/constants/colors";

export default function ProfileScreen() {
    const { user, isLoaded, signOut } = useAuthStore();
    const router = useRouter();

    const { planName, membershipStatus, streak, totalWorkouts, avatarUrl, uploadAvatar, memberSince } = useUserStore();
    const { credits } = useCreditsStore();
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0]) {
            setUploadingAvatar(true);
            const { success, message } = await uploadAvatar(result.assets[0].uri);
            if (!success) {
                Alert.alert("Upload Failed", message || "Failed to upload profile picture.");
            }
            setUploadingAvatar(false);
        }
    };

    if (!isLoaded) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color={colors.green} />
            </SafeAreaView>
        );
    }

    const onSignOutPress = async () => {
        try {
            await signOut();
            router.replace("/sign-in" as any);
        } catch (err) {
            console.error("Sign out error", err);
        }
    };

    const handleInvite = () => {
        router.push("/invite");
    };

    interface NavRowProps {
        icon: keyof typeof MaterialIcons.glyphMap;
        label: string;
        value?: string;
        onPress?: () => void;
        color?: string;
        showChevron?: boolean;
    }

    const NavRow = ({ icon, label, value, onPress, color = colors.muted, showChevron = true }: NavRowProps) => (
        <Pressable
            onPress={onPress}
            className="flex-row items-center justify-between py-3.5 border-b"
            style={{ borderBottomColor: colors.secondary }}
        >
            <View className="flex-row items-center gap-x-3">
                <View className="w-8 h-8 rounded-xl items-center justify-center border" style={{ backgroundColor: colors.surface, borderColor: colors.secondary }}>
                    <MaterialIcons name={icon} size={18} color={color} />
                </View>
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>{label}</Text>
            </View>
            <View className="flex-row items-center gap-x-1">
                {value ? <Text className="text-xs mr-1" style={{ color: colors.muted }}>{value}</Text> : null}
                {showChevron && <MaterialIcons name="chevron-right" size={18} color={colors.muted} />}
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 120 }}>

                {/* Header */}
                <View className="px-5 pt-3 pb-2">
                    <Text className="text-2xl font-bold" style={{ color: colors.text }}>Profile</Text>
                </View>

                {/* Profile Hero (Dark Container) */}
                <View className="mx-5 mt-3 mb-5 rounded-[28px] p-5 border shadow-sm" style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.softShadowLg]}>
                    <View className="flex-row items-center gap-x-4">
                        <Pressable onPress={pickImage} className="relative" disabled={uploadingAvatar}>
                            <View className="w-20 h-20 rounded-2xl items-center justify-center overflow-hidden border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: colors.secondaryDark }}>
                                {avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <MaterialIcons name="person" size={36} color={colors.textLight} />
                                )}
                                {uploadingAvatar && (
                                    <View className="absolute inset-0 bg-black/60 items-center justify-center rounded-2xl">
                                        <ActivityIndicator size="small" color="#fff" />
                                    </View>
                                )}
                            </View>
                            <View className="absolute -bottom-1 -right-1 p-0.5 rounded-full shadow-sm border" style={{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }}>
                                <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: colors.green }}>
                                    <MaterialIcons name="edit" size={12} color="#fff" />
                                </View>
                            </View>
                        </Pressable>
                        <View className="flex-1">
                            <Text className="text-lg font-bold" numberOfLines={1} style={{ color: colors.textLight }}>
                                {user?.username || "ZonoFit Member"}
                            </Text>
                            <Text className="text-xs mt-0.5" numberOfLines={1} style={{ color: colors.muted }}>
                                {user?.phone || "Google Sign-In"}
                            </Text>
                            <View className="flex-row items-center mt-2 gap-x-2">
                                <View className="px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: 'rgba(217, 255, 92, 0.1)', borderColor: 'rgba(217, 255, 92, 0.2)' }}>
                                    <Text className="text-[10px] font-bold" style={{ color: colors.lime }}>{planName}</Text>
                                </View>
                                <View className="px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: colors.secondaryDark }}>
                                    <Text className="text-[10px] font-semibold" style={{ color: colors.muted }}>Member since {memberSince}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Quick stats */}
                    <View className="h-[1px] mt-4 mb-3" style={{ backgroundColor: colors.secondaryDark }} />
                    <View className="flex-row justify-between">
                        <View className="items-center flex-1">
                            <Text className="text-base font-black" style={{ color: colors.textLight }}>{totalWorkouts}</Text>
                            <Text className="text-[10px] mt-0.5" style={{ color: colors.muted }}>Total Visits</Text>
                        </View>
                        <View className="w-[1px]" style={{ backgroundColor: colors.secondaryDark }} />
                        <View className="items-center flex-1">
                            <Text className="text-base font-black" style={{ color: colors.textLight }}>{streak}</Text>
                            <Text className="text-[10px] mt-0.5" style={{ color: colors.muted }}>Day Streak</Text>
                        </View>
                        <View className="w-[1px]" style={{ backgroundColor: colors.secondaryDark }} />
                        <View className="items-center flex-1">
                            <Text className="text-base font-black" style={{ color: colors.lime }}>{credits}</Text>
                            <Text className="text-[10px] mt-0.5" style={{ color: colors.muted }}>Credits</Text>
                        </View>
                    </View>
                </View>

                {/* Fitness Section */}
                <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-6" style={{ color: colors.muted }}>Fitness</Text>
                <View className="mx-5 rounded-[24px] px-4 border shadow-sm mb-4" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
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
                <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-6" style={{ color: colors.muted }}>Membership</Text>
                <View className="mx-5 rounded-[24px] px-4 border shadow-sm mb-4" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
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
                <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-6" style={{ color: colors.muted }}>Share & Earn</Text>
                <View className="mx-5 rounded-[24px] px-4 border shadow-sm mb-4" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
                    <Pressable
                        onPress={handleInvite}
                        className="flex-row items-center justify-between py-3.5"
                    >
                        <View className="flex-row items-center gap-x-3">
                            <View className="w-8 h-8 rounded-xl items-center justify-center border" style={{ backgroundColor: 'rgba(11, 110, 79, 0.1)', borderColor: 'rgba(11, 110, 79, 0.2)' }}>
                                <Ionicons name="gift-outline" size={18} color={colors.green} />
                            </View>
                            <View>
                                <Text className="text-sm font-semibold" style={{ color: colors.text }}>Invite a Friend</Text>
                                <Text className="text-[10px] mt-0.5" style={{ color: colors.muted }}>Earn bonus credits for each referral</Text>
                            </View>
                        </View>
                        <View className="px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'rgba(11, 110, 79, 0.1)', borderColor: 'rgba(11, 110, 79, 0.2)' }}>
                            <Text className="text-[10px] font-bold" style={{ color: colors.green }}>+50 Credits</Text>
                        </View>
                    </Pressable>
                </View>

                {/* Trainer & Buddy Section */}
                <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-6" style={{ color: colors.muted }}>Opportunities</Text>
                <View className="mx-5 rounded-[24px] px-4 border shadow-sm mb-4" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
                    <NavRow
                        icon="accessibility-new"
                        label="Become a Trainer"
                        onPress={() => router.push("/role-application?type=trainer")}
                    />
                    <NavRow
                        icon="people-outline"
                        label="Become a Gym Buddy"
                        onPress={() => router.push("/role-application?type=buddy")}
                    />
                </View>

                {/* About & Support Section */}
                <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-6" style={{ color: colors.muted }}>About & Support</Text>
                <View className="mx-5 rounded-[24px] px-4 border shadow-sm mb-4" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
                    <NavRow
                        icon="campaign"
                        label="Announcements"
                        onPress={() => router.push({ pathname: "/content", params: { type: "app_announcement", title: "Announcements" } })}
                    />
                    <NavRow
                        icon="help-outline"
                        label="General FAQ"
                        onPress={() => router.push({ pathname: "/content", params: { type: "faq_general", title: "General FAQ" } })}
                    />
                    <NavRow
                        icon="description"
                        label="Terms & Conditions"
                        onPress={() => router.push({ pathname: "/content", params: { type: "terms_and_conditions", title: "Terms & Conditions" } })}
                    />
                </View>

                {/* Account Section */}
                <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-6" style={{ color: colors.muted }}>Account</Text>
                <View className="mx-5 rounded-[24px] px-4 border shadow-sm mb-5" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
                    {user?.authMethod === "phone" ? (
                        <NavRow
                            icon="phone"
                            label="Phone Number"
                            value={user?.phone || "N/A"}
                            showChevron={false}
                        />
                    ) : (
                        <NavRow
                            icon="mail-outline"
                            label="Email"
                            value="Google Connected"
                            showChevron={false}
                        />
                    )}
                    <NavRow
                        icon="verified-user"
                        label="Verification Status"
                        value="Verified"
                        showChevron={false}
                        color={colors.green}
                    />
                </View>

                {/* Sign Out */}
                <View className="mx-5">
                    <Pressable
                        onPress={onSignOutPress}
                        className="h-12 border rounded-2xl flex-row items-center justify-center gap-x-2"
                        style={{ backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.2)' }}
                    >
                        <MaterialIcons name="logout" size={18} color={colors.coral} />
                        <Text className="font-bold text-base" style={{ color: colors.coral }}>Sign Out</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    softShadowLg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    softShadow: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }
  });