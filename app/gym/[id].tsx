import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  Image,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
const { width: windowWidth } = Dimensions.get("window");
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Gym } from "@/app/(tabs)/explore";
import { apiFetch } from "@/lib/api";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";

const TIME_SLOTS = ["06:00 AM", "08:00 AM", "10:00 AM", "05:00 PM", "07:00 PM", "09:00 PM"];

const getNextDays = () => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push({
      label: i === 0 ? "Today" : i === 1 ? "Tmrw" : days[d.getDay()],
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  }
  return dates;
};
const DATES = getNextDays();

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { bookingStatus, bookVisit } = useBookingStore();
  const { credits } = useCreditsStore();

  const [gym, setGym] = useState<Gym | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuthStore();

  const [selectedTime, setSelectedTime] = useState("07:00 PM");
  const [selectedDate, setSelectedDate] = useState(DATES[0].date);
  const [activeImage, setActiveImage] = useState(0);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  React.useEffect(() => {
    async function loadGym() {
      if (!token) return;
      setIsLoading(true);
      try {
        const g = await apiFetch(`/api/gyms/${id}`, { token });
        if (!g || typeof g !== 'object') {
          console.error("Gym response was empty or invalid:", g);
          throw new Error("Invalid gym response");
        }
        
        const formattedGym: Gym = {
          id: g.id,
          name: g.name,
          address: g.address || g.city,
          rating: g.rating || 4.5,
          distance: g.distanceKm || 2.1,
          cost: g.creditCost || 8,
          slots: g.availableSlots || 20,
          image: g.imageUrls?.[0] || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48",
          images: g.imageUrls?.length > 0 ? g.imageUrls : ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48", "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b"],
          tags: g.facilities || ["Strength", "Cardio"],
          type: g.facilities?.includes("Turf") ? "turf" : g.facilities?.includes("Swimming") || g.facilities?.includes("Basketball") ? "sports" : "gym",
          isPremium: g.category === "PREMIUM",
          isBeginnerFriendly: true,
          isBestValue: (g.creditCost || 8) <= 6,
          isNearPrimary: false,
          reviewCount: g.totalRatings || 120,
          description: g.description || "A premium fitness facility.",
          amenities: (g.facilities || []).map((f: string) => ({
            label: f,
            icon: f.includes("Pool") ? "water" : f.includes("AC") ? "snow" : "barbell"
          })),
          hours: (g.openingTime && g.closingTime) ? `${g.openingTime} - ${g.closingTime}` : "06:00 AM - 10:00 PM",
          plans: g.plans || []
        } as any; // Type override since we added local mock fields above
        setGym(formattedGym);
      } catch (e) {
        console.error("Failed to load gym", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadGym();
  }, [id, token]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4", alignItems: "center", justifyContent: "center" }} edges={["top"]}>
        <Text className="text-[#1F2520] font-bold text-base mt-3">Loading Gym...</Text>
      </SafeAreaView>
    );
  }

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
    const isCashVenue = gym.type === 'turf' || gym.type === 'sports';
    const cashCost = gym.cost * 50;

    if (isCashVenue) {
      if (useCreditsStore.getState().cashBalance < cashCost) {
        Alert.alert(
          "Insufficient Converted Cash",
          `This venue requires ₹${cashCost} in converted cash. You have ₹${useCreditsStore.getState().cashBalance}. Please convert credits from the Credits tab.`
        );
        return;
      }
    } else {
      if (credits < gym.cost) {
        Alert.alert(
          "Insufficient Credits",
          `This booking requires ${gym.cost} credits. You have ${credits} credits. Please top up from the Credits tab.`
        );
        return;
      }
    }
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = async () => {
    const isCashVenue = gym.type === 'turf' || gym.type === 'sports';
    const cashCost = gym.cost * 50;

    let success = false;
    
    if (isCashVenue) {
      success = useCreditsStore.getState().bookVisitWithCash(gym.name, cashCost);
      if (success) {
        await bookVisit(gym.id, gym.name, selectedDate, selectedTime, 0);
      }
    } else {
      success = await bookVisit(gym.id, gym.name, selectedDate, selectedTime, gym.cost);
    }

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
      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Hero Carousel */}
        <View style={{ position: "relative", height: 280 }}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false} 
            onScroll={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / windowWidth))}
            scrollEventThrottle={16}
          >
            {gym.images?.map((img: string, i: number) => (
              <Image
                key={i}
                source={{ uri: img }}
                style={{ width: windowWidth, height: 280 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
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
            pointerEvents="none"
          />
          {/* Pagination dots */}
          <View className="absolute bottom-10 left-0 right-0 flex-row justify-center gap-1.5" pointerEvents="none">
            {gym.images?.map((_: string, i: number) => (
              <View 
                key={i} 
                className={`h-1.5 rounded-full ${activeImage === i ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`} 
              />
            ))}
          </View>
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={{ position: "absolute", top: 16, left: 16, zIndex: 50, elevation: 10 }}
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

          {/* Action Row */}
          <View className="flex-row items-center justify-between mb-4 mt-2">
            <Pressable
              onPress={() => router.push(`/chat/${gym.id}` as any)}
              className="flex-1 bg-[#F5F7F4] flex-row items-center justify-center py-2.5 rounded-xl border border-black/5 mr-2 active:bg-gray-200"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#1F2520" />
              <Text className="text-[#1F2520] font-bold text-xs ml-2">Chat with Gym</Text>
            </Pressable>
            <View className="flex-1 bg-[#F5F7F4] flex-row items-center justify-center py-2.5 rounded-xl border border-black/5 ml-2">
              <Ionicons name="map-outline" size={16} color="#1F2520" />
              <Text className="text-[#1F2520] font-bold text-xs ml-2">Directions</Text>
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
              {gym.type === 'turf' || gym.type === 'sports' ? (
                <Text className="text-xs font-bold text-emerald-700">₹{gym.cost * 50} Cash</Text>
              ) : (
                <Text className="text-xs font-bold text-emerald-700">⚡ {gym.cost} Credits</Text>
              )}
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
            {gym.amenities?.map((amenity) => (
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

        {/* Custom Plans Section */}
        {gym.plans && gym.plans.length > 0 && (
          <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-5">
            <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-3">Available Plans</Text>
            <View>
              {gym.plans.map((plan: any) => (
                <Pressable 
                  key={plan.id}
                  onPress={() => Alert.alert("Plan Selected", `You selected ${plan.name}. Payment integration coming in Phase 2!`)}
                  className="bg-[#F5F7F4] p-4 rounded-xl border border-black/5 active:bg-[#E9EBE6] mb-3"
                >
                  <Text className="text-sm font-bold text-[#1F2520] mb-1">{plan.name}</Text>
                  <Text className="text-xs text-[#6B756E]">
                    First {plan.initialPeriodMonths} months: {plan.initialCutoffDays} days cutoff
                  </Text>
                  <Text className="text-xs text-[#6B756E]">
                    After {plan.initialPeriodMonths} months: {plan.subsequentCutoffDays} days cutoff
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Date Picker */}
        <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-5">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-3">Select a Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={true} overScrollMode="never" decelerationRate="fast" snapToInterval={80} snapToAlignment="start" disableIntervalMomentum={true} contentContainerStyle={{ gap: 10 }}>
            {DATES.map((item) => (
              <Pressable
                key={item.date}
                onPress={() => setSelectedDate(item.date)}
                className={`px-4 py-2.5 rounded-xl border items-center justify-center ${
                  selectedDate === item.date
                    ? "bg-[#EAF7EC] border-[#6BCB77]"
                    : "bg-[#F5F7F4] border-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-bold mb-0.5 ${
                    selectedDate === item.date ? "text-[#6BCB77]" : "text-[#1F2520]"
                  }`}
                >
                  {item.label}
                </Text>
                <Text
                  className={`text-[10px] ${
                    selectedDate === item.date ? "text-[#059669]" : "text-[#6B756E]"
                  }`}
                >
                  {item.date.split(" ")[1]} {item.date.split(" ")[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
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

        {/* Reviews Section */}
        <View className="mx-5 bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider">Reviews</Text>
            <Pressable onPress={() => {Alert.alert("Write Review", "Review and rating features will be available in Phase 2!")}} className="bg-[#EAF7EC] px-3 py-1.5 rounded-xl active:bg-[#D1F2D6]">
              <Text className="text-[#6BCB77] font-bold text-[10px]">Write Review</Text>
            </Pressable>
          </View>
          
          <View className="bg-[#F5F7F4] p-4 rounded-2xl">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center">
                <Ionicons name="person-circle" size={28} color="#9CA3AF" />
                <View className="ml-2">
                  <Text className="font-bold text-[#1F2520] text-sm">Sarah J.</Text>
                  <Text className="text-[10px] text-[#6B756E]">2 days ago</Text>
                </View>
              </View>
              <View className="flex-row bg-white px-2 py-1 rounded-full border border-black/5 items-center">
                <Ionicons name="star" size={10} color="#D97706" />
                <Text className="text-[10px] font-bold text-amber-800 ml-1">5.0</Text>
              </View>
            </View>
            <Text className="text-[#4A5043] text-xs leading-relaxed mt-1">
              Amazing facilities and great equipment! The gym is super clean and the staff is very helpful. Highly recommend!
            </Text>
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
          gap: 12,
        }}
      >
        <View className="mr-2">
          <Text className="text-[10px] text-[#6B756E] font-semibold uppercase tracking-wider">Visit Cost</Text>
          {gym.type === 'turf' || gym.type === 'sports' ? (
            <Text className="text-lg font-black text-[#1F2520]">₹{gym.cost * 50} Cash</Text>
          ) : (
            <Text className="text-lg font-black text-[#1F2520]">⚡ {gym.cost} Credits</Text>
          )}
        </View>
        
        <Pressable
          onPress={() => router.push("/chat" as any)}
          className="w-14 h-14 rounded-2xl border border-black/5 items-center justify-center bg-[#F5F7F4] active:bg-[#E9EBE6]"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#1F2520" />
        </Pressable>

        <Pressable
          onPress={handleBookVisit}
          className="flex-1 bg-[#6BCB77] h-14 rounded-2xl items-center justify-center active:opacity-90"
        >
          <Text className="text-white font-bold text-base">Book Visit • {selectedDate}</Text>
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
                <Text className="text-xs text-[#6B756E] mt-0.5">📅 {selectedDate}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[#6B756E] text-xs">Cost</Text>
                {gym.type === 'turf' || gym.type === 'sports' ? (
                  <Text className="text-base font-bold text-emerald-700 mt-0.5">₹{gym.cost * 50}</Text>
                ) : (
                  <Text className="text-base font-bold text-emerald-700 mt-0.5">⚡ {gym.cost}</Text>
                )}
              </View>
            </View>

            <View className="bg-amber-50 rounded-xl p-3 mb-6 flex-row items-center gap-x-2 border border-amber-100">
              <Ionicons name="information-circle-outline" size={16} color="#D97706" />
              <Text className="text-amber-800 text-xs flex-1">
                Your balance after booking: {gym.type === 'turf' || gym.type === 'sports' ? `₹${useCreditsStore.getState().cashBalance - (gym.cost * 50)} cash` : `${credits - gym.cost} credits`}
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
