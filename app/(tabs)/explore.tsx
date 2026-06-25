import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  FlatList, 
  Image, 
  Alert,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { mockGyms, Gym } from "@/data/gyms";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";

export default function ExploreScreen() {
  const router = useRouter();
  const { bookingStatus, bookVisit } = useBookingStore();
  const { credits } = useCreditsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  
  // Booking modal state
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [selectedTime, setSelectedTime] = useState("07:00 PM");
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  const filterTags = ["All", "Strength", "Cardio", "CrossFit", "Yoga", "Premium"];

  // Filter gyms based on search and selected tag
  const getFilteredGyms = () => {
    return mockGyms.filter((gym) => {
      const matchesSearch = gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            gym.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTag = selectedFilter === "All" || 
                         gym.tags.includes(selectedFilter) ||
                         (selectedFilter === "Premium" && gym.isPremium);

      return matchesSearch && matchesTag;
    });
  };

  // Group gyms for carousels
  const closestGyms = [...mockGyms].sort((a, b) => a.distance - b.distance);
  const bestValueGyms = mockGyms.filter((g) => g.isBestValue);
  const premiumGyms = mockGyms.filter((g) => g.isPremium && !g.isNearPrimary);
  const beginnerGyms = mockGyms.filter((g) => g.isBeginnerFriendly);
  const nearPrimaryGyms = mockGyms.filter((g) => g.isNearPrimary);

  const handleOpenBooking = (gym: Gym) => {
    if (bookingStatus !== "Not Booked") {
      Alert.alert(
        "Active Booking Exists", 
        "You already have an active booking today. Please cancel it before making a new booking."
      );
      return;
    }
    if (credits < gym.cost) {
      Alert.alert(
        "Insufficient Credits", 
        `This booking requires ${gym.cost} credits, but you only have ${credits} credits remaining.`
      );
      return;
    }
    setSelectedGym(gym);
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedGym) return;
    
    const success = bookVisit(
      selectedGym.id,
      selectedGym.name,
      selectedTime,
      selectedGym.cost
    );

    if (success) {
      setBookingModalVisible(false);
      Alert.alert(
        "Booking Confirmed!", 
        `Successfully booked a session at ${selectedGym.name} for ${selectedTime}.`
      );
    } else {
      Alert.alert("Error", "Failed to confirm booking. Check your credit balance.");
    }
  };

  const renderGymCard = ({ item }: { item: Gym }) => (
    <Pressable 
      onPress={() => router.push(`/gym/${item.id}` as any)}
      className="bg-white rounded-3xl overflow-hidden border border-black/5 shadow-sm mr-4 w-64"
    >
      <Image source={{ uri: item.image }} className="h-32 w-full" resizeMode="cover" />
      <View className="p-4">
        <View className="flex-row justify-between items-start">
          <Text className="text-base font-bold text-[#1F2520] flex-1 mr-1" numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row items-center bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
            <Ionicons name="star" size={12} color="#D97706" />
            <Text className="text-amber-800 text-[10px] font-bold ml-1">{item.rating}</Text>
          </View>
        </View>

        <Text className="text-[10px] text-[#6B756E] mt-1" numberOfLines={1}>
          📍 {item.address}
        </Text>

        <View className="flex-row justify-between items-center mt-3">
          <Text className="text-xs text-[#6B756E] font-medium">{item.distance} KM Away</Text>
          <View className="bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
            <Text className="text-emerald-800 font-bold text-xs">⚡ {item.cost} Credits</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const renderNearPrimaryCard = ({ item }: { item: Gym }) => (
    <View className="bg-white rounded-3xl overflow-hidden border border-black/5 shadow-sm mr-4 w-64 opacity-75">
      <Image source={{ uri: item.image }} className="h-32 w-full" resizeMode="cover" />
      <View className="p-4">
        <View className="flex-row justify-between items-start">
          <Text className="text-base font-bold text-[#1F2520] flex-1 mr-1" numberOfLines={1}>
            {item.name}
          </Text>
          <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
        </View>
        
        <Text className="text-[10px] text-[#6B756E] mt-1" numberOfLines={1}>
          📍 {item.address}
        </Text>

        <View className="mt-3 flex-row justify-between items-center">
          <Text className="text-xs text-[#6B756E] font-medium">{item.distance} KM Away</Text>
          <Text className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-xl">
            🔒 Not Available In Tier
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      {/* Sticky Search & Discovery Header */}
      <View className="px-5 pt-3 pb-4 bg-[#F5F7F4] border-b border-black/5">
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-2xl font-bold text-[#1F2520]">Discover Gyms</Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="location" size={14} color="#6BCB77" />
              <Text className="text-[#6B756E] text-xs font-semibold ml-1">Koramangala, Near Me · 5 KM Radius</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center bg-white rounded-2xl border border-black/5 shadow-sm px-4 h-12">
          <Ionicons name="search" size={18} color="#A0A5A1" />
          <TextInput
            placeholder="Search gym, area or landmark..."
            placeholderTextColor="#A0A5A1"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-sm text-[#1F2520] font-medium"
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Quick Filter Tags (Horizontal List) */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
        >
          {filterTags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => setSelectedFilter(tag)}
              className={`px-4 py-2 rounded-full mr-2.5 border ${
                selectedFilter === tag
                  ? "bg-[#6BCB77] border-transparent"
                  : "bg-white border-black/5"
              }`}
            >
              <Text 
                className={`text-xs font-bold ${
                  selectedFilter === tag ? "text-white" : "text-[#6B756E]"
                }`}
              >
                {tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Dynamic Search / Tag Results View */}
        {(searchQuery || selectedFilter !== "All") ? (
          <View className="px-5 mt-4">
            <Text className="text-base font-bold text-[#1F2520] mb-4">
              Found {getFilteredGyms().length} results
            </Text>
            {getFilteredGyms().map((gym) => (
              <Pressable
                key={gym.id}
                onPress={() => router.push(`/gym/${gym.id}` as any)}
                className="bg-white rounded-3xl overflow-hidden border border-black/5 shadow-sm mb-4"
              >
                <Image source={{ uri: gym.image }} className="h-44 w-full" resizeMode="cover" />
                <View className="p-4">
                  <View className="flex-row justify-between items-start">
                    <View>
                      <Text className="text-lg font-bold text-[#1F2520]">{gym.name}</Text>
                      <Text className="text-xs text-[#6B756E] mt-0.5">📍 {gym.address}</Text>
                    </View>
                    <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      <Ionicons name="star" size={12} color="#D97706" />
                      <Text className="text-amber-800 text-[10px] font-bold ml-1">{gym.rating}</Text>
                    </View>
                  </View>

                  <View className="flex-row gap-x-2 mt-2">
                    {gym.tags.map((tag) => (
                      <View key={tag} className="bg-[#F5F7F4] px-2.5 py-0.5 rounded-lg border border-black/5">
                        <Text className="text-[10px] font-semibold text-[#6B756E]">{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View className="h-[1px] bg-black/5 my-3" />

                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-xs text-[#6B756E] font-medium">{gym.distance} KM Away</Text>
                      <Text className="text-xs text-[#6B756E] mt-0.5">{gym.slots} Slots Left Today</Text>
                    </View>
                    <View className="flex-row items-center gap-x-2">
                      <Text className="text-emerald-800 font-bold text-sm">⚡ {gym.cost} Credits</Text>
                      <Pressable
                        onPress={() => handleOpenBooking(gym)}
                        className="bg-[#F5F7F4] border border-black/5 px-3 py-2.5 rounded-2xl"
                      >
                        <Text className="text-[#6B756E] font-bold text-xs">Book</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

        ) : (
          /* Grouped Carousels Layout when not searching */
          <View className="space-y-6 mt-2">
            {/* Closest To You */}
            <View>
              <Text className="text-base font-bold text-[#1F2520] px-5 mb-3">Closest To You</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={closestGyms}
                renderItem={renderGymCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              />
            </View>

            {/* Best Value */}
            <View>
              <Text className="text-base font-bold text-[#1F2520] px-5 mb-3">Best Value (Save Credits)</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={bestValueGyms}
                renderItem={renderGymCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              />
            </View>

            {/* Premium Facilities */}
            <View>
              <Text className="text-base font-bold text-[#1F2520] px-5 mb-3">Premium Facilities</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={premiumGyms}
                renderItem={renderGymCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              />
            </View>

            {/* Beginner Friendly */}
            <View>
              <Text className="text-base font-bold text-[#1F2520] px-5 mb-3">Beginner Friendly</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={beginnerGyms}
                renderItem={renderGymCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              />
            </View>

            {/* Near Your Primary Gym (Expansion / Upgrade Discovery) */}
            {nearPrimaryGyms.length > 0 && (
              <View>
                <Text className="text-base font-bold text-[#1F2520] px-5 mb-1">Near Your Primary Gym</Text>
                <Text className="text-xs text-[#6B756E] px-5 mb-3">Unlock alternative access by upgrading your membership tier.</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={nearPrimaryGyms}
                  renderItem={renderNearPrimaryCard}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                />
              </View>
            )}

            {/* All Available Gyms List */}
            <View className="px-5">
              <Text className="text-base font-bold text-[#1F2520] mb-3">All Partner Gyms</Text>
              {mockGyms.map((gym) => (
                <Pressable
                  key={gym.id}
                  onPress={() => router.push(`/gym/${gym.id}` as any)}
                  className="bg-white rounded-3xl overflow-hidden border border-black/5 shadow-sm mb-4"
                >
                  <Image source={{ uri: gym.image }} className="h-40 w-full" resizeMode="cover" />
                  <View className="p-4">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 mr-2">
                        <Text className="text-base font-bold text-[#1F2520]">{gym.name}</Text>
                        <Text className="text-xs text-[#6B756E] mt-0.5">📍 {gym.address}</Text>
                      </View>
                      <View className="flex-row items-center bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                        <Ionicons name="star" size={12} color="#D97706" />
                        <Text className="text-amber-800 text-[10px] font-bold ml-1">{gym.rating}</Text>
                      </View>
                    </View>

                    <View className="flex-row gap-x-2 mt-2">
                      {gym.tags.map((tag) => (
                        <View key={tag} className="bg-[#F5F7F4] px-2.5 py-0.5 rounded-lg border border-black/5">
                          <Text className="text-[10px] font-semibold text-[#6B756E]">{tag}</Text>
                        </View>
                      ))}
                    </View>

                    <View className="h-[1px] bg-black/5 my-3" />

                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-xs text-[#6B756E] font-medium">{gym.distance} KM Away · {gym.slots} Slots left</Text>
                      </View>
                      <View className="flex-row items-center gap-x-2">
                        <Text className="text-emerald-800 font-bold text-sm">⚡ {gym.cost} Credits</Text>
                        <Pressable
                          onPress={() => handleOpenBooking(gym)}
                          className="bg-[#F5F7F4] border border-black/5 px-3 py-2 rounded-xl"
                        >
                          <Text className="text-[#6B756E] font-bold text-xs">View Gym</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleOpenBooking(gym)}
                          className="bg-[#6BCB77] px-3 py-2 rounded-xl"
                        >
                          <Text className="text-white font-bold text-xs">Book</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Booking Confirmation Dialog Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bookingModalVisible}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[36px] p-6">
            <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-6 align-self-center mx-auto" />
            
            <Text className="text-xs font-bold text-[#6BCB77] uppercase tracking-wider">Confirm Booking</Text>
            <Text className="text-2xl font-bold text-[#1F2520] mt-1">{selectedGym?.name}</Text>
            <Text className="text-xs text-[#6B756E] mt-0.5">📍 {selectedGym?.address}</Text>

            <View className="h-[1px] bg-black/5 my-5" />

            <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2">Select Time Slot</Text>
            <View className="flex-row gap-x-3.5 mb-6">
              {["07:00 AM", "10:00 AM", "05:00 PM", "07:00 PM"].map((time) => (
                <Pressable
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  className={`flex-1 py-3 rounded-2xl border text-center items-center justify-center ${
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

            <View className="bg-[#F5F7F4] rounded-2xl p-4 flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-[#6B756E] text-xs">Cost for this visit</Text>
                <Text className="text-xl font-bold text-[#1F2520] mt-0.5">⚡ {selectedGym?.cost} Credits</Text>
              </View>
              <View className="align-items-end">
                <Text className="text-[#6B756E] text-xs">Your Balance</Text>
                <Text className="text-sm font-bold text-emerald-800 mt-0.5">{credits} Credits</Text>
              </View>
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