import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";

export default function ConvertScreen() {
  const router = useRouter();
  const { credits, cashBalance, convertCreditsToCash, convertCashToCredits } = useCreditsStore();
  const [conversionType, setConversionType] = useState<"creditsToCash" | "cashToCredits">("creditsToCash");
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");

  const isCreditsToCash = conversionType === "creditsToCash";
  
  // Rates
  const conversionRate = 8;
  const purchaseRate = 10;
  
  const numAmount = parseInt(amount) || 0;
  
  const youWillReceive = isCreditsToCash 
    ? numAmount * conversionRate 
    : Math.floor(numAmount / purchaseRate);

  const handleConvert = async () => {
    if (numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter an amount greater than 0.");
      return;
    }

    if (isCreditsToCash && numAmount > credits) {
      Alert.alert("Insufficient Credits", `You only have ${credits} credits available.`);
      return;
    }
    
    if (!isCreditsToCash && numAmount > cashBalance) {
      Alert.alert("Insufficient Cash", `You only have ₹${cashBalance} available.`);
      return;
    }

    setLoading(true);
    let result;
    if (isCreditsToCash) {
       result = await convertCreditsToCash(numAmount);
    } else {
       // user spends `numAmount` INR, which buys `youWillReceive` credits.
       result = await convertCashToCredits(youWillReceive);
    }
    setLoading(false);

    if (result.success) {
      Alert.alert(
        "Success", 
        isCreditsToCash 
          ? `Converted ${numAmount} Credits into ₹${youWillReceive} INR!` 
          : `Converted ₹${numAmount} INR into ${youWillReceive} Credits!`, 
        [{ text: "OK", onPress: () => router.back() }]
      );
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
            onPress={() => { setConversionType("creditsToCash"); setAmount(""); }}
            className={`flex-1 rounded-full py-3 items-center ${isCreditsToCash ? "bg-[#0B711A]" : "bg-transparent"}`}
          >
            <Text className={`font-bold text-[14px] ${isCreditsToCash ? "text-white" : "text-gray-500"}`}>
              Credits to INR
            </Text>
          </Pressable>
          <Pressable 
            onPress={() => { setConversionType("cashToCredits"); setAmount(""); }}
            className={`flex-1 rounded-full py-3 items-center ${!isCreditsToCash ? "bg-[#0B711A]" : "bg-transparent"}`}
          >
            <Text className={`font-bold text-[14px] ${!isCreditsToCash ? "text-white" : "text-gray-500"}`}>
              INR to Credits
            </Text>
          </Pressable>
        </View>

        {/* You Have Box */}
        <View className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm mb-[-24px] z-10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 3 }}>
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-2">
              <Text className="text-[13px] text-gray-500 font-medium mb-1">
                {isCreditsToCash ? "Enter Credits to Convert" : "Enter INR to Convert"}
              </Text>
              <View className="flex-row items-center border-b border-gray-100 pb-1 mt-1 mb-2 max-w-[120px]">
                {!isCreditsToCash && <Text className="text-[32px] font-bold text-[#0B711A] mr-1">₹</Text>}
                <TextInput
                  className="text-[32px] font-bold text-[#0B711A] p-0 m-0 min-w-[50px]"
                  placeholder="0"
                  placeholderTextColor="#A7F3D0"
                  keyboardType="number-pad"
                  value={amount}
                  onChangeText={(val) => {
                    const numeric = val.replace(/[^0-9]/g, "");
                    setAmount(numeric);
                  }}
                />
                {isCreditsToCash && <Text className="text-[18px] font-bold text-[#0B711A] ml-2">CR</Text>}
              </View>
              <Text className="text-[12px] text-gray-500">
                Available: {isCreditsToCash ? `${credits} CR` : `₹${cashBalance.toLocaleString('en-IN')}`}
              </Text>
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
          <Text className="text-[32px] font-bold text-[#7C3AED] mb-3">
            {isCreditsToCash ? `₹${youWillReceive.toLocaleString('en-IN')}` : `${youWillReceive} CR`}
          </Text>
          <View className="bg-gray-50 rounded-lg py-1 px-3 self-start border border-gray-100">
            <Text className="text-[11px] text-gray-600 font-medium">
              {isCreditsToCash ? `1 CR = ₹${conversionRate}` : `1 CR = ₹${purchaseRate}`}
            </Text>
          </View>
        </View>

        {/* Conversion Details */}
        <View className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm mt-8" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 3 }}>
          <Text className="text-[16px] font-bold text-black mb-5">Conversion Details</Text>
          
          <View className="flex-row justify-between mb-4">
            <Text className="text-[13px] text-black font-medium">Conversion Rate</Text>
            <Text className="text-[13px] text-black">
              {isCreditsToCash ? `1 CR = ₹${conversionRate}` : `1 CR = ₹${purchaseRate}`}
            </Text>
          </View>
          
          <View className="flex-row justify-between mb-4">
            <Text className="text-[13px] text-black font-medium">Available {isCreditsToCash ? "Credits" : "INR"}</Text>
            <Text className="text-[13px] text-black">
              {isCreditsToCash ? `${credits} CR` : `₹${cashBalance.toLocaleString('en-IN')}`}
            </Text>
          </View>
          
          <View className="flex-row justify-between mb-4">
            <Text className="text-[13px] text-black font-medium">You Will Receive</Text>
            <Text className="text-[13px] text-black">
              {isCreditsToCash ? `₹${youWillReceive.toLocaleString('en-IN')}` : `${youWillReceive} CR`}
            </Text>
          </View>
          
          <View className="flex-row justify-between mb-6">
            <Text className="text-[13px] text-black font-medium">Processing Fee</Text>
            <Text className="text-[13px] font-bold text-[#0B711A]">No Fee</Text>
          </View>

          <Pressable 
            onPress={handleConvert}
            disabled={loading || numAmount <= 0}
            className={`rounded-[16px] py-4 items-center justify-center active:opacity-80 flex-row ${
              numAmount > 0 ? "bg-[#7C3AED]" : "bg-gray-300"
            }`}
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
