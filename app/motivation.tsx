import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  Share, 
  Alert, 
  StyleSheet 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUserStore } from "@/store/useUserStore";

interface DailyQuote {
  day: number;
  quote: string;
  author: string;
  theme: string;
  focus: string;
}

const MOTIVATION_DAYS: DailyQuote[] = [
  { day: 1, quote: "Consistency beats intensity. You've already outperformed the person who stayed home.", author: "ZonoFit Principle", theme: "Showing Up", focus: "Commit to walking through the door today." },
  { day: 2, quote: "You don't have to be extreme, just consistent.", author: "Habit Rule", theme: "Momentum", focus: "Even a 30-minute workout compounds over time." },
  { day: 3, quote: "The hardest lift is lifting your body off the couch.", author: "Fitness Wisdom", theme: "Action", focus: "Overcome the initial friction with a 5-minute warm-up." },
  { day: 4, quote: "Small daily disciplines repeated consistently lead to massive long-term transformations.", author: "Habit Engine", theme: "Compounding", focus: "Celebrate showing up 4 days in a row." },
  { day: 5, quote: "I am someone who works out regularly.", author: "Identity Goal", theme: "Identity", focus: "Make fitness part of who you are, not just something you do." },
  { day: 6, quote: "Action breeds motivation, not the other way around.", author: "Performance Mindset", theme: "Action", focus: "Don't wait to feel motivated. Start moving first." },
  { day: 7, quote: "One week in. What seemed hard last Monday is becoming your normal today.", author: "ZonoFit Milestone", theme: "Progress", focus: "Notice your energy levels rising." },
  { day: 8, quote: "Your future self is watching you right now through memories.", author: "Mindset", theme: "Perspective", focus: "Give your future self a reason to thank you." },
  { day: 9, quote: "Flexibility is freedom. A missed workout isn't failure—it's just a reschedule.", author: "Credit Freedom", theme: "Resilience", focus: "Use credits at any network gym that fits your day." },
  { day: 10, quote: "Discipline is choosing between what you want now and what you want most.", author: "Classic Rule", theme: "Discipline", focus: "Keep your 30-day commitment in sight." },
  { day: 11, quote: "The body achieves what the mind believes.", author: "Mental Strength", theme: "Belief", focus: "Push for that extra rep or extra minute of cardio." },
  { day: 12, quote: "Fitness isn't a punishment for what you ate; it's a celebration of what your body can do.", author: "Self-Respect", theme: "Gratitude", focus: "Enjoy the movement and strength today." },
  { day: 13, quote: "A bad workout is only the one that didn't happen.", author: "Gym Truth", theme: "Effort", focus: "Any effort is better than zero effort." },
  { day: 14, quote: "Two weeks of consistency. You are building a lifelong habit.", author: "Habit Milestone", theme: "Habit", focus: "Lock in your weekly workout slots." },
  { day: 15, quote: "Halfway through the month. Momentum is on your side.", author: "Momentum", theme: "Persistence", focus: "Keep the streak alive and inspire someone today." },
  { day: 16, quote: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi", theme: "Willpower", focus: "Stay steady through busy days." },
  { day: 17, quote: "Routine is the foundation of freedom.", author: "Productivity", theme: "Routine", focus: "Pack your gym gear the night before." },
  { day: 18, quote: "You never regret a workout once it's finished.", author: "Every Athlete", theme: "Reward", focus: "Remember the post-workout high." },
  { day: 19, quote: "Don't count the days, make the days count.", author: "Muhammad Ali", theme: "Presence", focus: "Give 100% focus during your workout window." },
  { day: 20, quote: "Consistency is the DNA of mastery.", author: "Excellence", theme: "Mastery", focus: "Track your progress on your ZonoFit Journey." },
  { day: 21, quote: "21 days: Science says habits begin solidifying now.", author: "Behavioral Science", theme: "Transformation", focus: "Working out is becoming automatic." },
  { day: 22, quote: "Energy flows where attention goes.", author: "Focus", theme: "Energy", focus: "Channel your day's stress into heavy lifts or cardio." },
  { day: 23, quote: "Be stronger than your strongest excuse.", author: "No Excuses", theme: "Resilience", focus: "Find a 45-minute window and own it." },
  { day: 24, quote: "You are one workout away from a better mood.", author: "Endorphins", theme: "Mental Health", focus: "Move to clear your mind." },
  { day: 25, quote: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.", author: "Dwayne Johnson", theme: "Work Ethic", focus: "Show up today." },
  { day: 26, quote: "Your body can stand almost anything; it's your mind that you have to convince.", author: "Mental Grit", theme: "Grit", focus: "Breathe through the fatigue." },
  { day: 27, quote: "The difference between who you are and who you want to be is what you do.", author: "Transformation", theme: "Action", focus: "Close the gap one session at a time." },
  { day: 28, quote: "Almost at month end. Look back at how far you've come.", author: "Reflection", theme: "Pride", focus: "Count the visits you've completed this month." },
  { day: 29, quote: "Finish strong. How you finish determines how you start next month.", author: "ZonoFit Coach", theme: "Finish Line", focus: "Give today's session extra energy." },
  { day: 30, quote: "30 Days of Habit. You are officially someone who works out regularly.", author: "ZonoFit Identity", theme: "Identity Achieved", focus: "Celebrate your month! Ready for Cycle 2." },
];

export default function DailyMotivationScreen() {
  const router = useRouter();
  const { streak } = useUserStore();
  
  // Current active day based on streak (bounded 1 to 30)
  const currentDay = Math.min(30, Math.max(1, streak || 1));
  const [selectedDay, setSelectedDay] = useState<number>(currentDay);

  const activeQuote = MOTIVATION_DAYS.find(q => q.day === selectedDay) || MOTIVATION_DAYS[0];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🔥 Day ${activeQuote.day} Daily Motivation on ZonoFit:\n\n"${activeQuote.quote}"\n— ${activeQuote.author}\n\nBuild your fitness consistency with ZonoFit!`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3 bg-white border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 active:opacity-60">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <View className="items-center flex-1">
          <Text className="text-[17px] font-bold text-[#111827]">Daily Motivation</Text>
          <Text className="text-[11px] text-[#6B7280]">30-Day Fitness Habit Series</Text>
        </View>
        <Pressable onPress={handleShare} className="w-10 h-10 items-center justify-center active:opacity-60">
          <Ionicons name="share-social-outline" size={20} color="#1F7A3E" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Hero Card for Selected Day */}
        <View className="px-5 pt-5 mb-5">
          <View className="bg-[#1F7A3E] rounded-[28px] p-6 shadow-md relative overflow-hidden" style={styles.cardShadow}>
            {/* Background decorative glow */}
            <View style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.08)" }} />

            <View className="flex-row items-center justify-between mb-4">
              <View className="bg-white/20 px-3 py-1 rounded-full flex-row items-center">
                <Ionicons name="flame" size={13} color="#FDE047" />
                <Text className="text-white text-[11px] font-bold ml-1 uppercase tracking-wider">
                  Day {activeQuote.day} of 30
                </Text>
              </View>
              <View className="bg-[#A7F3D0]/20 px-2.5 py-0.5 rounded-full border border-white/20">
                <Text className="text-[#A7F3D0] text-[10px] font-bold uppercase">{activeQuote.theme}</Text>
              </View>
            </View>

            <Text className="text-white text-[20px] font-extrabold italic leading-8 mb-3">
              "{activeQuote.quote}"
            </Text>

            <Text className="text-white/80 text-xs font-semibold mb-6">
              — {activeQuote.author}
            </Text>

            {/* Daily Focus Callout */}
            <View className="bg-white/10 rounded-2xl p-3.5 border border-white/15">
              <View className="flex-row items-center mb-1">
                <Ionicons name="sparkles" size={14} color="#FDE047" />
                <Text className="text-[#FDE047] text-[11px] font-bold ml-1.5 uppercase">Today's Focus</Text>
              </View>
              <Text className="text-white/95 text-xs font-medium leading-relaxed">
                {activeQuote.focus}
              </Text>
            </View>

            {/* Share CTA */}
            <View className="flex-row gap-x-3 mt-5">
              <Pressable 
                onPress={handleShare}
                className="flex-1 bg-white rounded-xl py-3 flex-row items-center justify-center active:bg-gray-100"
              >
                <Ionicons name="share-social" size={16} color="#1F7A3E" style={{ marginRight: 6 }} />
                <Text className="text-[#1F7A3E] font-bold text-xs">Share Quote</Text>
              </Pressable>
              <Pressable 
                onPress={() => router.push("/explore")}
                className="flex-1 bg-white/20 rounded-xl py-3 flex-row items-center justify-center border border-white/30 active:bg-white/30"
              >
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-bold text-xs">Book Workout</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 30-Day Calendar Strip */}
        <View className="px-5 mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#111827] font-bold text-[15px]">30-Day Journey</Text>
            <Text className="text-[#6B7280] text-xs">Tap any day to preview</Text>
          </View>

          <View className="bg-white rounded-[24px] p-4 border border-gray-200 shadow-sm">
            <View className="flex-row flex-wrap gap-2 justify-between">
              {MOTIVATION_DAYS.map((item) => {
                const isSelected = item.day === selectedDay;
                const isCurrentStreak = item.day === currentDay;
                const isPast = item.day < currentDay;

                return (
                  <Pressable
                    key={item.day}
                    onPress={() => setSelectedDay(item.day)}
                    className={`w-[44px] h-[44px] rounded-2xl items-center justify-center border ${
                      isSelected
                        ? "bg-[#1F7A3E] border-[#1F7A3E]"
                        : isCurrentStreak
                        ? "bg-[#ECFDF5] border-[#1F7A3E]"
                        : isPast
                        ? "bg-[#F3F4F6] border-gray-200"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-[12px] font-bold ${
                      isSelected
                        ? "text-white"
                        : isCurrentStreak
                        ? "text-[#1F7A3E]"
                        : "text-[#374151]"
                    }`}>
                      D{item.day}
                    </Text>
                    {isCurrentStreak && (
                      <View className="w-1.5 h-1.5 rounded-full bg-[#1F7A3E] mt-0.5" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Motivation Rule of Thumb */}
        <View className="px-5 mb-4">
          <View className="bg-[#F0FDF4] rounded-2xl p-4 border border-[#BBF7D0] flex-row items-start">
            <View className="w-8 h-8 rounded-full bg-[#DCFCE7] items-center justify-center mr-3 mt-0.5">
              <Ionicons name="bulb-outline" size={18} color="#166534" />
            </View>
            <View className="flex-1">
              <Text className="text-[#166534] font-bold text-xs mb-0.5">The ZonoFit Habit Law</Text>
              <Text className="text-[#166534]/90 text-[11px] leading-relaxed">
                Consistency beats intensity. Missing one workout is an accident; missing two is the start of a new habit of inactivity. Show up for yourself today!
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
});
