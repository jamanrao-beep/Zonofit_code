import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";

const CREDIT_PACKAGES = [
  { id: "pack_10", credits: 10, price: 100, popular: false },
  { id: "pack_50", credits: 50, price: 500, popular: true },
  { id: "pack_100", credits: 100, price: 1000, popular: false },
];

export default function TopUpCreditsScreen() {
  const router = useRouter();
  const { buyCredits } = useCreditsStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [customCredits, setCustomCredits] = useState<string>("");

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["bottom"]}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: "Top Up Credits",
          headerTitleStyle: { fontWeight: "bold", color: "#1F2520" },
          headerStyle: { backgroundColor: "#F5F7F4" },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="mr-4 p-1">
              <Ionicons name="arrow-back" size={24} color="#1F2520" />
            </Pressable>
          ),
        }} 
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      >
        <View className="mb-6">
          <Text className="text-2xl font-black text-[#1F2520] mb-2">Buy Credits</Text>
          <Text className="text-sm text-[#6B756E]">Purchase loose credits to use at any partner gym in our network. 1 Credit = ₹10.</Text>
        </View>

        {/* Credit Packages */}
        <View className="gap-y-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <Pressable 
              key={pkg.id}
              onPress={() => handlePurchase(pkg.credits, pkg.price, pkg.id)}
              disabled={loadingId !== null}
              className={`bg-white rounded-3xl p-5 border shadow-sm relative overflow-hidden flex-row items-center justify-between active:bg-gray-50 ${
                pkg.popular ? "border-emerald-500 shadow-emerald-500/10" : "border-black/5"
              }`}
            >
              {pkg.popular && (
                <View className="absolute top-0 right-0 bg-emerald-500 px-3 py-1 rounded-bl-xl">
                  <Text className="text-white text-[10px] font-bold">MOST POPULAR</Text>
                </View>
              )}

              <View className="flex-row items-center">
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${pkg.popular ? "bg-emerald-50" : "bg-[#EAF7EC]"}`}>
                  <Ionicons name="flash" size={24} color="#059669" />
                </View>
                <View>
                  <Text className="text-xl font-bold text-[#1F2520]">{pkg.credits} Credits</Text>
                  <Text className="text-xs text-[#6B756E] mt-0.5">Value: ₹{pkg.credits * 10}</Text>
                </View>
              </View>

              <View className="bg-emerald-600 px-5 py-2.5 rounded-xl">
                {loadingId === pkg.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">₹{pkg.price}</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Custom Input Section */}
        <View className="mt-8">
          <Text className="text-sm font-bold text-[#6B756E] uppercase tracking-wider mb-4 ml-2">Custom Amount</Text>
          <View className="bg-white rounded-3xl p-5 border border-black/5 shadow-sm">
            <View className="flex-row items-center bg-[#F5F7F4] rounded-2xl px-4 py-1 mb-4 border border-transparent focus:border-emerald-500">
              <Ionicons name="flash" size={20} color="#059669" />
              <TextInput
                className="flex-1 h-12 ml-3 text-lg font-bold text-[#1F2520]"
                placeholder="Enter amount (e.g. 25)"
                placeholderTextColor="#A0A5A1"
                keyboardType="number-pad"
                value={customCredits}
                onChangeText={setCustomCredits}
              />
            </View>

            {customCredits && parseInt(customCredits) > 0 ? (
              <View className="flex-row justify-between items-center mb-4 px-1">
                <Text className="text-[#6B756E] font-medium">Cost (₹10/credit)</Text>
                <Text className="text-[#1F2520] font-black text-lg">₹{parseInt(customCredits) * 10}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                const credits = parseInt(customCredits);
                if (credits > 0) {
                  handlePurchase(credits, credits * 10, "custom");
                }
              }}
              disabled={!customCredits || parseInt(customCredits) <= 0 || loadingId !== null}
              className={`h-14 rounded-2xl items-center justify-center flex-row ${
                customCredits && parseInt(customCredits) > 0 ? "bg-emerald-600 active:bg-emerald-700" : "bg-[#E9EBE6]"
              }`}
            >
              {loadingId === "custom" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`font-bold text-base ${customCredits && parseInt(customCredits) > 0 ? "text-white" : "text-[#A0A5A1]"}`}>
                  Buy Custom Amount
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Info Banner */}
        <View className="mt-8 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex-row items-start">
          <Ionicons name="information-circle" size={20} color="#4F46E5" style={{ marginTop: 2 }} />
          <Text className="text-indigo-800 text-xs ml-3 flex-1 leading-relaxed">
            Credits expire 15 days after your active gym membership ends. If your membership expires, remaining credits will be automatically converted to non-convertible cash at a rate of ₹8 per credit.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
