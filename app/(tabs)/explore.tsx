import React, { useState, useEffect, useMemo } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  Image, 
  Alert,
  Modal,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { colors } from "@/constants/colors";
import { FALLBACK_NETWORK_GYMS } from "@/constants/fallbackGyms";
import Animated, { FadeInDown, SlideInRight } from "react-native-reanimated";

export interface Gym {
  id: string;
  name: string;
  address: string;
  rating: number;
  distance: number;
  cost: number;
  slots: number;
  image: string;
  images?: string[];
  tags: string[];
  type: string;
  isPremium?: boolean;
  isBeginnerFriendly?: boolean;
  isBestValue?: boolean;
  isNearPrimary?: boolean;
  isVerified?: boolean;
  reviewCount?: number;
  description?: string;
  openStatus?: string;
}

export default function ExploreScreen() {
  const router = useRouter();
  const { bookVisit, bookingStatus } = useBookingStore();
  const { credits, cashBalance, bookVisitWithCash } = useCreditsStore();
  const { isGuest, selectGym, endGuestSession } = useGuestStore();
  const { token } = useAuthStore();

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "cost">("distance");
  const [favoriteGymIds, setFavoriteGymIds] = useState<Set<string>>(new Set());

  // Booking modal state
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [selectedTime, setSelectedTime] = useState("07:00 PM");
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  // Load gyms & favorites on mount
  useEffect(() => {
    let isMounted = true;
    async function loadGyms() {
      setIsLoading(true);
      try {
        const data = await apiFetch("/api/gyms", token ? { token } : undefined);
        const gymsData = data?.gyms || [];
        if (isMounted && gymsData.length > 0) {
          const formattedGyms: Gym[] = gymsData.map((g: any, index: number) => ({
            id: g.id,
            name: g.name,
            address: g.address || g.city || "Bangalore",
            rating: g.rating || (4.6 + (index % 4) * 0.1),
            distance: g.distanceKm || (0.8 + index * 0.4),
            cost: g.creditCost || 8,
            slots: g.totalSlots || 20,
            image: g.imageUrls?.[0] || FALLBACK_NETWORK_GYMS[index % FALLBACK_NETWORK_GYMS.length]?.image,
            tags: Array.isArray(g.facilities) && g.facilities.length > 0 ? g.facilities : ["Strength", "Cardio", "Lockers"],
            type: g.facilities?.includes("Turf") ? "turf" : g.facilities?.includes("Swimming") ? "sports" : "gym",
            isPremium: g.category === "PREMIUM" || index === 2,
            isBeginnerFriendly: true,
            isBestValue: (g.creditCost || 8) <= 6,
            isNearPrimary: false,
            isVerified: true,
            reviewCount: 95 + (index * 23),
            openStatus: "Open Now • Closes 10:00 PM"
          }));
          setGyms(formattedGyms);
        } else {
          setGyms(FALLBACK_NETWORK_GYMS.map((g, idx) => ({
            ...g,
            isVerified: true,
            reviewCount: 80 + idx * 35,
            openStatus: "Open Now • Closes 10:00 PM"
          })));
        }
      } catch (e: any) {
        setGyms(FALLBACK_NETWORK_GYMS.map((g, idx) => ({
          ...g,
          isVerified: true,
          reviewCount: 80 + idx * 35,
          openStatus: "Open Now • Closes 10:00 PM"
        })));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    async function loadFavorites() {
      if (!token || isGuest) return;
      try {
        const data = await apiFetch("/api/gyms/favorites", { token });
        if (isMounted && Array.isArray(data?.favoriteGymIds)) {
          setFavoriteGymIds(new Set(data.favoriteGymIds));
        } else if (isMounted && Array.isArray(data?.savedGyms)) {
          setFavoriteGymIds(new Set(data.savedGyms.map((g: any) => g.id)));
        }
      } catch {
        // Silently continue
      }
    }

    loadGyms();
    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [token, isGuest]);

  const handleToggleFavorite = async (gymId: string) => {
    if (isGuest) {
      Alert.alert(
        "Account Required",
        "Sign in or create a full ZonoFit account to save your favorite gyms.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Create Account", 
            onPress: async () => {
              await endGuestSession();
              router.replace("/(auth)/create-account");
            } 
          }
        ]
      );
      return;
    }

    setFavoriteGymIds(prev => {
      const next = new Set(prev);
      if (next.has(gymId)) next.delete(gymId);
      else next.add(gymId);
      return next;
    });

    if (token) {
      try {
        await apiFetch(`/api/gyms/${gymId}/favorite`, { method: "POST", token });
      } catch (err) {
        // Silently keep optimistic UI state
      }
    }
  };

  const handleOpenBooking = (gym: Gym) => {
    if (isGuest) {
      selectGym(gym.id, gym.name);
      Alert.alert(
        "Account Required", 
        "Create an account and activate a membership to book gym visits.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Create Account", 
            onPress: async () => {
              await endGuestSession();
              router.replace("/(auth)/create-account");
            } 
          }
        ]
      );
      return;
    }

    if (bookingStatus !== "Not Booked") {
      Alert.alert(
        "Active Booking Exists", 
        "You already have an active booking today. Please cancel or complete it before making a new booking."
      );
      return;
    }

    const isCashVenue = gym.type === 'turf' || gym.type === 'sports';
    const cashCost = gym.cost * 8;

    if (isCashVenue) {
      if (cashBalance < cashCost) {
        Alert.alert(
          "Insufficient Converted Cash", 
          `This venue requires ₹${cashCost} in converted cash, but you only have ₹${cashBalance} remaining.`
        );
        return;
      }
    } else {
      if (credits < gym.cost) {
        Alert.alert(
          "Insufficient Credits", 
          `This booking requires ${gym.cost} credits, but you only have ${credits} credits remaining.`
        );
        return;
      }
    }

    setSelectedGym(gym);
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedGym) return;
    
    const isCashVenue = selectedGym.type === 'turf' || selectedGym.type === 'sports';
    const cashCost = selectedGym.cost * 8;

    let success = false;
    if (isCashVenue) {
      success = bookVisitWithCash(selectedGym.name, cashCost);
      if (success) {
        await bookVisit(selectedGym.id, selectedGym.name, new Date().toISOString(), selectedTime, 0); 
      }
    } else {
      success = await bookVisit(
        selectedGym.id,
        selectedGym.name,
        new Date().toISOString(),
        selectedTime,
        selectedGym.cost
      );
    }

    if (success) {
      setBookingModalVisible(false);
      Alert.alert(
        "Booking Confirmed!", 
        `Successfully booked a session at ${selectedGym.name} for ${selectedTime}. Show your QR pass upon arrival.`
      );
    } else {
      Alert.alert("Error", "Failed to confirm booking. Check your balance.");
    }
  };

  // Filter and sort gyms
  const filteredGyms = useMemo(() => {
    let result = gyms.filter((gym) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        gym.name.toLowerCase().includes(q) ||
        gym.address.toLowerCase().includes(q) ||
        gym.tags.some(t => t.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeFilter === "Top Rated") return gym.rating >= 4.8;
      if (activeFilter === "Open Now") return true;
      if (activeFilter === "Best Value") return gym.isBestValue || gym.cost <= 6;
      if (activeFilter === "Ambience") return gym.isPremium || gym.rating >= 4.8;
      if (activeFilter === "Turf & Sports") return gym.type === "turf" || gym.type === "sports";

      return true;
    });

    if (sortBy === "distance") {
      result = [...result].sort((a, b) => a.distance - b.distance);
    } else if (sortBy === "rating") {
      result = [...result].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "cost") {
      result = [...result].sort((a, b) => a.cost - b.cost);
    }

    return result;
  }, [gyms, searchQuery, activeFilter, sortBy]);

  // Curated collections for the discovery sections
  const topAmbienceGyms = useMemo(() => {
    return gyms.filter(g => g.isPremium || g.rating >= 4.8);
  }, [gyms]);

  const closestGyms = useMemo(() => {
    return [...gyms].sort((a, b) => a.distance - b.distance).slice(0, 5);
  }, [gyms]);

  const bestValueGyms = useMemo(() => {
    return gyms.filter(g => g.isBestValue || g.cost <= 6);
  }, [gyms]);

  const cycleSort = () => {
    if (sortBy === "distance") setSortBy("rating");
    else if (sortBy === "rating") setSortBy("cost");
    else setSortBy("distance");
  };

  const isBrowsingAll = searchQuery === "" && activeFilter === "All";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <View className="flex-row items-center">
            <Ionicons name="location" size={14} color="#1F7A3E" />
            <Text className="text-[12px] font-bold text-[#1F7A3E] ml-1 uppercase tracking-wider">
              Bengaluru • Within 5 KM
            </Text>
          </View>
          <Text className="text-[24px] font-extrabold text-[#111827] tracking-tight mt-0.5">
            Fitness Centres
          </Text>
        </View>

        <Pressable 
          onPress={() => router.push("/notifications" as any)}
          className="w-10 h-10 rounded-full border border-gray-200 items-center justify-center relative bg-white active:bg-gray-100 shadow-sm"
        >
          <Ionicons name="notifications-outline" size={20} color="#111827" />
          <View className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-orange-500 border border-white" />
        </Pressable>
      </View>

      {/* Search Input Bar */}
      <View className="px-5 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center bg-[#F3F4F6] rounded-2xl px-3.5 h-12 border border-gray-200">
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Search gym, area, or facility..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2.5 text-sm font-medium text-[#111827]"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={10} className="p-1">
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Quick Filter Chips (Google local style) */}
      <View className="bg-white py-2.5 border-b border-gray-100">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {/* Sort Chip */}
          <Pressable
            onPress={cycleSort}
            className="flex-row items-center px-3.5 py-1.5 rounded-full border border-gray-300 bg-white active:bg-gray-50"
          >
            <Ionicons name="swap-vertical" size={13} color="#374151" />
            <Text className="text-xs font-semibold text-[#374151] ml-1.5 capitalize">
              Sort: {sortBy}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#6B7280" style={{ marginLeft: 2 }} />
          </Pressable>

          {/* Filter Chips */}
          {[
            { id: "All", label: "All Venues", icon: "grid-outline" },
            { id: "Top Rated", label: "Rating 4.8+ ★", icon: "star" },
            { id: "Open Now", label: "Open Now 🟢", icon: "time-outline" },
            { id: "Ambience", label: "Amazing Ambience ✨", icon: "sparkles" },
            { id: "Best Value", label: "Best Value ⚡", icon: "flash" },
            { id: "Turf & Sports", label: "Turf & Sports ⚽", icon: "football-outline" },
          ].map((chip) => {
            const isSelected = activeFilter === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => setActiveFilter(chip.id)}
                className={`flex-row items-center px-3.5 py-1.5 rounded-full border ${
                  isSelected 
                    ? "bg-[#1F7A3E] border-[#1F7A3E]" 
                    : "bg-white border-gray-300 active:bg-gray-50"
                }`}
              >
                <Text className={`text-xs font-semibold ${isSelected ? "text-white" : "text-[#374151]"}`}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {isLoading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#1F7A3E" />
            <Text className="text-gray-500 text-xs mt-3 font-medium">Discovering fitness centres in Bengaluru...</Text>
          </View>
        ) : (
          <>
            {/* If user is exploring without a restrictive query, show curated discovery sections */}
            {isBrowsingAll && (
              <>
                {/* Discovery Section 1: Centres with Amazing Ambience (Horizontal Carousel) */}
                <View className="mt-4 mb-6">
                  <View className="px-5 mb-3 flex-row justify-between items-end">
                    <View>
                      <Text className="text-xs font-bold uppercase tracking-wider text-[#1F7A3E]">
                        Curated Experience
                      </Text>
                      <Text className="text-lg font-extrabold text-[#111827]">
                        Centres with Amazing Ambience ✨
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-[#6B7280]">
                      {topAmbienceGyms.length} venues
                    </Text>
                  </View>

                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                  >
                    {topAmbienceGyms.map((gym) => {
                      const isFav = favoriteGymIds.has(gym.id);
                      return (
                        <Pressable
                          key={gym.id}
                          onPress={() => router.push(`/gym/${gym.id}` as any)}
                          className="w-[280px] bg-white rounded-3xl overflow-hidden border border-gray-200 active:opacity-95 shadow-sm"
                          style={styles.cardShadow}
                        >
                          <View className="relative h-44 w-full">
                            <Image 
                              source={{ uri: gym.image }} 
                              className="w-full h-full" 
                              resizeMode="cover" 
                            />
                            {/* Gradient/Badge Overlays */}
                            <View className="absolute top-3 left-3 bg-[#111827]/80 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center">
                              <Ionicons name="sparkles" size={11} color="#FBBF24" />
                              <Text className="text-white text-[10px] font-bold ml-1">Premium Ambience</Text>
                            </View>

                            <Pressable 
                              onPress={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(gym.id);
                              }}
                              hitSlop={8}
                              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90"
                            >
                              <Ionicons 
                                name={isFav ? "heart" : "heart-outline"} 
                                size={18} 
                                color={isFav ? "#EF4444" : "#111827"} 
                              />
                            </Pressable>

                            <View className="absolute bottom-2 left-3 bg-black/60 px-2 py-0.5 rounded-lg flex-row items-center">
                              <Ionicons name="time-outline" size={11} color="#A7F3D0" />
                              <Text className="text-white text-[10px] font-medium ml-1">Open Now</Text>
                            </View>
                          </View>

                          <View className="p-4">
                            <View className="flex-row justify-between items-start">
                              <Text className="text-base font-bold text-[#111827] flex-1 mr-2" numberOfLines={1}>
                                {gym.name}
                              </Text>
                              <View className="flex-row items-center bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text className="text-[11px] font-bold text-amber-800 ml-1">{gym.rating.toFixed(1)}</Text>
                              </View>
                            </View>

                            <Text className="text-xs text-[#6B7280] mt-1" numberOfLines={1}>
                              📍 {gym.address} • {gym.distance} KM
                            </Text>

                            <View className="flex-row gap-x-1.5 mt-2.5">
                              {gym.tags.slice(0, 3).map((tag) => (
                                <View key={tag} className="bg-gray-100 px-2 py-0.5 rounded-md">
                                  <Text className="text-[10px] font-semibold text-gray-600">{tag}</Text>
                                </View>
                              ))}
                            </View>

                            <View className="h-[1px] bg-gray-100 my-3" />

                            <View className="flex-row justify-between items-center">
                              <View>
                                <Text className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">VISIT PASS</Text>
                                <Text className="text-sm font-black text-[#1F7A3E]">⚡ {gym.cost} Credits</Text>
                              </View>

                              <Pressable
                                onPress={() => handleOpenBooking(gym)}
                                className="bg-[#1F7A3E] px-4 py-2 rounded-xl active:opacity-90"
                              >
                                <Text className="text-white text-xs font-bold">Book Visit</Text>
                              </Pressable>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Discovery Section 2: Closest To You */}
                <View className="mb-6">
                  <View className="px-5 mb-3 flex-row justify-between items-end">
                    <View>
                      <Text className="text-xs font-bold uppercase tracking-wider text-[#1F7A3E]">
                        Distance First
                      </Text>
                      <Text className="text-lg font-extrabold text-[#111827]">
                        Closest To You 📍
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-[#6B7280]">
                      Under 2 KM
                    </Text>
                  </View>

                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                  >
                    {closestGyms.map((gym) => (
                      <Pressable
                        key={gym.id}
                        onPress={() => router.push(`/gym/${gym.id}` as any)}
                        className="w-[240px] bg-white rounded-2xl overflow-hidden border border-gray-200 active:opacity-95 shadow-sm p-3"
                        style={styles.cardShadow}
                      >
                        <Image 
                          source={{ uri: gym.image }} 
                          className="w-full h-28 rounded-xl mb-2.5" 
                          resizeMode="cover" 
                        />
                        <View className="flex-row items-center justify-between">
                          <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Text className="text-[#065F46] text-[10px] font-bold">⚡ {gym.distance} KM Away</Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons name="star" size={11} color="#F59E0B" />
                            <Text className="text-[11px] font-bold text-gray-700 ml-1">{gym.rating.toFixed(1)}</Text>
                          </View>
                        </View>

                        <Text className="text-sm font-bold text-black mt-1.5" numberOfLines={1}>{gym.name}</Text>
                        <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>{gym.address}</Text>

                        <View className="flex-row justify-between items-center mt-3 pt-2 border-t border-gray-100">
                          <Text className="text-xs font-bold text-[#1F7A3E]">⚡ {gym.cost} Credits</Text>
                          <Text className="text-xs font-bold text-blue-600">View Gym →</Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {/* Discovery Section 3: Best Value for Credits */}
                {bestValueGyms.length > 0 && (
                  <View className="mb-6 px-5">
                    <View className="bg-[#ECFDF5] rounded-3xl p-5 border border-[#A7F3D0] shadow-sm">
                      <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center">
                          <Ionicons name="flash" size={18} color="#047857" />
                          <Text className="text-[#047857] text-base font-extrabold ml-1.5">
                            Best Value • 6 Credits / Visit
                          </Text>
                        </View>
                        <View className="bg-[#10B981] px-2 py-0.5 rounded-full">
                          <Text className="text-white text-[9px] font-black uppercase tracking-wider">SAVINGS</Text>
                        </View>
                      </View>
                      <Text className="text-[#065F46] text-xs leading-relaxed mb-4">
                        Maximize your workouts with top-rated network facilities requiring fewer credits per completed visit.
                      </Text>

                      <View className="gap-y-2.5">
                        {bestValueGyms.slice(0, 2).map((gym) => (
                          <Pressable
                            key={gym.id}
                            onPress={() => router.push(`/gym/${gym.id}` as any)}
                            className="bg-white rounded-2xl p-3 flex-row items-center justify-between border border-emerald-100 active:bg-gray-50"
                          >
                            <View className="flex-row items-center flex-1 mr-2">
                              <Image 
                                source={{ uri: gym.image }} 
                                className="w-12 h-12 rounded-xl mr-3" 
                                resizeMode="cover" 
                              />
                              <View className="flex-1">
                                <Text className="text-sm font-bold text-black" numberOfLines={1}>{gym.name}</Text>
                                <Text className="text-[11px] text-gray-500 mt-0.5">⭐ {gym.rating.toFixed(1)} • {gym.distance} KM Away</Text>
                              </View>
                            </View>

                            <View className="items-end">
                              <Text className="text-xs font-black text-[#1F7A3E]">⚡ {gym.cost} Credits</Text>
                              <Text className="text-[10px] text-gray-400 font-semibold mt-0.5">Book Now</Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Main Listing Section — Google Local Style Cards */}
            <View className="px-5 mt-2">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-extrabold text-[#111827]">
                  {searchQuery 
                    ? `Results for "${searchQuery}" (${filteredGyms.length})` 
                    : activeFilter !== "All" 
                      ? `${activeFilter} Centres (${filteredGyms.length})` 
                      : `All Partner Fitness Centres (${filteredGyms.length})`
                  }
                </Text>
                {searchQuery || activeFilter !== "All" ? (
                  <Pressable 
                    onPress={() => { setSearchQuery(""); setActiveFilter("All"); }}
                    className="py-1 px-2.5 bg-gray-200 rounded-full"
                  >
                    <Text className="text-[11px] font-bold text-gray-700">Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              {filteredGyms.length === 0 ? (
                <View className="py-12 px-6 items-center bg-white rounded-3xl border border-gray-200 my-4">
                  <Ionicons name="barbell-outline" size={42} color="#9CA3AF" />
                  <Text className="text-base font-bold text-gray-800 mt-3">No matching fitness centres</Text>
                  <Text className="text-xs text-gray-500 text-center mt-1">
                    Try searching for another neighborhood or clearing your filter chips.
                  </Text>
                  <Pressable
                    onPress={() => { setSearchQuery(""); setActiveFilter("All"); }}
                    className="mt-4 px-5 py-2 bg-[#1F7A3E] rounded-full"
                  >
                    <Text className="text-white text-xs font-bold">Show All Venues</Text>
                  </Pressable>
                </View>
              ) : (
                filteredGyms.map((gym) => {
                  const isFav = favoriteGymIds.has(gym.id);
                  return (
                    <View 
                      key={gym.id}
                      className="bg-white rounded-3xl overflow-hidden border border-gray-200 mb-4 shadow-sm"
                      style={styles.cardShadow}
                    >
                      {/* Large Gym Photo */}
                      <Pressable 
                        onPress={() => router.push(`/gym/${gym.id}` as any)}
                        className="relative h-48 w-full"
                      >
                        <Image 
                          source={{ uri: gym.image }} 
                          className="w-full h-full" 
                          resizeMode="cover" 
                        />
                        
                        {/* Top Badges */}
                        <View className="absolute top-3 left-3 flex-row gap-x-2">
                          <View className="bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center">
                            <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                            <Text className="text-white text-[10px] font-bold ml-1">Verified Partner</Text>
                          </View>
                          {gym.isBestValue && (
                            <View className="bg-amber-500/90 backdrop-blur-md px-2.5 py-1 rounded-full">
                              <Text className="text-white text-[10px] font-bold">Best Value</Text>
                            </View>
                          )}
                        </View>

                        {/* Favorite Heart Button */}
                        <Pressable 
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(gym.id);
                          }}
                          hitSlop={8}
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 items-center justify-center shadow-md active:scale-90"
                        >
                          <Ionicons 
                            name={isFav ? "heart" : "heart-outline"} 
                            size={20} 
                            color={isFav ? "#EF4444" : "#111827"} 
                          />
                        </Pressable>

                        {/* Bottom Photo Overlay */}
                        <View className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-xl flex-row items-center">
                          <Ionicons name="time" size={12} color="#34D399" />
                          <Text className="text-white text-[11px] font-medium ml-1.5">{gym.openStatus || "Open Now"}</Text>
                        </View>
                      </Pressable>

                      {/* Card Content & Details */}
                      <View className="p-4">
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1 mr-2">
                            <Text className="text-[17px] font-extrabold text-[#111827]" numberOfLines={1}>
                              {gym.name}
                            </Text>
                            <Text className="text-xs text-gray-500 mt-0.5">
                              Fitness Centre • Strength & Conditioning
                            </Text>
                          </View>

                          <View className="flex-row items-center bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text className="text-xs font-black text-amber-900 ml-1">{gym.rating.toFixed(1)}</Text>
                          </View>
                        </View>

                        {/* Location & Reviews */}
                        <View className="flex-row items-center mt-2">
                          <Ionicons name="location-outline" size={14} color="#6B7280" />
                          <Text className="text-xs text-gray-600 ml-1 font-medium" numberOfLines={1}>
                            {gym.address} • <Text className="font-bold text-[#1F7A3E]">{gym.distance} KM Away</Text>
                          </Text>
                          <Text className="text-xs text-gray-400 ml-1.5">
                            ({gym.reviewCount || 120} reviews)
                          </Text>
                        </View>

                        {/* Feature Tags */}
                        <View className="flex-row flex-wrap gap-1.5 mt-3">
                          {gym.tags.map((tag) => (
                            <View key={tag} className="bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                              <Text className="text-[11px] font-medium text-gray-700">{tag}</Text>
                            </View>
                          ))}
                        </View>

                        <View className="h-[1px] bg-gray-100 my-3.5" />

                        {/* Action & Cost Row */}
                        <View className="flex-row justify-between items-center">
                          <View>
                            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              VISIT COST
                            </Text>
                            <Text className="text-base font-black text-[#1F7A3E]">
                              ⚡ {gym.cost} Credits <Text className="text-[11px] font-normal text-gray-500">(≈ ₹{gym.cost * 10})</Text>
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-x-2">
                            <Pressable
                              onPress={() => router.push(`/gym/${gym.id}` as any)}
                              className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white active:bg-gray-50"
                            >
                              <Text className="text-xs font-bold text-gray-700">Details</Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleOpenBooking(gym)}
                              className="px-4 py-2 rounded-xl bg-[#1F7A3E] active:opacity-90 shadow-sm"
                            >
                              <Text className="text-xs font-bold text-white">Book Visit</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Bottom Referral & Suggestion Card */}
            <View className="px-5 mt-6 mb-4">
              <View className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
                <Text className="text-xs font-bold uppercase tracking-wider text-[#1F7A3E]">Network Expansion</Text>
                <Text className="text-base font-bold text-[#111827] mt-1">Want your favorite gym on ZonoFit?</Text>
                <Text className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Refer your local fitness centre to join the ZonoFit partner network and earn 100 reward credits when they onboard.
                </Text>

                <Pressable
                  onPress={() => router.push("/invite" as any)}
                  className="mt-4 bg-[#1F7A3E] py-2.5 rounded-xl items-center active:opacity-90"
                >
                  <Text className="text-white text-xs font-bold">Refer Gym or Friends</Text>
                </Pressable>
              </View>
            </View>
          </>
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
          <View className="rounded-t-[32px] p-6 bg-white">
            <View className="w-12 h-1.5 rounded-full mb-5 self-center bg-gray-300" />
            
            <Text className="text-xs font-bold uppercase tracking-wider text-[#1F7A3E]">Confirm Booking</Text>
            <Text className="text-2xl font-black mt-1 text-[#111827]">{selectedGym?.name}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">📍 {selectedGym?.address}</Text>

            <View className="h-[1px] my-4 bg-gray-200" />

            <Text className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-700">Select Time Slot</Text>
            <View className="flex-row gap-x-2.5 mb-6">
              {["07:00 AM", "10:00 AM", "05:00 PM", "07:00 PM"].map((time) => (
                <Pressable
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  className={`flex-1 py-3 rounded-2xl border text-center items-center justify-center active:scale-[0.98] ${
                    selectedTime === time 
                      ? "bg-[#ECFDF5] border-[#10B981]" 
                      : "bg-[#F9FAFB] border-gray-200"
                  }`}
                >
                  <Text className={`text-xs font-bold ${selectedTime === time ? "text-[#065F46]" : "text-gray-600"}`}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="rounded-2xl p-4 flex-row justify-between items-center mb-6 bg-[#F3F4F6]">
              <View>
                <Text className="text-xs text-gray-500">Available Wallet Balance</Text>
                <Text className="text-lg font-bold text-gray-800 mt-0.5">{credits} Credits</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-gray-500 mb-0.5">Session Cost</Text>
                <Text className="text-xl font-black text-[#1F7A3E]">⚡ {selectedGym?.cost} Credits</Text>
              </View>
            </View>

            <View className="flex-row gap-x-3">
              <Pressable
                onPress={() => setBookingModalVisible(false)}
                className="flex-1 h-12 rounded-2xl items-center justify-center border border-gray-300 bg-white active:bg-gray-50"
              >
                <Text className="font-bold text-sm text-gray-700">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmBooking}
                className="flex-1 h-12 rounded-2xl items-center justify-center bg-[#1F7A3E] active:opacity-90 shadow-sm"
              >
                <Text className="font-bold text-sm text-white">Confirm & Book</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
});