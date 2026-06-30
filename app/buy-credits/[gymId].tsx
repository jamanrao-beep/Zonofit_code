import React from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GymSubscriptionScreen() {
  const { gymId } = useLocalSearchParams();
  const { token } = useAuthStore();
  const [gym, setGym] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const buyGymSubscription = useCreditsStore((s) => s.buyGymSubscription);

  React.useEffect(() => {
    async function loadGym() {
      try {
        const data = await apiFetch(`/api/gyms/${gymId}`, { token });
        setGym(data);
      } catch (err) {
        console.log("Error loading gym", err);
      } finally {
        setLoading(false);
      }
    }
    loadGym();
  }, [gymId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7F4]">
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!gym) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7F4]">
        <Text>Gym not found.</Text>
      </View>
    );
  }

  // Calculate prices based on visit cost.
  // 1 credit = 10 rupees.
  // We assume a person visits ~15 times a month.
  // So monthly cost = 15 visits * gym.cost * 10
  const monthlyCostInr = 15 * gym.cost * 10;
  const yearlyCostInr = monthlyCostInr * 10; // 2 months free

  const handlePurchase = (planName: string, costInInr: number) => {
    // initial deduction is 10 days of credits for this gym
    const initialCreditDeduction = 10 * gym.cost;
    const creditsAdded = costInInr / 10;

    Alert.alert(
      "Confirm Purchase",
      `Pay ₹${costInInr} for the ${planName} subscription? This will add ${creditsAdded} credits and immediately deduct ${initialCreditDeduction} credits as an upfront 10-day commitment for ${gym.name}.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm & Pay", 
          onPress: async () => {
            const result = await buyGymSubscription(gym.name, costInInr, initialCreditDeduction);
            if (result.success) {
              Alert.alert("Success", "Subscription purchased and credits added to your wallet!", [
                {
                  text: "View Wallet",
                  onPress: () => router.navigate("/(tabs)/credits")
                }
              ]);
            } else {
              Alert.alert("Purchase Failed", result.message || "An error occurred.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7F4]">
      {/* Header */}
      <View className="px-5 py-3 flex-row justify-between items-center border-b border-black/5 bg-white">
        <Text className="text-lg font-bold text-[#1F2520]">Buy Subscription</Text>
        <Pressable onPress={() => router.navigate("/")} className="bg-[#F5F7F4] p-2 rounded-full active:bg-gray-200">
          <Ionicons name="close" size={20} color="#1F2520" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Gym Header */}
        <View className="bg-white rounded-3xl p-5 mb-6 border border-black/5 shadow-sm">
          <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-3">
            <Ionicons name="barbell-outline" size={24} color="#059669" />
          </View>
          <Text className="text-xl font-bold text-[#1F2520]">{gym.name}</Text>
          <Text className="text-sm text-[#6B756E] mt-1">{gym.address}</Text>
          
          <View className="h-[1px] bg-black/5 my-4" />
          
          <View className="flex-row items-center gap-x-2">
            <Ionicons name="information-circle" size={16} color="#059669" />
            <Text className="text-xs text-emerald-800 font-medium flex-1">10 Days Upfront Commitment: {10 * gym.cost} Credits will be deducted instantly.</Text>
          </View>
        </View>

        <Text className="text-sm font-bold text-[#6B756E] uppercase tracking-wider mb-4 ml-2">Choose Plan</Text>

        {/* Monthly Plan */}
        <Pressable 
          onPress={() => handlePurchase("Monthly", monthlyCostInr)}
          className="bg-white rounded-3xl p-5 mb-4 border border-black/5 shadow-sm active:bg-gray-50 flex-row items-center"
        >
          <View className="flex-1">
            <Text className="text-lg font-bold text-[#1F2520]">Monthly Pass</Text>
            <Text className="text-xs text-[#6B756E] mt-1">Converts to {monthlyCostInr/10} Credits</Text>
          </View>
          <View className="bg-emerald-600 px-4 py-2 rounded-xl">
            <Text className="text-white font-bold text-sm">₹{monthlyCostInr}</Text>
          </View>
        </Pressable>

        {/* Yearly Plan */}
        <Pressable 
          onPress={() => handlePurchase("Yearly", yearlyCostInr)}
          className="bg-emerald-50 rounded-3xl p-5 mb-6 border border-emerald-200 shadow-sm active:bg-emerald-100 flex-row items-center relative overflow-hidden"
        >
          <View className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-200/50 rounded-full" />
          <View className="flex-1">
            <View className="flex-row items-center gap-x-2 mb-1">
              <Text className="text-lg font-bold text-[#1F2520]">Yearly Pass</Text>
              <View className="bg-amber-100 px-2 py-0.5 rounded text-xs"><Text className="text-amber-800 font-bold text-[10px]">SAVE 16%</Text></View>
            </View>
            <Text className="text-xs text-[#6B756E]">Converts to {yearlyCostInr/10} Credits</Text>
          </View>
          <View className="bg-emerald-600 px-4 py-2 rounded-xl">
            <Text className="text-white font-bold text-sm">₹{yearlyCostInr}</Text>
          </View>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}
