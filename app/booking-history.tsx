import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useBookingStore } from "@/store/useBookingStore";



const statusConfig = {
  checked_in: {
    label: "Checked In",
    icon: "checkmark-circle" as const,
    color: "#10B981",
    bg: "bg-[#EAF7EC]",
    textColor: "text-[#065F46]",
  },
  booked: {
    label: "Booked",
    icon: "time" as const,
    color: "#2563EB",
    bg: "bg-blue-50",
    textColor: "text-blue-700",
  },
  cancelled: {
    label: "Cancelled",
    icon: "close-circle" as const,
    color: "#EF4444",
    bg: "bg-red-50",
    textColor: "text-red-600",
  },
};

export default function BookingHistoryScreen() {
  const router = useRouter();
  const { pastBookings } = useBookingStore();

  const allBookings = pastBookings.map(b => ({
    id: b.id,
    gymName: b.gymName,
    gymAddress: "ZonoFit Gym", 
    date: b.date,
    time: b.time || "N/A",
    status: (b.status === "Completed" || b.status === "Checked In") ? "checked_in" : "cancelled" as any,
    credits: b.credits || 0,
  }));

  const completedCount = allBookings.filter((b) => b.status === "checked_in").length;
  const totalCreditsUsed = allBookings
    .filter((b) => b.status === "checked_in")
    .reduce((sum, b) => sum + b.credits, 0);

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
        <Text className="text-lg font-bold text-[#1F2520]">Booking History</Text>
        <View className="w-9" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Summary Card */}
        <View className="mx-5 mb-5">
          <View className="bg-emerald-600 rounded-[24px] p-5 flex-row justify-between overflow-hidden relative">
            <View style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.1)" }} />
            <View className="items-center flex-1">
              <Text className="text-white/75 text-[10px] font-semibold uppercase tracking-wider">Completed</Text>
              <Text className="text-white text-3xl font-black mt-0.5">{completedCount}</Text>
              <Text className="text-white/70 text-[10px] mt-0.5">Total Visits</Text>
            </View>
            <View className="w-[1px] bg-white/20 mx-3" />
            <View className="items-center flex-1">
              <Text className="text-white/75 text-[10px] font-semibold uppercase tracking-wider">Used</Text>
              <Text className="text-white text-3xl font-black mt-0.5">{totalCreditsUsed}</Text>
              <Text className="text-white/70 text-[10px] mt-0.5">Credits Spent</Text>
            </View>
            <View className="w-[1px] bg-white/20 mx-3" />
            <View className="items-center flex-1">
              <Text className="text-white/75 text-[10px] font-semibold uppercase tracking-wider">Saved</Text>
              <Text className="text-white text-3xl font-black mt-0.5">₹{totalCreditsUsed * 10 - totalCreditsUsed * 6}</Text>
              <Text className="text-white/70 text-[10px] mt-0.5">vs Pay-Per-Visit</Text>
            </View>
          </View>
        </View>

        {/* Bookings List */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2.5 ml-6">All Visits</Text>

        {allBookings.length === 0 ? (
          <View className="mx-5 bg-white rounded-[24px] p-8 border border-black/5 shadow-sm items-center">
            <Ionicons name="calendar-outline" size={40} color="#B0B5B0" />
            <Text className="text-[#1F2520] font-bold text-base mt-3">No bookings yet</Text>
            <Text className="text-xs text-[#6B756E] mt-1 text-center">Your visit history will appear here after your first booking.</Text>
            <Pressable
              onPress={() => router.push("/explore")}
              className="mt-4 px-6 py-3 bg-[#6BCB77] rounded-2xl"
            >
              <Text className="text-white font-bold text-sm">Discover Gyms</Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-5 gap-y-3">
            {allBookings.map((booking) => {
              const config = statusConfig[booking.status as keyof typeof statusConfig];
              return (
                <View
                  key={booking.id}
                  className="bg-white rounded-[20px] p-4 border border-black/5 shadow-sm"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="font-bold text-sm text-[#1F2520]">{booking.gymName}</Text>
                      <Text className="text-[10px] text-[#6B756E] mt-0.5">📍 {booking.gymAddress}</Text>
                    </View>
                    <View className={`flex-row items-center px-2.5 py-1 rounded-full ${config.bg}`}>
                      <Ionicons name={config.icon} size={11} color={config.color} />
                      <Text className={`text-[10px] font-bold ml-1 ${config.textColor}`}>{config.label}</Text>
                    </View>
                  </View>

                  <View className="h-[1px] bg-black/5 mb-2" />

                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-x-3">
                      <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={12} color="#6B756E" />
                        <Text className="text-[10px] text-[#6B756E] ml-1">{booking.date}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={12} color="#6B756E" />
                        <Text className="text-[10px] text-[#6B756E] ml-1">{booking.time}</Text>
                      </View>
                    </View>
                    <Text className={`text-xs font-bold ${booking.status === "cancelled" ? "text-[#9CA3AF] line-through" : "text-emerald-700"}`}>
                      ⚡ {booking.credits} Credits
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
