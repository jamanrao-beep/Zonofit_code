import React from "react";
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  Image, 
  Alert, 
  StyleSheet, 
  Dimensions 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useBookingStore } from "@/store/useBookingStore";
import { useUserStore } from "@/store/useUserStore";
import { 
  FALLBACK_NETWORK_GYMS, 
  getGymPolicies, 
  CANCELLATION_POLICY_NOTE, 
  DEFAULT_GYM_POLICIES 
} from "@/constants/fallbackGyms";

const { width } = Dimensions.get("window");

export default function BookingPassScreen() {
  const router = useRouter();
  const { 
    bookingStatus, 
    bookingId, 
    bookedGymId, 
    bookedGymName, 
    bookedDate, 
    bookedTime, 
    bookedCost,
    cancelBooking 
  } = useBookingStore();
  const { primaryGymId, primaryGymName } = useUserStore();

  const isPrimary = 
    (bookedGymId && primaryGymId && bookedGymId === primaryGymId) ||
    (bookedGymName && primaryGymName && bookedGymName.toLowerCase() === primaryGymName.toLowerCase()) ||
    bookedCost === 0;

  // Resolve gym details from fallback database or user profile
  const matchedGym = FALLBACK_NETWORK_GYMS.find(
    (g) => 
      (bookedGymId && g.id.toLowerCase() === bookedGymId.toLowerCase()) ||
      (bookedGymName && g.name.toLowerCase() === bookedGymName.toLowerCase())
  );

  const displayGymName = bookedGymName || matchedGym?.name || primaryGymName || "Being Fitness";
  const displayAddress = matchedGym?.address || "City Center, Udaipur";
  const displayImage = matchedGym?.image || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600";
  
  // Format clean booking ID (e.g., ZF-784562)
  const displayBookingId = bookingId 
    ? (bookingId.startsWith("ZF-") ? bookingId : `ZF-${bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`) 
    : "ZF-784562";

  // Format date display
  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date());

  const displayDate = bookedDate || todayFormatted;
  const displayTime = bookedTime || "7:00 PM";
  const isMandatory = bookedCost === 0;

  // Gym policies
  const gymPolicies = getGymPolicies(matchedGym?.id || displayGymName);

  const handleCancelBooking = () => {
    Alert.alert(
      "Cancel Booking?",
      "Are you sure you want to cancel your workout booking? Your visits or credits will be restored.",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelBooking();
              Alert.alert("Booking Cancelled", "Your booking has been cancelled successfully.", [
                { text: "OK", onPress: () => router.replace("/(tabs)") }
              ]);
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not cancel booking.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={["top", "bottom"]}>
      {/* Top Header */}
      <View className="px-5 py-3.5 flex-row items-center justify-between border-b border-gray-100 bg-white">
        <Pressable 
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100 active:bg-gray-100"
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>

        <Text className="text-base font-bold text-gray-900">Booking Pass</Text>

        <Pressable 
          onPress={() => router.replace("/(tabs)")}
          hitSlop={12}
          className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100 active:bg-gray-100"
        >
          <Ionicons name="home-outline" size={20} color="#111827" />
        </Pressable>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success / Confirmed Banner Header */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-[#DCFCE7] items-center justify-center mb-3.5 shadow-sm border-4 border-white">
            <View className="w-14 h-14 rounded-full bg-[#16A34A] items-center justify-center shadow-sm">
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
          </View>
          <Text className="text-2xl font-black text-gray-900 tracking-tight">Booking Confirmed!</Text>
          <Text className="text-sm text-gray-500 font-medium mt-1">Your workout is all set. Stay consistent!</Text>
        </View>

        {/* 6. Booking Confirmation Card */}
        <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-5">
          {/* Gym info header row */}
          <View className="flex-row items-center mb-4">
            <Image 
              source={{ uri: displayImage }} 
              className="w-16 h-16 rounded-2xl bg-gray-100" 
              resizeMode="cover"
            />
            <View className="flex-1 ml-3.5">
              <View className="flex-row items-center mb-1">
                <View className={`px-2.5 py-0.5 rounded-full ${isPrimary ? "bg-[#DCFCE7] border border-[#86EFAC]" : "bg-[#DBEAFE] border border-[#93C5FD]"}`}>
                  <Text className={`text-[11px] font-bold ${isPrimary ? "text-[#166534]" : "text-[#1E40AF]"}`}>
                    {isPrimary ? "Primary Gym" : "Partner Gym"}
                  </Text>
                </View>
              </View>

              <Text className="text-lg font-black text-gray-900" numberOfLines={1}>
                {displayGymName}
              </Text>
              
              <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                📍 {displayAddress}
              </Text>
            </View>
          </View>

          {/* Date & Time pill banner */}
          <View className="bg-gray-50 rounded-2xl p-3.5 flex-row items-center justify-between border border-gray-100 mb-4">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-xl bg-white items-center justify-center border border-gray-100 mr-2.5">
                <Ionicons name="calendar-outline" size={16} color="#16A34A" />
              </View>
              <View>
                <Text className="text-[10px] uppercase font-bold text-gray-400">Date</Text>
                <Text className="text-xs font-bold text-gray-800">{displayDate}</Text>
              </View>
            </View>

            <View className="w-[1px] h-8 bg-gray-200 mx-2" />

            <View className="flex-row items-center flex-1 pl-2">
              <View className="w-8 h-8 rounded-xl bg-white items-center justify-center border border-gray-100 mr-2.5">
                <Ionicons name="time-outline" size={16} color="#16A34A" />
              </View>
              <View>
                <Text className="text-[10px] uppercase font-bold text-gray-400">Time Slot</Text>
                <Text className="text-xs font-bold text-gray-800">{displayTime}</Text>
              </View>
            </View>
          </View>

          {/* Booking Metadata Details */}
          <View className="border-t border-gray-100 pt-3.5 space-y-2.5">
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-500 font-medium">Booking Type</Text>
              <Text className="text-xs font-bold text-gray-900">
                {isMandatory ? "Mandatory Visit (Plan Included)" : `Credit Visit (${bookedCost} Credits)`}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-500 font-medium">Booking ID</Text>
              <View className="flex-row items-center">
                <Text className="text-xs font-mono font-black text-[#16A34A]">{displayBookingId}</Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-500 font-medium">Entry Verification</Text>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                <Text className="text-xs font-bold text-emerald-700">Confirmed • Show at Desk</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cancellation Notice (as specified on Slide 6) */}
        <View className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 mb-5 flex-row items-start">
          <Ionicons name="shield-checkmark" size={18} color="#059669" style={{ marginTop: 1, marginRight: 10 }} />
          <View className="flex-1">
            <Text className="text-xs font-bold text-emerald-900 mb-0.5">Cancellation Policy</Text>
            <Text className="text-xs text-emerald-800 leading-relaxed">
              {CANCELLATION_POLICY_NOTE}
            </Text>
          </View>
        </View>

        {/* Gym Specific Policies & Rules */}
        <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-3.5">
            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-lg bg-gray-50 items-center justify-center mr-2 border border-gray-100">
                <Ionicons name="document-text-outline" size={15} color="#111827" />
              </View>
              <Text className="text-sm font-bold text-gray-900">
                {displayGymName} Policies
              </Text>
            </View>
            <View className="bg-gray-100 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-semibold text-gray-600">Gym Rules</Text>
            </View>
          </View>

          <View className="space-y-2.5">
            {gymPolicies.map((policy, idx) => (
              <View key={idx} className="flex-row items-start">
                <Ionicons 
                  name="checkmark-circle" 
                  size={15} 
                  color="#16A34A" 
                  style={{ marginTop: 2, marginRight: 8 }} 
                />
                <Text className="text-xs text-gray-600 font-medium flex-1 leading-relaxed">
                  {policy}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-4 pt-3 border-t border-gray-100">
            <Text className="text-[11px] text-gray-400 italic">
              * Individual gym policies apply. Please respect gym trainers, equipment, and fellow members.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="space-y-3">
          <Pressable
            onPress={() => router.push("/booking-history" as any)}
            className="w-full bg-[#1F7A3E] py-4 rounded-2xl items-center active:opacity-90 shadow-sm"
          >
            <Text className="text-white font-bold text-sm tracking-wide">View My Bookings</Text>
          </Pressable>

          <Pressable
            onPress={handleCancelBooking}
            className="w-full bg-white border border-red-200 py-3.5 rounded-2xl items-center active:bg-red-50"
          >
            <Text className="text-red-600 font-bold text-xs tracking-wide">Cancel This Booking</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(tabs)")}
            className="w-full py-3 items-center active:opacity-60"
          >
            <Text className="text-gray-500 font-bold text-xs">Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
