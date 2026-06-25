import React from "react";
import { ScrollView, Text, View, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { membershipPlans } from "@/data/plans";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";

export default function MembershipScreen() {
  const router = useRouter();
  const { planName, membershipStatus, membershipExpiry, visitsRemaining } = useUserStore();
  const { credits } = useCreditsStore();

  // Derive current plan id from planName (mock)
  const currentPlanId = planName.toLowerCase().includes("premium")
    ? "premium"
    : planName.toLowerCase().includes("standard")
    ? "standard"
    : "basic";

  const currentPlan = membershipPlans.find((p) => p.id === currentPlanId);

  const handleUpgrade = (planName: string) => {
    Alert.alert(
      "Upgrade Plan",
      `This will redirect you to the payment flow to upgrade to the ${planName} plan. Payment integration coming soon.`,
      [{ text: "OK" }]
    );
  };

  const handleRenew = () => {
    Alert.alert(
      "Renew Membership",
      "Membership renewal will be processed via the payment gateway. Payment integration coming soon.",
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white items-center justify-center border border-black/5 shadow-sm"
        >
          <Ionicons name="arrow-back" size={18} color="#1F2520" />
        </Pressable>
        <Text className="text-lg font-bold text-[#1F2520]">Membership</Text>
        <View className="w-9" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Current Plan Card */}
        <View className="mx-5 mb-6">
          <View
            className="rounded-[28px] p-6 overflow-hidden relative"
            style={{ backgroundColor: currentPlan?.color ?? "#6BCB77" }}
          >
            <View style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.1)" }} />

            <View className="flex-row justify-between items-start mb-3">
              <View>
                <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider">Current Plan</Text>
                <Text className="text-white text-2xl font-black mt-0.5">{currentPlan?.name ?? planName}</Text>
              </View>
              <Text style={{ fontSize: 28 }}>{currentPlan?.emoji}</Text>
            </View>

            <View className="flex-row gap-x-4 mb-4">
              <View className="bg-white/15 rounded-xl px-3 py-2 items-center">
                <Text className="text-white text-base font-black">{credits}</Text>
                <Text className="text-white/70 text-[10px] uppercase font-medium mt-0.5">Credits Left</Text>
              </View>
              <View className="bg-white/15 rounded-xl px-3 py-2 items-center">
                <Text className="text-white text-base font-black">{visitsRemaining}</Text>
                <Text className="text-white/70 text-[10px] uppercase font-medium mt-0.5">Visits Left</Text>
              </View>
            </View>

            <View className="h-[1px] bg-white/20 mb-3" />

            <View className="flex-row justify-between items-center">
              <Text className="text-white/80 text-xs">{membershipStatus} · Expires {membershipExpiry}</Text>
              <Pressable
                onPress={handleRenew}
                className="bg-white/20 border border-white/25 px-4 py-1.5 rounded-full"
              >
                <Text className="text-white text-xs font-bold">Renew</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* What's included */}
        {currentPlan && (
          <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-5">
            <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-3">What's Included</Text>
            {currentPlan.features.map((feature, i) => (
              <View key={i} className="flex-row items-center py-2 border-b border-[#F5F7F4] last:border-0">
                <View className="w-5 h-5 rounded-full bg-[#EAF7EC] items-center justify-center mr-3">
                  <Ionicons name="checkmark" size={12} color="#10B981" />
                </View>
                <Text className="text-sm text-[#4A5043] flex-1">{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {/* All Plans */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">All Plans</Text>
        <View className="px-5 gap-y-3 mb-6">
          {membershipPlans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <View
                key={plan.id}
                className={`bg-white rounded-[24px] p-5 border shadow-sm ${isCurrent ? "border-[#6BCB77]" : "border-black/5"}`}
              >
                {/* Plan header */}
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center gap-x-2">
                    <Text style={{ fontSize: 22 }}>{plan.emoji}</Text>
                    <View>
                      <View className="flex-row items-center gap-x-2">
                        <Text className="font-bold text-base text-[#1F2520]">{plan.name}</Text>
                        {plan.isPopular && (
                          <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                            <Text className="text-blue-700 text-[10px] font-bold">Most Popular</Text>
                          </View>
                        )}
                        {isCurrent && (
                          <View className="bg-[#EAF7EC] px-2 py-0.5 rounded-full">
                            <Text className="text-[#059669] text-[10px] font-bold">Current</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[10px] text-[#6B756E] mt-0.5">{plan.networkAccess}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-black text-[#1F2520]">₹{plan.pricePerMonth}</Text>
                    <Text className="text-[10px] text-[#6B756E]">/month</Text>
                  </View>
                </View>

                {/* Credits + Visits */}
                <View className="flex-row gap-x-3 mb-4">
                  <View className="flex-1 bg-[#F5F7F4] rounded-xl p-2.5 items-center">
                    <Text className="text-sm font-bold text-[#1F2520]">{plan.creditsPerMonth}</Text>
                    <Text className="text-[10px] text-[#6B756E] mt-0.5">Credits/mo</Text>
                  </View>
                  <View className="flex-1 bg-[#F5F7F4] rounded-xl p-2.5 items-center">
                    <Text className="text-sm font-bold text-[#1F2520]">{plan.visitsPerMonth}</Text>
                    <Text className="text-[10px] text-[#6B756E] mt-0.5">Visits/mo</Text>
                  </View>
                </View>

                {/* CTA */}
                {isCurrent ? (
                  <View className="h-10 rounded-xl items-center justify-center bg-[#EAF7EC] border border-[#6BCB77]">
                    <Text className="text-[#059669] font-bold text-xs">Your Current Plan</Text>
                  </View>
                ) : plan.id === "basic" && currentPlanId !== "basic" ? (
                  <View className="h-10 rounded-xl items-center justify-center bg-[#F5F7F4] border border-black/5">
                    <Text className="text-[#6B756E] font-bold text-xs">Downgrade</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleUpgrade(plan.name)}
                    className="h-10 rounded-xl items-center justify-center active:opacity-80"
                    style={{ backgroundColor: plan.color }}
                  >
                    <Text className="text-white font-bold text-xs">Upgrade to {plan.name}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* Info footer */}
        <View className="mx-5 bg-amber-50 rounded-2xl p-4 border border-amber-100 flex-row items-start gap-x-3">
          <Ionicons name="information-circle-outline" size={18} color="#D97706" />
          <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
            Credits from your current plan are valid for the membership period plus 15 days after expiry. Expired credits cannot be recovered. Upgrades take effect immediately.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
