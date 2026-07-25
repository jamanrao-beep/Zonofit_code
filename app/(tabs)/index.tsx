import React from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  Image,
  StyleSheet
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { avatarUrl } = useUserStore();
  const { credits } = useCreditsStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12 }}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-gray-500 text-sm font-medium">Good Morning,</Text>
            <Text className="text-[28px] font-bold mt-0.5 text-black tracking-tight">{user?.username || "Saransh"}</Text>
          </View>
          <View className="flex-row items-center gap-x-3">
            <Pressable className="w-10 h-10 rounded-full border border-gray-200 items-center justify-center relative bg-white">
              <Ionicons name="notifications-outline" size={20} color="black" />
              <View className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-orange-500 border border-white" />
            </Pressable>
            <Pressable onPress={() => router.push("/profile")}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="w-10 h-10 rounded-full bg-gray-200" />
              ) : (
                <Image 
                  source={{ uri: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" }} 
                  className="w-10 h-10 rounded-full bg-gray-200" 
                />
              )}
            </Pressable>
          </View>
        </View>

        {/* Primary Gym Card */}
        <View className="bg-[#1F7A3E] rounded-[32px] p-6 mb-6">
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-white/70 text-[10px] font-bold tracking-[1.5px] uppercase mb-1">PRIMARY GYM</Text>
              <View className="flex-row items-center">
                <Text className="text-white text-[22px] font-bold tracking-tight">Gold's Gym</Text>
                <Ionicons name="chevron-forward" size={18} color="white" className="ml-1 mt-0.5" />
              </View>
            </View>
            <View className="w-12 h-12 rounded-full bg-white shadow-sm" />
          </View>

          <View className="flex-row justify-between items-end mb-2">
            <View>
              <Text className="text-white/70 text-xs mb-1">Completed Visits</Text>
              <Text className="text-white text-[32px] font-bold leading-9">
                12 <Text className="text-white/70 text-lg font-normal">/ 18</Text>
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-white/70 text-xs mb-1">Visits Left</Text>
              <Text className="text-white text-[32px] font-bold leading-9">6</Text>
            </View>
          </View>

          {/* 18-Segment Progress Bar */}
          <View className="flex-row gap-x-1.5 mb-6 w-full">
            {[...Array(18)].map((_, i) => (
              <View 
                key={i} 
                className={`flex-1 h-1.5 rounded-full ${i < 12 ? 'bg-[#28C76F]' : 'bg-white border border-white border-dashed bg-transparent opacity-60'}`} 
                style={i >= 12 ? { backgroundColor: 'transparent', borderStyle: 'dashed' } : {}}
              />
            ))}
          </View>

          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <View className="w-5 h-5 rounded-full bg-yellow-500/20 items-center justify-center mr-1.5">
                <Text className="text-yellow-500 text-[10px] font-bold">🪙</Text>
              </View>
              <Text className="text-white text-sm font-medium">Available Credits ₹{credits || "1,240"}</Text>
            </View>
            <Pressable onPress={() => router.push("/credits")}>
              <Text className="text-white/90 text-xs underline font-medium tracking-wide">View Wallet</Text>
            </Pressable>
          </View>

          <Pressable 
            onPress={() => router.push("/explore")}
            className="bg-white rounded-2xl py-3.5 flex-row justify-center items-center shadow-sm active:opacity-90"
          >
            <Ionicons name="calendar-outline" size={18} color="#1F7A3E" className="mr-2" />
            <Text className="text-[#1F7A3E] font-bold text-sm tracking-wide">Book Visit</Text>
          </Pressable>
        </View>

        {/* Your Journey Card */}
        <View className="bg-white rounded-[32px] p-5 mb-6 border border-gray-100 shadow-sm" style={styles.cardShadow}>
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-[17px] font-bold text-black">Your Journey</Text>
            <Pressable onPress={() => router.push("/journey")} className="flex-row items-center">
              <Text className="text-[#1F7A3E] font-bold text-xs tracking-wide mr-0.5">View Journey</Text>
              <Ionicons name="chevron-forward" size={12} color="#1F7A3E" />
            </Pressable>
          </View>

          <View className="flex-row justify-between items-end mb-3">
            <View>
              <Text className="text-gray-400 text-[10px] font-bold tracking-wider mb-1">Year Plan Progress</Text>
              <Text className="text-black font-bold text-[15px]">
                Month 3 <Text className="text-gray-400 font-normal">/ 12</Text>
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-[10px] font-bold tracking-wider mb-1">Current Phase</Text>
              <View className="bg-[#E8F5E9] px-3 py-1 rounded-full border border-green-500/10">
                <Text className="text-[#1F7A3E] text-[10px] font-bold tracking-wide">Foundation</Text>
              </View>
            </View>
          </View>

          {/* 12-Segment Progress Bar */}
          <View className="flex-row gap-x-1.5 mb-6 w-full">
            {[...Array(12)].map((_, i) => (
              <View 
                key={i} 
                className={`flex-1 h-1.5 rounded-full ${i < 3 ? 'bg-[#1F7A3E]' : 'bg-gray-200'}`} 
              />
            ))}
          </View>

          <View className="h-[1px] bg-gray-100 w-full mb-4" />

          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] tracking-wide mb-1">Completed Visits</Text>
              <Text className="text-black text-xl font-bold">26</Text>
            </View>

            <View className="w-[1px] h-8 bg-gray-200 mx-2" />

            <View className="flex-1 pl-2">
              <Text className="text-gray-400 text-[10px] tracking-wide mb-1">Money Saved</Text>
              <Text className="text-[#1F7A3E] text-xl font-bold">₹2,340</Text>
            </View>

            <View className="w-10 h-10 rounded-full bg-[#E8F5E9] items-center justify-center">
              <Text className="text-lg">🐷</Text>
            </View>
          </View>
        </View>

        {/* Refer & Earn Card */}
        <View className="bg-[#EDF7EC] rounded-[24px] p-6 mb-8 flex-row justify-between overflow-hidden relative border border-black/5" style={styles.cardShadow}>
          {/* Top Right Share Button */}
          <Pressable 
            onPress={() => router.push("/invite" as any)}
            className="absolute top-4 right-4 w-9 h-9 bg-white rounded-xl items-center justify-center shadow-sm z-20 active:bg-gray-100 border border-black/5"
          >
            <Ionicons name="share-social-outline" size={18} color="#1F7A3E" />
          </Pressable>

          <View className="w-[55%] z-10 py-1">
            <Text className="text-[#1F7A3E] text-[18px] font-bold mb-1">Refer & Earn</Text>
            <Text className="text-[#1F2520] text-[13px] font-medium mb-1">Invite friends and earn</Text>
            <Text className="text-[#1F7A3E] text-3xl font-black tracking-tight mb-1">₹500</Text>
            <Text className="text-[#1F2520] text-xs mb-4">for every successful join!</Text>

            <Pressable 
              onPress={() => router.push("/invite" as any)}
              className="bg-[#1F7A3E] self-start px-5 py-3 rounded-xl flex-row items-center active:opacity-90 shadow-sm"
            >
              <Text className="text-white font-bold text-xs tracking-wide mr-2">Invite Now</Text>
              <Ionicons name="chevron-forward" size={14} color="white" />
            </Pressable>
          </View>

          {/* Extracted Animated Characters Illustration */}
          <View className="absolute right-1 bottom-0 w-[185px] h-[160px] justify-end items-end pointer-events-none z-10">
            <Image 
              source={require("../../assets/images/refer-characters.png")} 
              style={{ width: "100%", height: "100%" }} 
              resizeMode="contain" 
            />
          </View>
        </View>

        {/* Connect Section */}
        <View>
          <Text className="text-black text-lg font-bold mb-4 ml-1">Connect</Text>

          <View className="flex-row gap-x-3 mb-6">
            {/* Workout Buddy Card */}
            <Pressable 
              onPress={() => router.push("/tools/workout-buddy" as any)}
              className="flex-1 bg-[#F4F0FF] rounded-[24px] p-5 active:opacity-90 flex-col justify-between"
            >
              <View>
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mb-3 shadow-sm" style={styles.iconShadow}>
                  <Ionicons name="people-outline" size={18} color="#8B5CF6" />
                </View>
                <Text className="text-black font-bold text-[13px] mb-1.5">Find Workout Buddy</Text>
                <Text className="text-gray-500 text-[10px] leading-relaxed pr-2 mb-3">Find someone to stay motivated together</Text>
              </View>
              <View className="bg-white self-start px-3 py-1 rounded-full shadow-sm border border-gray-100">
                <Text className="text-gray-400 text-[9px] font-bold tracking-wide">Coming Soon</Text>
              </View>
            </Pressable>

            {/* Personal Trainer Card */}
            <Pressable 
              onPress={() => router.push("/tools/find-trainer" as any)}
              className="flex-1 bg-[#FFF4ED] rounded-[24px] p-5 active:opacity-90 flex-col justify-between"
            >
              <View>
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mb-3 shadow-sm" style={styles.iconShadow}>
                  <Ionicons name="person-outline" size={18} color="#F97316" />
                </View>
                <Text className="text-black font-bold text-[13px] mb-1.5">Find Personal Trainer</Text>
                <Text className="text-gray-500 text-[10px] leading-relaxed pr-2 mb-3">Connect with certified trainers near you</Text>
              </View>
              <View className="bg-white self-start px-3 py-1 rounded-full shadow-sm border border-gray-100">
                <Text className="text-gray-400 text-[9px] font-bold tracking-wide">Coming Soon</Text>
              </View>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  }
});