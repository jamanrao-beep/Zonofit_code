import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useCreditsStore } from "@/store/useCreditsStore";

interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  targetCount: number;
  rewardCredits: number;
  type: string;
  currentCount: number;
  completed: boolean;
}

export default function ChallengesScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { fetchWallet } = useCreditsStore();
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/challenges", { token });
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error("Failed to load challenges:", error);
      Alert.alert("Error", "Could not load challenges. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (id: string) => {
    try {
      setClaimingId(id);
      await apiFetch(`/api/challenges/${id}/claim`, {
        method: "POST",
        token,
      });

      Alert.alert("Success", `Challenge completed!`);
      // Update local state to show it's completed
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, completed: true } : c))
      );
      // Refresh wallet balance globally
      // (No longer needed since there are no credits awarded for challenges)
      // await fetchWallet(token!);
    } catch (error: any) {
      Alert.alert("Claim Failed", error.message || "Something went wrong.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["bottom"]}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: "Challenges",
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
          <Text className="text-2xl font-black text-[#1F2520] mb-2">Monthly Challenges</Text>
          <Text className="text-sm text-[#6B756E]">Complete challenges to earn bonus credits and build a consistent fitness habit.</Text>
        </View>

        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : challenges.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <Ionicons name="trophy-outline" size={48} color="#D1D5DB" />
            <Text className="text-lg font-bold text-[#6B756E] mt-4">No Active Challenges</Text>
            <Text className="text-sm text-[#9CA3AF] text-center mt-2 px-6">Check back later for new ways to earn bonus credits.</Text>
          </View>
        ) : (
          challenges.map((challenge) => {
            const isCompleted = challenge.completed;
            const canClaim = challenge.currentCount >= challenge.targetCount && !isCompleted;
            const progressPercent = Math.min(100, Math.round((challenge.currentCount / challenge.targetCount) * 100));

            return (
              <View 
                key={challenge.id}
                className={`bg-white rounded-3xl p-5 mb-4 border shadow-sm ${
                  isCompleted ? "border-emerald-200" : "border-black/5"
                }`}
              >
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-row flex-1 mr-4">
                    <View className="w-12 h-12 rounded-full bg-indigo-50 items-center justify-center mr-4 border border-indigo-100">
                      <Text className="text-2xl">{challenge.emoji}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-[#1F2520] mb-1">{challenge.title}</Text>
                      <Text className="text-xs text-[#6B756E] leading-relaxed">{challenge.description}</Text>
                    </View>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="mb-4">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-xs font-bold text-[#6B756E]">Progress</Text>
                    <Text className="text-xs font-bold text-[#1F2520]">
                      {Math.min(challenge.currentCount, challenge.targetCount)} / {challenge.targetCount}
                    </Text>
                  </View>
                  <View className="h-2.5 w-full bg-[#E9EBE6] rounded-full overflow-hidden">
                    <View 
                      style={{ width: `${progressPercent}%` }} 
                      className={`h-full rounded-full ${
                        isCompleted ? "bg-emerald-500" : "bg-indigo-500"
                      }`} 
                    />
                  </View>
                </View>

                {/* Claim Button */}
                {isCompleted ? (
                  <View className="bg-emerald-50 rounded-xl py-3 items-center flex-row justify-center border border-emerald-100">
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                    <Text className="text-emerald-700 font-bold text-sm ml-2">Completed</Text>
                  </View>
                ) : canClaim ? (
                  <Pressable 
                    onPress={() => handleClaim(challenge.id)}
                    disabled={claimingId === challenge.id}
                    className="bg-indigo-600 rounded-xl py-3 items-center justify-center flex-row active:bg-indigo-700"
                  >
                    {claimingId === challenge.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                        <Text className="text-white font-bold text-sm ml-2">Mark as Completed</Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <View className="bg-gray-100 rounded-xl py-3 items-center justify-center flex-row">
                    <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
                    <Text className="text-gray-500 font-bold text-sm ml-2">Locked</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
