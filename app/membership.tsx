import React, { useEffect } from "react";
import { ScrollView, Text, View, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function MembershipScreen() {
  const router = useRouter();
  const { 
    membershipStatus, 
    membershipExpiry, 
    visitsRemaining, 
    primaryGymName, 
    currentMonth,
    totalWorkouts 
  } = useUserStore();
  const { credits, membershipInfo, fetchWallet } = useCreditsStore();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchWallet(token);
      useUserStore.getState().fetchProfile(token);
    }
  }, [token]);

  const cycleNumber = membershipInfo?.cycleNumber ?? currentMonth ?? 1;
  const maxCycles = membershipInfo?.maxCycles ?? 12;
  const isExpired = membershipInfo?.isExpired || membershipStatus === "EXPIRED";
  const isExpiringSoon = membershipInfo?.isExpiringSoon || false;
  const daysRemaining = membershipInfo?.daysRemaining ?? (membershipStatus === "ACTIVE" ? 30 : 0);

  // Exact Business Rule:
  // First 4 months (1-4) -> first 10 days credits are cut (10 mandatory visits)
  // Months 5-12 -> first 15 days credits are cut (15 mandatory visits)
  const isFoundationPhase = cycleNumber <= 4;
  const mandatoryVisitsTotal = isFoundationPhase ? 10 : 15;
  const completedVisits = membershipInfo?.completedVisits ?? 0;
  const mandatoryVisitsRemaining = Math.max(0, mandatoryVisitsTotal - completedVisits);

  const gymName = membershipInfo?.gymName || primaryGymName || "Being Fitness";

  const handleRenew = () => {
    router.push("/onboarding/order-summary?mode=repurchase" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between bg-white border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <View className="items-center">
          <Text className="text-lg font-black text-[#111827]">My Membership</Text>
          <Text className="text-[11px] text-gray-500 font-medium">12-Month Common Fitness Plan</Text>
        </View>
        <Pressable
          onPress={() => router.push("/content?type=faq_general" as any)}
          className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center border border-emerald-100"
          hitSlop={8}
        >
          <Ionicons name="help-circle-outline" size={20} color="#1F7A3E" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* ======================================================== */}
        {/* 1. CURRENT MEMBERSHIP HERO CARD                          */}
        {/* ======================================================== */}
        <View className="mx-5 mt-4 mb-4">
          <View className="rounded-[28px] p-6 bg-[#1F7A3E] relative overflow-hidden shadow-sm">
            {/* Background geometric accents */}
            <View style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.08)" }} />
            <View style={{ position: "absolute", bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.05)" }} />

            {/* Badge & Month indicator */}
            <View className="flex-row justify-between items-center mb-3">
              <View className="bg-white/20 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-black tracking-wide uppercase">
                  Month {cycleNumber} of {maxCycles}
                </Text>
              </View>
              <View className="bg-emerald-400/30 px-3 py-1 rounded-full flex-row items-center border border-white/20">
                <View className="w-2 h-2 rounded-full bg-white mr-1.5" />
                <Text className="text-white text-xs font-bold uppercase">
                  {isExpired ? "Expired" : "Active Plan"}
                </Text>
              </View>
            </View>

            <Text className="text-white text-[24px] font-black tracking-tight mb-1">
              ZonoFit Monthly Membership
            </Text>
            <View className="flex-row items-center mb-4">
              <Ionicons name="location-sharp" size={14} color="#A7F3D0" style={{ marginRight: 4 }} />
              <Text className="text-emerald-100 text-xs font-semibold" numberOfLines={1}>
                Primary Gym: {gymName}
              </Text>
            </View>

            {/* Stats Split */}
            <View className="flex-row gap-x-3 mb-4">
              <View className="flex-1 bg-white/15 rounded-2xl p-3 border border-white/10">
                <Text className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                  Mandatory Visits
                </Text>
                <Text className="text-white text-2xl font-black">
                  {mandatoryVisitsRemaining}
                </Text>
                <Text className="text-emerald-200 text-[11px] font-medium mt-0.5">
                  of {mandatoryVisitsTotal} visits left
                </Text>
              </View>

              <View className="flex-1 bg-white/15 rounded-2xl p-3 border border-white/10">
                <Text className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                  Rest Credits
                </Text>
                <Text className="text-white text-2xl font-black">{credits}</Text>
                <Text className="text-emerald-200 text-[11px] font-medium mt-0.5">
                  Spend anywhere
                </Text>
              </View>
            </View>

            <View className="h-[1px] bg-white/20 mb-3" />

            {/* Footer row with validity & renew */}
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-emerald-100 text-[11px]">
                  {isExpired ? "Cycle ended" : `Valid for ${daysRemaining} more days`}
                </Text>
                <Text className="text-white text-xs font-bold mt-0.5">
                  {isExpired ? "Please renew to continue" : `Expires ${membershipExpiry}`}
                </Text>
              </View>

              <Pressable
                onPress={handleRenew}
                className="bg-white px-4 py-2 rounded-xl active:bg-gray-100 shadow-sm"
              >
                <Text className="text-[#1F7A3E] text-xs font-black uppercase tracking-wider">
                  {isExpired ? "Renew Plan" : "Repurchase"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 2. THE CORE RULE: MONTHLY PRIMARY GYM ALLOCATION CARD    */}
        {/* ======================================================== */}
        <View className="mx-5 bg-white rounded-[26px] p-5 border border-gray-200 shadow-sm mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center mr-2.5 border border-emerald-100">
                <Ionicons name="calendar" size={16} color="#1F7A3E" />
              </View>
              <Text className="text-sm font-extrabold text-[#111827]">
                Monthly Primary Gym Allocation
              </Text>
            </View>
            <View className="bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              <Text className="text-[10px] font-extrabold text-[#1F7A3E]">
                {isFoundationPhase ? "10 Days Cut" : "15 Days Cut"}
              </Text>
            </View>
          </View>

          <Text className="text-xs text-gray-500 mb-4 leading-relaxed">
            {isFoundationPhase
              ? `You are in Month ${cycleNumber} of 12 (Foundation Phase). When your monthly payment is made, the first 10 days of credits are cut and reserved as mandatory visits at ${gymName}.`
              : `You are in Month ${cycleNumber} of 12 (Progression Phase). When your monthly payment is made, the first 15 days of credits are cut and reserved as mandatory visits at ${gymName}.`}
          </Text>

          {/* Progress Box */}
          <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-bold text-gray-700">Visits Progress</Text>
              <Text className="text-xs font-black text-[#1F7A3E]">
                {completedVisits} / {mandatoryVisitsTotal} Completed
              </Text>
            </View>

            {/* Segmented bar */}
            <View className="flex-row gap-1 w-full mb-2">
              {[...Array(mandatoryVisitsTotal)].map((_, i) => (
                <View
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    i < completedVisits ? "bg-[#1F7A3E]" : "bg-gray-200"
                  }`}
                />
              ))}
            </View>

            <Text className="text-[11px] text-gray-500">
              {mandatoryVisitsRemaining > 0
                ? `${mandatoryVisitsRemaining} mandatory visits remaining to complete this month's commitment.`
                : "Great work! You have completed all mandatory visits for this cycle."}
            </Text>
          </View>

          <View className="flex-row items-center gap-x-2 pt-1">
            <Ionicons name="information-circle" size={16} color="#059669" />
            <Text className="text-[11px] text-gray-600 flex-1 leading-snug">
              Mandatory visits build your consistency habit first. Once completed, your remaining credits are completely flexible.
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 3. 12-MONTH TRANSFORMATION ROADMAP                       */}
        {/* ======================================================== */}
        <View className="mx-5 bg-white rounded-[26px] p-5 border border-gray-200 shadow-sm mb-4">
          <Text className="text-sm font-extrabold text-[#111827] mb-1">
            12-Month Common Plan Structure
          </Text>
          <Text className="text-xs text-gray-500 mb-4">
            One single unified membership that evolves as your fitness consistency grows.
          </Text>

          {/* Phase 1: Months 1-4 */}
          <View
            className={`p-4 rounded-2xl mb-3 border ${
              isFoundationPhase
                ? "bg-emerald-50/70 border-emerald-300"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <View className="flex-row justify-between items-center mb-1">
              <View className="flex-row items-center">
                <Text className="text-sm font-black text-[#111827]">
                  Months 1 to 4: Foundation Phase
                </Text>
                {isFoundationPhase && (
                  <View className="bg-[#1F7A3E] px-2 py-0.5 rounded-full ml-2">
                    <Text className="text-white text-[9px] font-black uppercase">Current Phase</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs font-black text-[#1F7A3E]">10 Visits / Mo</Text>
            </View>
            <Text className="text-xs text-gray-600 leading-relaxed">
              First 10 days of credits are cut for primary gym visits. Builds showing up regularly without overwhelming your routine.
            </Text>
          </View>

          {/* Phase 2: Months 5-12 */}
          <View
            className={`p-4 rounded-2xl border ${
              !isFoundationPhase
                ? "bg-emerald-50/70 border-emerald-300"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <View className="flex-row justify-between items-center mb-1">
              <View className="flex-row items-center">
                <Text className="text-sm font-black text-[#111827]">
                  Months 5 to 12: Progression Phase
                </Text>
                {!isFoundationPhase && (
                  <View className="bg-[#1F7A3E] px-2 py-0.5 rounded-full ml-2">
                    <Text className="text-white text-[9px] font-black uppercase">Current Phase</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs font-black text-[#1F7A3E]">15 Visits / Mo</Text>
            </View>
            <Text className="text-xs text-gray-600 leading-relaxed">
              First 15 days of credits are cut for primary gym visits. Solidifies your fitness identity and long-term athletic discipline.
            </Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 4. FLEXIBLE CREDITS & ANTI-WASTAGE GUARANTEE             */}
        {/* ======================================================== */}
        <View className="mx-5 bg-white rounded-[26px] p-5 border border-gray-200 shadow-sm mb-4">
          <Text className="text-sm font-extrabold text-[#111827] mb-3">
            What Happens to Remaining Credits?
          </Text>

          <View className="flex-row items-start mb-3">
            <View className="w-7 h-7 rounded-full bg-emerald-50 items-center justify-center mr-3 mt-0.5">
              <Ionicons name="globe-outline" size={15} color="#1F7A3E" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-[#111827]">Network Gym Access</Text>
              <Text className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                Use your remaining credits to book sessions at any other partner gym in the ZonoFit network.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start mb-3">
            <View className="w-7 h-7 rounded-full bg-emerald-50 items-center justify-center mr-3 mt-0.5">
              <Ionicons name="cart-outline" size={15} color="#1F7A3E" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-[#111827]">Marketplace & Supplements</Text>
              <Text className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                Apply your available credits or converted wallet balances toward genuine supplements and gear in the shop.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="w-7 h-7 rounded-full bg-amber-50 items-center justify-center mr-3 mt-0.5 border border-amber-100">
              <Ionicons name="shield-checkmark-outline" size={15} color="#D97706" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-[#111827]">15-Day Anti-Wastage Protection</Text>
              <Text className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                When your 30-day plan expires, unused credits automatically convert to spendable INR cash valid for 15 days for repurchases or orders.
              </Text>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 5. PRIMARY CTA BUTTON                                    */}
        {/* ======================================================== */}
        <View className="mx-5 mt-2">
          {isExpired || isExpiringSoon ? (
            <Pressable
              onPress={handleRenew}
              className="bg-[#1F7A3E] active:bg-[#186031] py-4 rounded-2xl flex-row items-center justify-center shadow-sm"
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text className="text-white font-black text-sm uppercase tracking-wider">
                Renew Membership for Month {cycleNumber >= 12 ? 1 : cycleNumber + 1}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/booking-pass" as any)}
              className="bg-gray-900 active:bg-black py-4 rounded-2xl flex-row items-center justify-center shadow-sm"
            >
              <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text className="text-white font-black text-sm uppercase tracking-wider">
                View Check-in Pass
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
