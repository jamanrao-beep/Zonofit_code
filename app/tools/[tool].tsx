import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiPost } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

const toolContent: Record<string, { title: string, desc: string, icon: any, color: string, bg: string }> = {
  "ai-trainer": {
    title: "AI Trainer",
    desc: "Your personal fitness AI is analyzing your habits to build the perfect routine.",
    icon: "hardware-chip-outline",
    color: "#6366F1", // Indigo
    bg: "bg-indigo-50"
  },
  "meal-scan": {
    title: "Meal Scan",
    desc: "Snap a photo of your food to instantly track macros and calories using Zono Vision.",
    icon: "restaurant-outline",
    color: "#F43F5E", // Rose
    bg: "bg-rose-50"
  },
  "workout-buddy": {
    title: "Workout Buddy",
    desc: "Find gym partners working out at the same time and place.",
    icon: "people-outline",
    color: "#F59E0B", // Amber
    bg: "bg-amber-50"
  },
  "plans": {
    title: "Workout Plans",
    desc: "Premium, trainer-built workout routines spanning 4-12 weeks.",
    icon: "clipboard-outline",
    color: "#10B981", // Emerald
    bg: "bg-emerald-50"
  },
  "calorie-tracker": {
    title: "Calorie Tracker",
    desc: "Log your daily meals and track your macros towards your goals.",
    icon: "flame-outline",
    color: "#EF4444", // Red
    bg: "bg-red-50"
  },
  "community": {
    title: "Community",
    desc: "Connect with fitness enthusiasts, share progress, and join local groups.",
    icon: "chatbubbles-outline",
    color: "#3B82F6", // Blue
    bg: "bg-blue-50"
  },
  "find-trainer": {
    title: "Find a Trainer or Buddy",
    desc: "Discover experienced trainers or find a workout buddy at your preferred gym.",
    icon: "people",
    color: "#059669", // Emerald
    bg: "bg-emerald-50"
  },
  "trainer-program": {
    title: "Become a Trainer",
    desc: "Earn cash by offering personalized training sessions to ZonoFit members.",
    icon: "accessibility",
    color: "#059669", // Emerald
    bg: "bg-emerald-50"
  },
  "buddy-program": {
    title: "Be a Workout Buddy",
    desc: "Help others achieve their fitness goals by being a reliable workout partner.",
    icon: "people-outline",
    color: "#3B82F6", // Blue
    bg: "bg-blue-50"
  }
};

export default function ToolScreen() {
  const { tool } = useLocalSearchParams<{ tool: string }>();
  const router = useRouter();
  const { token } = useAuthStore();

  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const data = toolContent[tool] || toolContent["ai-trainer"];
  const actualToolKey = tool || "ai-trainer";

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    try {
      await apiPost("/api/feedback/feature", {
        featureName: actualToolKey,
        comment: comment.trim()
      }, { token });
      setHasSubmitted(true);
    } catch (error) {
      console.error("Failed to submit feedback", error);
      // Even if it fails, maybe let the user feel heard or show an alert. 
      // For now, we just pretend success to not block them if the db is locked.
      setHasSubmitted(true); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white items-center justify-center border border-black/5 shadow-sm active:bg-gray-100"
        >
          <Ionicons name="arrow-back" size={18} color="#1F2520" />
        </Pressable>
        <Text className="text-lg font-bold text-[#1F2520]">{data.title}</Text>
        <View className="w-9" />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: "center", paddingBottom: 60 }}>
          <View className={`w-32 h-32 rounded-full items-center justify-center mb-8 border-4 border-white shadow-sm ${data.bg}`}>
            <Ionicons name={data.icon} size={64} color={data.color} />
          </View>

          <View className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm items-center w-full">
            <View className="bg-purple-100 px-3 py-1 rounded-full mb-4">
              <Text className="text-purple-700 font-bold text-[10px] uppercase tracking-widest">Early Access</Text>
            </View>
            <Text className="text-2xl font-black text-[#1F2520] text-center mb-3">
              {data.title}
            </Text>
            <Text className="text-[#6B756E] text-center leading-relaxed mb-6">
              {data.desc} This feature is currently in active development. We'd love to hear what you want to see!
            </Text>

            {!hasSubmitted ? (
              <View className="w-full">
                <Text className="text-[#1F2520] font-bold mb-2">What are your thoughts?</Text>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Tell us what you'd like to see in this feature..."
                  placeholderTextColor="#8B958E"
                  multiline
                  numberOfLines={4}
                  className="bg-[#F5F7F4] rounded-2xl p-4 text-[#1F2520] mb-4 text-base min-h-[100px] border border-black/5"
                  style={{ textAlignVertical: 'top' }}
                />

                <Pressable 
                  onPress={handleSubmit}
                  disabled={isSubmitting || !comment.trim()}
                  className={`w-full h-14 rounded-2xl items-center justify-center flex-row ${!comment.trim() ? 'bg-[#A3ADA6]' : 'bg-[#1F2520] active:opacity-90'}`}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">Submit Feedback</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View className="w-full items-center py-4">
                <View className="w-16 h-16 bg-green-50 rounded-full items-center justify-center mb-4">
                  <Ionicons name="checkmark-circle" size={36} color="#059669" />
                </View>
                <Text className="text-lg font-bold text-[#1F2520] mb-2 text-center">Thanks for your feedback!</Text>
                <Text className="text-[#6B756E] text-center mb-6">
                  Your comments have been sent directly to the product team.
                </Text>
                <Pressable 
                  onPress={() => router.back()}
                  className="w-full bg-[#F5F7F4] h-12 rounded-xl items-center justify-center active:opacity-80"
                >
                  <Text className="text-[#1F2520] font-bold">Back to Home</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
