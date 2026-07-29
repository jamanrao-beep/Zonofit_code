import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function FeatureDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Mock data fetching based on ID. Defaults to "Recovery" as per mockup.
  const getFeatureDetails = (featureId: string) => {
    const data: any = {
      recovery: {
        title: "Recovery",
        icon: "heart",
        iconBg: "bg-rose-50",
        iconColor: "#F43F5E",
        status: "Coming Soon",
        statusBg: "bg-rose-50",
        statusColor: "text-rose-500",
        launch: "Q3 2026",
        desc: "Complete recovery solutions to help your body heal, relax and perform better.",
        themeColor: "#F43F5E",
        themeBg: "bg-[#F43F5E]",
        themeLightBg: "bg-rose-50",
        whatsComing: [
          { title: "Recovery Centers", desc: "Find recovery centers near you.", icon: "medkit-outline", iconBg: "bg-rose-50" },
          { title: "Massage Therapy", desc: "Book professional massage sessions.", icon: "body-outline", iconBg: "bg-rose-50" },
          { title: "Ice Bath & Compression", desc: "Ice baths, compression therapy and more.", icon: "snow-outline", iconBg: "bg-rose-50" },
          { title: "Mobility & Stretching", desc: "Improve flexibility and mobility.", icon: "fitness-outline", iconBg: "bg-rose-50" },
          { title: "Recovery Plans", desc: "Personalized recovery plans for you.", icon: "clipboard-outline", iconBg: "bg-rose-50" }
        ],
        whyMatters: "Recovery is 50% of your progress. We're bringing the best recovery experiences to you.",
        waiting: "8,250",
        timeline: [
          { step: "Planning", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
          { step: "Design & Research", status: "Completed", color: "text-green-600", dotColor: "bg-green-600", iconColor: "#10B981" },
          { step: "Development", status: "In Progress", color: "text-amber-500", dotColor: "bg-amber-500", iconColor: "#F59E0B" },
          { step: "Testing", status: "Upcoming", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" },
          { step: "Launch", status: "Q3 2026 (Expected)", color: "text-gray-500", dotColor: "bg-gray-200", iconColor: "#E5E7EB" }
        ]
      }
    };
    return data[featureId] || data.recovery; // Fallback to recovery for MVP
  };

  const feature = getFeatureDetails(id as string);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 z-10">
          <Ionicons name="chevron-back" size={26} color="#000" />
        </Pressable>
        <Text className="text-[18px] font-bold text-black flex-1 text-center -ml-6">Feature Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Main Hero Card */}
        <View className="flex-row px-6 py-6 items-center border-b border-gray-100">
          <View className={`w-[100px] h-[100px] rounded-3xl ${feature.iconBg} items-center justify-center mr-6 shadow-sm`} style={{ shadowColor: feature.themeColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <Ionicons name={feature.icon} size={48} color={feature.iconColor} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center mb-1.5 flex-wrap">
              <Text className="text-[22px] font-bold text-black mr-2">{feature.title}</Text>
              <View className={`${feature.statusBg} px-2 py-1 rounded-md`}>
                <Text className={`${feature.statusColor} text-[9px] font-bold uppercase tracking-wider`}>{feature.status}</Text>
              </View>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="calendar-outline" size={12} color="#6B7280" />
              <Text className="text-gray-500 text-[11px] ml-1">Launch expected: {feature.launch}</Text>
            </View>
            <Text className="text-gray-600 text-[13px] leading-relaxed pr-2">{feature.desc}</Text>
          </View>
        </View>

        {/* What's Coming */}
        <View className="px-5 py-6">
          <Text className="text-[18px] font-bold text-black mb-4">What's Coming</Text>
          {feature.whatsComing.map((item: any, index: number) => (
            <View key={index} className="flex-row items-center mb-4">
              <View className={`w-10 h-10 rounded-full ${item.iconBg} items-center justify-center mr-4`}>
                <Ionicons name={item.icon} size={18} color={feature.iconColor} />
              </View>
              <View className="flex-1 border-b border-gray-50 pb-4">
                <Text className="text-[14px] font-bold text-black mb-0.5">{item.title}</Text>
                <Text className="text-[12px] text-gray-500">{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          ))}
        </View>

        {/* Why it matters */}
        <View className="px-5 mb-6">
          <View className={`${feature.themeLightBg} rounded-[20px] p-5 flex-row items-center border border-rose-100/50`}>
            <View className="flex-1 pr-4">
              <Text className={`${feature.statusColor} font-bold text-[14px] mb-2`}>Why it matters?</Text>
              <Text className="text-gray-800 text-[13px] leading-relaxed">{feature.whyMatters}</Text>
            </View>
            <View className="opacity-50">
              <Ionicons name="pulse" size={40} color={feature.iconColor} />
            </View>
          </View>
        </View>

        {/* Community Interest */}
        <View className="px-5 mb-8">
          <Text className="text-[16px] font-bold text-black mb-2">Community Interest</Text>
          <Text className={`${feature.statusColor} font-bold text-[12px] mb-4`}><Text className="font-black text-[13px]">{feature.waiting}</Text> members are waiting for this feature</Text>
          <View className="flex-row items-center">
            {/* Mock Avatars */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} className={`w-10 h-10 rounded-full bg-gray-200 border-2 border-white items-center justify-center ${i > 1 ? '-ml-3' : ''} z-${10-i}`}>
                <Ionicons name="person" size={20} color="#9CA3AF" />
              </View>
            ))}
            <View className="w-10 h-10 rounded-full bg-rose-50 border-2 border-white items-center justify-center -ml-3 z-0">
              <Text className="text-[10px] font-bold text-rose-500">+8K</Text>
            </View>
          </View>
        </View>

        {/* Help Prioritize */}
        <View className="px-5 mb-8">
          <Text className="text-[16px] font-bold text-black mb-2">Help Prioritize This Feature</Text>
          <Text className="text-gray-500 text-[12px] mb-5">Your vote helps us decide what to build next.</Text>
          
          <Pressable className={`${feature.themeBg} rounded-[16px] py-4 items-center justify-center flex-row mb-3 active:opacity-90 shadow-sm`}>
            <Ionicons name="thumbs-up" size={18} color="white" />
            <Text className="text-white font-bold text-[15px] ml-2">Vote for {feature.title}</Text>
          </Pressable>
          
          <Pressable className={`border border-rose-300 ${feature.themeLightBg} rounded-[16px] py-4 items-center justify-center flex-row active:opacity-90`}>
            <Ionicons name="chatbubble-outline" size={18} color={feature.iconColor} />
            <Text className={`${feature.statusColor} font-bold text-[15px] ml-2`}>Share Feedback</Text>
          </Pressable>
        </View>

        {/* Get Notified */}
        <View className="px-5 mb-8">
          <Text className="text-[16px] font-bold text-black mb-2">Get Notified</Text>
          <Text className="text-gray-500 text-[12px] mb-5">We'll notify you as soon as this feature is available.</Text>
          
          <Pressable className={`${feature.themeBg} rounded-[16px] py-4 items-center justify-center flex-row active:opacity-90 shadow-sm`}>
            <Ionicons name="notifications" size={18} color="white" />
            <Text className="text-white font-bold text-[15px] ml-2">Notify Me</Text>
          </Pressable>
        </View>

        {/* Roadmap Timeline */}
        <View className="px-5 mb-8">
          <Text className="text-[18px] font-bold text-black mb-6">Roadmap Timeline</Text>
          
          <View className="ml-2">
            {feature.timeline.map((item: any, index: number) => {
              const isLast = index === feature.timeline.length - 1;
              return (
                <View key={index} className="flex-row mb-6 relative">
                  {/* Vertical Line */}
                  {!isLast && (
                    <View className="absolute left-2.5 top-6 bottom-[-24px] w-[2px] bg-gray-100" />
                  )}
                  
                  <View className={`w-5 h-5 rounded-full ${item.dotColor} items-center justify-center mt-0.5 z-10`}>
                    {item.status === "Completed" && <Ionicons name="checkmark" size={12} color="white" />}
                    {item.status === "In Progress" && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                  
                  <View className="flex-row justify-between flex-1 ml-4 border-b border-gray-50 pb-2">
                    <Text className="text-[14px] font-bold text-black">{item.step}</Text>
                    <Text className={`text-[12px] font-bold ${item.color}`}>{item.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
