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
import { useGuestStore } from "@/store/useGuestStore";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { avatarUrl } = useUserStore();
  const { credits } = useCreditsStore();
  const { isGuest, hoursRemaining, checkExpiry } = useGuestStore();

  React.useEffect(() => {
    if (isGuest && checkExpiry()) {
      router.replace("/guest-expired" as any);
    }
  }, [isGuest]);

  if (isGuest) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
        {/* Guest Header */}
        <View className="flex-row justify-between items-center px-5 pt-4 pb-3 bg-white border-b border-gray-100">
          <View>
            <View className="flex-row items-center">
              <Text className="text-[24px] font-black text-[#111827] tracking-tight">ZonoFit</Text>
              <View className="bg-[#E8F5E9] px-2.5 py-0.5 rounded-full ml-2">
                <Text className="text-[10px] font-extrabold text-[#1F7A3E] uppercase tracking-wider">Guest Mode</Text>
              </View>
            </View>
            <Text className="text-xs font-medium text-gray-500 mt-0.5">Explore gyms & find your fitness home</Text>
          </View>
          <Pressable 
            onPress={() => router.push("/(auth)/create-account")}
            className="bg-[#1F7A3E] px-3.5 py-2 rounded-full active:opacity-90 shadow-sm"
          >
            <Text className="text-white font-bold text-xs">Create Account</Text>
          </Pressable>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16 }}
        >
          {/* Guest Expiry Countdown Banner */}
          <View className="bg-amber-50 border border-amber-200 rounded-[20px] p-4 mb-5 flex-row items-center justify-between shadow-sm">
            <View className="flex-row items-center flex-1 mr-3">
              <Ionicons name="time-outline" size={20} color="#D97706" />
              <View className="ml-2.5 flex-1">
                <Text className="text-xs font-bold text-amber-900">Guest Access Active</Text>
                <Text className="text-[11px] text-amber-700">Expires in {hoursRemaining} hours</Text>
              </View>
            </View>
            <Pressable 
              onPress={() => router.push("/(auth)/create-account")}
              className="bg-white border border-amber-300 px-3 py-1.5 rounded-xl shadow-xs active:bg-amber-100"
            >
              <Text className="text-xs font-bold text-amber-900">Sign Up</Text>
            </Pressable>
          </View>

          {/* PRD Section 8.2 & 8.3: Hero Action Card */}
          <View className="bg-[#1F7A3E] rounded-[30px] p-6 mb-6 shadow-md relative overflow-hidden">
            <View style={{ position: "absolute", top: -20, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.08)" }} />
            
            <View className="bg-white/15 px-3 py-1 rounded-full self-start mb-4">
              <Text className="text-white text-[10px] font-bold tracking-widest uppercase">FITNESS ACCESS NETWORK</Text>
            </View>

            <Text className="text-white text-2xl font-black tracking-tight leading-8 mb-2">
              Make Fitness Fit Into Your Real Life
            </Text>

            <Text className="text-white/85 text-xs font-medium leading-relaxed mb-6">
              Choose a partner gym, activate your membership, and use flexible access based on your plan across our city network.
            </Text>

            {/* Primary CTA: Choose Your Primary Gym */}
            <Pressable 
              onPress={() => router.push("/explore")}
              className="bg-white rounded-2xl py-4 px-5 flex-row items-center justify-center shadow-sm active:bg-gray-100"
            >
              <Ionicons name="compass" size={20} color="#1F7A3E" style={{ marginRight: 8 }} />
              <Text className="text-[#1F7A3E] font-black text-sm tracking-wide">
                Choose Your Primary Gym
              </Text>
            </Pressable>
          </View>

          {/* PRD Section 8.4: Locked Member Sections (No fake 0 values!) */}
          <View className="bg-white rounded-[26px] p-5 mb-6 border border-gray-200 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name="lock-closed" size={16} color="#4B5563" />
                <Text className="text-sm font-bold text-[#111827] ml-2">Member Dashboard</Text>
              </View>
              <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-gray-500 uppercase">Members Only</Text>
              </View>
            </View>

            <Text className="text-xs text-gray-500 leading-relaxed mb-4">
              Your membership dashboard is waiting. Activate your membership to see your visits, credits and booking access.
            </Text>

            <View className="flex-row gap-x-2.5 mb-4">
              <View className="flex-1 bg-gray-50 rounded-2xl p-3 items-center border border-gray-100">
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                <Text className="text-xs font-bold text-gray-700 mt-1">Visits</Text>
                <Text className="text-[10px] text-gray-400 mt-0.5">🔒 Locked</Text>
              </View>
              <View className="flex-1 bg-gray-50 rounded-2xl p-3 items-center border border-gray-100">
                <Ionicons name="flash-outline" size={20} color="#9CA3AF" />
                <Text className="text-xs font-bold text-gray-700 mt-1">Credits</Text>
                <Text className="text-[10px] text-gray-400 mt-0.5">🔒 Locked</Text>
              </View>
              <View className="flex-1 bg-gray-50 rounded-2xl p-3 items-center border border-gray-100">
                <Ionicons name="wallet-outline" size={20} color="#9CA3AF" />
                <Text className="text-xs font-bold text-gray-700 mt-1">Wallet</Text>
                <Text className="text-[10px] text-gray-400 mt-0.5">🔒 Locked</Text>
              </View>
            </View>

            <Pressable 
              onPress={() => router.push("/explore")}
              className="bg-[#1F7A3E] rounded-xl py-3 items-center justify-center active:bg-[#165a2d]"
            >
              <Text className="text-white font-bold text-xs">Activate Membership</Text>
            </Pressable>
          </View>

          {/* PRD Section 8.1: How ZonoFit Works */}
          <View className="bg-white rounded-[26px] p-5 mb-6 border border-gray-200 shadow-sm">
            <Text className="text-base font-black text-[#111827] mb-4">How ZonoFit Works</Text>
            
            <View className="gap-y-4">
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-full bg-[#E8F5E9] items-center justify-center mr-3 mt-0.5">
                  <Text className="text-xs font-bold text-[#1F7A3E]">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#111827]">Choose Your Primary Gym</Text>
                  <Text className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Pick your home fitness center near work or residence from 100+ verified partner gyms.
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-full bg-[#E8F5E9] items-center justify-center mr-3 mt-0.5">
                  <Text className="text-xs font-bold text-[#1F7A3E]">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#111827]">30-Day Flexible Cycle</Text>
                  <Text className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Get mandatory visits for your home gym plus flexible credits in every 30-day membership cycle.
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-full bg-[#E8F5E9] items-center justify-center mr-3 mt-0.5">
                  <Text className="text-xs font-bold text-[#1F7A3E]">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#111827]">Workout Across the Network</Text>
                  <Text className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Travel or explore other gyms anytime using your available ZonoFit credits.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick FAQ Section */}
          <View className="bg-white rounded-[26px] p-5 mb-8 border border-gray-200 shadow-sm">
            <Text className="text-base font-black text-[#111827] mb-3">Frequently Asked Questions</Text>
            
            <View className="py-2.5 border-b border-gray-100">
              <Text className="text-xs font-bold text-gray-800">Can I explore without payment?</Text>
              <Text className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Yes! As a guest you can explore all partner gyms, facilities, and plan prices with zero commitment.
              </Text>
            </View>

            <View className="py-2.5 border-b border-gray-100">
              <Text className="text-xs font-bold text-gray-800">Can I try multiple gyms?</Text>
              <Text className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Yes. While you commit mandatory visits to your Primary Gym, your credits unlock visits at any partner gym in the network.
              </Text>
            </View>

            <View className="pt-2.5">
              <Text className="text-xs font-bold text-gray-800">What happens to unused credits?</Text>
              <Text className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Unused credits automatically convert into an INR wallet upon 30-day expiry, valid for 15 days.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Standard Header */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-4">
        <View>
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight">{user?.username || "Saransh"}</Text>
          <Text className="text-sm font-medium text-[#6B7280] mt-1">Good Morning,</Text>
        </View>
        <View className="flex-row items-center gap-x-3">
          <Pressable 
            onPress={() => router.push("/booking-history")}
            className="w-10 h-10 rounded-full border border-gray-200 items-center justify-center relative bg-white active:bg-gray-100"
          >
            <Ionicons name="notifications-outline" size={20} color="#111827" />
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

      <ScrollView 
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
      >
        {/* Primary Gym Card */}
        <View className="bg-[#1F7A3E] rounded-[32px] p-6 mb-6">
          <Pressable 
            onPress={() => router.push("/explore")}
            className="flex-row justify-between items-start mb-6 active:opacity-80"
          >
            <View>
              <Text className="text-white/70 text-[10px] font-bold tracking-[1.5px] uppercase mb-1">PRIMARY GYM</Text>
              <View className="flex-row items-center">
                <Text className="text-white text-[22px] font-bold tracking-tight">Gold's Gym</Text>
                <Ionicons name="chevron-forward" size={18} color="white" className="ml-1 mt-0.5" />
              </View>
            </View>
            <View className="w-12 h-12 rounded-full bg-white shadow-sm" />
          </Pressable>

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
        <Pressable 
          onPress={() => router.push("/journey")}
          className="bg-white rounded-[32px] p-5 mb-6 border border-gray-100 shadow-sm active:opacity-95" 
          style={styles.cardShadow}
        >
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-[17px] font-bold text-black">Your Journey</Text>
            <View className="flex-row items-center">
              <Text className="text-[#1F7A3E] font-bold text-xs tracking-wide mr-0.5">View Journey</Text>
              <Ionicons name="chevron-forward" size={12} color="#1F7A3E" />
            </View>
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
        </Pressable>

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
              onPress={() => router.push("/future/workout-buddy" as any)}
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
              onPress={() => router.push("/future/personal-trainer" as any)}
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

        {/* Motivation Quote Card */}
        <Pressable 
          onPress={() => router.push("/challenges")}
          className="bg-white rounded-[24px] p-5 mb-8 border border-black/5 shadow-sm active:opacity-95" 
          style={styles.cardShadow}
        >
          <View className="flex-row items-center mb-2.5">
            <View className="w-6 h-6 rounded-full bg-[#EDF7EC] items-center justify-center mr-2">
              <Text className="text-xs">⚡</Text>
            </View>
            <Text className="text-[#0B6E4F] text-[11px] font-bold uppercase tracking-wider">Daily Motivation • Day 24</Text>
          </View>
          <Text className="text-[#1F2520] text-[15px] font-bold italic leading-relaxed">
            "Consistency beats intensity. You've already outperformed the person who stayed home."
          </Text>
        </Pressable>

        {/* More Coming Your Way Section */}
        <View className="mb-10">
          <View className="flex-row items-center mb-4 ml-1">
            <Ionicons name="globe-outline" size={18} color="#0B6E4F" />
            <Text className="text-[#1F2520] text-[16px] font-bold ml-2">More Coming Your Way</Text>
          </View>

          {/* 4 Locked Feature Grid Cards */}
          <View className="flex-row gap-x-2.5">
            {/* Nutrition */}
            <Pressable 
              onPress={() => router.push("/future/nutrition" as any)}
              className="flex-1 bg-white rounded-2xl py-4 px-1 items-center border border-black/5 shadow-sm relative active:bg-gray-50"
            >
              <Ionicons name="lock-closed" size={10} color="#9CA3AF" className="absolute top-2 right-2" />
              <View className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center mb-1">
                <Ionicons name="nutrition-outline" size={20} color="#1F2520" />
              </View>
              <Text className="text-[11px] font-semibold text-[#1F2520] mt-1 text-center">Nutrition</Text>
            </Pressable>

            {/* AI Coach */}
            <Pressable 
              onPress={() => router.push("/future/ai-coach" as any)}
              className="flex-1 bg-white rounded-2xl py-4 px-1 items-center border border-black/5 shadow-sm relative active:bg-gray-50"
            >
              <Ionicons name="lock-closed" size={10} color="#9CA3AF" className="absolute top-2 right-2" />
              <View className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center mb-1">
                <Ionicons name="hardware-chip-outline" size={20} color="#1F2520" />
              </View>
              <Text className="text-[11px] font-semibold text-[#1F2520] mt-1 text-center">AI Coach</Text>
            </Pressable>

            {/* Home Workout */}
            <Pressable 
              onPress={() => router.push("/future/home-workout" as any)}
              className="flex-1 bg-white rounded-2xl py-4 px-1 items-center border border-black/5 shadow-sm relative active:bg-gray-50"
            >
              <Ionicons name="lock-closed" size={10} color="#9CA3AF" className="absolute top-2 right-2" />
              <View className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center mb-1">
                <Ionicons name="home-outline" size={20} color="#1F2520" />
              </View>
              <Text className="text-[11px] font-semibold text-[#1F2520] mt-1 text-center">Home Workout</Text>
            </Pressable>

            {/* Community */}
            <Pressable 
              onPress={() => router.push("/future/community" as any)}
              className="flex-1 bg-white rounded-2xl py-4 px-1 items-center border border-black/5 shadow-sm relative active:bg-gray-50"
            >
              <Ionicons name="lock-closed" size={10} color="#9CA3AF" className="absolute top-2 right-2" />
              <View className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center mb-1">
                <Ionicons name="people-outline" size={20} color="#1F2520" />
              </View>
              <Text className="text-[11px] font-semibold text-[#1F2520] mt-1 text-center">Community</Text>
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