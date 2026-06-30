import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function TrainerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!token || !id) return;
      setIsLoading(true);
      try {
        const data = await apiFetch(`/api/roles/${id}`, { token });
        setProfile(data.profile);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [id, token]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4", alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <ActivityIndicator size="large" color="#6BCB77" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4", alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <Ionicons name="alert-circle-outline" size={48} color="#6B756E" />
        <Text className="text-[#1F2520] font-bold text-base mt-3">Profile not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-6 py-3 bg-[#6BCB77] rounded-2xl">
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isTrainer = profile.role === "TRAINER";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center justify-between border-b border-black/5 bg-[#F5F7F4] z-10 relative">
        <Pressable onPress={() => router.back()} className="active:opacity-70 w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm">
          <Ionicons name="arrow-back" size={20} color="#1F2520" />
        </Pressable>
        <Text className="text-sm font-bold text-[#6B756E] uppercase tracking-wider">{isTrainer ? "Trainer" : "Workout Buddy"}</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Card */}
        <View className="bg-white rounded-b-[40px] px-5 pt-6 pb-8 border-b border-black/5 shadow-sm items-center relative overflow-hidden">
          {/* Background decoration */}
          <View className="absolute top-[-50] right-[-50] w-48 h-48 bg-[#6BCB77]/10 rounded-full" />
          
          <Image
            source={{ uri: profile.user.avatarUrl || "https://ui-avatars.com/api/?name=" + profile.user.name + "&background=F5F7F4&color=1F2520&size=200" }}
            className="w-32 h-32 rounded-full border-4 border-white shadow-sm mb-4"
          />
          
          <View className="flex-row items-center bg-[#EAF7EC] px-3 py-1 rounded-full mb-2">
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text className="text-[#059669] text-xs font-bold ml-1">Verified {isTrainer ? "Trainer" : "Buddy"}</Text>
          </View>
          
          <Text className="text-3xl font-black text-[#1F2520] mb-1">{profile.user.name}</Text>
          
          {isTrainer && profile.specialties?.length > 0 && (
            <View className="flex-row flex-wrap justify-center gap-2 mt-4">
              {profile.specialties.map((spec: string, i: number) => (
                <View key={i} className="bg-[#F0F3ED] px-3 py-1.5 rounded-full border border-black/5">
                  <Text className="text-xs font-semibold text-[#6B756E]">{spec}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bio Section */}
        <View className="px-5 mt-6 mb-6">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2 ml-1">About Me</Text>
          <View className="bg-white p-5 rounded-[24px] border border-black/5 shadow-sm">
            <Text className="text-[#4A5043] leading-relaxed text-sm">
              {profile.bio || `Hi! I'm ${profile.user.name} and I'm a ${isTrainer ? "trainer" : "buddy"} on ZonoFit.`}
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View className="px-5 mb-6">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2 ml-1">Details</Text>
          <View className="bg-white p-5 rounded-[24px] border border-black/5 shadow-sm flex-row justify-around">
            {isTrainer ? (
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-2">
                  <Ionicons name="cash-outline" size={24} color="#10B981" />
                </View>
                <Text className="text-[#6B756E] text-[10px] uppercase font-bold tracking-wider">Per Session</Text>
                <Text className="text-lg font-black text-emerald-700 mt-1">₹{(profile.costPerSessionInPaise ? profile.costPerSessionInPaise / 100 : 0)}</Text>
              </View>
            ) : (
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
                  <Ionicons name="time-outline" size={24} color="#3B82F6" />
                </View>
                <Text className="text-[#6B756E] text-[10px] uppercase font-bold tracking-wider">Usually Visits</Text>
                <Text className="text-sm font-bold text-[#1F2520] mt-1 text-center">{profile.timingInterval || "Anytime"}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Partner Gyms Section */}
        <View className="px-5 mb-6">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2 ml-1">Available At</Text>
          {profile.gyms.length === 0 ? (
            <View className="bg-white p-5 rounded-[24px] border border-black/5 shadow-sm">
              <Text className="text-[#6B756E] text-sm text-center">Not associated with specific gyms.</Text>
            </View>
          ) : (
            profile.gyms.map((g: any, index: number) => (
              <Pressable 
                key={index} 
                onPress={() => router.push(`/gym/${g.gym.id}` as any)}
                className="bg-white p-4 rounded-[24px] border border-black/5 shadow-sm flex-row items-center mb-3 active:opacity-90"
              >
                <Image
                  source={{ uri: g.gym.imageUrls?.[0] || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48" }}
                  className="w-16 h-16 rounded-2xl mr-4"
                />
                <View className="flex-1">
                  <Text className="text-base font-bold text-[#1F2520]">{g.gym.name}</Text>
                  <Text className="text-xs text-[#6B756E] mt-1" numberOfLines={1}>📍 {g.gym.address}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "white",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 32,
          borderTopWidth: 1,
          borderTopColor: "rgba(0,0,0,0.06)",
        }}
      >
        <Pressable
          onPress={() => router.push("/chat" as any)}
          className="bg-[#1F2520] h-14 rounded-2xl items-center justify-center flex-row gap-x-2 active:opacity-90"
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="white" />
          <Text className="text-white font-bold text-base">Message {profile.user.name.split(" ")[0]}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
