import React from "react";
import { View, Text, Pressable, ScrollView, Share, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function InviteScreen() {
  const router = useRouter();
  const inviteCode = "ZONO-582X9";

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ZonoFit using my code ${inviteCode} and we both get 50 bonus credits! Download here: https://zonofit.com/app`,
      });
    } catch (error) {
      Alert.alert("Error", "Could not share code.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white items-center justify-center border border-black/5 shadow-sm"
        >
          <Ionicons name="arrow-back" size={18} color="#1F2520" />
        </Pressable>
        <Text className="text-lg font-bold text-[#1F2520]">Refer & Earn</Text>
        <View className="w-9" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Graphic Area */}
        <View className="items-center mb-8 mt-4">
          <View className="w-32 h-32 bg-[#EAF7EC] rounded-full items-center justify-center mb-6 border-4 border-white shadow-sm">
            <Ionicons name="gift" size={64} color="#6BCB77" />
          </View>
          <Text className="text-2xl font-black text-[#1F2520] text-center mb-2">
            Give 50, Get 50
          </Text>
          <Text className="text-center text-[#6B756E] px-4 leading-relaxed">
            Invite friends to ZonoFit. They get 50 credits when they sign up, and you get 50 credits when they complete their first visit!
          </Text>
        </View>

        {/* Code Box */}
        <View className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm items-center mb-8">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-3">Your Unique Code</Text>
          <View className="bg-[#F5F7F4] px-8 py-4 rounded-2xl border border-dashed border-black/20 w-full items-center mb-4">
            <Text className="text-2xl font-black tracking-widest text-[#1F2520]">{inviteCode}</Text>
          </View>
          <Pressable 
            onPress={handleShare}
            className="w-full bg-[#6BCB77] h-14 rounded-2xl items-center justify-center flex-row active:bg-emerald-500"
          >
            <Ionicons name="share-social" size={20} color="white" />
            <Text className="text-white font-bold text-base ml-2">Share Link</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-3 ml-2">Your Rewards</Text>
        <View className="bg-white rounded-[24px] p-5 border border-black/5 shadow-sm flex-row justify-between mb-8">
          <View className="items-center flex-1">
            <Text className="text-2xl font-black text-[#1F2520]">3</Text>
            <Text className="text-[10px] text-[#6B756E] mt-1">Friends Joined</Text>
          </View>
          <View className="w-[1px] bg-black/5 mx-2" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-black text-[#6BCB77]">150</Text>
            <Text className="text-[10px] text-[#6B756E] mt-1">Credits Earned</Text>
          </View>
        </View>

        {/* How it works */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-3 ml-2">How it works</Text>
        <View className="bg-white rounded-[24px] p-5 border border-black/5 shadow-sm gap-y-4">
          <View className="flex-row items-center gap-x-3">
            <View className="w-8 h-8 rounded-full bg-[#F5F7F4] items-center justify-center">
              <Text className="font-bold text-[#1F2520]">1</Text>
            </View>
            <Text className="flex-1 text-sm text-[#4A5043]">Share your code with friends</Text>
          </View>
          <View className="flex-row items-center gap-x-3">
            <View className="w-8 h-8 rounded-full bg-[#F5F7F4] items-center justify-center">
              <Text className="font-bold text-[#1F2520]">2</Text>
            </View>
            <Text className="flex-1 text-sm text-[#4A5043]">They get 50 bonus credits on sign-up</Text>
          </View>
          <View className="flex-row items-center gap-x-3">
            <View className="w-8 h-8 rounded-full bg-[#F5F7F4] items-center justify-center">
              <Text className="font-bold text-[#1F2520]">3</Text>
            </View>
            <Text className="flex-1 text-sm text-[#4A5043]">You get 50 credits after their first visit</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
