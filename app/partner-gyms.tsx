import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  Image, 
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { apiFetch } from "@/lib/api";
import { FALLBACK_NETWORK_GYMS, NetworkGym } from "@/constants/fallbackGyms";

const PAGE_SIZE = 6;

export default function PartnerGymsScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Nearby");
  const [currentPage, setCurrentPage] = useState(1);
  const [gyms, setGyms] = useState<NetworkGym[]>(FALLBACK_NETWORK_GYMS);
  const [isLoading, setIsLoading] = useState(false);

  const { token } = useAuthStore();
  const { isGuest, endGuestSession } = useGuestStore();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Fetch gyms and initial favorites
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const data = await apiFetch("/api/gyms", token ? { token } : undefined);
        const gymsData = data?.gyms || [];
        if (isMounted && gymsData.length > 0) {
          const formattedGyms: NetworkGym[] = gymsData.map((g: any) => ({
            id: g.id,
            name: g.name,
            address: g.address || g.city || "Bangalore",
            rating: g.rating || 4.6,
            distance: g.distanceKm || 2.4,
            cost: g.creditCost || 8,
            slots: g.totalSlots || 20,
            image: g.imageUrls?.[0] || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600",
            tags: Array.isArray(g.facilities) && g.facilities.length > 0 ? g.facilities : ["Strength", "Cardio", "Locker"],
            type: "gym",
            isBeginnerFriendly: true,
            isBestValue: (g.creditCost || 8) <= 7,
            isNearPrimary: false,
          }));
          setGyms(formattedGyms);
        }
      } catch (err) {
        console.warn("Could not fetch remote partner gyms, using offline network fallback:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    async function loadFavorites() {
      if (!token || isGuest) return;
      try {
        const favData = await apiFetch("/api/gyms/favorites", { token });
        if (isMounted && Array.isArray(favData.favoriteGymIds)) {
          setFavorites(new Set(favData.favoriteGymIds));
        }
      } catch {
        // Silently continue
      }
    }

    loadData();
    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [token, isGuest]);

  // Handle favorite toggle with DB persistence and guest check
  const handleToggleFavorite = async (gymId: string) => {
    if (isGuest || !token) {
      Alert.alert(
        "Account Required",
        "Sign in or create a full ZonoFit account to save your favorite gyms across devices.",
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

    // Optimistic toggle
    const isCurrentlyFav = favorites.has(gymId);
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(gymId)) next.delete(gymId);
      else next.add(gymId);
      return next;
    });

    try {
      await apiFetch(`/api/gyms/${gymId}/favorite`, {
        method: "POST",
        token
      });
    } catch (e) {
      // Revert if API failed
      setFavorites(prev => {
        const next = new Set(prev);
        if (isCurrentlyFav) next.add(gymId);
        else next.delete(gymId);
        return next;
      });
    }
  };

  // Filtered gyms
  const filteredGyms = useMemo(() => {
    return gyms.filter(gym => {
      const matchesSearch = 
        gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gym.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gym.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === "Top Rated") {
        return (gym.rating || 0) >= 4.7;
      }
      if (activeFilter === "Open Now") {
        return true;
      }
      if (activeFilter === "Best Value") {
        return gym.cost <= 7 || gym.isBestValue;
      }
      return true; // "Nearby" or default
    });
  }, [gyms, searchQuery, activeFilter]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  // Pagination calculations: exactly 6 gyms per page
  const totalPages = Math.max(1, Math.ceil(filteredGyms.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredGyms.length);
  const displayedGyms = filteredGyms.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    // Smooth scroll back to partner gyms list section
    scrollViewRef.current?.scrollTo({ y: 320, animated: true });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 pt-2 pb-3 border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="w-10 h-10 justify-center active:opacity-60">
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </Pressable>
        <View className="items-center flex-1">
          <Text className="text-[17px] font-bold text-[#000000]">Partner Gyms</Text>
          <Text className="text-[11px] text-[#6B7280] mt-0.5">Use your ZonoFit Credits at partner fitness clubs</Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Search Bar */}
        <View className="px-5 mb-3 mt-3">
          <View className="flex-row items-center bg-[#F9FAFB] rounded-[16px] px-4 h-12 border border-gray-200">
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search by gym name, area, or facility"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-sm text-black"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} className="p-1">
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filters */}
        <View className="px-5 mb-4 flex-row gap-x-2">
          {["Nearby", "Open Now", "Top Rated", "Best Value"].map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`flex-row items-center px-3.5 py-1.5 rounded-full border ${
                activeFilter === filter ? 'bg-[#1F7A3E] border-[#1F7A3E]' : 'bg-white border-gray-200'
              }`}
            >
              {filter === "Nearby" && <Ionicons name="navigate" size={12} color={activeFilter === filter ? "white" : "#4B5563"} />}
              {filter === "Open Now" && <Ionicons name="time-outline" size={12} color={activeFilter === filter ? "white" : "#4B5563"} />}
              {filter === "Top Rated" && <Ionicons name="star-outline" size={12} color={activeFilter === filter ? "white" : "#4B5563"} />}
              {filter === "Best Value" && <Ionicons name="flash-outline" size={12} color={activeFilter === filter ? "white" : "#4B5563"} />}
              <Text className={`text-xs font-semibold ml-1 ${activeFilter === filter ? 'text-white' : 'text-[#4B5563]'}`}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Primary Gym Card */}
        <View className="px-5 mb-5">
          <View className="bg-[#064E3B] rounded-[20px] p-4" style={styles.cardShadow}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="bg-[#047857] px-2.5 py-0.5 rounded-full">
                <Text className="text-[#34D399] text-[9px] font-bold tracking-wider uppercase">PRIMARY GYM</Text>
              </View>
              <Text className="text-[#A7F3D0] text-[11px] font-medium">Included in Plan</Text>
            </View>

            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-1 pr-2">
                <Text className="text-white text-[19px] font-bold mb-1">Gold's Gym</Text>
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={12} color="#A7F3D0" />
                  <Text className="text-[#D1FAE5] text-[11px] ml-1">1.2 km away • Koramangala</Text>
                </View>
              </View>
              <Image 
                source={require('@/assets/Zonofit_final_logo.jpeg')} 
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white' }}
              />
            </View>
            
            <View className="flex-row justify-between items-center border-t border-[#047857]/80 pt-3">
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={14} color="#A7F3D0" />
                <View className="ml-1.5">
                  <Text className="text-[#A7F3D0] text-[9px]">Home Membership</Text>
                  <Text className="text-white text-[11px] font-semibold">Active Access</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark-outline" size={14} color="#A7F3D0" />
                <View className="ml-1.5">
                  <Text className="text-[#A7F3D0] text-[9px]">Primary Zone</Text>
                  <Text className="text-white text-[11px] font-semibold">3 km Radius</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Partner Gyms Header with Count */}
        <View className="px-5 mb-3 flex-row justify-between items-center">
          <View>
            <Text className="text-[#000000] font-bold text-[15px]">Partner Gyms ({filteredGyms.length})</Text>
            <Text className="text-[#6B7280] text-[11px]">Showing 6 gyms per page</Text>
          </View>
          <View className="bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
            <Text className="text-[#047857] text-[10px] font-bold">
              Page {currentPage} of {totalPages}
            </Text>
          </View>
        </View>

        {/* 6 Gyms per page listing */}
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="small" color="#1F7A3E" />
            <Text className="text-[#6B7280] text-xs mt-2 font-medium">Loading partner gyms...</Text>
          </View>
        ) : displayedGyms.length === 0 ? (
          <View className="px-5 py-8 items-center bg-[#F9FAFB] rounded-2xl mx-5 border border-gray-200">
            <Ionicons name="barbell-outline" size={36} color="#9CA3AF" />
            <Text className="text-[#111827] font-bold text-sm mt-2">No gyms matched your filter</Text>
            <Text className="text-[#6B7280] text-xs text-center mt-1">Try clearing your search query or choosing another filter category.</Text>
            <Pressable 
              onPress={() => { setSearchQuery(""); setActiveFilter("Nearby"); }}
              className="mt-3 px-4 py-1.5 bg-[#1F7A3E] rounded-full"
            >
              <Text className="text-white text-xs font-semibold">Reset Filters</Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-5">
            {displayedGyms.map((gym) => {
              const isFav = favorites.has(gym.id) || favorites.has(gym.name);
              return (
                <Pressable 
                  key={gym.id}
                  onPress={() => router.push(`/gym/${gym.id}` as any)}
                  className="bg-white rounded-[16px] mb-3.5 border border-gray-200 overflow-hidden active:opacity-95"
                  style={styles.cardShadow}
                >
                  <View className="flex-row">
                    {/* Gym Image */}
                    <View className="w-[125px] relative" style={{ minHeight: 115 }}>
                      <Image 
                        source={{ uri: gym.image }} 
                        className="w-full h-full" 
                        resizeMode="cover" 
                      />
                      <View className="absolute top-2 left-2 bg-[#DCFCE7] px-1.5 py-0.5 rounded-full border border-[#86EFAC]">
                        <Text className="text-[#166534] text-[8px] font-bold">Credit Eligible</Text>
                      </View>
                      {gym.cost && (
                        <View className="absolute bottom-2 left-2 bg-black/75 px-1.5 py-0.5 rounded">
                          <Text className="text-white text-[9px] font-bold">⚡ {gym.cost} Credits</Text>
                        </View>
                      )}
                    </View>

                    {/* Gym Info */}
                    <View className="flex-1 p-3 flex-col justify-between">
                      <View>
                        <View className="flex-row justify-between items-start mb-1">
                          <Text className="text-[#000000] font-bold text-[14px] flex-1 mr-2" numberOfLines={1}>
                            {gym.name}
                          </Text>
                          <Pressable 
                            hitSlop={8}
                            onPress={() => handleToggleFavorite(gym.id)}
                            className="p-0.5"
                          >
                            <Ionicons 
                              name={isFav ? "heart" : "heart-outline"} 
                              size={18} 
                              color={isFav ? "#EF4444" : "#9CA3AF"} 
                            />
                          </Pressable>
                        </View>

                        <View className="flex-row items-center mb-1.5">
                          <Ionicons name="location-outline" size={11} color="#6B7280" />
                          <Text className="text-[#6B7280] text-[10px] ml-1 mr-2.5 font-medium">
                            {typeof gym.distance === 'number' ? `${gym.distance.toFixed(1)} km` : gym.distance}
                          </Text>
                          <Ionicons name="star" size={11} color="#F59E0B" />
                          <Text className="text-[#374151] text-[10px] ml-1 font-semibold">
                            {gym.rating}
                          </Text>
                        </View>

                        {/* Facility chips */}
                        <View className="flex-row gap-1 flex-wrap">
                          {gym.tags.slice(0, 3).map((tag, idx) => (
                            <View key={idx} className="bg-[#F3F4F6] px-1.5 py-0.5 rounded border border-gray-100">
                              <Text className="text-[#4B5563] text-[9px] font-medium">{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Book CTA */}
                      <Pressable 
                        onPress={() => router.push(`/gym/${gym.id}` as any)}
                        className="w-full py-1.5 rounded-lg border border-[#1F7A3E] items-center mt-2.5 bg-[#ECFDF5] active:bg-[#D1FAE5]"
                      >
                        <Text className="text-[#1F7A3E] font-bold text-[11px]">Book with Credits</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Pagination Bar (Only if multiple pages exist) */}
        {totalPages > 1 && (
          <View className="px-5 mt-2 mb-6">
            <View className="bg-[#F9FAFB] rounded-2xl p-3 border border-gray-200 flex-row items-center justify-between">
              {/* Prev Button */}
              <Pressable
                onPress={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex-row items-center px-3 py-1.5 rounded-lg border ${
                  currentPage === 1 
                    ? 'border-gray-200 bg-gray-100 opacity-50' 
                    : 'border-gray-300 bg-white active:bg-gray-50'
                }`}
              >
                <Ionicons name="chevron-back" size={14} color={currentPage === 1 ? "#9CA3AF" : "#111827"} />
                <Text className={`text-xs font-semibold ml-1 ${currentPage === 1 ? 'text-[#9CA3AF]' : 'text-[#111827]'}`}>
                  Prev
                </Text>
              </Pressable>

              {/* Page Number Pills */}
              <View className="flex-row items-center gap-x-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Pressable
                    key={pageNum}
                    onPress={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-full items-center justify-center border ${
                      currentPage === pageNum
                        ? 'bg-[#1F7A3E] border-[#1F7A3E]'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${
                      currentPage === pageNum ? 'text-white' : 'text-[#374151]'
                    }`}>
                      {pageNum}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Next Button */}
              <Pressable
                onPress={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex-row items-center px-3 py-1.5 rounded-lg border ${
                  currentPage === totalPages 
                    ? 'border-gray-200 bg-gray-100 opacity-50' 
                    : 'border-gray-300 bg-white active:bg-gray-50'
                }`}
              >
                <Text className={`text-xs font-semibold mr-1 ${currentPage === totalPages ? 'text-[#9CA3AF]' : 'text-[#111827]'}`}>
                  Next
                </Text>
                <Ionicons name="chevron-forward" size={14} color={currentPage === totalPages ? "#9CA3AF" : "#111827"} />
              </Pressable>
            </View>

            <Text className="text-center text-[10px] text-[#6B7280] mt-1.5">
              Showing {startIndex + 1}–{endIndex} of {filteredGyms.length} gyms (6 per page)
            </Text>
          </View>
        )}

        {/* Gyms Inside Primary Zone Section */}
        <View className="px-5 mb-3 flex-row items-center mt-2">
          <Text className="text-[#000000] font-bold text-[14px] mr-1.5">Gyms Inside Your Primary Zone</Text>
          <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
        </View>

        <View className="px-5 mb-6">
          <View className="flex-row bg-[#F9FAFB] rounded-[16px] border border-gray-200 overflow-hidden" style={{ minHeight: 96 }}>
            <View className="w-[110px] relative">
              <Image 
                source={{ uri: "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&q=80&w=400" }} 
                className="w-full h-full grayscale opacity-70" 
                resizeMode="cover" 
              />
              <View className="absolute top-2 left-2 bg-white px-2 py-0.5 rounded-full border border-gray-200 shadow-sm">
                <Text className="text-[#4B5563] text-[9px] font-bold">Protected Area</Text>
              </View>
            </View>
            <View className="flex-1 p-3 flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-[#000000] font-bold text-[13px] mb-0.5">Anytime Fitness</Text>
                <View className="flex-row items-center mb-1">
                  <Ionicons name="location-outline" size={10} color="#6B7280" />
                  <Text className="text-[#6B7280] text-[10px] ml-1">0.8 km away</Text>
                </View>
                <Text className="text-[#6B7280] text-[9px] leading-tight">
                  This gym is inside your Primary Zone and is reserved for your primary gym access.
                </Text>
              </View>
              <Pressable 
                onPress={() => Alert.alert("Primary Zone Protection", "To protect partner gym revenue and prevent member migration within 3km of your home gym, credits cannot be used at competing facilities inside your primary zone.")}
                className="px-3 py-1.5 rounded-lg border border-[#1F7A3E] bg-white active:bg-gray-50"
              >
                <Text className="text-[#1F7A3E] font-bold text-[11px]">Why?</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Bottom Banners */}
        <View className="px-5 mb-4">
          <View className="bg-[#F9FAFB] rounded-[16px] p-4 border border-gray-200 flex-row items-center">
            <View className="flex-1">
              <Text className="text-[#000000] font-bold text-[14px] mb-1">Can't find a gym you need?</Text>
              <Text className="text-[#6B7280] text-[11px] leading-snug">Tell us which gym you want in your area. We'll invite them to the ZonoFit Network!</Text>
            </View>
            <View className="ml-3 items-center">
              <View className="w-[48px] h-[48px] bg-[#EDE9FE] rounded-[12px] items-center justify-center mb-1.5">
                <Text className="text-[22px]">🏬</Text>
              </View>
              <Pressable 
                onPress={() => Alert.alert("Nominate a Gym", "Thank you for helping expand ZonoFit! We have registered your area interest.")}
                className="border border-[#1F7A3E] px-2.5 py-1 rounded-full bg-white active:bg-gray-50"
              >
                <Text className="text-[#1F7A3E] font-bold text-[10px]">Vote for a Gym</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Help Grow Banner */}
        <View className="px-5 mb-8">
          <View className="bg-[#2A8737] rounded-2xl overflow-hidden relative" style={{ minHeight: 130 }}>
            <Image 
              source={require('@/assets/images/refer-characters.png')} 
              className="absolute right-[-10px] bottom-[-10px] w-[160px] h-[140px] z-0"
              resizeMode="contain"
            />
            <View className="absolute inset-0 bg-black/5 z-0" />
            
            <View className="p-4 pr-[120px] z-10 justify-center flex-1">
              <Text className="text-white font-extrabold text-[15px] mb-1.5 leading-tight">
                Help Grow ZonoFit in Your City
              </Text>
              <Text className="text-white/90 text-[11px] mb-3 leading-snug font-medium">
                More members = More gyms, sports,{"\n"}trainers & services for everyone!
              </Text>
              <Pressable 
                onPress={() => router.push("/refer" as any)}
                className="bg-white px-4 py-1.5 rounded-lg self-start active:opacity-80 shadow-sm"
              >
                <Text className="text-[#2A8737] font-bold text-[12px]">Invite Friends</Text>
              </Pressable>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  }
});
