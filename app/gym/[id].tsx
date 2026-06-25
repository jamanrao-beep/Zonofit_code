import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  Image,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { mockGyms } from "@/data/gyms";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";

const TIME_SLOTS = ["06:00 AM", "08:00 AM", "10:00 AM", "05:00 PM", "07:00 PM", "09:00 PM"];

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const gym = mockGyms.find((g) => g.id === id);
  const { bookingStatus, bookVisit } = useBookingStore();
  const { credits } = useCreditsStore();

  const [selectedTime, setSelectedTime] = useState("07:00 PM");
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  if (!gym) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4", alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <Ionicons name="alert-circle-outline" size={48} color="#6B756E" />
        <Text className="text-[#1F2520] font-bold text-base mt-3">Gym not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-6 py-3 bg-[#6BCB77] rounded-2xl">
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleBookVisit = () => {
    if (bookingStatus !== "Not Booked") {
      Alert.alert(
        "Active Booking Exists",
        "You already have an active booking today. Cancel it before making a new one."
      );
      return;
    }
    if (credits < gym.cost) {
      Alert.alert(
        "Insufficient Credits",
        `This booking requires ${gym.cost} credits. You have ${credits} credits. Please top up from the Credits tab.`
      );
      return;
    }
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = () => {
    const success = bookVisit(gym.id, gym.name, selectedTime, gym.cost);
    if (success) {
      setBookingModalVisible(false);
      Alert.alert(
        "Booking Confirmed! 🎉",
        `You've booked a session at ${gym.name} for ${selectedTime}.`,
        [{ text: "Go to Home", onPress: () => router.push("/") }]
      );
    } else {
      Alert.alert("Error", "Booking failed. Please check your credit balance.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero Image */}
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: gym.image }}
            style={{ width: "100%", height: 280 }}
            resizeMode="cover"
          />
          {/* Gradient overlay */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={{ position: "absolute", top: 16, left: 16 }}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </Pressable>
          {/* Premium badge */}
          {gym.isPremium && (
            <View
              style={{ position: "absolute", top: 16, right: 16 }}
              className="bg-amber-500 px-3 py-1 rounded-full flex-row items-center"
            >
              <Ionicons name="star" size={12} color="white" />
              <Text className="text-white text-xs font-bold ml-1">Premium</Text>
            </View>
          )}
        </View>

        {/* Gym Info Card */}
        <View className="mx-5 -mt-6 bg-white rounded-[28px] p-5 border border-black/5 shadow-sm mb-5">
          {/* Name + Rating */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-x-2 mb-1">
                {gym.isVerified && (
                  <View className="flex-row items-center bg-[#EAF7EC] px-2 py-0.5 rounded-full border border-[#D1F2D6]">
                    <Ionicons name="shield-checkmark" size={10} color="#059669" />
                    <Text className="text-[#059669] text-[10px] font-bold ml-1">Verified</Text>
                  </View>
                )}
              </View>
              <Text className="text-xl font-black text-[#1F2520]">{gym.name}</Text>
              <Text className="text-xs text-[#6B756E] mt-0.5">📍 {gym.address}</Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                <Ionicons name="star" size={14} color="#D97706" />
                <Text className="text-amber-800 text-sm font-bold ml-1">{gym.rating}</Text>
              </View>
              <Text className="text-[10px] text-[#6B756E] mt-1">{gym.reviewCount} reviews</Text>
            </View>
          </View>

          {/* Tags */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            {gym.tags.map((tag) => (
              <View key={tag} className="bg-[#F0F3ED] px-3 py-1 rounded-full border border-black/5">
                <Text className="text-[11px] font-semibold text-[#6B756E]">{tag}</Text>
              </View>
            ))}
          </View>

          <View className="h-[1px] bg-black/5 mb-4" />

          {/* Key metrics */}
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-xs font-bold text-[#1F2520]">{gym.distance} KM</Text>
              <Text className="text-[10px] text-[#6B756E] mt-0.5">Away</Text>
            </View>
            <View className="w-[1px] bg-black/5" />
            <View className="items-center flex-1">
              <Text className="text-xs font-bold text-emerald-700">⚡ {gym.cost} Credits</Text>
              <Text className="text-[10px] text-[#6B756E] mt-0.5">Per Visit</Text>
            </View>
            <View className="w-[1px] bg-black/5" />
            <View className="items-center flex-1">
              <Text className="text-xs font-bold text-[#1F2520]">{gym.slots}</Text>
              <Text className="text-[10px] text-[#6B756E] mt-0.5">Slots Left</Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-5">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2">About</Text>
          <Text className="text-sm text-[#4A5043] leading-relaxed">{gym.description}</Text>
        </View>

        {/* Amenities Section */}
        <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-5">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-3">Amenities</Text>
          <View className="flex-row flex-wrap gap-3">
            {gym.amenities.map((amenity) => (
              <View
                key={amenity.label}
                className="flex-row items-center bg-[#F5F7F4] px-3 py-2 rounded-xl border border-black/5 gap-x-2"
              >
                <Ionicons name={amenity.icon as any} size={15} color="#6BCB77" />
                <Text className="text-xs font-semibold text-[#1F2520]">{amenity.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Hours Section */}
        <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-5">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2">Opening Hours</Text>
          <View className="flex-row items-center gap-x-2">
            <Ionicons name="time-outline" size={16} color="#6BCB77" />
            <Text className="text-sm text-[#4A5043] leading-relaxed flex-1">{gym.hours}</Text>
          </View>
        </View>

        {/* Time Slot Picker */}
        <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-5">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-3">Select a Time Slot</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {TIME_SLOTS.map((time) => (
              <Pressable
                key={time}
                onPress={() => setSelectedTime(time)}
                className={`px-4 py-2.5 rounded-xl border ${
                  selectedTime === time
                    ? "bg-[#EAF7EC] border-[#6BCB77]"
                    : "bg-[#F5F7F4] border-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedTime === time ? "text-[#6BCB77]" : "text-[#6B756E]"
                  }`}
                >
                  {time}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer CTA */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "white",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 32,
          borderTopWidth: 1,
          borderTopColor: "rgba(0,0,0,0.06)",
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <View>
          <Text className="text-[10px] text-[#6B756E] font-semibold uppercase tracking-wider">Visit Cost</Text>
          <Text className="text-lg font-black text-[#1F2520]">⚡ {gym.cost} Credits</Text>
        </View>
        <Pressable
          onPress={handleBookVisit}
          className="flex-1 bg-[#6BCB77] h-14 rounded-2xl items-center justify-center active:opacity-90"
        >
          <Text className="text-white font-bold text-base">Book Visit at {selectedTime}</Text>
        </Pressable>
      </View>

      {/* Booking Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bookingModalVisible}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View className="bg-white rounded-t-[36px] p-6">
            <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-6 mx-auto" />

            <Text className="text-xs font-bold text-[#6BCB77] uppercase tracking-wider">Confirm Booking</Text>
            <Text className="text-2xl font-bold text-[#1F2520] mt-1">{gym.name}</Text>
            <Text className="text-xs text-[#6B756E] mt-0.5">📍 {gym.address}</Text>

            <View className="h-[1px] bg-black/5 my-4" />

            <View className="bg-[#F5F7F4] rounded-2xl p-4 flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-[#6B756E] text-xs">Visit Time</Text>
                <Text className="text-base font-bold text-[#1F2520] mt-0.5">🕐 {selectedTime}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[#6B756E] text-xs">Credits Used</Text>
                <Text className="text-base font-bold text-emerald-700 mt-0.5">⚡ {gym.cost}</Text>
              </View>
            </View>

            <View className="bg-amber-50 rounded-xl p-3 mb-6 flex-row items-center gap-x-2 border border-amber-100">
              <Ionicons name="information-circle-outline" size={16} color="#D97706" />
              <Text className="text-amber-800 text-xs flex-1">
                Your balance after booking: {credits - gym.cost} credits
              </Text>
            </View>

            <View className="flex-row gap-x-4">
              <Pressable
                onPress={() => setBookingModalVisible(false)}
                className="flex-1 bg-[#F5F7F4] h-12 rounded-2xl items-center justify-center border border-black/5"
              >
                <Text className="text-[#6B756E] font-bold text-sm">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmBooking}
                className="flex-1 bg-[#6BCB77] h-12 rounded-2xl items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">Confirm & Book</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
