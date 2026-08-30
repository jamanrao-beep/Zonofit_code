import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";

const CREDIT_PACKAGES = [
  { id: "pack_10", credits: 10, price: 100 },
  { id: "pack_25", credits: 25, price: 250, tag: "MOST POPULAR" },
  { id: "pack_50", credits: 50, price: 500 },
  { id: "pack_100", credits: 100, price: 1000, tag: "Best Value" },
];

export default function TopUpCreditsScreen() {
  const router = useRouter();
  const { buyCredits } = useCreditsStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [customCredits, setCustomCredits] = useState("");

  const handlePurchase = async (credits: number, price: number, id: string) => {
    Alert.alert(
      "Confirm Purchase",
      `Are you sure you want to buy ${credits} credits for ₹${price}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm & Pay", 
          onPress: async () => {
            setLoadingId(id);
            const result = await buyCredits(credits, price);
            setLoadingId(null);
            
            if (result.success) {
              Alert.alert("Success", `You successfully purchased ${credits} credits!`, [
                { text: "OK", onPress: () => router.back() }
              ]);
            } else {
              Alert.alert("Payment Failed", result.message || "An error occurred.");
            }
          }
        }
      ]
    );
  };

  const handleCustomPurchase = () => {
    const credits = parseInt(customCredits);
    if (isNaN(credits) || credits <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid number of credits.");
      return;
    }
    handlePurchase(credits, credits * 10, "pack_custom");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-center px-5 py-4 mb-4 relative">
        <Pressable onPress={() => router.back()} className="absolute left-5 z-10 p-2">
          <Ionicons name="chevron-back" size={28} color="#000" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[32px] font-black text-black">Buy Credits</Text>
          <Text className="text-[15px] text-gray-500 mt-1">Choose a package</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {/* Custom Credits Section */}
        <View className="mb-8">
          <View className="bg-[#1F2520] rounded-[24px] p-6 shadow-md border border-[#323b34]">
            <Text className="text-white text-[18px] font-bold mb-1">Custom Amount</Text>
            <Text className="text-gray-400 text-[12px] mb-4">Enter the exact number of credits you need</Text>
            
            <View className="flex-row items-center bg-[#323b34] rounded-[16px] px-4 py-3 mb-4 border border-gray-600">
              <TextInput
                value={customCredits}
                onChangeText={setCustomCredits}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="flex-1 text-white text-[32px] font-black py-0"
                style={{ includeFontPadding: false, textAlignVertical: 'center' }}
                maxLength={5}
              />
              <Text className="text-emerald-400 font-bold text-[20px]">CR</Text>
            </View>

            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-gray-300">Total Price</Text>
              <Text className="text-white text-[20px] font-bold">
                ₹{(parseInt(customCredits || "0") * 10).toLocaleString('en-IN')}
              </Text>
            </View>

            <Pressable 
              onPress={handleCustomPurchase}
              disabled={loadingId !== null || !customCredits || parseInt(customCredits) <= 0}
              className={`w-full h-[54px] rounded-[16px] items-center justify-center flex-row shadow-sm ${
                !customCredits || parseInt(customCredits) <= 0 ? 'bg-gray-600' : 'bg-emerald-500 active:bg-emerald-600'
              }`}
            >
              {loadingId === 'pack_custom' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-bold text-[16px]">Buy Custom Amount</Text>
              )}
            </Pressable>
          </View>
        </View>

        <Text className="text-black font-bold text-[18px] mb-4 ml-1">Quick Packages</Text>

        {/* 2x2 Grid of Standard Packages */}
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {CREDIT_PACKAGES.map((pkg) => {
            const isPopular = pkg.id === "pack_25";
            const isBestValue = pkg.id === "pack_100";

            return (
              <Pressable 
                key={pkg.id}
                onPress={() => handlePurchase(pkg.credits, pkg.price, pkg.id)}
                disabled={loadingId !== null}
                className={`rounded-[20px] p-5 border items-center active:opacity-80 w-[48%] relative overflow-hidden ${
                  isPopular ? "bg-[#F6fcf7] border-[#1F7A3E]/30" : "bg-white border-gray-200"
                }`}
              >
                {/* Badge (Top-Center) */}
                {(isPopular || isBestValue) && (
                  <View 
                    className={`absolute top-0 w-full py-1 items-center ${isPopular ? 'bg-[#75d38c]' : 'bg-[#A855F7]'}`}
                  >
                    <Text className="text-white text-[9px] font-bold tracking-wider">
                      {isPopular ? "MOST POPULAR" : "BEST VALUE"}
                    </Text>
                  </View>
                )}

                <View className="items-center mb-3 mt-4">
                  <Text className="text-[24px] font-black text-[#1F7A3E]">{pkg.credits}</Text>
                  <Text className="text-[12px] font-bold text-[#1F7A3E]">CR</Text>
                </View>

                <View className="items-center mb-4">
                  <Text className="text-[16px] font-bold text-black">₹{pkg.price.toLocaleString('en-IN')}</Text>
                </View>

                <View className="border border-[#1F7A3E] rounded-[12px] py-2 w-full items-center">
                  {loadingId === pkg.id ? (
                    <ActivityIndicator size="small" color="#1F7A3E" />
                  ) : (
                    <Text className="text-[#1F7A3E] font-bold text-[13px]">Buy</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Info Banner */}
        <View className="mt-8 bg-[#f9f5ff] rounded-[16px] p-5 flex-row items-center justify-between">
          <Text className="text-[#374151] text-[12px] font-medium flex-1 leading-relaxed pr-4">
            Credits are added instantly to your wallet and never expire.
          </Text>
          <View className="relative items-center justify-center">
            <Ionicons name="shield-outline" size={24} color="#A855F7" />
            <Text className="absolute text-[#A855F7] text-[12px] font-bold mb-[1px]">+</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

