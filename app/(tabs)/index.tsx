import React, { useRef, useEffect } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  Image,
  StyleSheet,
  Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useBookingStore } from "@/store/useBookingStore";

function BlinkingRedDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DC2626',
        opacity,
      }}
    />
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning,";
  if (hour < 17) return "Good Afternoon,";
  return "Good Evening,";
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { 
    avatarUrl, 
    visitsRemaining, 
    planName, 
    primaryGymName: userPrimaryGymName,
    primaryGymId: userPrimaryGymId,
    streak, 
    totalWorkouts, 
    trainingHours, 
    currentMonth, 
    totalMonths, 
    identityStage, 
    progressPercentage, 
    nextMilestone 
  } = useUserStore();
  const { credits, membershipInfo } = useCreditsStore();
  const { isGuest, hoursRemaining, checkExpiry, endGuestSession, selectedGymName, selectedGymId } = useGuestStore();
  const { bookingStatus, bookedGymName, bookedTime } = useBookingStore();

  React.useEffect(() => {
    if (token) {
      useCreditsStore.getState().fetchWallet(token);
      useUserStore.getState().fetchProfile(token);
    }
  }, [token]);

  const resolvedGymName = (
    membershipInfo?.gymName && 
    membershipInfo.gymName !== "None" && 
    membershipInfo.gymName !== "Select a Gym" && 
    membershipInfo.gymName !== "Primary Gym" &&
    membershipInfo.gymName !== "ZonoFit Partner Gym"
  ) ? membershipInfo.gymName 
    : (userPrimaryGymName || selectedGymName || user?.primaryGym || "FitZone Pro");

  const mandatoryVisits = membershipInfo?.mandatoryVisits ?? (visitsRemaining > 0 ? visitsRemaining + totalWorkouts : 10);
  const completedVisits = membershipInfo?.completedVisits ?? totalWorkouts ?? 0;
  const visitsLeft = membershipInfo?.mandatoryVisitsRemaining ?? (visitsRemaining > 0 ? visitsRemaining : Math.max(0, mandatoryVisits - completedVisits));

  const isExpired = membershipInfo ? membershipInfo.isExpired : false;
  const isMembershipActive = membershipInfo ? (!membershipInfo.isExpired && membershipInfo.status === "ACTIVE") : false;
  const daysRemaining = membershipInfo?.daysRemaining ?? 0;
  const isExpiringSoon = isMembershipActive && daysRemaining <= 3 && daysRemaining > 0;
  const showRenewalAlert = isExpired || isExpiringSoon;

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
            onPress={async () => {
              await endGuestSession();
              router.replace("/(auth)/create-account");
            }}
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
              onPress={async () => {
                await endGuestSession();
                router.replace("/(auth)/create-account");
              }}
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
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight">{user?.username || "ZonoFit Member"}</Text>
          <Text className="text-sm font-medium text-[#6B7280] mt-1">{getGreeting()}</Text>
        </View>
        <View className="flex-row items-center gap-x-3">
          <Pressable 
            onPress={() => router.push("/notifications" as any)}
            className="w-10 h-10 rounded-full border border-gray-200 items-center justify-center relative bg-white active:bg-gray-100"
          >
            <Ionicons name="notifications-outline" size={20} color="#111827" />
            <View className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-orange-500 border border-white" />
          </Pressable>
          <Pressable onPress={() => router.push("/profile")}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="w-10 h-10 rounded-full bg-gray-200" />
            ) : (
              <View className="w-10 h-10 rounded-full bg-[#1F7A3E]/10 border border-[#1F7A3E]/20 items-center justify-center">
                <Text className="text-[#1F7A3E] font-extrabold text-sm">
                  {(user?.username || user?.phone || "Z")[0].toUpperCase()}
                </Text>
              </View>
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
        {/* Renewal / Expiry Alert Banner */}
        {showRenewalAlert && (
          <View className="mb-4 bg-red-50 border border-red-200 rounded-[24px] p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="mr-2.5">
                  <BlinkingRedDot />
                </View>
                <Text className="text-sm font-black text-red-700">
                  {isExpired ? "Membership Expired" : `Plan About to Expire (${daysRemaining}d left)`}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/membership")}
                className="bg-red-600 active:bg-red-700 rounded-xl px-3 py-1.5 flex-row items-center shadow-sm"
              >
                <Text className="text-white font-extrabold text-[11px] uppercase tracking-wider">Renew Now</Text>
              </Pressable>
            </View>
            <Text className="text-xs text-red-600 leading-relaxed">
              {isExpired 
                ? "Your membership cycle has ended. Renew now to continue booking gym visits."
                : "Your plan is about to expire in 3 days. Renew now to avoid workout interruptions."}
            </Text>
          </View>
        )}

        {/* Primary Gym Card */}
        <View style={{ backgroundColor: '#1F7A3E', borderRadius: 32, padding: 24, marginBottom: 24 }}>
          <Pressable 
            onPress={() => router.push("/partner-gyms" as any)}
            className="flex-row justify-between items-start mb-6 active:opacity-80"
          >
            <View>
              <Text className="text-white/70 text-[10px] font-bold tracking-[1.5px] uppercase mb-1">PRIMARY GYM</Text>
              <View className="flex-row items-center">
                <Text className="text-white text-[22px] font-bold tracking-tight">{resolvedGymName}</Text>
                <Ionicons name="chevron-forward" size={18} color="white" className="ml-1 mt-0.5" />
              </View>
            </View>
            <View className="w-12 h-12 rounded-full bg-white shadow-sm items-center justify-center overflow-hidden border border-white/20">
              <Image 
                source={require("@/assets/Zonofit_final_logo.jpeg")} 
                style={{ width: 44, height: 44, borderRadius: 22 }}
                resizeMode="cover"
              />
            </View>
          </Pressable>

          <View className="flex-row justify-between items-end mb-2">
            <View>
              <Text className="text-white/70 text-xs mb-1">Completed Visits</Text>
              <Text className="text-white text-[32px] font-bold leading-9">
                {completedVisits} <Text className="text-white/70 text-lg font-normal">/ {mandatoryVisits}</Text>
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-white/70 text-xs mb-1">Visits Left</Text>
              <Text className="text-white text-[32px] font-bold leading-9">{visitsLeft}</Text>
            </View>
          </View>

          {/* Dynamic Progress Bar */}
          {(() => {
            const totalVisits = mandatoryVisits;
            const completed = completedVisits;
            const segments = Math.max(totalVisits, 1);
            return (
              <View className="flex-row gap-x-1.5 mb-6 w-full">
                {[...Array(segments)].map((_, i) => (
                  <View 
                    key={i} 
                    className={`flex-1 h-1.5 rounded-full ${i < completed ? 'bg-[#28C76F]' : 'bg-white border border-white border-dashed bg-transparent opacity-60'}`} 
                    style={i >= completed ? { backgroundColor: 'transparent', borderStyle: 'dashed' } : {}}
                  />
                ))}
              </View>
            );
          })()}

          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <View className="w-5 h-5 rounded-full bg-yellow-500/20 items-center justify-center mr-1.5">
                <Text className="text-yellow-500 text-[10px] font-bold">🪙</Text>
              </View>
              <Text className="text-white text-sm font-medium">Available Credits: {credits}</Text>
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

        {/* Today Section — Dynamic based on booking status */}
        <View className="bg-white rounded-[24px] p-5 mb-6 border border-gray-100 shadow-sm" style={styles.cardShadow}>
          <Text className="text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-3">TODAY</Text>
          {bookingStatus === "Not Booked" ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                  <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                </View>
                <Text className="text-sm text-gray-500 font-medium">No workout booked</Text>
              </View>
              <Pressable 
                onPress={() => router.push("/explore")}
                className="bg-[#1F7A3E] px-4 py-2 rounded-xl active:opacity-90"
              >
                <Text className="text-white font-bold text-xs">Book Visit</Text>
              </Pressable>
            </View>
          ) : bookingStatus === "Booked" ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#E8F5E9] items-center justify-center mr-3">
                  <Ionicons name="checkmark-circle" size={20} color="#1F7A3E" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-[#111827]">Workout Booked</Text>
                  <Text className="text-xs text-gray-500">{bookedGymName} • {bookedTime || "Today"}</Text>
                </View>
              </View>
              <Pressable 
                onPress={() => router.push("/scan-modal" as any)}
                className="bg-[#1F7A3E] px-4 py-2 rounded-xl active:opacity-90"
              >
                <Text className="text-white font-bold text-xs">View Pass</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#FEF3C7] items-center justify-center mr-3">
                <Text className="text-lg">🔥</Text>
              </View>
              <View>
                <Text className="text-sm font-bold text-[#111827]">Checked In Successfully</Text>
                <Text className="text-xs text-gray-500">Great Work! Keep the momentum going.</Text>
              </View>
            </View>
          )}
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
                Month {membershipInfo?.cycleNumber ?? currentMonth} <Text className="text-gray-400 font-normal">/ {membershipInfo?.maxCycles ?? totalMonths}</Text>
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-[10px] font-bold tracking-wider mb-1">Current Phase</Text>
              <View className="bg-[#E8F5E9] px-3 py-1 rounded-full border border-green-500/10">
                <Text className="text-[#1F7A3E] text-[10px] font-bold tracking-wide">{identityStage || "Foundation"}</Text>
              </View>
            </View>
          </View>

          {/* 12-Segment Progress Bar */}
          <View className="flex-row gap-x-1.5 mb-6 w-full">
            {[...Array((membershipInfo?.maxCycles ?? totalMonths) || 12)].map((_, i) => (
              <View 
                key={i} 
                className={`flex-1 h-1.5 rounded-full ${i < (membershipInfo?.cycleNumber ?? currentMonth) ? 'bg-[#1F7A3E]' : 'bg-gray-200'}`} 
              />
            ))}
          </View>

          <View className="h-[1px] bg-gray-100 w-full mb-4" />

          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-gray-400 text-[10px] tracking-wide mb-1">Completed Visits</Text>
              <Text className="text-black text-xl font-bold">{totalWorkouts}</Text>
            </View>

            <View className="w-[1px] h-8 bg-gray-200 mx-2" />

            <View className="flex-1 pl-2">
              <Text className="text-gray-400 text-[10px] tracking-wide mb-1">Money Saved</Text>
              <Text className="text-[#1F7A3E] text-xl font-bold">₹{Math.round(totalWorkouts * 90).toLocaleString()}</Text>
            </View>

            <View className="w-10 h-10 rounded-full bg-[#E8F5E9] items-center justify-center">
              <Text className="text-lg">🐷</Text>
            </View>
          </View>
        </Pressable>

        {/* Refer & Earn Card */}
        <View 
          style={[{
            backgroundColor: '#EDF7EC',
            borderRadius: 24,
            padding: 24,
            marginBottom: 32,
            flexDirection: 'row',
            justifyContent: 'space-between',
            overflow: 'hidden',
            position: 'relative',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)',
          }, styles.cardShadow]}
        >
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

        {/* Connect Section — Colors match internal screens */}
        <View>
          <Text className="text-black text-lg font-bold mb-4 ml-1">Connect</Text>

          <View className="flex-row gap-x-3 mb-6">
            {/* Workout Buddy Card — Soft Lavender theme with white circular icon */}
            <Pressable 
              onPress={() => router.push("/future/workout-buddy" as any)}
              className="flex-1 rounded-[24px] p-5 active:opacity-90 flex-col justify-between overflow-hidden relative"
              style={{ backgroundColor: '#F6F3FD', borderWidth: 1, borderColor: '#EDE9FE' }}
            >
              <View>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#EDE9FE', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
                  <Ionicons name="people-outline" size={21} color="#7C3AED" />
                </View>
                <Text className="text-[#0F172A] font-bold text-[14.5px] mb-1.5">Find Workout Buddy</Text>
                <Text style={{ color: '#64748B', fontSize: 10.5, lineHeight: 15, marginBottom: 14 }}>Find someone to stay motivated together</Text>
              </View>
              <View style={{ backgroundColor: '#FFFFFF', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4.5, borderRadius: 14, borderWidth: 1, borderColor: '#EDE9FE', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
                <Text style={{ color: '#64748B', fontSize: 9.5, fontWeight: '700' }}>Coming Soon</Text>
              </View>
            </Pressable>

            {/* Personal Trainer Card — Soft Peach/Cream theme with white circular icon */}
            <Pressable 
              onPress={() => router.push("/future/personal-trainer" as any)}
              className="flex-1 rounded-[24px] p-5 active:opacity-90 flex-col justify-between overflow-hidden relative"
              style={{ backgroundColor: '#FFF5EC', borderWidth: 1, borderColor: '#FED7AA' }}
            >
              <View>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#FED7AA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
                  <Ionicons name="person-outline" size={21} color="#D97706" />
                </View>
                <Text className="text-[#0F172A] font-bold text-[14.5px] mb-1.5">Find Personal Trainer</Text>
                <Text style={{ color: '#64748B', fontSize: 10.5, lineHeight: 15, marginBottom: 14 }}>Connect with certified trainers near you</Text>
              </View>
              <View style={{ backgroundColor: '#FFFFFF', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4.5, borderRadius: 14, borderWidth: 1, borderColor: '#FED7AA', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
                <Text style={{ color: '#64748B', fontSize: 9.5, fontWeight: '700' }}>Coming Soon</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Motivation Quote Card */}
        <Pressable 
          onPress={() => router.push("/motivation" as any)}
          className="bg-white rounded-[24px] p-5 mb-8 border border-black/5 shadow-sm active:opacity-95" 
          style={styles.cardShadow}
        >
          <View className="flex-row items-center mb-2.5">
            <View className="w-6 h-6 rounded-full bg-[#EDF7EC] items-center justify-center mr-2">
              <Text className="text-xs">⚡</Text>
            </View>
            <Text className="text-[#0B6E4F] text-[11px] font-bold uppercase tracking-wider">Daily Motivation • Day {streak || 1}</Text>
          </View>
          <Text className="text-[#1F2520] text-[15px] font-bold italic leading-relaxed">
            "Consistency beats intensity. You've already outperformed the person who stayed home."
          </Text>
        </Pressable>

        {/* More Coming Your Way — Premium Glassmorphism Locked Features */}
        <View className="mb-10">
          <View className="flex-row items-center mb-4 ml-1">
            <Ionicons name="sparkles" size={17} color="#1F7A3E" />
            <Text className="text-[#1F2520] text-[16px] font-bold ml-2">More Coming Your Way</Text>
          </View>

          {/* 2x2 Glassmorphism Locked Grid */}
          <View className="gap-y-3">
            <View className="flex-row gap-x-3">
              {/* Nutrition — Warm Orange matching /future/nutrition */}
              <Pressable 
                onPress={() => router.push("/future/nutrition" as any)}
                className="flex-1 rounded-[22px] overflow-hidden active:opacity-90"
                style={styles.glassCard}
              >
                <View style={styles.glassCardInner}>
                  <View style={[styles.glassIconWrap, { backgroundColor: '#FFEDD5' }]}>
                    <Ionicons name="nutrition" size={22} color="#EA580C" />
                  </View>
                  <Text style={styles.glassCardTitle}>Nutrition</Text>
                  <Text style={styles.glassCardSub}>Track meals & macros</Text>
                </View>
                {/* Premium Glassmorphism lock overlay */}
                <View style={styles.glassOverlay}>
                  <View style={styles.glassLockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
                    <Text style={styles.glassLockText}>Coming Soon</Text>
                  </View>
                </View>
              </Pressable>

              {/* AI Coaching — Purple matching /future/ai-coach */}
              <Pressable 
                onPress={() => router.push("/future/ai-coach" as any)}
                className="flex-1 rounded-[22px] overflow-hidden active:opacity-90"
                style={styles.glassCard}
              >
                <View style={styles.glassCardInner}>
                  <View style={[styles.glassIconWrap, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="hardware-chip" size={22} color="#7C3AED" />
                  </View>
                  <Text style={styles.glassCardTitle}>AI Coaching</Text>
                  <Text style={styles.glassCardSub}>Smart fitness guidance</Text>
                </View>
                <View style={styles.glassOverlay}>
                  <View style={styles.glassLockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
                    <Text style={styles.glassLockText}>Coming Soon</Text>
                  </View>
                </View>
              </Pressable>
            </View>

            <View className="flex-row gap-x-3">
              {/* Home Workout — Emerald matching /future/home-workout */}
              <Pressable 
                onPress={() => router.push("/future/home-workout" as any)}
                className="flex-1 rounded-[22px] overflow-hidden active:opacity-90"
                style={styles.glassCard}
              >
                <View style={styles.glassCardInner}>
                  <View style={[styles.glassIconWrap, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="home" size={22} color="#059669" />
                  </View>
                  <Text style={styles.glassCardTitle}>Home Workout</Text>
                  <Text style={styles.glassCardSub}>Exercise at home</Text>
                </View>
                <View style={styles.glassOverlay}>
                  <View style={styles.glassLockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
                    <Text style={styles.glassLockText}>Coming Soon</Text>
                  </View>
                </View>
              </Pressable>

              {/* Community — Blue matching /future/community */}
              <Pressable 
                onPress={() => router.push("/future/community" as any)}
                className="flex-1 rounded-[22px] overflow-hidden active:opacity-90"
                style={styles.glassCard}
              >
                <View style={styles.glassCardInner}>
                  <View style={[styles.glassIconWrap, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="people" size={22} color="#2563EB" />
                  </View>
                  <Text style={styles.glassCardTitle}>Community</Text>
                  <Text style={styles.glassCardSub}>Connect & compete</Text>
                </View>
                <View style={styles.glassOverlay}>
                  <View style={styles.glassLockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
                    <Text style={styles.glassLockText}>Coming Soon</Text>
                  </View>
                </View>
              </Pressable>
            </View>
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
  },
  glassCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  glassCardInner: {
    padding: 16,
    alignItems: "flex-start",
  },
  glassIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  glassCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  glassCardSub: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  glassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.52)",
    alignItems: "center",
    justifyContent: "center",
  },
  glassLockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.78)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 16,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  glassLockText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});