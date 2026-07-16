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
  Modal,
  StyleSheet
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { colors } from "@/constants/colors";
import Animated, { FadeInDown, SlideInRight } from "react-native-reanimated";
import { Animated3DCard } from "@/components/Animated3DCard";

export interface TrialGym {
  id: string;
  name: string;
  city: string;
  area: string;
  description: string;
  imageUrl?: string;
  voteCount: number;
  hasVoted: boolean;
}

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
  amenities?: { label: string; icon: string }[];
  hours?: string;
}

export default function ExploreScreen() {
  const router = useRouter();
  const { bookVisit, bookingStatus } = useBookingStore();
  const { credits, cashBalance, bookVisitWithCash } = useCreditsStore();

  const { token } = useAuthStore();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [trialGyms, setTrialGyms] = useState<TrialGym[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  
  React.useEffect(() => {
    async function loadGyms() {
      if (!token) return;
      setIsLoading(true);
      try {
        const data = await apiFetch("/api/gyms", { token });
        const gymsData = data.gyms || [];
        const formattedGyms = gymsData.map((g: any) => ({
          id: g.id,
          name: g.name,
          address: g.address || g.city,
          rating: g.rating || 4.5,
          distance: g.distanceKm || 2.1,
          cost: g.creditCost || 8,
          slots: g.totalSlots || 20,
          image: g.imageUrls?.[0] || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48",
          tags: g.facilities || ["Strength", "Cardio"],
          type: g.facilities?.includes("Turf") ? "turf" : g.facilities?.includes("Swimming") || g.facilities?.includes("Basketball") ? "sports" : "gym",
          isPremium: g.category === "PREMIUM",
          isBeginnerFriendly: true,
          isBestValue: g.creditCost <= 6,
          isNearPrimary: false,
        }));
        setGyms(formattedGyms);
      } catch (e) {
        console.error("Failed to load gyms", e);
      }
    }

    async function loadTrialGyms() {
      if (!token) return;
      try {
        const data = await apiFetch("/api/trial-gyms", { token });
        setTrialGyms(data.trialGyms || []);
      } catch (e) {
        console.error("Failed to load trial gyms", e);
      }
    }

    async function loadData() {
      setIsLoading(true);
      await Promise.all([loadGyms(), loadTrialGyms()]);
      setIsLoading(false);
    }
    
    loadData();
  }, [token]);
  
  const handleVoteTrialGym = async (gymId: string) => {
    if (!token) return;
    try {
      const data = await apiFetch(`/api/trial-gyms/${gymId}/vote`, {
        method: "POST",
        token
      });
      // Optimistically update the UI
      setTrialGyms(prev => prev.map(gym => {
        if (gym.id === gymId) {
          const voteChange = data.hasVoted ? 1 : -1;
          return {
            ...gym,
            hasVoted: data.hasVoted,
            voteCount: gym.voteCount + voteChange
          };
        }
        return gym;
      }));
    } catch (error) {
      console.error("Failed to vote for gym", error);
      Alert.alert("Error", "Could not submit your vote.");
    }
  };
  
  // Booking modal state
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [selectedTime, setSelectedTime] = useState("07:00 PM");
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  const filterTags = ["All", "Gyms", "Turf", "Pools", "Courts"];

  // Filter gyms based on search and selected tag
  const getFilteredGyms = () => {
    return gyms.filter((gym) => {
      const matchesSearch = gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            gym.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTag = selectedFilter === "All" || 
                         (selectedFilter === "Gyms" && gym.type === "gym") ||
                         (selectedFilter === "Turf" && gym.tags.includes("Turf")) ||
                         (selectedFilter === "Pools" && gym.tags.includes("Swimming")) ||
                         (selectedFilter === "Courts" && gym.tags.includes("Basketball"));

      return matchesSearch && matchesTag;
    });
  };

  // Group gyms for carousels
  const closestGyms = [...gyms].sort((a, b) => a.distance - b.distance);
  const bestValueGyms = gyms.filter((g) => g.isBestValue);
  const premiumGyms = gyms.filter((g) => g.isPremium && !g.isNearPrimary);
  const beginnerGyms = gyms.filter((g) => g.isBeginnerFriendly);
  const nearPrimaryGyms = gyms.filter((g) => g.isNearPrimary);

  const handleOpenBooking = (gym: Gym) => {
    if (bookingStatus !== "Not Booked") {
      Alert.alert(
        "Active Booking Exists", 
        "You already have an active booking today. Please cancel it before making a new booking."
      );
      return;
    }

    const isCashVenue = gym.type === 'turf' || gym.type === 'sports';
    const cashCost = gym.cost * 8; // Exchange value is 8 rupees per credit

    if (isCashVenue) {
      if (cashBalance < cashCost) {
        Alert.alert(
          "Insufficient Converted Cash", 
          `This venue requires ₹${cashCost} in converted cash (Conversion rate: ₹8 per 1 Credit), but you only have ₹${cashBalance} remaining.`
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
        `Successfully booked a session at ${selectedGym.name} for ${selectedTime}.`
      );
    } else {
      Alert.alert("Error", "Failed to confirm booking. Check your balance.");
    }
  };

  const renderGymCard = ({ item }: { item: Gym }) => (
    <Animated3DCard 
      scaleDown={0.96} 
      onPress={() => router.push(`/gym/${item.id}` as any)}
      className="mr-4 w-64 rounded-3xl"
    >
      <View 
        className="rounded-3xl overflow-hidden border"
        style={[{ backgroundColor: item.isPremium ? colors.surfaceDark : colors.surface, borderColor: item.isPremium ? colors.secondaryDark : colors.secondary }, styles.softShadow]}
      >
        <Image source={{ uri: item.image }} className="h-32 w-full" resizeMode="cover" />
        <View className="p-4">
          <View className="flex-row justify-between items-start">
            <Text className="text-base font-bold flex-1 mr-1" numberOfLines={1} style={{ color: item.isPremium ? colors.textLight : colors.text }}>
              {item.name}
            </Text>
            <View className="flex-row items-center px-2 py-0.5 rounded-lg border" style={{ backgroundColor: 'rgba(255, 176, 32, 0.1)', borderColor: 'rgba(255, 176, 32, 0.2)' }}>
              <Ionicons name="star" size={12} color={colors.amber} />
              <Text className="text-[10px] font-bold ml-1" style={{ color: colors.amber }}>{item.rating}</Text>
            </View>
          </View>

          <Text className="text-[10px] mt-1" numberOfLines={1} style={{ color: colors.muted }}>
            📍 {item.address}
          </Text>

          <View className="flex-row justify-between items-center mt-3">
            <Text className="text-xs font-medium" style={{ color: colors.muted }}>{item.distance} KM Away</Text>
            <View className="border px-2.5 py-1 rounded-xl" style={{ backgroundColor: 'rgba(217, 255, 92, 0.1)', borderColor: 'rgba(217, 255, 92, 0.2)' }}>
              <Text className="font-bold text-xs" style={{ color: colors.lime }}>⚡ {item.cost} Credits</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated3DCard>
  );

  const renderNearPrimaryCard = ({ item }: { item: Gym }) => (
    <Animated3DCard disabled className="mr-4 w-64 rounded-3xl opacity-75">
      <View className="rounded-3xl overflow-hidden border" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
        <Image source={{ uri: item.image }} className="h-32 w-full" resizeMode="cover" />
        <View className="p-4">
          <View className="flex-row justify-between items-start">
            <Text className="text-base font-bold flex-1 mr-1" numberOfLines={1} style={{ color: colors.text }}>
              {item.name}
            </Text>
            <Ionicons name="lock-closed" size={16} color={colors.muted} />
          </View>
          
          <Text className="text-[10px] mt-1" numberOfLines={1} style={{ color: colors.muted }}>
            📍 {item.address}
          </Text>

          <View className="mt-3 flex-row justify-between items-center">
            <Text className="text-xs font-medium" style={{ color: colors.muted }}>{item.distance} KM Away</Text>
            <Text className="text-[10px] font-semibold border px-2.5 py-1 rounded-xl" style={{ color: colors.coral, backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.2)' }}>
              🔒 Not Available In Tier
            </Text>
          </View>
        </View>
      </View>
    </Animated3DCard>
  );

  const renderTrialGymCard = ({ item }: { item: TrialGym }) => (
    <Animated3DCard scaleDown={0.96} className="mr-4 w-64 rounded-3xl">
      <View className="rounded-3xl overflow-hidden border shadow-sm" style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.softShadow]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="h-32 w-full" resizeMode="cover" />
        ) : (
          <View className="h-32 w-full items-center justify-center" style={{ backgroundColor: colors.secondaryDark }}>
            <Ionicons name="barbell-outline" size={32} color={colors.muted} />
          </View>
        )}
        <View className="p-4">
          <View className="flex-row justify-between items-start">
            <Text className="text-base font-bold flex-1 mr-1" numberOfLines={1} style={{ color: colors.textLight }}>
              {item.name}
            </Text>
          </View>

          <Text className="text-[10px] mt-1" numberOfLines={1} style={{ color: colors.muted }}>
            📍 {item.area}, {item.city}
          </Text>

          <Text className="text-[10px] mt-2" numberOfLines={2} style={{ color: colors.muted }}>
            {item.description || "Vote to bring this gym to ZonoFit!"}
          </Text>

          <View className="flex-row justify-between items-center mt-3 border-t pt-3" style={{ borderTopColor: colors.secondaryDark }}>
            <Text className="text-xs font-bold" style={{ color: colors.muted }}>{item.voteCount} Votes</Text>
            <Pressable 
              onPress={() => handleVoteTrialGym(item.id)}
              className={`px-4 py-1.5 rounded-xl border active:opacity-80`}
              style={{ 
                backgroundColor: item.hasVoted ? 'rgba(217, 255, 92, 0.1)' : colors.green,
                borderColor: item.hasVoted ? colors.lime : 'transparent' 
              }}
            >
              <Text className="text-xs font-bold" style={{ color: item.hasVoted ? colors.lime : colors.textLight }}>
                {item.hasVoted ? 'Voted ✅' : 'Vote'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated3DCard>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Sticky Search & Discovery Header */}
      <Animated.View entering={FadeInDown.delay(100).springify()} className="px-5 pt-3 pb-4 border-b z-10" style={{ backgroundColor: colors.bg, borderBottomColor: colors.secondary }}>
        <View className="flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-2xl font-bold" style={{ color: colors.text }}>Discover Venues</Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="location" size={14} color={colors.lime} />
              <Text className="text-xs font-semibold ml-1" style={{ color: colors.muted }}>Koramangala, Near Me · 5 KM Radius</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center rounded-2xl border shadow-sm px-4 h-12" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder="Search gym, turf, area or landmark..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-sm font-medium"
            style={{ color: colors.text }}
          />
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Quick Filter Tags (Horizontal List) */}
        <Animated.ScrollView 
          entering={SlideInRight.delay(200).springify()}
          horizontal 
          showsHorizontalScrollIndicator={false}
          bounces={true}
          overScrollMode="never"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
        >
          {filterTags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => setSelectedFilter(tag)}
              className="px-4 py-2 rounded-full mr-2.5 border active:opacity-80"
              style={{
                backgroundColor: selectedFilter === tag ? colors.surfaceDark : colors.surface,
                borderColor: selectedFilter === tag ? 'transparent' : colors.secondary
              }}
            >
              <Text 
                className="text-xs font-bold"
                style={{ color: selectedFilter === tag ? colors.textLight : colors.muted }}
              >
                {tag}
              </Text>
            </Pressable>
          ))}
        </Animated.ScrollView>

        {/* Dynamic Search / Tag Results View */}
        {(searchQuery || selectedFilter !== "All") ? (
          <View className="px-5 mt-4">
            <Text className="text-base font-bold mb-4" style={{ color: colors.text }}>
              Found {getFilteredGyms().length} results
            </Text>
            {getFilteredGyms().map((gym, index) => (
              <Animated.View key={gym.id} entering={FadeInDown.delay(100 + index * 50).springify()}>
                <Animated3DCard onPress={() => router.push(`/gym/${gym.id}` as any)} className="mb-4">
                  <View 
                    className="rounded-3xl overflow-hidden border shadow-sm"
                    style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
                  >
                    <Image source={{ uri: gym.image }} className="h-44 w-full" resizeMode="cover" />
                    <View className="p-4">
                      <View className="flex-row justify-between items-start">
                        <View>
                          <Text className="text-lg font-bold" style={{ color: colors.text }}>{gym.name}</Text>
                          <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>📍 {gym.address}</Text>
                        </View>
                        <View className="flex-row items-center px-2 py-1 rounded-lg border" style={{ backgroundColor: 'rgba(255, 176, 32, 0.1)', borderColor: 'rgba(255, 176, 32, 0.2)' }}>
                          <Ionicons name="star" size={12} color={colors.amber} />
                          <Text className="text-[10px] font-bold ml-1" style={{ color: colors.amber }}>{gym.rating}</Text>
                        </View>
                      </View>

                      <View className="flex-row gap-x-2 mt-2">
                        {gym.tags.map((tag) => (
                          <View key={tag} className="px-2.5 py-0.5 rounded-lg border" style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}>
                            <Text className="text-[10px] font-semibold" style={{ color: colors.muted }}>{tag}</Text>
                          </View>
                        ))}
                      </View>

                      <View className="h-[1px] my-3" style={{ backgroundColor: colors.secondary }} />

                      <View className="flex-row justify-between items-center">
                        <View>
                          <Text className="text-xs font-medium" style={{ color: colors.muted }}>{gym.distance} KM Away</Text>
                          <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>{gym.slots} Slots Left Today</Text>
                        </View>
                        <View className="flex-row items-center gap-x-2">
                          {gym.type === 'turf' || gym.type === 'sports' ? (
                            <Text className="font-bold text-sm" style={{ color: colors.lime }}>₹{gym.cost * 8} Cash</Text>
                          ) : (
                            <Text className="font-bold text-sm" style={{ color: colors.lime }}>⚡ {gym.cost} Credits</Text>
                          )}
                          <Pressable
                            onPress={() => handleOpenBooking(gym)}
                            className="border px-3 py-2.5 rounded-2xl active:opacity-80"
                            style={[{ backgroundColor: colors.lime, borderColor: colors.lime }, styles.neonGlowSm]}
                          >
                            <Text className="font-bold text-xs" style={{ color: colors.bg }}>Book</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                </Animated3DCard>
              </Animated.View>
            ))}
          </View>

        ) : (
          /* Grouped Carousels Layout when not searching */
          <View className="space-y-6 mt-2">
            {/* Vote for New Gyms! */}
            {trialGyms.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).springify()}>
                <View className="px-5 mb-3 flex-row justify-between items-center">
                  <View>
                    <Text className="text-base font-bold" style={{ color: colors.text }}>Vote for Trial Gyms! 🔥</Text>
                    <Text className="text-xs" style={{ color: colors.muted }}>Help us decide where to partner next.</Text>
                  </View>
                </View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  bounces={true}
                  overScrollMode="never"
                  decelerationRate="fast"
                  snapToInterval={272}
                  snapToAlignment="start"
                  disableIntervalMomentum={true}
                  data={trialGyms}
                  renderItem={renderTrialGymCard}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
                />
              </Animated.View>
            )}

            {/* Closest To You */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Text className="text-base font-bold px-5 mb-3" style={{ color: colors.text }}>Closest To You</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                bounces={true}
                overScrollMode="never"
                decelerationRate="fast"
                snapToInterval={272}
                snapToAlignment="start"
                disableIntervalMomentum={true}
                data={closestGyms}
                renderItem={renderGymCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
              />
            </Animated.View>

            {/* Best Value */}
            <Animated.View entering={FadeInDown.delay(500).springify()}>
              <Text className="text-base font-bold px-5 mb-3" style={{ color: colors.text }}>Best Value (Save Credits)</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                bounces={true}
                overScrollMode="never"
                decelerationRate="fast"
                snapToInterval={272}
                snapToAlignment="start"
                disableIntervalMomentum={true}
                data={bestValueGyms}
                renderItem={renderGymCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
              />
            </Animated.View>

            {/* Premium Facilities */}
            <Animated.View entering={FadeInDown.delay(600).springify()}>
              <Text className="text-base font-bold px-5 mb-3" style={{ color: colors.text }}>Premium Facilities</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                bounces={true}
                overScrollMode="never"
                decelerationRate="fast"
                snapToInterval={272}
                snapToAlignment="start"
                disableIntervalMomentum={true}
                data={premiumGyms}
                renderItem={renderGymCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
              />
            </Animated.View>

            {/* Beginner Friendly */}
            <Animated.View entering={FadeInDown.delay(700).springify()}>
              <Text className="text-base font-bold px-5 mb-3" style={{ color: colors.text }}>Beginner Friendly</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                bounces={true}
                overScrollMode="never"
                decelerationRate="fast"
                snapToInterval={272}
                snapToAlignment="start"
                disableIntervalMomentum={true}
                data={beginnerGyms}
                renderItem={renderGymCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
              />
            </Animated.View>

            {/* Near Your Primary Gym (Expansion / Upgrade Discovery) */}
            {nearPrimaryGyms.length > 0 && (
              <Animated.View entering={FadeInDown.delay(800).springify()}>
                <Text className="text-base font-bold px-5 mb-1" style={{ color: colors.text }}>Near Your Primary Gym</Text>
                <Text className="text-xs px-5 mb-3" style={{ color: colors.muted }}>Unlock alternative access by upgrading your membership tier.</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  bounces={true}
                  overScrollMode="never"
                  decelerationRate="fast"
                  snapToInterval={272}
                  snapToAlignment="start"
                  disableIntervalMomentum={true}
                  data={nearPrimaryGyms}
                  renderItem={renderNearPrimaryCard}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
                />
              </Animated.View>
            )}

            {/* All Available Gyms List */}
            <Animated.View entering={FadeInDown.delay(900).springify()} className="px-5">
              <Text className="text-base font-bold mb-3" style={{ color: colors.text }}>All Partner Venues</Text>
              {gyms.map((gym, index) => (
                <Animated3DCard 
                  key={gym.id} 
                  className="mb-4"
                  onPress={() => router.push(`/gym/${gym.id}` as any)}
                >
                  <View 
                    className="rounded-3xl overflow-hidden border shadow-sm"
                    style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
                  >
                    <Image source={{ uri: gym.image }} className="h-40 w-full" resizeMode="cover" />
                    <View className="p-4">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 mr-2">
                          <Text className="text-base font-bold" style={{ color: colors.text }}>{gym.name}</Text>
                          <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>📍 {gym.address}</Text>
                        </View>
                        <View className="flex-row items-center px-2 py-0.5 rounded-lg border" style={{ backgroundColor: 'rgba(255, 176, 32, 0.1)', borderColor: 'rgba(255, 176, 32, 0.2)' }}>
                          <Ionicons name="star" size={12} color={colors.amber} />
                          <Text className="text-[10px] font-bold ml-1" style={{ color: colors.amber }}>{gym.rating}</Text>
                        </View>
                      </View>

                      <View className="flex-row gap-x-2 mt-2">
                        {gym.tags.map((tag) => (
                          <View key={tag} className="px-2.5 py-0.5 rounded-lg border" style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}>
                            <Text className="text-[10px] font-semibold" style={{ color: colors.muted }}>{tag}</Text>
                          </View>
                        ))}
                      </View>

                      <View className="h-[1px] my-3" style={{ backgroundColor: colors.secondary }} />

                      <View className="flex-row justify-between items-center">
                        <View>
                          <Text className="text-xs font-medium" style={{ color: colors.muted }}>{gym.distance} KM Away · {gym.slots} Slots left</Text>
                        </View>
                        <View className="flex-row items-center gap-x-2">
                        {gym.type === 'turf' || gym.type === 'sports' ? (
                          <Text className="font-bold text-sm" style={{ color: colors.lime }}>₹{gym.cost * 8} Cash</Text>
                        ) : (
                          <Text className="font-bold text-sm" style={{ color: colors.lime }}>⚡ {gym.cost} Credits</Text>
                        )}
                          <Pressable
                            onPress={() => handleOpenBooking(gym)}
                            className="border px-3 py-2 rounded-xl active:opacity-80"
                            style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}
                          >
                            <Text className="font-bold text-xs" style={{ color: colors.muted }}>View Gym</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleOpenBooking(gym)}
                            className="px-3 py-2 rounded-xl active:opacity-80"
                            style={[{ backgroundColor: colors.lime }, styles.neonGlowSm]}
                          >
                            <Text className="font-bold text-xs" style={{ color: colors.bg }}>Book</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                </Animated3DCard>
              ))}
            </Animated.View>
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
        <View className="flex-1 justify-end bg-black/80">
          <View className="rounded-t-[36px] p-6" style={{ backgroundColor: colors.bg }}>
            <View className="w-12 h-1.5 rounded-full mb-6 align-self-center mx-auto" style={{ backgroundColor: colors.secondary }} />
            
            <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.lime }}>Confirm Booking</Text>
            <Text className="text-2xl font-bold mt-1" style={{ color: colors.text }}>{selectedGym?.name}</Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>📍 {selectedGym?.address}</Text>

            <View className="h-[1px] my-5" style={{ backgroundColor: colors.secondary }} />

            <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.muted }}>Select Time Slot</Text>
            <View className="flex-row gap-x-3.5 mb-6">
              {["07:00 AM", "10:00 AM", "05:00 PM", "07:00 PM"].map((time) => (
                <Pressable
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  className={`flex-1 py-3 rounded-2xl border text-center items-center justify-center active:scale-[0.95] transition-transform`}
                  style={{
                    backgroundColor: selectedTime === time ? 'rgba(217, 255, 92, 0.1)' : colors.surface,
                    borderColor: selectedTime === time ? colors.lime : colors.secondary
                  }}
                >
                  <Text 
                    className="text-xs font-bold"
                    style={{ color: selectedTime === time ? colors.lime : colors.muted }}
                  >
                    {time}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="rounded-2xl p-4 flex-row justify-between items-center mb-6" style={{ backgroundColor: colors.surface }}>
              <View>
                <Text className="text-xs" style={{ color: colors.muted }}>Cost for this visit</Text>
                <Text className="text-xl font-bold mt-0.5" style={{ color: colors.text }}>⚡ {selectedGym?.cost} Credits</Text>
              </View>
              <View className="align-items-end">
                <Text className="text-sm mb-1" style={{ color: colors.muted }}>Total Cost</Text>
                {selectedGym && (selectedGym.type === 'turf' || selectedGym.type === 'sports') ? (
                  <Text className="text-2xl font-black" style={{ color: colors.lime }}>₹{selectedGym.cost * 8} Cash</Text>
                ) : (
                  <Text className="text-2xl font-black" style={{ color: colors.lime }}>{selectedGym?.cost} Credits</Text>
                )}
              </View>
            </View>

            <View className="flex-row gap-x-4">
              <Pressable
                onPress={() => setBookingModalVisible(false)}
                className="flex-1 h-12 rounded-2xl items-center justify-center border active:opacity-70"
                style={{ backgroundColor: colors.surface, borderColor: colors.secondary }}
              >
                <Text className="font-bold text-sm" style={{ color: colors.text }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmBooking}
                className="flex-1 h-12 rounded-2xl items-center justify-center active:opacity-80"
                style={[{ backgroundColor: colors.lime }, styles.neonGlowSm]}
              >
                <Text className="font-bold text-sm" style={{ color: colors.bg }}>Confirm & Book</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  softShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  neonGlowSm: {
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  }
});