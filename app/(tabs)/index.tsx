import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  ActivityIndicator, 
  Modal 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "@/store/useUserStore";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { mockQuotes } from "@/data/quotes";

export default function HomeScreen() {
  const router = useRouter();
  
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
    trainingHours 
  } = useUserStore();

  const { 
    bookingStatus, 
    bookedGymName, 
    bookedTime, 
    checkIn, 
    cancelBooking 
  } = useBookingStore();

  const { credits } = useCreditsStore();

  // Local State
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const rotateQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % mockQuotes.length);
  };

  const handleMockCheckIn = () => {
    setCheckingIn(true);
    setTimeout(() => {
      checkIn();
      setCheckingIn(false);
      setPassModalVisible(false);
    }, 1500);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-xs font-semibold text-[#6B756E] uppercase tracking-wider">Welcome back</Text>
            <Text className="text-2xl font-bold text-[#1F2520] mt-0.5">ZonoFit Member</Text>
          </View>
          <Pressable 
            onPress={() => router.push("/profile")}
            className="w-10 h-10 rounded-full bg-[#E9EBE6] items-center justify-center border border-black/5"
          >
            <Ionicons name="person" size={18} color="#555" />
          </Pressable>
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
              onPress={() => setPassModalVisible(true)}
              className="bg-[#6BCB77] h-12 rounded-2xl items-center justify-center mt-2 flex-row gap-x-2"
            >
              <Ionicons name="qr-code-outline" size={16} color="white" />
              <Text className="text-white font-bold text-sm">View Pass & Check-In</Text>
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
          <View className="w-[47%] bg-white rounded-2xl p-4 border border-black/5 shadow-sm opacity-60">
            <Text className="text-lg">🔒</Text>
            <Text className="font-bold text-sm text-[#1F2520] mt-1">AI Trainer</Text>
            <Text className="text-[10px] text-[#6B756E] mt-0.5">Coming Soon</Text>
          </View>

          <View className="w-[47%] bg-white rounded-2xl p-4 border border-black/5 shadow-sm opacity-60">
            <Text className="text-lg">🔒</Text>
            <Text className="font-bold text-sm text-[#1F2520] mt-1">Meal Scan</Text>
            <Text className="text-[10px] text-[#6B756E] mt-0.5">Coming Soon</Text>
          </View>

          <View className="w-[47%] bg-white rounded-2xl p-4 border border-black/5 shadow-sm opacity-60">
            <Text className="text-lg">🔒</Text>
            <Text className="font-bold text-sm text-[#1F2520] mt-1">Workout Buddy</Text>
            <Text className="text-[10px] text-[#6B756E] mt-0.5">Coming Soon</Text>
          </View>

          <View className="w-[47%] bg-white rounded-2xl p-4 border border-black/5 shadow-sm opacity-60">
            <Text className="text-lg">🔒</Text>
            <Text className="font-bold text-sm text-[#1F2520] mt-1">Workout Plans</Text>
            <Text className="text-[10px] text-[#6B756E] mt-0.5">Coming Soon</Text>
          </View>
        </View>

        {/* Section 7: Motivation Quote */}
        <Pressable 
          onPress={rotateQuote}
          className="bg-[#E9EBE6] rounded-2xl p-4 border border-black/5 items-center flex-row justify-between active:opacity-90"
        >
          <View className="flex-1 mr-4">
            <Text className="text-[#6B756E] text-xs font-bold tracking-widest uppercase">Motivation</Text>
            <Text className="text-[#1F2520] text-sm font-semibold italic mt-1">
              "{mockQuotes[quoteIndex]}"
            </Text>
          </View>
          <Ionicons name="refresh" size={16} color="#6B756E" />
        </Pressable>
      </ScrollView>

      {/* QR Code Pass Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={passModalVisible}
        onRequestClose={() => setPassModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[36px] p-6 items-center">
            <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-6" />
            
            <Text className="text-xl font-bold text-[#1F2520]">{bookedGymName}</Text>
            <Text className="text-sm text-[#6B756E] mt-1">Show this QR code to the gym staff</Text>
            
            {/* Mock Vector QR Code */}
            <View className="my-8 p-4 bg-[#F5F7F4] rounded-3xl border border-black/5">
              <View className="w-48 h-48 bg-white p-3 rounded-2xl flex-row flex-wrap justify-between items-between">
                {/* Simulated QR boxes */}
                <View className="w-14 h-14 bg-[#1F2520] rounded-md p-1">
                  <View className="w-full h-full bg-white rounded-sm p-1">
                    <View className="w-full h-full bg-[#1F2520] rounded-[2px]" />
                  </View>
                </View>
                <View className="w-14 h-14 bg-white" />
                <View className="w-14 h-14 bg-[#1F2520] rounded-md p-1">
                  <View className="w-full h-full bg-white rounded-sm p-1">
                    <View className="w-full h-full bg-[#1F2520] rounded-[2px]" />
                  </View>
                </View>
                
                <View className="w-14 h-14 bg-white" />
                <View className="w-14 h-14 bg-[#1F2520] rounded-sm" />
                <View className="w-14 h-14 bg-white" />
                
                <View className="w-14 h-14 bg-[#1F2520] rounded-md p-1">
                  <View className="w-full h-full bg-white rounded-sm p-1">
                    <View className="w-full h-full bg-[#1F2520] rounded-[2px]" />
                  </View>
                </View>
                <View className="w-14 h-14 bg-white" />
                <View className="w-14 h-14 bg-[#1F2520] rounded-sm" />
              </View>
            </View>

            <Text className="text-xs font-semibold text-[#6B756E] tracking-wider uppercase mb-6">
              Booking Ref: ZF-{credits}-{streak}
            </Text>

            <View className="w-full space-y-3">
              <Pressable 
                onPress={handleMockCheckIn}
                disabled={checkingIn}
                className="bg-[#6BCB77] h-12 rounded-2xl items-center justify-center flex-row"
              >
                {checkingIn ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="scan-outline" size={16} color="white" className="mr-2" />
                    <Text className="text-white font-bold text-sm">Simulate Check-In (Staff Scan)</Text>
                  </>
                )}
              </Pressable>

              <Pressable 
                onPress={() => setPassModalVisible(false)}
                className="bg-[#F5F7F4] h-12 rounded-2xl items-center justify-center border border-black/5"
              >
                <Text className="text-[#6B756E] font-bold text-sm">Close Pass</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}