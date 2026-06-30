import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function TrainersIndexScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<"TRAINER" | "BUDDY">("TRAINER");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      if (!token) return;
      setIsLoading(true);
      try {
        const data = await apiFetch(`/api/roles?role=${activeTab}`, { token });
        setProfiles(data.profiles || []);
      } catch (error) {
        console.error("Failed to load profiles:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfiles();
  }, [activeTab, token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center bg-white border-b border-black/5">
        <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70">
          <Ionicons name="arrow-back" size={24} color="#1F2520" />
        </Pressable>
        <Text className="text-lg font-black text-[#1F2520]">Community</Text>
      </View>

      {/* Tabs */}
      <View className="px-5 py-4 bg-white mb-2 shadow-sm">
        <View className="flex-row bg-[#F5F7F4] p-1 rounded-2xl border border-black/5">
          <Pressable
            onPress={() => setActiveTab("TRAINER")}
            className={`flex-1 py-2.5 items-center rounded-xl ${activeTab === "TRAINER" ? "bg-white shadow-sm" : "bg-transparent shadow-none"}`}
          >
            <Text className={`text-sm font-bold ${activeTab === "TRAINER" ? "text-[#1F2520]" : "text-[#6B756E]"}`}>
              Trainers
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("BUDDY")}
            className={`flex-1 py-2.5 items-center rounded-xl ${activeTab === "BUDDY" ? "bg-white shadow-sm" : "bg-transparent shadow-none"}`}
          >
            <Text className={`text-sm font-bold ${activeTab === "BUDDY" ? "text-[#1F2520]" : "text-[#6B756E]"}`}>
              Workout Buddies
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#6BCB77" />
          </View>
        ) : profiles.length === 0 ? (
          <View className="items-center justify-center py-20 bg-white rounded-3xl border border-black/5">
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <Text className="text-[#1F2520] font-bold text-base mt-4">No {activeTab === "TRAINER" ? "Trainers" : "Buddies"} Found</Text>
            <Text className="text-[#6B756E] text-xs text-center mt-2 px-6">
              There are currently no active {activeTab.toLowerCase()}s. Be the first to register in your profile!
            </Text>
          </View>
        ) : (
          profiles.map((profile) => (
            <Pressable
              key={profile.id}
              onPress={() => router.push(`/trainers/${profile.id}` as any)}
              className="bg-white rounded-[24px] p-5 mb-4 border border-black/5 shadow-sm active:opacity-90"
            >
              <View className="flex-row items-center mb-3">
                <Image
                  source={{ uri: profile.user.avatarUrl || "https://ui-avatars.com/api/?name=" + profile.user.name + "&background=F5F7F4&color=1F2520" }}
                  className="w-12 h-12 rounded-full mr-3"
                />
                <View className="flex-1">
                  <Text className="text-base font-bold text-[#1F2520]">{profile.user.name}</Text>
                  <Text className="text-xs text-[#6B756E]" numberOfLines={1}>
                    {profile.gyms.map((g: any) => g.gym.name).join(", ") || "No specific gym"}
                  </Text>
                </View>
              </View>

              <Text className="text-sm text-[#4A5043] leading-relaxed mb-4" numberOfLines={2}>
                {profile.bio || `Passionate ${activeTab.toLowerCase()} ready to help you achieve your goals.`}
              </Text>

              <View className="flex-row justify-between items-center border-t border-black/5 pt-3">
                {activeTab === "TRAINER" ? (
                  <View>
                    <Text className="text-[10px] text-[#6B756E] uppercase font-bold tracking-wider">Session Cost</Text>
                    <Text className="text-sm font-black text-emerald-700">₹{(profile.costPerSessionInPaise ? profile.costPerSessionInPaise / 100 : 0)}</Text>
                  </View>
                ) : (
                  <View>
                    <Text className="text-[10px] text-[#6B756E] uppercase font-bold tracking-wider">Usually Visits</Text>
                    <Text className="text-xs font-bold text-[#1F2520]">{profile.timingInterval || "Anytime"}</Text>
                  </View>
                )}

                <View className="bg-[#EAF7EC] px-4 py-2 rounded-xl">
                  <Text className="text-[#6BCB77] font-bold text-xs">View Profile</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
