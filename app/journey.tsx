import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '@/store/useUserStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BADGES = [
  { id: 1, name: "First Steps", description: "Completed 1 workout", icon: "footsteps-outline", color: "bg-blue-50 text-blue-600", earned: true },
  { id: 2, name: "Explorer", description: "Visited 3 different gyms", icon: "compass-outline", color: "bg-purple-50 text-purple-600", earned: true },
  { id: 3, name: "On Fire", description: "7 day streak", icon: "flame-outline", color: "bg-orange-50 text-orange-600", earned: false },
  { id: 4, name: "Early Bird", description: "Workout before 7 AM", icon: "sunny-outline", color: "bg-amber-50 text-amber-600", earned: false },
  { id: 5, name: "Heavy Lifter", description: "10 strength sessions", icon: "barbell-outline", color: "bg-slate-50 text-slate-600", earned: false },
  { id: 6, name: "Weekend Warrior", description: "5 weekend workouts", icon: "calendar-outline", color: "bg-indigo-50 text-indigo-600", earned: false },
];

export default function JourneyScreen() {
  const router = useRouter();
  const { streak, totalWorkouts, trainingHours } = useUserStore();

  const progressToNextMilestone = Math.min((totalWorkouts / 50) * 100, 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="px-5 pt-8 pb-4 flex-row justify-between items-start">
          <View>
            <Text className="text-3xl font-black text-[#1F2520]">Journey</Text>
            <Text className="text-sm text-[#6B756E] mt-1">Track your fitness habits.</Text>
          </View>
          <Pressable onPress={() => router.navigate("/")} className="bg-white p-2 rounded-full border border-black/5 shadow-sm active:bg-gray-100">
            <Ionicons name="close" size={20} color="#1F2520" />
          </Pressable>
        </View>

        {/* Milestone Card */}
        <View className="mx-5 bg-white rounded-[32px] p-6 border border-black/5 shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-xs font-bold text-[#6BCB77] uppercase tracking-wider mb-1">Current Stage</Text>
              <Text className="text-xl font-black text-[#1F2520]">Explorer</Text>
            </View>
            <View className="w-12 h-12 bg-emerald-50 rounded-full items-center justify-center">
              <Ionicons name="medal" size={24} color="#059669" />
            </View>
          </View>

          <View className="mb-2 flex-row justify-between items-end">
            <Text className="text-sm font-bold text-[#1F2520]">{totalWorkouts} Workouts</Text>
            <Text className="text-xs text-[#6B756E]">Goal: 50</Text>
          </View>
          <View className="h-3 bg-[#F5F7F4] rounded-full overflow-hidden">
            <View 
              className="h-full bg-[#6BCB77] rounded-full" 
              style={{ width: `${progressToNextMilestone}%` }} 
            />
          </View>
          <Text className="text-xs text-[#6B756E] mt-3 text-center">
            {50 - totalWorkouts} more workouts to reach the next milestone!
          </Text>
        </View>

        {/* Momentum Stats */}
        <View className="mx-5 mb-6">
          <Text className="text-base font-black text-[#1F2520] mb-4">Momentum</Text>
          <View className="flex-row gap-x-4">
            <View className="flex-1 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm">
              <Ionicons name="flame" size={24} color="#F97316" className="mb-3" />
              <Text className="text-2xl font-black text-[#1F2520]">{streak}</Text>
              <Text className="text-xs text-[#6B756E] mt-1">Day Streak</Text>
            </View>
            <View className="flex-1 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm">
              <Ionicons name="time" size={24} color="#3B82F6" className="mb-3" />
              <Text className="text-2xl font-black text-[#1F2520]">{trainingHours}</Text>
              <Text className="text-xs text-[#6B756E] mt-1">Training Hours</Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        <View className="mx-5 mb-6">
          <Text className="text-base font-black text-[#1F2520] mb-4">Badges</Text>
          <View className="flex-row flex-wrap justify-between">
            {BADGES.map((badge) => (
              <View 
                key={badge.id} 
                className={`w-[48%] bg-white rounded-[24px] p-4 border border-black/5 shadow-sm mb-4 ${badge.earned ? "" : "opacity-50"}`}
              >
                <View className={`w-10 h-10 rounded-full items-center justify-center mb-3 ${badge.earned ? badge.color.split(' ')[0] : 'bg-gray-100'}`}>
                  <Ionicons name={badge.icon as any} size={20} color={badge.earned ? "#1F2520" : "#9CA3AF"} />
                </View>
                <Text className="text-sm font-bold text-[#1F2520] mb-1">{badge.name}</Text>
                <Text className="text-[10px] text-[#6B756E]">{badge.description}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
