import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  Image, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useUserStore } from "@/store/useUserStore";
import { FALLBACK_NETWORK_GYMS, NetworkGym } from "@/constants/fallbackGyms";
import BookingConfirmedModal from "@/components/BookingConfirmedModal";
import BookingModal from "@/components/BookingModal";

export interface Gym extends NetworkGym {
  images?: string[];
  description?: string;
  openStatus?: string;
}

const GYMS_PER_PAGE = 5;

export default function PartnerGymsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; city?: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const selectedCity = params.city || "Delhi NCR";
  const isUdaipur = selectedCity.toLowerCase() === "udaipur";

  // Require city selection - if accessed without city, forward to city selection
  useEffect(() => {
    if (!params.city) {
      router.replace("/partner-cities" as any);
    }
  }, [params.city]);

  const { bookingStatus } = useBookingStore();
  const { credits, cashBalance, membershipInfo } = useCreditsStore();
  const { isGuest, selectedGymId, selectedGymName, selectGym, endGuestSession } = useGuestStore();
  const { token, user } = useAuthStore();
  const { visitsRemaining } = useUserStore();

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [searchOpen, setSearchOpen] = useState(!!params.q);
  const [currentPage, setCurrentPage] = useState(0);
  const [favoriteGymIds, setFavoriteGymIds] = useState<Set<string>>(new Set());

  // Filter Bar States (matching screenshot)
  const [selectedSort, setSelectedSort] = useState<"distance" | "rating" | "default">("default");
  const [filterRating4Plus, setFilterRating4Plus] = useState(false);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState(false);
  const [selectedArea, setSelectedArea] = useState(isUdaipur ? "Rao Ji Ka Hata" : selectedCity);

  // Booking Modal State
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [confirmedModalVisible, setConfirmedModalVisible] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<{
    gymName: string;
    gymAddress?: string;
    gymImage?: string;
    timeSlot: string;
    isMandatoryVisit?: boolean;
    mandatoryVisitsLeft?: number;
    totalMandatoryVisits?: number;
    creditsDeducted: number;
    remainingCredits: number;
  } | null>(null);

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
            address: g.address || g.city || "Udaipur",
            rating: g.rating || (4.6 + (index % 4) * 0.1),
            distance: g.distanceKm || (0.8 + index * 0.4),
            cost: g.creditCost || 8,
            slots: g.totalSlots || 20,
            image: g.imageUrls?.[0] || FALLBACK_NETWORK_GYMS[index % FALLBACK_NETWORK_GYMS.length]?.image,
            logo: FALLBACK_NETWORK_GYMS[index % FALLBACK_NETWORK_GYMS.length]?.logo || g.imageUrls?.[0],
            tags: Array.isArray(g.facilities) && g.facilities.length > 0 ? g.facilities : ["Strength", "Cardio", "Lockers"],
            type: g.facilities?.includes("Turf") ? "turf" : g.facilities?.includes("Swimming") ? "sports" : "gym",
            isPremium: g.category === "PREMIUM" || index === 2,
            isBeginnerFriendly: true,
            isBestValue: (g.creditCost || 8) <= 6,
            isNearPrimary: false,
            isVerified: true,
            reviewCount: 50 + (index * 19),
            openStatus: "Open Now",
            ambience: index % 2 === 1,
            rank: index < 3 ? index + 1 : undefined,
          }));
          const combined = [
            ...formattedGyms,
            ...FALLBACK_NETWORK_GYMS.filter(fb => !formattedGyms.some(fg => fg.id === fb.id))
          ];
          setGyms(combined);
        } else {
          setGyms(FALLBACK_NETWORK_GYMS);
        }
      } catch {
        setGyms(FALLBACK_NETWORK_GYMS);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    async function loadFavorites() {
      if (!token || isGuest) return;
      try {
        const data = await apiFetch("/api/gyms/favorites", { token, silent: true });
        if (isMounted && Array.isArray(data?.favoriteGymIds)) {
          setFavoriteGymIds(new Set(data.favoriteGymIds));
        } else if (isMounted && Array.isArray(data?.savedGyms)) {
          setFavoriteGymIds(new Set(data.savedGyms.map((g: any) => g.id)));
        }
      } catch {}
    }

    loadGyms();
    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [token, isGuest]);

  // ─── SCROLL POSITION BUG FIX ───
  // Whenever currentPage changes, immediately reset scroll position to top (y: 0)
  // so the user starts fresh at the 1st gym card instead of staying at the bottom.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 40);
    return () => clearTimeout(timer);
  }, [currentPage]);

  // Reset pagination and scroll when search, filters, or city change
  useEffect(() => {
    setCurrentPage(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [searchQuery, selectedSort, filterRating4Plus, filterOpenNow, filterFavoritesOnly, params.city]);

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

    setFavoriteGymIds((prev) => {
      const next = new Set(prev);
      if (next.has(gymId)) next.delete(gymId);
      else next.add(gymId);
      return next;
    });

    if (token) {
      try {
        await apiFetch(`/api/gyms/${gymId}/favorite`, { method: "POST", token });
      } catch {}
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

    const isPrimary = primaryGym && gym.id === primaryGym.id;
    const isMandatory = isPrimary && visitsRemaining > 0;

    if (!isMandatory) {
      const isCashVenue = gym.type === 'turf' || gym.type === 'sports';
      const cashCost = gym.cost * 8;

      if (isCashVenue) {
        if (cashBalance < cashCost) {
          Alert.alert(
            "Insufficient Cash Balance", 
            `This venue requires ₹${cashCost} in cash balance, but you only have ₹${cashBalance} remaining.`
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
    }

    setSelectedGym(gym);
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = async (slotTime?: string, dateIso?: string) => {
    if (!selectedGym) return;
    const timeToUse = slotTime || "07:00 PM";
    const dateToUse = dateIso || new Date().toISOString();
    
    const isPrimary = Boolean(primaryGym && selectedGym.id === primaryGym.id);
    const isMandatory = Boolean(isPrimary && visitsRemaining > 0);

    try {
      const { bookVisit } = useBookingStore.getState();
      const creditsCost = isMandatory ? 0 : (selectedGym.cost || 8);
      await bookVisit(
        selectedGym.id,
        selectedGym.name, 
        dateToUse,
        timeToUse, 
        creditsCost
      );

      const creditsDeducted = isMandatory ? 0 : (selectedGym.cost || 8);
      const remainingCreditsAfter = Math.max(0, credits - creditsDeducted);
      const remainingMandatoryAfter = isMandatory ? Math.max(0, visitsRemaining - 1) : visitsRemaining;

      setConfirmedBookingData({
        gymName: selectedGym.name,
        gymAddress: selectedGym.address,
        gymImage: selectedGym.image,
        timeSlot: timeToUse,
        isMandatoryVisit: Boolean(isMandatory),
        mandatoryVisitsLeft: remainingMandatoryAfter,
        totalMandatoryVisits: membershipInfo?.mandatoryVisits || 10,
        creditsDeducted,
        remainingCredits: remainingCreditsAfter,
      });

      setBookingModalVisible(false);
      setConfirmedModalVisible(true);
    } catch (err: any) {
      Alert.alert("Booking Failed", err.message || "Could not confirm booking.");
    }
  };

  // Primary Gym
  const primaryGymName = (
    membershipInfo?.gymName && 
    membershipInfo.gymName !== "Select a Gym" && 
    membershipInfo.gymName !== "Primary Gym" &&
    membershipInfo.gymName !== "ZonoFit Partner Gym"
  ) ? membershipInfo.gymName : (selectedGymName || user?.primaryGym || null);

  const primaryGym = useMemo(() => {
    if (gyms.length === 0) return null;
    if (selectedGymId) {
      const found = gyms.find((g) => g.id === selectedGymId);
      if (found) return found;
    }
    if (primaryGymName) {
      const found = gyms.find((g) => 
        g.name.toLowerCase() === primaryGymName.toLowerCase() ||
        g.name.toLowerCase().includes(primaryGymName.toLowerCase()) ||
        primaryGymName.toLowerCase().includes(g.name.toLowerCase())
      );
      if (found) return found;
    }
    return gyms[0] || null;
  }, [gyms, selectedGymId, primaryGymName]);

  // Filtered & Sorted Gyms
  const filteredGyms = useMemo(() => {
    let result = [...gyms];

    // Filter by selected City
    const cityTarget = selectedCity.toLowerCase().trim();
    const cityMatches = result.filter((g) => {
      const gCity = (g.city || "").toLowerCase();
      const gAddr = (g.address || "").toLowerCase();
      return gCity === cityTarget || gAddr.includes(cityTarget);
    });

    if (cityMatches.length > 0) {
      result = cityMatches;
    } else {
      const fallbackMatches = FALLBACK_NETWORK_GYMS.filter(
        (g) => (g.city || "").toLowerCase() === cityTarget
      );
      if (fallbackMatches.length > 0) {
        result = fallbackMatches;
      }
    }

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter((g) =>
        g.name.toLowerCase().includes(q) ||
        g.address.toLowerCase().includes(q) ||
        g.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Rating 4.0+
    if (filterRating4Plus) {
      result = result.filter((g) => g.rating >= 4.0);
    }

    // Favorites only
    if (filterFavoritesOnly) {
      result = result.filter((g) => favoriteGymIds.has(g.id));
    }

    // Sort
    if (selectedSort === "distance") {
      result.sort((a, b) => a.distance - b.distance);
    } else if (selectedSort === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [gyms, selectedCity, searchQuery, filterRating4Plus, filterFavoritesOnly, selectedSort, favoriteGymIds]);

  // STRICTLY 5 GYMS PER PAGE
  const totalPages = Math.max(1, Math.ceil(filteredGyms.length / GYMS_PER_PAGE));
  const paginatedGyms = useMemo(() => {
    const start = currentPage * GYMS_PER_PAGE;
    return filteredGyms.slice(start, start + GYMS_PER_PAGE);
  }, [filteredGyms, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  // Ambience Gyms Curated List
  const ambienceGyms = useMemo(() => {
    return gyms.filter(g => g.ambience || g.rating >= 4.8).slice(0, 5);
  }, [gyms]);

  // Ranked Gyms (1, 2, 3)
  const rankedGyms = useMemo(() => {
    const sorted = [...gyms].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    return sorted.slice(0, 3);
  }, [gyms]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* ─── Top Header (Matching Screenshot) ─── */}
      <View style={styles.topNav}>
        {/* Back Button */}
        <Pressable 
          onPress={() => router.back()} 
          style={styles.navBackBtn}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>

        {/* Location / City Title */}
        <Pressable 
          onPress={() => router.push("/partner-cities" as any)}
          style={styles.locationHeaderWrap}
        >
          <Text style={styles.headerSmallLabel}>PARTNER CENTRES IN</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="location-sharp" size={13} color="#EF4444" />
            <Text style={styles.locationTitleText}>{selectedCity}</Text>
            <Ionicons name="chevron-down" size={13} color="#6B7280" />
          </View>
        </Pressable>

        {/* Search Icon */}
        <Pressable 
          onPress={() => setSearchOpen(prev => !prev)}
          style={styles.searchToggleBtn}
          hitSlop={10}
        >
          <Ionicons name={searchOpen ? "close" : "search"} size={21} color="#111827" />
        </Pressable>
      </View>

      {/* ─── Collapsible Search Bar ─── */}
      {searchOpen && (
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              placeholder="Search gym, area, or facility..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ─── Horizontal Filter Pills (Matching Screenshot) ─── */}
      <View style={styles.filterBarContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {/* Sort Chip */}
          <Pressable 
            onPress={() => {
              Alert.alert(
                "Sort Gyms",
                "Choose sort criteria:",
                [
                  { text: "Default (Recommended)", onPress: () => setSelectedSort("default") },
                  { text: "Distance (Nearest First)", onPress: () => setSelectedSort("distance") },
                  { text: "Rating (Highest Rated)", onPress: () => setSelectedSort("rating") },
                  { text: "Cancel", style: "cancel" }
                ]
              );
            }}
            style={[styles.filterChip, selectedSort !== "default" && styles.filterChipActive]}
          >
            <Ionicons name="swap-vertical" size={13} color={selectedSort !== "default" ? "#166534" : "#4B5563"} />
            <Text style={[styles.filterChipText, selectedSort !== "default" && styles.filterChipTextActive]}>
              Sort ▾
            </Text>
          </Pressable>

          {/* Filter Chip */}
          <Pressable 
            onPress={() => {
              Alert.alert(
                "Filter Facilities",
                "Showing partner gyms in " + selectedArea + " with full network access."
              );
            }}
            style={styles.filterChip}
          >
            <Ionicons name="options-outline" size={13} color="#4B5563" />
            <Text style={styles.filterChipText}>Filter ▾</Text>
          </Pressable>

          {/* Rating 4.0+ Chip */}
          <Pressable 
            onPress={() => setFilterRating4Plus(prev => !prev)}
            style={[styles.filterChip, filterRating4Plus && styles.filterChipActive]}
          >
            <Ionicons name="star" size={12} color={filterRating4Plus ? "#166534" : "#F59E0B"} />
            <Text style={[styles.filterChipText, filterRating4Plus && styles.filterChipTextActive]}>
              Rating 4.0+
            </Text>
          </Pressable>

          {/* Open Now Chip */}
          <Pressable 
            onPress={() => setFilterOpenNow(prev => !prev)}
            style={[styles.filterChip, filterOpenNow && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filterOpenNow && styles.filterChipTextActive]}>
              Open ▾
            </Text>
          </Pressable>

          {/* Favorites Heart Pill */}
          <Pressable 
            onPress={() => setFilterFavoritesOnly(prev => !prev)}
            style={[styles.filterChipIconOnly, filterFavoritesOnly && styles.filterChipActive]}
          >
            <Ionicons 
              name={filterFavoritesOnly ? "heart" : "heart-outline"} 
              size={15} 
              color={filterFavoritesOnly ? "#EF4444" : "#4B5563"} 
            />
          </Pressable>
        </ScrollView>
      </View>

      {/* ─── Gym Listing Content (5 per page) ─── */}
      <ScrollView 
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
      >
        {/* ─── PROMINENT UDAIPUR RESTRICTION BANNER OR TRAVEL BANNER ─── */}
        {isUdaipur ? (
          <View style={styles.udaipurBanner}>
            <View style={styles.udaipurBannerRow}>
              <View style={styles.udaipurLockIconCircle}>
                <Ionicons name="lock-closed" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.udaipurBannerTitle}>Home City Network Restriction</Text>
                  <View style={styles.udaipurLockBadge}>
                    <Text style={styles.udaipurLockBadgeText}>LOCKED</Text>
                  </View>
                </View>
                <Text style={styles.udaipurBannerDesc}>
                  You cannot visit any other gym in Udaipur. As per membership policy, network visits within your home city (Udaipur) are restricted to your designated Primary Gym.
                </Text>
                <Text style={styles.udaipurBannerSub}>
                  Want to use credits at partner gyms? Explore our network in other cities like Delhi NCR, Mumbai, or Jaipur when traveling.
                </Text>
                <Pressable 
                  onPress={() => router.push("/partner-cities" as any)}
                  style={styles.changeCityBtn}
                >
                  <Ionicons name="location-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.changeCityBtnText}>Select Another City</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.travelBanner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.travelPlaneCircle}>
                <Ionicons name="airplane" size={16} color="#166534" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.travelBannerTitle}>Visiting {selectedCity}?</Text>
                <Text style={styles.travelBannerDesc}>
                  Book any verified partner centre in {selectedCity} with your credits!
                </Text>
              </View>
              <Pressable 
                onPress={() => router.push("/partner-cities" as any)}
                style={styles.changeCityChip}
              >
                <Text style={styles.changeCityChipText}>Change City</Text>
              </Pressable>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#1F7A3E" />
            <Text style={styles.loadingText}>Loading fitness centres in {selectedCity}...</Text>
          </View>
        ) : filteredGyms.length === 0 ? (
          <View style={styles.centerWrap}>
            <Ionicons name="barbell-outline" size={44} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No matching fitness centres</Text>
            <Text style={styles.emptySubtitle}>Try resetting filters or searching for another area.</Text>
            <Pressable 
              onPress={() => {
                setSearchQuery("");
                setFilterRating4Plus(false);
                setFilterFavoritesOnly(false);
                setSelectedSort("default");
              }}
              style={styles.resetFiltersBtn}
            >
              <Text style={styles.resetFiltersBtnText}>Reset All Filters</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {/* RENDER THE 5 GYMS FOR CURRENT PAGE */}
            {paginatedGyms.map((gym, index) => {
              const isFav = favoriteGymIds.has(gym.id);
              return (
                <React.Fragment key={gym.id}>
                  {/* Gym Card matching screenshot */}
                  <Pressable
                    onPress={() => {
                      if (isUdaipur) {
                        Alert.alert(
                          "Udaipur Restriction",
                          `You cannot visit ${gym.name} in Udaipur. As per policy, local visits are restricted to your Primary Gym. Network credits can be used in other cities (e.g. Delhi NCR, Mumbai, Jaipur) when traveling.`,
                          [
                            { text: "View Details", onPress: () => router.push(`/gym/${gym.id}` as any) },
                            { text: "Select Another City", onPress: () => router.push("/partner-cities" as any) },
                            { text: "Close", style: "cancel" }
                          ]
                        );
                      } else {
                        router.push(`/gym/${gym.id}` as any);
                      }
                    }}
                    style={styles.gymCard}
                  >
                    {/* Big Gym Photo */}
                    <View style={styles.gymImageWrap}>
                      <Image 
                        source={{ uri: gym.image }} 
                        style={styles.gymImage}
                        resizeMode="cover"
                      />
                      {/* Favorite Button on top-right */}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(gym.id);
                        }}
                        style={styles.favIconBtn}
                        hitSlop={8}
                      >
                        <Ionicons 
                          name={isFav ? "heart" : "heart-outline"} 
                          size={20} 
                          color={isFav ? "#EF4444" : "#FFFFFF"} 
                        />
                      </Pressable>
                    </View>

                    {/* Bottom Strip: Circular Logo + Checkmark + Info */}
                    <View style={styles.gymBottomInfo}>
                      {/* Logo with Blue Verified Checkmark */}
                      <View style={styles.logoWrap}>
                        <Image 
                          source={{ uri: gym.logo || gym.image }} 
                          style={styles.logoImg}
                          resizeMode="cover"
                        />
                        {/* Blue Verified Checkmark Badge */}
                        <View style={styles.blueCheckBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#2563EB" />
                        </View>
                      </View>

                      {/* Name & Details */}
                      <View style={styles.gymTextDetails}>
                        <Text style={styles.gymNameText} numberOfLines={1}>
                          {gym.name}
                        </Text>
                        <Text style={styles.gymLocationText} numberOfLines={1}>
                          {gym.address} • {gym.distance ? `${gym.distance.toFixed(2)} km` : "1.42 km"}
                        </Text>
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={styles.ratingScoreText}>
                            {gym.rating?.toFixed(1) || "4.8"}
                          </Text>
                          <Text style={styles.reviewCountText}>
                            ({gym.reviewCount || 50})
                          </Text>
                        </View>
                      </View>

                      {/* Quick Action / Credits Pill */}
                      {isUdaipur ? (
                        <Pressable 
                          onPress={() => Alert.alert(
                            "Udaipur Restriction",
                            "You cannot visit other gyms in Udaipur. Your ZonoFit membership allows local visits only at your designated Primary Gym. Network credits can be used in other cities (e.g. Delhi NCR, Mumbai, Jaipur) when traveling.",
                            [
                              { text: "Got It", style: "cancel" },
                              { text: "Select Another City", onPress: () => router.push("/partner-cities" as any) }
                            ]
                          )}
                          style={styles.lockedPillBtn}
                          hitSlop={6}
                        >
                          <Ionicons name="lock-closed" size={11} color="#DC2626" />
                          <Text style={styles.lockedPillText}>Locked in Udaipur</Text>
                        </Pressable>
                      ) : (
                        <Pressable 
                          onPress={() => handleOpenBooking(gym)}
                          style={styles.bookPillBtn}
                          hitSlop={6}
                        >
                          <Ionicons name="flash" size={11} color="#166534" />
                          <Text style={styles.bookPillText}>{gym.cost || 8} Credits</Text>
                        </Pressable>
                      )}
                    </View>
                  </Pressable>

                  {/* ─── In-Feed Section 1: "Centres with amazing ambience 🪄" (Shown on page 1 after item 3) ─── */}
                  {currentPage === 0 && index === 2 && (
                    <View style={styles.ambienceSection}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>
                          Centres with amazing <Text style={{ color: "#7C3AED" }}>ambience 🪄</Text>
                        </Text>
                      </View>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollContent}
                      >
                        {ambienceGyms.map((aGym) => (
                          <Pressable
                            key={`ambience-${aGym.id}`}
                            onPress={() => router.push(`/gym/${aGym.id}` as any)}
                            style={styles.ambienceCard}
                          >
                            <Image 
                              source={{ uri: aGym.image }} 
                              style={styles.ambienceCardImg}
                              resizeMode="cover"
                            />
                            <View style={styles.ambienceCardBody}>
                              <View style={styles.ambienceLogoRow}>
                                <Image source={{ uri: aGym.logo || aGym.image }} style={styles.ambienceLogo} />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                  <Text style={styles.ambienceGymName} numberOfLines={1}>
                                    {aGym.name}
                                  </Text>
                                  <Text style={styles.ambienceGymSub} numberOfLines={1}>
                                    {aGym.address} • {aGym.distance.toFixed(2)} km
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.ambienceRatingRow}>
                                <Ionicons name="star" size={11} color="#F59E0B" />
                                <Text style={styles.ambienceRatingText}>{aGym.rating.toFixed(1)}</Text>
                                <Text style={styles.ambienceReviewsText}>({aGym.reviewCount || 50})</Text>
                              </View>
                            </View>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </React.Fragment>
              );
            })}

            {/* ─── In-Feed Section 2: "Most visited gym in Rao Ji Ka Hata" (Shown on page 1 after item 5) ─── */}
            {currentPage === 0 && (
              <View style={styles.mostVisitedSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    Most visited gym in {selectedArea}
                  </Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                >
                  {rankedGyms.map((rGym, rIdx) => {
                    const rankNum = rIdx + 1;
                    const rankColor = rankNum === 1 ? "#EF4444" : rankNum === 2 ? "#F97316" : "#10B981";
                    return (
                      <Pressable
                        key={`ranked-${rGym.id}`}
                        onPress={() => router.push(`/gym/${rGym.id}` as any)}
                        style={styles.rankedCard}
                      >
                        {/* Huge outline rank number badge */}
                        <Text style={[styles.rankBigNumber, { color: rankColor }]}>
                          {rankNum}
                        </Text>
                        
                        <View style={styles.rankedCardInner}>
                          <Image source={{ uri: rGym.image }} style={styles.rankedImg} resizeMode="cover" />
                          <View style={styles.rankedBody}>
                            <View style={styles.rankedLogoWrap}>
                              <Image source={{ uri: rGym.logo || rGym.image }} style={styles.rankedLogo} />
                            </View>
                            <Text style={styles.rankedName} numberOfLines={1}>{rGym.name}</Text>
                            <View style={styles.rankedRatingRow}>
                              <Ionicons name="star" size={11} color="#F59E0B" />
                              <Text style={styles.rankedRatingText}>{rGym.rating.toFixed(1)}</Text>
                              <Text style={styles.rankedReviewsText}>({rGym.reviewCount || 1})</Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ─── STRICT 5 PER PAGE PAGINATION CONTROLS ─── */}
            <View style={styles.paginationBox}>
              <Text style={styles.paginationInfoText}>
                Showing {currentPage * GYMS_PER_PAGE + 1}–{Math.min((currentPage + 1) * GYMS_PER_PAGE, filteredGyms.length)} of {filteredGyms.length} centres
              </Text>

              <View style={styles.paginationButtonsRow}>
                {/* Previous Button */}
                <Pressable
                  onPress={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  style={[styles.pageNavBtn, currentPage === 0 && styles.pageNavBtnDisabled]}
                >
                  <Ionicons name="chevron-back" size={16} color={currentPage === 0 ? "#9CA3AF" : "#111827"} />
                  <Text style={[styles.pageNavBtnText, currentPage === 0 && styles.pageNavBtnTextDisabled]}>
                    Previous
                  </Text>
                </Pressable>

                {/* Page Number Pills */}
                <View style={styles.pageNumbersWrap}>
                  {Array.from({ length: totalPages }).map((_, pIdx) => {
                    const isActive = pIdx === currentPage;
                    return (
                      <Pressable
                        key={pIdx}
                        onPress={() => handlePageChange(pIdx)}
                        style={[styles.pageNumberPill, isActive && styles.pageNumberPillActive]}
                      >
                        <Text style={[styles.pageNumberText, isActive && styles.pageNumberTextActive]}>
                          {pIdx + 1}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Next Button */}
                <Pressable
                  onPress={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  style={[styles.pageNavBtn, currentPage >= totalPages - 1 && styles.pageNavBtnDisabled]}
                >
                  <Text style={[styles.pageNavBtnText, currentPage >= totalPages - 1 && styles.pageNavBtnTextDisabled]}>
                    Next
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={currentPage >= totalPages - 1 ? "#9CA3AF" : "#111827"} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── Booking Modal ─── */}
      <BookingModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        onConfirm={handleConfirmBooking}
        gym={selectedGym}
        isPrimaryGym={Boolean(primaryGym && selectedGym?.id === primaryGym.id)}
        visitsRemaining={visitsRemaining}
        mandatoryVisitsTotal={membershipInfo?.mandatoryVisits || 10}
        availableCredits={credits}
        cashBalance={cashBalance}
      />

      {/* ─── Booking Confirmed Modal ─── */}
      {confirmedBookingData && (
        <BookingConfirmedModal
          visible={confirmedModalVisible}
          gymName={confirmedBookingData.gymName}
          gymAddress={confirmedBookingData.gymAddress}
          gymImage={confirmedBookingData.gymImage}
          timeSlot={confirmedBookingData.timeSlot}
          isMandatoryVisit={confirmedBookingData.isMandatoryVisit}
          mandatoryVisitsLeft={confirmedBookingData.mandatoryVisitsLeft}
          totalMandatoryVisits={confirmedBookingData.totalMandatoryVisits}
          creditsDeducted={confirmedBookingData.creditsDeducted}
          remainingCredits={confirmedBookingData.remainingCredits}
          onDone={() => {
            setConfirmedModalVisible(false);
            setConfirmedBookingData(null);
          }}
          onViewPass={() => {
            setConfirmedModalVisible(false);
            setConfirmedBookingData(null);
            router.push("/booking-pass" as any);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  locationHeaderWrap: {
    alignItems: "center",
  },
  headerSmallLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  locationTitleText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  searchToggleBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  filterBarContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  filterChipActive: {
    borderColor: "#166534",
    backgroundColor: "#F0FDF4",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  filterChipTextActive: {
    color: "#166534",
    fontWeight: "700",
  },
  filterChipIconOnly: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  scrollBody: {
    paddingTop: 12,
    paddingBottom: 60,
  },
  centerWrap: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 12,
    fontWeight: "500",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  resetFiltersBtn: {
    marginTop: 16,
    backgroundColor: "#166534",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  resetFiltersBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Gym Card */
  gymCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  gymImageWrap: {
    width: "100%",
    height: 175,
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  gymImage: {
    width: "100%",
    height: "100%",
  },
  favIconBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  gymBottomInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  logoWrap: {
    position: "relative",
    width: 44,
    height: 44,
  },
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
  },
  blueCheckBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  gymTextDetails: {
    flex: 1,
    marginLeft: 10,
  },
  gymNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  gymLocationText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  ratingScoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  reviewCountText: {
    fontSize: 11,
    color: "#64748B",
  },
  bookPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 3,
  },
  bookPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },

  /* In-feed Ambience Section */
  ambienceSection: {
    marginVertical: 10,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  ambienceCard: {
    width: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ambienceCardImg: {
    width: "100%",
    height: 105,
    backgroundColor: "#E2E8F0",
  },
  ambienceCardBody: {
    padding: 10,
  },
  ambienceLogoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ambienceLogo: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  ambienceGymName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  ambienceGymSub: {
    fontSize: 10,
    color: "#64748B",
  },
  ambienceRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 2,
  },
  ambienceRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  ambienceReviewsText: {
    fontSize: 10,
    color: "#64748B",
  },

  /* In-feed Most Visited Section */
  mostVisitedSection: {
    marginVertical: 12,
  },
  rankedCard: {
    width: 155,
    position: "relative",
    paddingTop: 14,
  },
  rankBigNumber: {
    position: "absolute",
    top: -4,
    left: 4,
    fontSize: 32,
    fontWeight: "900",
    zIndex: 10,
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rankedCardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rankedImg: {
    width: "100%",
    height: 90,
  },
  rankedBody: {
    padding: 8,
    alignItems: "flex-start",
  },
  rankedLogoWrap: {
    marginTop: -16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 4,
  },
  rankedLogo: {
    width: 24,
    height: 24,
  },
  rankedName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  rankedRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 2,
  },
  rankedRatingText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  rankedReviewsText: {
    fontSize: 9.5,
    color: "#64748B",
  },

  /* Pagination */
  paginationBox: {
    marginTop: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  paginationInfoText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 10,
  },
  paginationButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  pageNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  pageNavBtnDisabled: {
    opacity: 0.45,
    borderColor: "#E2E8F0",
  },
  pageNavBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  pageNavBtnTextDisabled: {
    color: "#9CA3AF",
  },
  pageNumbersWrap: {
    flexDirection: "row",
    gap: 6,
  },
  pageNumberPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  pageNumberPillActive: {
    backgroundColor: "#166534",
    borderColor: "#166534",
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  pageNumberTextActive: {
    color: "#FFFFFF",
  },
  udaipurBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  udaipurBannerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  udaipurLockIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  udaipurBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#991B1B",
  },
  udaipurLockBadge: {
    backgroundColor: "#DC2626",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  udaipurLockBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  udaipurBannerDesc: {
    fontSize: 11.5,
    color: "#B91C1C",
    marginTop: 4,
    lineHeight: 16.5,
    fontWeight: "500",
  },
  udaipurBannerSub: {
    fontSize: 11,
    color: "#7F1D1D",
    marginTop: 6,
    lineHeight: 15,
    fontWeight: "400",
  },
  changeCityBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#DC2626",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 10,
    gap: 5,
  },
  changeCityBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  travelBanner: {
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  travelPlaneCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  travelBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  travelBannerDesc: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 1,
    fontWeight: "500",
  },
  changeCityChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  changeCityChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#166534",
  },
  lockedPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  lockedPillText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#DC2626",
  },
});
