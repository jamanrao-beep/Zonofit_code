import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useUserStore } from "@/store/useUserStore";
import { useAuthStore } from "@/store/useAuthStore";

const PRESET_AMOUNTS = [10, 25, 50, 100];
const MIN_CREDITS = 10;
const CREDIT_PRICE_INR = 10; // 1 Credit = ₹10

export default function TopUpCreditsScreen() {
  const router = useRouter();
  const { buyCredits, membershipInfo, fetchWallet } = useCreditsStore();
  const { membershipStatus, membershipExpiry } = useUserStore();
  const token = useAuthStore((s) => s.token);

  const [quantity, setQuantity] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      fetchWallet(token);
    }
  }, [token]);

  const isMembershipActive = membershipInfo 
    ? (!membershipInfo.isExpired && membershipInfo.status === "ACTIVE")
    : (membershipStatus?.toLowerCase().includes("active") && !membershipStatus?.toLowerCase().includes("no active"));

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(MIN_CREDITS, prev - 1));
  };

  const handlePresetSelect = (amount: number) => {
    setQuantity(Math.max(MIN_CREDITS, Math.floor(amount)));
  };

  const handleDirectInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (!cleaned) {
      setQuantity(MIN_CREDITS);
      return;
    }
    const val = parseInt(cleaned, 10);
    if (!isNaN(val)) {
      setQuantity(Math.max(MIN_CREDITS, val));
    }
  };

  const handlePurchase = async () => {
    if (!isMembershipActive) {
      Alert.alert(
        "Active Membership Required",
        "Additional credits can only be purchased while your membership is active. If your membership has expired, please repurchase a membership cycle.",
        [{ text: "OK" }]
      );
      return;
    }

    if (quantity < MIN_CREDITS || !Number.isInteger(quantity)) {
      Alert.alert("Invalid Quantity", `Minimum purchase is ${MIN_CREDITS} whole credits.`);
      return;
    }

    const price = quantity * CREDIT_PRICE_INR;

    Alert.alert(
      "Confirm Purchase",
      `Buy ${quantity} Additional Credits for ₹${price.toLocaleString("en-IN")}?\n\nNote: Additional credits do not extend membership duration.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Pay",
          onPress: async () => {
            setLoading(true);
            const result = await buyCredits(quantity, price);
            setLoading(false);

            if (result.success) {
              Alert.alert("Success", `You successfully purchased ${quantity} credits!`, [
                { text: "Done", onPress: () => router.back() },
              ]);
            } else {
              Alert.alert("Payment Failed", result.message || "An error occurred.");
            }
          },
        },
      ]
    );
  };

  const totalPrice = quantity * CREDIT_PRICE_INR;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-gray-100">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-[#111827]">Buy Additional Credits</Text>
        <View className="w-8" />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      >
        {/* Membership Status Context Card */}
        {isMembershipActive ? (
          <View className="bg-[#E8F5E9] border border-[#C8E6C9] rounded-[20px] p-4 mb-6 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#1F7A3E] items-center justify-center mr-3.5">
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] font-bold text-[#1F7A3E]">
                  {membershipInfo?.gymName || "Active Membership"}
                </Text>
                <View className="bg-[#1F7A3E] px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-white uppercase">Active</Text>
                </View>
              </View>
              <Text className="text-xs text-[#2E7D32] mt-0.5">
                Cycle {membershipInfo?.cycleNumber || 1} of {membershipInfo?.maxCycles || 12} · {membershipInfo?.daysRemaining || "Active"} days remaining
              </Text>
            </View>
          </View>
        ) : (
          <View className="bg-[#FFF3E0] border border-[#FFE0B2] rounded-[20px] p-4 mb-6 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#E65100] items-center justify-center mr-3.5">
              <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-[#BF360C]">No Active Membership</Text>
              <Text className="text-xs text-[#D84315] mt-0.5">
                Additional credits can only be bought during an active membership cycle.
              </Text>
            </View>
          </View>
        )}

        {/* Section C: Quantity Selector Card (PRD Section 7 & 22C) */}
        <View className="bg-white rounded-[24px] p-6 border border-gray-200 shadow-sm mb-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quantity Control</Text>
          <Text className="text-lg font-black text-[#111827] mb-1">Select Additional Credits</Text>
          <Text className="text-xs text-gray-500 mb-6">
            Minimum 10 credits · Step by 1 credit · Whole numbers only
          </Text>

          {/* Interactive Stepper: [-] [ Quantity ] [+] */}
          <View className="flex-row items-center justify-between bg-gray-50 rounded-[20px] p-3 border border-gray-200 mb-6">
            <Pressable
              onPress={handleDecrement}
              disabled={quantity <= MIN_CREDITS}
              className={`w-14 h-14 rounded-2xl items-center justify-center ${
                quantity <= MIN_CREDITS ? "bg-gray-200 opacity-50" : "bg-white border border-gray-200 active:bg-gray-100 shadow-sm"
              }`}
            >
              <Ionicons name="remove" size={26} color={quantity <= MIN_CREDITS ? "#9CA3AF" : "#111827"} />
            </Pressable>

            <View className="flex-1 items-center px-4">
              <View className="flex-row items-baseline justify-center">
                <TextInput
                  value={quantity.toString()}
                  onChangeText={handleDirectInput}
                  keyboardType="number-pad"
                  className="text-4xl font-black text-[#111827] text-center"
                  style={{ minWidth: 60 }}
                  maxLength={4}
                />
                <Text className="text-lg font-bold text-[#1F7A3E] ml-1.5">CR</Text>
              </View>
              <Text className="text-[11px] font-semibold text-gray-400 mt-0.5">Whole Credits</Text>
            </View>

            <Pressable
              onPress={handleIncrement}
              className="w-14 h-14 rounded-2xl bg-white border border-gray-200 items-center justify-center active:bg-gray-100 shadow-sm"
            >
              <Ionicons name="add" size={26} color="#111827" />
            </Pressable>
          </View>

          {/* Quick Presets */}
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Quick Presets</Text>
          <View className="flex-row gap-x-2.5">
            {PRESET_AMOUNTS.map((preset) => {
              const isSelected = quantity === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => handlePresetSelect(preset)}
                  className={`flex-1 py-2.5 rounded-xl items-center border ${
                    isSelected
                      ? "bg-[#1F7A3E] border-[#1F7A3E]"
                      : "bg-gray-50 border-gray-200 active:bg-gray-100"
                  }`}
                >
                  <Text className={`text-xs font-bold ${isSelected ? "text-white" : "text-gray-700"}`}>
                    {preset} CR
                  </Text>
                  <Text className={`text-[10px] mt-0.5 ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                    ₹{preset * CREDIT_PRICE_INR}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Pricing Summary Card */}
        <View className="bg-white rounded-[24px] p-5 border border-gray-200 shadow-sm mb-6">
          <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <Text className="text-sm font-medium text-gray-500">Credits Selected</Text>
            <Text className="text-sm font-bold text-[#111827]">{quantity} Credits</Text>
          </View>
          <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <Text className="text-sm font-medium text-gray-500">Rate</Text>
            <Text className="text-sm font-bold text-[#111827]">₹10 per credit</Text>
          </View>
          <View className="flex-row justify-between items-center pt-3">
            <Text className="text-base font-bold text-[#111827]">Total Amount</Text>
            <Text className="text-2xl font-black text-[#1F7A3E]">₹{totalPrice.toLocaleString("en-IN")}</Text>
          </View>
        </View>

        {/* PRD Section 9: Rules & Disclaimer Card */}
        <View className="bg-gray-50 rounded-[20px] p-4 border border-gray-200 mb-8">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={16} color="#4B5563" />
            <Text className="text-xs font-bold text-gray-700 ml-1.5">Additional Credits Rules</Text>
          </View>
          <Text className="text-[11px] text-gray-500 leading-relaxed mb-1">
            • Purchasing additional credits does <Text className="font-bold text-gray-700">NOT</Text> extend your 30-day membership cycle.
          </Text>
          <Text className="text-[11px] text-gray-500 leading-relaxed mb-1">
            • Does <Text className="font-bold text-gray-700">NOT</Text> create a new membership cycle or count toward the 12-membership limit.
          </Text>
          <Text className="text-[11px] text-gray-500 leading-relaxed">
            • Any unused credits at membership expiry convert automatically to your temporary 15-day INR wallet.
          </Text>
        </View>

        {/* CTA Button */}
        <Pressable
          onPress={handlePurchase}
          disabled={loading || !isMembershipActive}
          className={`h-14 rounded-2xl items-center justify-center flex-row shadow-sm ${
            !isMembershipActive
              ? "bg-gray-300"
              : loading
              ? "bg-[#1F7A3E]/80"
              : "bg-[#1F7A3E] active:bg-[#165a2d]"
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text className="text-white font-bold text-base">
                Buy {quantity} Credits (₹{totalPrice.toLocaleString("en-IN")})
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
