import React from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFeatureStore, featureBaseData } from "@/store/useFeatureStore";

export default function FutureOverviewScreen() {
  const router = useRouter();
  const { votes, notifications, toggleVote, toggleNotify } = useFeatureStore();

  const renderCard = (
    id: string, icon: any, iconBg: string, iconColor: string, 
    title: string, items: string[], tag: string, tagBg: string, tagColor: string, 
    showNotifyPrimary: boolean, hasVoteAction: boolean
  ) => {
    
    const hasVoted = !!votes[id];
    const hasNotified = !!notifications[id];
    const currentWaiting = (featureBaseData[id] || 0) + (hasVoted ? 1 : 0);
    const waitingStr = currentWaiting.toLocaleString("en-US");

    return (
      <Pressable 
        key={id}
        onPress={() => router.push(`/future/${id}`)}
        className="w-[170px] bg-white border border-gray-100 shadow-sm rounded-[24px] p-4 mr-4"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}
      >
        <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-4 ${iconBg}`}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <Text className="font-bold text-[16px] text-black mb-2">{title}</Text>
        <View className="mb-3 flex-1">
          {items.map((item, i) => (
            <Text key={i} className="text-gray-600 text-[11px] mb-1.5 leading-tight">• {item}</Text>
          ))}
        </View>
        <View className={`self-start px-2 py-1 rounded-md mb-4 ${tagBg}`}>
          <Text className={`font-bold text-[9px] uppercase tracking-wider ${tagColor}`}>{tag}</Text>
        </View>
        <View className="flex-row items-center mb-4">
          <Ionicons name="people" size={12} color="#4B5563" />
          <Text className="text-black font-bold text-[12px] ml-1.5">{waitingStr} <Text className="font-normal text-gray-500">waiting</Text></Text>
        </View>
        <View className="flex-row gap-x-2 mt-auto">
          {hasVoteAction && (
            <Pressable 
              onPress={() => toggleVote(id)}
              className={`flex-1 items-center justify-center py-2 border rounded-[10px] ${hasVoted ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}
            >
              <View className="flex-row items-center">
                <Ionicons name="thumbs-up-outline" size={12} color={hasVoted ? iconColor : "#4B5563"} />
                <Text className={`font-bold text-[11px] ml-1 ${hasVoted ? tagColor : 'text-gray-700'}`}>{hasVoted ? 'Voted' : 'Vote'}</Text>
              </View>
            </Pressable>
          )}
          
          {showNotifyPrimary ? (
            <Pressable 
              onPress={() => toggleNotify(id)}
              className={`flex-1 items-center justify-center py-2 rounded-[10px] border ${hasNotified ? 'bg-gray-100 border-gray-200' : `${iconBg} border-[${iconColor}] border-opacity-20`}`}
            >
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={12} color={hasNotified ? "#9CA3AF" : iconColor} />
                <Text className={`font-bold text-[11px] ml-1 ${hasNotified ? 'text-gray-500' : tagColor}`}>
                  {hasNotified ? 'Notified' : 'Notify Me'}
                </Text>
              </View>
            </Pressable>
          ) : !hasVoteAction ? (
             <Pressable 
              onPress={() => toggleVote(id)}
              className={`flex-1 items-center justify-center py-2 border rounded-[10px] ${hasVoted ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}
            >
              <View className="flex-row items-center">
                <Ionicons name="thumbs-up-outline" size={12} color={hasVoted ? iconColor : "#4B5563"} />
                <Text className={`font-bold text-[11px] ml-1 ${hasVoted ? tagColor : 'text-gray-700'}`}>{hasVoted ? 'Voted' : 'Vote'}</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row justify-between items-start">
        <View className="flex-1 pr-4">
          <Text className="text-[28px] font-black text-black tracking-tight mb-1">Future of ZonoFit</Text>
          <Text className="text-gray-500 text-[14px] leading-snug">We're building more to power your fitness journey.</Text>
        </View>
        <Pressable className="w-10 h-10 rounded-full border border-gray-200 bg-white items-center justify-center relative shadow-sm">
          <Ionicons name="notifications-outline" size={20} color="black" />
          <View className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 border border-white" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}>
        {/* Hero Banner */}
        <View className="mx-5 bg-[#E8F5E9] rounded-[24px] p-6 mb-6 flex-row overflow-hidden relative border border-[#1F7A3E]/10" style={{ shadowColor: '#1F7A3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
          <View className="w-[60%] z-10">
            <Text className="text-[#0B711A] text-[20px] font-black mb-2 leading-snug">The Future Starts Here</Text>
            <Text className="text-[#1F7A3E] text-[13px] font-medium mb-4 leading-relaxed pr-2">
              You're one of our early members. Help shape the future of ZonoFit.
            </Text>
            <Pressable className="bg-[#0B711A] self-start px-4 py-2.5 rounded-full flex-row items-center shadow-sm">
              <Text className="text-white font-bold text-[12px] mr-1.5">Join Beta Program</Text>
              <Ionicons name="chevron-forward" size={14} color="white" />
            </Pressable>
          </View>
          {/* Placeholder for Rocket 3D Graphic */}
          <View className="absolute right-[-10px] bottom-[-10px] w-[140px] h-[140px] items-center justify-center opacity-90 pointer-events-none">
             <Ionicons name="rocket" size={100} color="#34D399" style={{ transform: [{ rotate: '45deg' }] }} />
             <View className="absolute bottom-4 left-6 bg-[#0B711A] px-3 py-1.5 rounded-lg transform -rotate-12">
               <Text className="text-white font-black italic text-lg">ZF</Text>
             </View>
          </View>
        </View>

        {/* Community Progress */}
        <View className="mx-5 mb-8">
          <Text className="text-black font-bold text-[16px] mb-4">Community Progress</Text>
          <View className="flex-row justify-between bg-white rounded-[20px] p-4 shadow-sm border border-gray-100" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
            <View className="flex-row items-center flex-1 justify-center border-r border-gray-100">
              <View className="w-8 h-8 rounded-full bg-[#E8F5E9] items-center justify-center mr-2 border border-green-100">
                <Ionicons name="checkmark-circle-outline" size={16} color="#0B711A" />
              </View>
              <View>
                <Text className="text-black font-black text-[18px]">4</Text>
                <Text className="text-gray-500 text-[9px] font-bold">Live Features</Text>
              </View>
            </View>
            <View className="flex-row items-center flex-1 justify-center border-r border-gray-100">
              <View className="w-8 h-8 rounded-full bg-[#FFF7ED] items-center justify-center mr-2 border border-orange-100">
                <Ionicons name="build-outline" size={14} color="#EA580C" />
              </View>
              <View>
                <Text className="text-black font-black text-[18px]">6</Text>
                <Text className="text-gray-500 text-[9px] font-bold">In Development</Text>
              </View>
            </View>
            <View className="flex-row items-center flex-1 justify-center">
              <View className="w-8 h-8 rounded-full bg-[#F3E8FF] items-center justify-center mr-2 border border-purple-100">
                <Ionicons name="list-outline" size={16} color="#7C3AED" />
              </View>
              <View>
                <Text className="text-black font-black text-[18px]">9</Text>
                <Text className="text-gray-500 text-[9px] font-bold">Planned Features</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Launching Next */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-5 mb-4">
            <Text className="text-black font-bold text-[18px]">Launching Next</Text>
            <Text className="text-[#0B711A] font-bold text-[12px]">View All</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 6 }}>
            {renderCard(
              "recovery", "heart", "bg-rose-50", "#F43F5E",
              "Recovery", ["Recovery Centers", "Massage Therapy", "Ice Bath & More"],
              "Coming Soon", "bg-rose-50", "text-rose-500", true, false
            )}
            {renderCard(
              "nutrition", "nutrition", "bg-orange-50", "#EA580C",
              "Nutrition", ["Nutrition Plans", "Meal Tracking", "Dietician Consultation"],
              "Coming Soon", "bg-orange-50", "text-orange-500", true, false
            )}
            {renderCard(
              "sports-booking", "football", "bg-blue-50", "#3B82F6",
              "Sports Booking", ["Courts & Grounds", "Classes & Activities", "Community Play"],
              "Coming Soon", "bg-blue-50", "text-blue-500", true, false
            )}
          </ScrollView>
        </View>

        {/* In Development */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-5 mb-4">
            <Text className="text-black font-bold text-[18px]">In Development</Text>
            <Text className="text-[#0B711A] font-bold text-[12px]">View All</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 6 }}>
            {renderCard(
              "ai-coach", "hardware-chip", "bg-purple-50", "#7C3AED",
              "AI Coach", ["Personal AI Trainer", "Adaptive Workouts", "Smart Guidance"],
              "In Development", "bg-purple-100", "text-purple-600", true, true
            )}
            {renderCard(
              "workout-generator", "barbell", "bg-teal-50", "#0D9488",
              "Workout Generator", ["Custom Workouts", "Goal Based Plans", "Exercise Library"],
              "In Development", "bg-teal-100", "text-teal-600", true, true
            )}
            {renderCard(
              "personal-trainer", "person", "bg-orange-50", "#EA580C",
              "Personal Trainer", ["Book Trainers", "1-on-1 Sessions", "Training Plans"],
              "In Development", "bg-orange-100", "text-orange-600", true, true
            )}
          </ScrollView>
        </View>

        {/* Future Vision */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-5 mb-4">
            <Text className="text-black font-bold text-[18px]">Future Vision</Text>
            <Text className="text-[#0B711A] font-bold text-[12px]">View All</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 6 }}>
            {renderCard(
              "travel-fitness", "airplane", "bg-indigo-50", "#4F46E5",
              "Travel Fitness", ["Workouts on the go", "Hotel Gyms", "Travel Planner"],
              "Planned", "bg-gray-100", "text-gray-600", false, false
            )}
            {renderCard(
              "corporate-wellness", "briefcase", "bg-emerald-50", "#10B981",
              "Corporate Wellness", ["Corporate Plans", "Employee Challenges", "Wellness Programs"],
              "Planned", "bg-gray-100", "text-gray-600", false, false
            )}
            {renderCard(
              "smart-wearables", "watch", "bg-purple-50", "#7C3AED",
              "Smart Wearables", ["Wearable Sync", "Health Insights", "Smart Recommendations"],
              "Planned", "bg-gray-100", "text-gray-600", false, false
            )}
          </ScrollView>
        </View>

        {/* Help Us Build Banner */}
        <View className="mx-5 bg-[#FFFBEB] rounded-[24px] p-5 mb-6 flex-row items-center border border-amber-100 shadow-sm relative overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 }}>
          <View className="w-12 h-12 bg-amber-100 rounded-full items-center justify-center mr-4">
            <Text className="text-2xl">🏆</Text>
          </View>
          <View className="flex-1 pr-16 z-10">
            <Text className="font-bold text-black text-[14px] mb-1">Help Us Build ZonoFit Faster</Text>
            <Text className="text-[11px] text-gray-700 mb-3">More members, more partners, faster launches!</Text>
            <Pressable className="bg-[#0B711A] self-start px-4 py-2 rounded-lg flex-row items-center">
              <Text className="text-white font-bold text-[11px] mr-1">Invite Friends</Text>
              <Ionicons name="chevron-forward" size={12} color="white" />
            </Pressable>
          </View>
          <View className="absolute right-0 bottom-0 opacity-80 pointer-events-none">
            <Ionicons name="people" size={80} color="#FCD34D" style={{ marginRight: -10, marginBottom: -10 }} />
          </View>
        </View>

        {/* Have an idea */}
        <View className="mx-5 mb-6 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="font-bold text-black text-[14px] mb-1">Have an idea?</Text>
            <Text className="text-gray-500 text-[12px]">Suggest a feature you'd love to see in ZonoFit.</Text>
          </View>
          <Pressable className="border border-[#0B711A] bg-green-50 px-3 py-2 rounded-lg flex-row items-center">
            <Ionicons name="bulb-outline" size={14} color="#0B711A" className="mr-1" />
            <Text className="text-[#0B711A] font-bold text-[11px] mr-1 ml-1">Suggest Feature</Text>
            <Ionicons name="chevron-forward" size={12} color="#0B711A" />
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
