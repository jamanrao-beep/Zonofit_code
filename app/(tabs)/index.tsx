import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  ActivityIndicator, 
  Modal,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "@/store/useUserStore";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Zustand Stores
  const { 
    visitsRemaining, 
    membershipStatus, 
    planName, 
    membershipExpiry,
    currentMonth,
    totalMonths,
    identityStage,
    progressPercentage,
    nextMilestone,
    streak,
    totalWorkouts,
    trainingHours,
    avatarUrl 
  } = useUserStore();

  const { 
    bookingStatus, 
    bookedGymName, 
    bookedTime, 
    checkIn, 
    cancelBooking 
  } = useBookingStore();

  const { credits } = useCreditsStore();

  // Initialize Push Notifications
  usePushNotifications();

  // Local State
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [quote, setQuote] = useState("Consistency beats intensity. Just show up today.");

  async function fetchQuote() {
    try {
      const currentToken = useAuthStore.getState().token;
      const data = await apiFetch("/api/quotes/daily", { token: currentToken });
      if (data.text) {
        setQuote(data.text);
      }
    } catch (err) {
      console.log("Failed to fetch quote");
    }
  };

  React.useEffect(() => {
    fetchQuote();
  }, []);

  const rotateQuote = () => {
    fetchQuote();
  };



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12 }}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-xs font-semibold text-[#6B756E] uppercase tracking-wider">Welcome back</Text>
            <Text className="text-2xl font-bold text-[#1F2520] mt-0.5">{user?.username || "ZonoFit Member"}</Text>
          </View>
          <View className="flex-row items-center gap-x-3">
            <Pressable 
              onPress={() => router.push("/marketplace" as any)}
              className="w-10 h-10 rounded-full bg-[#E9EBE6] items-center justify-center border border-black/5"
            >
              <Ionicons name="cart-outline" size={20} color="#555" />
            </Pressable>
            <Pressable 
              onPress={() => setNotificationsVisible(true)}
              className="w-10 h-10 rounded-full bg-[#E9EBE6] items-center justify-center border border-black/5 relative"
            >
              <Ionicons name="notifications-outline" size={20} color="#555" />
              {/* Unread badge */}
              <View className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </Pressable>
            <Pressable 
              onPress={() => router.push("/profile")}
              className="w-10 h-10 rounded-full bg-[#E9EBE6] items-center justify-center border border-black/5 overflow-hidden"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={18} color="#555" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Section 1: Hero Access Card */}
        <View className="bg-emerald-600 rounded-[28px] p-6 mb-6 shadow-md overflow-hidden relative">
          {/* Background subtle pattern blobs */}
          <View className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-emerald-500/30" />
          <View className="absolute bottom-[-80px] left-[-30px] w-40 h-40 rounded-full bg-emerald-500/20" />

          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider">Visits Remaining</Text>
              <Text className="text-6xl font-black text-white mt-1">{visitsRemaining}</Text>
            </View>
            <View className="bg-white/20 px-3 py-1 rounded-full border border-white/20">
              <Text className="text-white text-xs font-semibold">{membershipStatus}</Text>
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-white/90 text-sm font-medium">{planName} · Expires {membershipExpiry}</Text>
          </View>

          <View className="h-[1px] bg-white/20 my-4" />

          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Ionicons name="wallet-outline" size={16} color="#A7F3D0" />
              <Text className="text-[#A7F3D0] text-sm font-bold ml-1.5">{credits} Credits</Text>
            </View>
            
            {bookingStatus === "Not Booked" && (
              <Pressable 
                onPress={() => router.push("/explore")}
                className="bg-white px-4 py-2.5 rounded-2xl shadow-sm flex-row items-center active:scale-95"
              >
                <Text className="text-emerald-700 font-bold text-xs mr-1">Book Today's Visit</Text>
                <Ionicons name="arrow-forward" size={12} color="#047857" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Section 2: Today's Booking Section */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-1">Today's Workout</Text>
        
        {bookingStatus === "Not Booked" && (
          <View className="bg-white rounded-3xl p-5 border border-black/5 shadow-sm mb-6 flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-1">
                <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                <Text className="text-[#1F2520] font-bold text-base">No workout booked</Text>
              </View>
              <Text className="text-xs text-[#6B756E]">Discover partner gyms nearby and book your session.</Text>
            </View>
            <Pressable 
              onPress={() => router.push("/explore")}
              className="bg-[#EAF7EC] px-4 py-2.5 rounded-2xl"
            >
              <Text className="text-[#6BCB77] font-bold text-xs">Book Visit</Text>
            </Pressable>
          </View>
        )}

        {bookingStatus === "Booked" && (
          <View className="bg-white rounded-3xl p-5 border border-black/5 shadow-sm mb-6">
            <View className="flex-row justify-between items-start mb-3">
              <View>
                <View className="flex-row items-center mb-1">
                  <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                  <Text className="text-[#1F2520] font-bold text-base">Workout Booked</Text>
                </View>
                <Text className="text-lg font-bold text-[#1F2520]">{bookedGymName}</Text>
                <Text className="text-xs text-[#6B756E] mt-0.5">Time Slot: {bookedTime}</Text>
              </View>
              <Pressable 
                onPress={cancelBooking}
                className="p-1"
              >
                <Text className="text-xs text-red-500 font-semibold">Cancel</Text>
              </Pressable>
            </View>
            
            <Pressable 
              onPress={() => router.push("/scan" as any)}
              className="bg-[#6BCB77] h-12 rounded-2xl items-center justify-center mt-2 flex-row gap-x-2"
            >
              <Ionicons name="scan-outline" size={16} color="white" />
              <Text className="text-white font-bold text-sm">Scan Gym QR to Check-In</Text>
            </Pressable>
          </View>
        )}

        {bookingStatus === "Checked In" && (
          <View className="bg-[#EAF7EC] rounded-3xl p-5 border border-[#D1F2D6] mb-6">
            <View className="flex-row items-center mb-1">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text className="text-[#065F46] font-bold text-base ml-2">Checked In Successfully</Text>
            </View>
            <Text className="text-xs text-[#065F46] mt-1">
              🔥 Great Work! You verified your check-in code at <Text className="font-bold">{bookedGymName}</Text>. Have a great workout!
            </Text>
          </View>
        )}

        {/* Section 3: Fitness Journey */}
        <View className="bg-white rounded-[28px] p-5 border border-black/5 shadow-sm mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-xs font-semibold text-[#6B756E] uppercase tracking-wider">Fitness Journey</Text>
              <Text className="text-lg font-bold text-[#1F2520] mt-0.5">Month {currentMonth} of {totalMonths}</Text>
            </View>
            <View className="bg-[#F0F3ED] px-3 py-1 rounded-full">
              <Text className="text-[#6B756E] text-xs font-bold">{identityStage}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View className="h-3 w-full bg-[#E9EBE6] rounded-full overflow-hidden mb-3">
            <View 
              style={{ width: `${progressPercentage}%` }} 
              className="h-full bg-[#6BCB77] rounded-full" 
            />
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xs text-[#6B756E] font-medium">{progressPercentage}% Complete</Text>
            <Text className="text-xs text-[#1F2520] font-bold">Next: {nextMilestone}</Text>
          </View>

          <Pressable
            onPress={() => router.push("/journey")}
            className="bg-[#EAF7EC] h-10 rounded-2xl items-center justify-center flex-row gap-x-1.5 border border-[#D1F2D6]"
          >
            <Text className="text-[#059669] font-bold text-xs">View Full Journey</Text>
            <Ionicons name="arrow-forward" size={12} color="#059669" />
          </Pressable>
        </View>

        {/* Challenges Entry */}
        <Pressable
          onPress={() => router.push("/challenges" as any)}
          className="bg-indigo-600 rounded-[28px] p-6 mb-6 shadow-sm overflow-hidden relative active:scale-95 transition-transform"
        >
          <View className="absolute right-[-20] top-[-20] w-32 h-32 bg-white/10 rounded-full" />
          <View className="absolute right-10 bottom-[-10] w-20 h-20 bg-indigo-500/30 rounded-full" />
          
          <View className="flex-row items-center mb-2">
            <Ionicons name="trophy" size={20} color="#C7D2FE" />
          </View>
          <Text className="text-xl font-black text-white mb-1">Monthly Challenges</Text>
          <Text className="text-sm text-indigo-100 mb-4 max-w-[80%]">Complete challenges to earn bonus credits and build consistency.</Text>
          
          <View className="bg-white/20 self-start px-4 py-2 rounded-xl flex-row items-center">
            <Text className="text-white font-bold text-xs mr-2">View Challenges</Text>
            <Ionicons name="arrow-forward" size={12} color="white" />
          </View>
        </Pressable>

        {/* Find Trainer / Buddy Section */}
        <Pressable
          onPress={() => router.push("/tools/find-trainer" as any)}
          className="bg-[#1F2520] rounded-[28px] p-6 mb-6 shadow-sm overflow-hidden relative"
        >
          <View className="absolute right-[-20] top-[-20] w-32 h-32 bg-white/5 rounded-full" />
          <View className="absolute right-10 bottom-[-10] w-20 h-20 bg-[#6BCB77]/20 rounded-full" />
          
          <View className="flex-row items-center mb-2">
            <View className="bg-white/10 px-2.5 py-1 rounded-full mr-2 border border-white/10">
              <Text className="text-white text-[10px] font-bold tracking-wider">NEW</Text>
            </View>
            <Ionicons name="people" size={16} color="#6BCB77" />
          </View>
          <Text className="text-xl font-black text-white mb-1">Find a Trainer or Buddy</Text>
          <Text className="text-sm text-gray-300 mb-4 max-w-[80%]">Discover experienced trainers or find a workout buddy at your preferred gym.</Text>
          
          <View className="bg-white/10 self-start px-4 py-2 rounded-xl border border-white/10 flex-row items-center">
            <Text className="text-white font-bold text-xs mr-2">Early Access</Text>
            <Ionicons name="lock-closed" size={12} color="white" />
          </View>
        </Pressable>

        {/* Section 4: Momentum Bento Grid */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-1">Momentum</Text>
        <View className="flex-row gap-x-4 mb-6">
          {/* Card 1: Streak */}
          <View className="flex-1 bg-white rounded-2xl p-4 border border-black/5 shadow-sm items-center">
            <Text className="text-2xl mb-1">🔥</Text>
            <Text className="text-xl font-bold text-[#1F2520]">{streak}</Text>
            <Text className="text-[10px] text-[#6B756E] font-medium uppercase mt-0.5">Day Streak</Text>
          </View>

          {/* Card 2: Workouts */}
          <View className="flex-1 bg-white rounded-2xl p-4 border border-black/5 shadow-sm items-center">
            <Text className="text-2xl mb-1">🏋️</Text>
            <Text className="text-xl font-bold text-[#1F2520]">{totalWorkouts}</Text>
            <Text className="text-[10px] text-[#6B756E] font-medium uppercase mt-0.5">Total Visits</Text>
          </View>

          {/* Card 3: Training Hours */}
          <View className="flex-1 bg-white rounded-2xl p-4 border border-black/5 shadow-sm items-center">
            <Text className="text-2xl mb-1">⏱️</Text>
            <Text className="text-xl font-bold text-[#1F2520]">{trainingHours}</Text>
            <Text className="text-[10px] text-[#6B756E] font-medium uppercase mt-0.5">Total Hours</Text>
          </View>
        </View>

        {/* Section 5: Dynamic Status / Alerts */}
        {credits < 50 && (
          <View className="bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-6 flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-amber-800 font-bold text-sm">Low Credits</Text>
              <Text className="text-xs text-amber-700 mt-0.5">You only have {credits} credits left. Top up to continue booking.</Text>
            </View>
            <Pressable 
              onPress={() => router.push("/credits")}
              className="bg-amber-600 px-4 py-2 rounded-xl"
            >
              <Text className="text-white font-bold text-xs">Recharge</Text>
            </Pressable>
          </View>
        )}

        {/* Section 6: Fitness Tools Bento Grid */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-1">Fitness Tools</Text>
        <View className="flex-wrap flex-row gap-4 mb-6">
          <Pressable onPress={() => router.push("/tools/ai-trainer" as any)} className="w-[47%] bg-white rounded-2xl p-4 border border-black/5 shadow-sm active:bg-gray-50">
            <Text className="text-lg">🤖</Text>
            <Text className="font-bold text-sm text-[#1F2520] mt-1">AI Trainer</Text>
            <Text className="text-[10px] text-purple-600 font-bold mt-0.5">Early Access</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/tools/meal-scan" as any)} className="w-[47%] bg-white rounded-2xl p-4 border border-black/5 shadow-sm active:bg-gray-50">
            <Text className="text-lg">📸</Text>
            <Text className="font-bold text-sm text-[#1F2520] mt-1">Meal Scan</Text>
            <Text className="text-[10px] text-purple-600 font-bold mt-0.5">Early Access</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/tools/workout-buddy" as any)} className="w-[47%] bg-white rounded-2xl p-4 border border-black/5 shadow-sm active:bg-gray-50">
            <Text className="text-lg">👥</Text>
            <Text className="font-bold text-sm text-[#1F2520] mt-1">Workout Buddy</Text>
            <Text className="text-[10px] text-purple-600 font-bold mt-0.5">Early Access</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/tools/plans" as any)} className="w-[47%] bg-white rounded-2xl p-4 border border-black/5 shadow-sm active:bg-gray-50">
            <Text className="text-lg">📋</Text>
            <Text className="font-bold text-sm text-[#1F2520] mt-1">Workout Plans</Text>
            <Text className="text-[10px] text-purple-600 font-bold mt-0.5">Early Access</Text>
          </Pressable>
        </View>

        {/* Section 7: Motivation Quote */}
        <Pressable 
          onPress={rotateQuote}
          className="bg-[#E9EBE6] rounded-2xl p-4 border border-black/5 items-center flex-row justify-between active:opacity-90"
        >
          <View className="flex-1 mr-4">
            <Text className="text-[#6B756E] text-xs font-bold tracking-widest uppercase">Motivation</Text>
            <Text className="text-[#1F2520] text-sm font-semibold italic mt-1">
              "{quote}"
            </Text>
          </View>
          <Ionicons name="refresh" size={16} color="#6B756E" />
        </Pressable>
      </ScrollView>



      {/* Notifications Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={notificationsVisible}
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[36px] p-6 h-[70%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-[#1F2520]">Notifications</Text>
              <Pressable onPress={() => setNotificationsVisible(false)} className="w-8 h-8 bg-[#F0F3ED] rounded-full items-center justify-center">
                <Ionicons name="close" size={20} color="#1F2520" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never">
              {/* Notification 1 */}
              <View className="bg-[#EAF7EC] rounded-2xl p-4 mb-3 border border-[#D1F2D6] flex-row">
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3 border border-black/5">
                  <Text className="text-lg">🎉</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#1F2520]">Welcome to ZonoFit!</Text>
                  <Text className="text-xs text-[#6B756E] mt-0.5">We're glad to have you here. Book your first visit now.</Text>
                  <Text className="text-[10px] text-[#6B756E] font-medium mt-2">Just now</Text>
                </View>
              </View>

              {/* Notification 2 */}
              <View className="bg-[#F5F7F4] rounded-2xl p-4 mb-3 border border-black/5 flex-row">
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3 border border-black/5">
                  <Text className="text-lg">⚡</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#1F2520]">Credits Added</Text>
                  <Text className="text-xs text-[#6B756E] mt-0.5">1,250 credits have been successfully added to your wallet.</Text>
                  <Text className="text-[10px] text-[#6B756E] font-medium mt-2">2 hours ago</Text>
                </View>
              </View>

              {/* Notification 3 */}
              <View className="bg-[#F5F7F4] rounded-2xl p-4 mb-3 border border-black/5 flex-row">
                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3 border border-black/5">
                  <Text className="text-lg">🔥</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#1F2520]">Streak Preserved!</Text>
                  <Text className="text-xs text-[#6B756E] mt-0.5">Your 12-day streak is safe. Keep up the momentum tomorrow.</Text>
                  <Text className="text-[10px] text-[#6B756E] font-medium mt-2">Yesterday</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}