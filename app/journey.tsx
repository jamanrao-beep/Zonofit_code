import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUserStore } from "@/store/useUserStore";
import { useJourneyStore } from "@/store/useJourneyStore";
import { journeyStages, getStageForWorkoutCount } from "@/data/milestones";
import { mockBadges, getUnlockedBadges } from "@/data/badges";

export default function JourneyScreen() {
  const router = useRouter();

  const {
    totalWorkouts,
    streak,
    currentMonth,
    totalMonths,
    identityStage,
    progressPercentage,
    nextMilestone,
  } = useUserStore();

  const { activeChallenges } = useJourneyStore();

  const currentStage = getStageForWorkoutCount(totalWorkouts);
  const unlockedBadges = getUnlockedBadges(totalWorkouts);
  const lockedBadgeCount = mockBadges.filter(
    (b) => !b.isSpecial && b.unlockedAt !== undefined && totalWorkouts < (b.unlockedAt ?? 0)
  ).length;

  const monthlyTarget = 15;
  const monthlyVisits = Math.min(totalWorkouts, monthlyTarget);

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
        <Text className="text-lg font-bold text-[#1F2520]">Fitness Journey</Text>
        <View className="w-9" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Section 1: Journey Hero */}
        <View className="mx-5 mb-6">
          <View
            className="rounded-[28px] p-6 overflow-hidden relative"
            style={{ backgroundColor: currentStage.color }}
          >
            {/* Background blobs */}
            <View
              style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.1)" }}
            />
            <View
              style={{ position: "absolute", bottom: -60, left: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.07)" }}
            />

            {/* Stage badge */}
            <View className="flex-row justify-between items-start mb-4">
              <View className="bg-white/20 px-3 py-1.5 rounded-full border border-white/25">
                <Text className="text-white text-xs font-bold">Month {currentMonth} of {totalMonths}</Text>
              </View>
              <Text style={{ fontSize: 36 }}>{currentStage.stageEmoji}</Text>
            </View>

            <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider">Current Stage</Text>
            <Text className="text-white text-3xl font-black mt-0.5">{currentStage.stageName}</Text>
            <Text className="text-white/75 text-xs mt-1.5 leading-relaxed">{currentStage.description}</Text>

            {/* Progress bar */}
            <View className="mt-5">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-white/80 text-xs font-medium">{progressPercentage}% Complete</Text>
                <Text className="text-white text-xs font-bold">Next: {nextMilestone}</Text>
              </View>
              <View style={{ height: 8, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 4, overflow: "hidden" }}>
                <View style={{ width: `${progressPercentage}%`, height: "100%", backgroundColor: "white", borderRadius: 4 }} />
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Quick Stats */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">Your Stats</Text>
        <View className="flex-row gap-x-4 px-5 mb-6">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-black/5 shadow-sm items-center">
            <Text className="text-2xl mb-0.5">🏋️</Text>
            <Text className="text-xl font-bold text-[#1F2520]">{totalWorkouts}</Text>
            <Text className="text-[10px] text-[#6B756E] font-medium uppercase mt-0.5">Total Visits</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-black/5 shadow-sm items-center">
            <Text className="text-2xl mb-0.5">🔥</Text>
            <Text className="text-xl font-bold text-[#1F2520]">{streak}</Text>
            <Text className="text-[10px] text-[#6B756E] font-medium uppercase mt-0.5">Day Streak</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-black/5 shadow-sm items-center">
            <Text className="text-2xl mb-0.5">🏅</Text>
            <Text className="text-xl font-bold text-[#1F2520]">{unlockedBadges.length}</Text>
            <Text className="text-[10px] text-[#6B756E] font-medium uppercase mt-0.5">Badges</Text>
          </View>
        </View>

        {/* Section 3: Monthly Target */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">Monthly Target</Text>
        <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-base font-bold text-[#1F2520]">July Target</Text>
              <Text className="text-xs text-[#6B756E] mt-0.5">{monthlyVisits} of {monthlyTarget} visits completed</Text>
            </View>
            <View className="bg-[#EAF7EC] px-3 py-1 rounded-full">
              <Text className="text-[#6BCB77] text-xs font-bold">{Math.round((monthlyVisits / monthlyTarget) * 100)}%</Text>
            </View>
          </View>

          {/* Visit dots grid */}
          <View className="flex-row flex-wrap gap-2 mt-1">
            {Array.from({ length: monthlyTarget }).map((_, i) => (
              <View
                key={i}
                className={`w-7 h-7 rounded-lg items-center justify-center ${i < monthlyVisits ? "bg-[#6BCB77]" : "bg-[#E9EBE6]"}`}
              >
                {i < monthlyVisits && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
            ))}
          </View>

          <View className="h-[1px] bg-black/5 mt-4 mb-3" />
          <Text className="text-xs text-[#6B756E]">
            {monthlyTarget - monthlyVisits} more visit{monthlyTarget - monthlyVisits !== 1 ? "s" : ""} to hit your monthly target.
            {monthlyVisits >= monthlyTarget ? " 🎉 Goal reached!" : ""}
          </Text>
        </View>

        {/* Section 4: Active Challenges */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">Active Challenges</Text>
        <View className="px-5 gap-y-3 mb-6">
          {activeChallenges.map((challenge) => {
            const progressPct = Math.round((challenge.currentCount / challenge.targetCount) * 100);
            const isComplete = challenge.currentCount >= challenge.targetCount;
            return (
              <View
                key={challenge.id}
                className={`bg-white rounded-[24px] p-5 border shadow-sm ${isComplete ? "border-[#6BCB77]" : "border-black/5"}`}
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center flex-1 mr-3">
                    <Text style={{ fontSize: 22 }}>{challenge.emoji}</Text>
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-sm text-[#1F2520]">{challenge.title}</Text>
                      <Text className="text-xs text-[#6B756E] mt-0.5">{challenge.description}</Text>
                    </View>
                  </View>
                  <View className="bg-[#EAF7EC] px-2.5 py-1 rounded-xl border border-[#D1F2D6]">
                    <Text className="text-[#059669] text-[10px] font-bold">+{challenge.rewardCredits} Credits</Text>
                  </View>
                </View>

                <View className="h-2 bg-[#E9EBE6] rounded-full overflow-hidden mb-2">
                  <View
                    style={{ width: `${progressPct}%` }}
                    className={`h-full rounded-full ${isComplete ? "bg-[#6BCB77]" : "bg-[#6BCB77]/70"}`}
                  />
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-[10px] text-[#6B756E] font-medium">
                    {challenge.currentCount} / {challenge.targetCount} {challenge.type === "visits" ? "visits" : challenge.type === "streak" ? "days" : "gyms"}
                  </Text>
                  <Text className="text-[10px] text-[#6B756E] font-medium">{challenge.deadline}</Text>
                </View>

                {isComplete && (
                  <View className="mt-3 flex-row items-center bg-[#EAF7EC] rounded-xl px-3 py-2">
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text className="text-[#065F46] text-xs font-bold ml-1.5">Challenge Complete! Reward credited.</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Section 5: Achievements */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">Achievements</Text>
        <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-6">
          {unlockedBadges.length === 0 ? (
            <View className="items-center py-4">
              <Text className="text-3xl mb-2">🔒</Text>
              <Text className="text-sm font-bold text-[#1F2520]">No badges yet</Text>
              <Text className="text-xs text-[#6B756E] mt-1 text-center">Complete gym visits to unlock your first achievement badge.</Text>
            </View>
          ) : (
            <>
              <View className="flex-row flex-wrap gap-3">
                {unlockedBadges.map((badge) => (
                  <View key={badge.id} className="items-center w-[80px]">
                    <View className="w-14 h-14 rounded-2xl bg-[#EAF7EC] items-center justify-center border border-[#D1F2D6] mb-1">
                      <Text style={{ fontSize: 26 }}>{badge.emoji}</Text>
                    </View>
                    <Text className="text-[10px] text-center font-bold text-[#1F2520]" numberOfLines={2}>{badge.name}</Text>
                  </View>
                ))}
                {/* Locked badges preview */}
                {lockedBadgeCount > 0 && (
                  <View className="items-center w-[80px]">
                    <View className="w-14 h-14 rounded-2xl bg-[#E9EBE6] items-center justify-center border border-black/5 mb-1">
                      <Text style={{ fontSize: 22 }}>🔒</Text>
                    </View>
                    <Text className="text-[10px] text-center font-medium text-[#6B756E]">+{lockedBadgeCount} locked</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Section 6: Journey Stage Timeline */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">12-Month Journey</Text>
        <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-6">
          {journeyStages.map((stage, index) => {
            const isCompleted = currentMonth > stage.month;
            const isCurrent = currentMonth === stage.month;
            const isLocked = currentMonth < stage.month;
            return (
              <View key={stage.month} className="flex-row items-center">
                {/* Timeline dot + line */}
                <View className="items-center mr-4" style={{ width: 32 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: isCompleted ? stage.color : isCurrent ? stage.color : "#E9EBE6",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isCurrent ? 3 : 0,
                      borderColor: "white",
                      shadowColor: isCurrent ? stage.color : "transparent",
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: isCurrent ? 4 : 0,
                    }}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={16} color="white" />
                    ) : isLocked ? (
                      <Text style={{ fontSize: 12 }}>{stage.stageEmoji}</Text>
                    ) : (
                      <Text style={{ fontSize: 14 }}>{stage.stageEmoji}</Text>
                    )}
                  </View>
                  {index < journeyStages.length - 1 && (
                    <View style={{ width: 2, height: 24, backgroundColor: isCompleted ? stage.color : "#E9EBE6", marginTop: 2 }} />
                  )}
                </View>

                {/* Stage label */}
                <View className="flex-1 pb-6">
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-sm font-bold ${isLocked ? "text-[#B0B5B0]" : "text-[#1F2520]"}`}>
                      {stage.stageName}
                    </Text>
                    <Text className={`text-[10px] font-medium ${isLocked ? "text-[#C0C5C0]" : "text-[#6B756E]"}`}>
                      Month {stage.month}
                    </Text>
                  </View>
                  {isCurrent && (
                    <View className="mt-0.5 flex-row items-center">
                      <View className="w-1.5 h-1.5 rounded-full bg-[#6BCB77] mr-1.5" />
                      <Text className="text-[10px] text-[#6BCB77] font-semibold">You are here</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Section 7: Go Book a Gym CTA */}
        <View className="mx-5">
          <Pressable
            onPress={() => router.push("/explore")}
            className="bg-[#6BCB77] h-14 rounded-2xl items-center justify-center flex-row gap-x-2 shadow-sm active:opacity-90"
          >
            <Ionicons name="fitness-outline" size={20} color="white" />
            <Text className="text-white font-bold text-base">Book Today's Visit</Text>
          </Pressable>
          <Text className="text-center text-xs text-[#6B756E] mt-2">Every visit advances your journey.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
