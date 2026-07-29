import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";

export default function ConvertScreen() {
  const router = useRouter();
  const { credits, convertCreditsToCash } = useCreditsStore();
  const [conversionType, setConversionType] = useState<"creditsToCash" | "cashToCredits">("creditsToCash");
  const [loading, setLoading] = useState(false);

  // Hardcoded as per the image
  const conversionRate = 8;
  const youWillReceive = credits * conversionRate;

  const handleConvert = async () => {
    if (credits <= 0) {
      Alert.alert("Insufficient Credits", "You don't have any credits to convert.");
      return;
    }

    setLoading(true);
    const result = await convertCreditsToCash(credits);
    setLoading(false);

    if (result.success) {
      Alert.alert("Success", `Converted ${credits} Credits into ₹${youWillReceive} INR!`, [
        { text: "OK", onPress: () => router.back() }
      ]);
    } else {
      Alert.alert("Error", result.message || "Conversion failed.");
    }
  };

  const recentConversions = [
    { id: 1, credits: 120, inr: 960 },
    { id: 2, credits: 200, inr: 1600 },
    { id: 3, credits: 150, inr: 1200 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-center px-5 pt-4 pb-6 relative">
        <Pressable onPress={() => router.back()} className="absolute left-5 top-4 z-10 p-2">
          <Ionicons name="chevron-back" size={24} color="#000" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[20px] font-bold text-black">Convert</Text>
          <Text className="text-[13px] text-gray-500 mt-1">Convert between Credits and INR</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {/* Toggle Switch */}
        <View className="flex-row bg-white border border-gray-100 rounded-full p-1 mb-8 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <Pressable 
            onPress={() => setConversionType("creditsToCash")}
            className={`flex-1 rounded-full py-3 items-center ${conversionType === "creditsToCash" ? "bg-[#0B711A]" : "bg-transparent"}`}
          >
            <Text className={`font-bold text-[14px] ${conversionType === "creditsToCash" ? "text-white" : "text-gray-500"}`}>
              Credits to INR
            </Text>
          </Pressable>
          <Pressable 
            onPress={() => setConversionType("cashToCredits")}
            className={`flex-1 rounded-full py-3 items-center ${conversionType === "cashToCredits" ? "bg-[#0B711A]" : "bg-transparent"}`}
          >
            <Text className={`font-bold text-[14px] ${conversionType === "cashToCredits" ? "text-white" : "text-gray-500"}`}>
              INR to Credits
            </Text>
          </Pressable>
        </View>

        {/* You Have Box */}
        <View className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm mb-[-24px] z-10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 3 }}>
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-[13px] text-gray-500 font-medium mb-1">You Have</Text>
              <View className="flex-row items-baseline">
                <Text className="text-[32px] font-bold text-[#0B711A]">{credits}</Text>
                <Text className="text-[18px] font-bold text-[#0B711A] ml-1">CR</Text>
              </View>
              <Text className="text-[12px] text-gray-500 mt-1">Available Credits</Text>
            </View>
            <View className="w-12 h-12 rounded-full bg-[#E8F5E9] items-center justify-center">
              <Ionicons name="wallet-outline" size={24} color="#0B711A" />
            </View>
          </View>
        </View>

        {/* Middle Arrows Section */}
        <View className="flex-row justify-center items-center gap-x-4 z-20">
          <View className="w-14 h-14 rounded-full bg-[#E8F5E9] items-center justify-center shadow-sm">
            <Ionicons name="arrow-down" size={24} color="#0B711A" />
          </View>
          <View className="w-14 h-14 rounded-full bg-white border border-gray-200 items-center justify-center shadow-sm">
            <Ionicons name="swap-horizontal" size={24} color="#374151" />
          </View>
          <View className="w-14 h-14 rounded-full bg-[#F3E8FF] items-center justify-center shadow-sm">
            <Ionicons name="arrow-up" size={24} color="#7C3AED" />
          </View>
        </View>

        {/* You'll Get Box */}
        <View className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm mt-[-24px] z-10 pt-10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 3 }}>
          <Text className="text-[13px] text-gray-500 font-medium mb-1">You'll Get (Approx.)</Text>
          <Text className="text-[32px] font-bold text-[#7C3AED] mb-3">₹{youWillReceive.toLocaleString('en-IN')}</Text>
          <View className="bg-gray-50 rounded-lg py-1 px-3 self-start border border-gray-100">
            <Text className="text-[11px] text-gray-600 font-medium">1 CR = ₹{conversionRate}</Text>
          </View>
        </View>

        {/* Conversion Details */}
        <View className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm mt-8" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 3 }}>
          <Text className="text-[16px] font-bold text-black mb-5">Conversion Details</Text>
          
          <View className="flex-row justify-between mb-4">
            <Text className="text-[13px] text-black font-medium">Conversion Rate</Text>
            <Text className="text-[13px] text-black">1 CR = ₹{conversionRate}</Text>
          </View>
          
          <View className="flex-row justify-between mb-4">
            <Text className="text-[13px] text-black font-medium">Available Credits</Text>
            <Text className="text-[13px] text-black">{credits} CR</Text>
          </View>
          
          <View className="flex-row justify-between mb-4">
            <Text className="text-[13px] text-black font-medium">You Will Receive</Text>
            <Text className="text-[13px] text-black">₹{youWillReceive.toLocaleString('en-IN')}</Text>
          </View>
          
          <View className="flex-row justify-between mb-6">
            <Text className="text-[13px] text-black font-medium">Processing Fee</Text>
            <Text className="text-[13px] font-bold text-[#0B711A]">No Fee</Text>
          </View>

          <Pressable 
            onPress={handleConvert}
            disabled={loading}
            className="bg-[#7C3AED] rounded-[16px] py-4 items-center justify-center active:opacity-80 flex-row"
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white text-[15px]">Convert Now</Text>}
          </Pressable>
        </View>

        {/* Info Banner */}
        <View className="bg-[#F9F5FF] rounded-[16px] p-5 mt-6 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="font-bold text-black text-[13px] mb-1.5">Why conversion rate is ₹8?</Text>
            <Text className="text-[#374151] text-[12px] leading-relaxed">
              We encourage more gym visits and support our partner gyms. That's why credits convert at ₹8 instead of full value ₹10.
            </Text>
          </View>
          <View className="relative items-center justify-center">
            <Ionicons name="shield-outline" size={24} color="#7C3AED" />
            <Ionicons name="arrow-down" size={10} color="#7C3AED" style={{ position: 'absolute' }} />
          </View>
        </View>

        {/* Recent Conversions */}
        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[16px] font-bold text-black">Recent Conversions</Text>
            <Text className="text-[13px] font-bold text-[#0B711A]">View All</Text>
          </View>
          
          <View className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 }}>
            {recentConversions.map((conv, index) => (
              <View key={conv.id} className={`flex-row justify-between items-center py-4 ${index !== recentConversions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <View>
                  <Text className="text-[14px] font-bold text-black mb-1">
                    {conv.credits} CR → ₹{conv.inr.toLocaleString('en-IN')}
                  </Text>
                  <Text className="text-[11px] text-gray-500">Converted to INR</Text>
                </View>
                <View className="bg-[#F9F5FF] px-3 py-1.5 rounded-full">
                  <Text className="text-[#7C3AED] text-[10px] font-bold">Completed</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
