import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";

const CREDIT_PACKAGES = [
  { id: "pack_100", credits: 100, price: 1000 },
  { id: "pack_250", credits: 250, price: 2500, tag: "MOST POPULAR" },
  { id: "pack_500", credits: 500, price: 5000 },
  { id: "pack_1000", credits: 1000, price: 10000, tag: "Best Value" },
];

export default function TopUpCreditsScreen() {
  const router = useRouter();
  const { buyCredits } = useCreditsStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-center px-5 pt-20 pb-8 relative">
        <Pressable onPress={() => router.back()} className="absolute left-5 top-20 z-10 p-2">
          <Ionicons name="chevron-back" size={28} color="#000" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[32px] font-black text-black">Buy Credits</Text>
          <Text className="text-[15px] text-gray-500 mt-2">Choose a package</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <View className="gap-y-4">
          {CREDIT_PACKAGES.map((pkg) => {
            const isPopular = pkg.id === "pack_250";
            const isBestValue = pkg.id === "pack_1000";

            return (
              <Pressable 
                key={pkg.id}
                onPress={() => handlePurchase(pkg.credits, pkg.price, pkg.id)}
                disabled={loadingId !== null}
                className={`rounded-[20px] py-5 px-6 border flex-row items-start justify-between active:opacity-80 ${
                  isPopular ? "bg-[#F6fcf7] border-[#1F7A3E]/30" : "bg-white border-gray-200"
                }`}
              >
                {/* Left Side */}
                <View className="flex-1 justify-center">
                  <Text className="text-[22px] font-bold text-[#1F7A3E] mb-1">{pkg.credits} CR</Text>
                  <Text className="text-[12px] text-gray-500 mb-2">1 CR = ₹10</Text>
                  
                  {isPopular && (
                    <View 
                      className="mt-1 px-3 py-1 rounded-full self-start items-center justify-center" 
                      style={{ backgroundColor: '#75d38c' }}
                    >
                      <Text className="text-white text-[10px] font-bold tracking-wider">MOST POPULAR</Text>
                    </View>
                  )}
                </View>

                {/* Right Side */}
                <View className="items-end justify-center relative min-w-[90px]">
                  {isBestValue && (
                    <View className="absolute -top-6 right-0 bg-[#A855F7] bg-opacity-70 px-2 py-0.5 rounded-full z-10 shadow-sm" style={{ backgroundColor: 'rgba(168, 85, 247, 0.7)' }}>
                      <Text className="text-white text-[10px] font-bold">Best Value</Text>
                    </View>
                  )}
                  
                  <View className="flex-row items-center mb-3">
                    <Text className="text-[20px] font-bold text-black">₹{pkg.price.toLocaleString('en-IN')}</Text>
                    {isPopular && (
                      <Ionicons name="leaf" size={14} color="#75d38c" style={{ position: 'absolute', right: -16, top: -4 }} />
                    )}
                  </View>
                  
                  <View className="border border-[#1F7A3E] rounded-[10px] px-5 py-1.5 w-full flex-row justify-center items-center">
                    {loadingId === pkg.id ? (
                      <ActivityIndicator size="small" color="#1F7A3E" />
                    ) : (
                      <Text className="text-[#1F7A3E] font-bold text-[13px]">Buy Now</Text>
                    )}
                  </View>
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
