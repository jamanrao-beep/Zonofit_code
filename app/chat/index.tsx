import React from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FALLBACK_NETWORK_GYMS } from "@/constants/fallbackGyms";

export default function ChatIndexScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-gray-100">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-[#111827]">Messages</Text>
        <View className="w-8" />
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider px-5 py-2">
          Partner Gyms & Support
        </Text>
        {FALLBACK_NETWORK_GYMS.slice(0, 3).map((gym) => (
          <Pressable
            key={gym.id}
            onPress={() => router.push(`/chat/${gym.id}` as any)}
            className="flex-row items-center px-5 py-3.5 border-b border-gray-50 active:bg-gray-50"
          >
            <Image
              source={{ uri: gym.image }}
              className="w-12 h-12 rounded-full mr-3 bg-gray-200"
              resizeMode="cover"
            />
            <View className="flex-1">
              <View className="flex-row justify-between items-center">
                <Text className="font-bold text-sm text-[#111827]">{gym.name}</Text>
                <Text className="text-[10px] text-gray-400">Online</Text>
              </View>
              <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                Ask about facilities, equipment or visit times...
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" className="ml-2" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
