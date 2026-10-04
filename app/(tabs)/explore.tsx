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
import { FALLBACK_NETWORK_GYMS } from "@/constants/fallbackGyms";
import BookingConfirmedModal from "@/components/BookingConfirmedModal";

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

const GYMS_PER_PAGE = 5;

export default function ExploreScreen() {
  const router = useRouter();
  const { bookVisit, bookingStatus } = useBookingStore();
  const { credits, cashBalance, bookVisitWithCash } = useCreditsStore();
  const { isGuest, selectGym, endGuestSession } = useGuestStore();
  const { token } = useAuthStore();

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [favoriteGymIds, setFavoriteGymIds] = useState<Set<string>>(new Set());

  // Booking modal state
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [selectedTime, setSelectedTime] = useState("07:00 PM");
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [confirmedModalVisible, setConfirmedModalVisible] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<{
    gymName: string;
    gymAddress?: string;
    gymImage?: string;
    timeSlot: string;
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
            openStatus: "Open Now"
          }));
          setGyms(formattedGyms);
        } else {
          setGyms(FALLBACK_NETWORK_GYMS.map((g, idx) => ({
            ...g,
            isVerified: true,
            reviewCount: 80 + idx * 35,
            openStatus: "Open Now"
          })));
        }
      } catch (e: any) {
        setGyms(FALLBACK_NETWORK_GYMS.map((g, idx) => ({
          ...g,
          isVerified: true,
          reviewCount: 80 + idx * 35,
          openStatus: "Open Now"
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

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

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
      const remaining = useCreditsStore.getState().credits;
      setConfirmedBookingData({
        gymName: selectedGym.name,
        gymAddress: selectedGym.address,
        gymImage: selectedGym.image,
        timeSlot: selectedTime,
        creditsDeducted: selectedGym.cost,
        remainingCredits: remaining,
      });
      setBookingModalVisible(false);
      setConfirmedModalVisible(true);
    } else {
      Alert.alert("Booking Error", "Unable to confirm booking. Please check your credit balance or network connection.");
    }
  };

  // Filter gyms based on search
  const filteredGyms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return gyms;
    return gyms.filter((gym) =>
      gym.name.toLowerCase().includes(q) ||
      gym.address.toLowerCase().includes(q) ||
      gym.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [gyms, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredGyms.length / GYMS_PER_PAGE);
  const paginatedGyms = useMemo(() => {
    const start = currentPage * GYMS_PER_PAGE;
    return filteredGyms.slice(start, start + GYMS_PER_PAGE);
  }, [filteredGyms, currentPage]);

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // ─── Gym Card Component ───
  const renderGymCard = (gym: Gym) => {
    const isFav = favoriteGymIds.has(gym.id);
    return (
      <Pressable
        key={gym.id}
        onPress={() => router.push(`/gym/${gym.id}` as any)}
        style={[styles.gymCard]}
      >
        {/* Gym Image */}
        <View style={styles.gymImageWrap}>
          <Image 
            source={{ uri: gym.image }} 
            style={styles.gymImage}
            resizeMode="cover" 
          />
          {/* Verified Badge */}
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
            <Text style={styles.verifiedText}>ZonoFit Partner</Text>
          </View>
          {/* Favorite Button */}
          <Pressable 
            onPress={(e) => {
              e.stopPropagation();
              handleToggleFavorite(gym.id);
            }}
            hitSlop={10}
            style={styles.favButton}
          >
            <Ionicons 
              name={isFav ? "heart" : "heart-outline"} 
              size={18} 
              color={isFav ? "#EF4444" : "#111827"} 
            />
          </Pressable>
        </View>

        {/* Card Content */}
        <View style={styles.gymContent}>
          <View style={styles.gymHeader}>
            <Text style={styles.gymName} numberOfLines={1}>{gym.name}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{gym.rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.gymLocation}>
            <Ionicons name="location-outline" size={13} color="#6B7280" />
            <Text style={styles.gymAddress} numberOfLines={1}>{gym.address}</Text>
          </View>

          {/* Tags */}
          <View style={styles.tagRow}>
            {gym.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Cost & Action Row */}
          <View style={styles.actionRow}>
            <View>
              <Text style={styles.costLabel}>VISIT COST</Text>
              <Text style={styles.costValue}>⚡ {gym.cost} Credits</Text>
            </View>
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => router.push(`/gym/${gym.id}` as any)}
                style={styles.detailsBtn}
              >
                <Text style={styles.detailsBtnText}>View Gym</Text>
              </Pressable>
              <Pressable
                onPress={() => handleOpenBooking(gym)}
                style={styles.bookBtn}
              >
                <Text style={styles.bookBtnText}>Book Visit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>All Partner Gym Centres</Text>
          <Text style={styles.headerSubtitle}>
            {filteredGyms.length} ZonoFit partner {filteredGyms.length === 1 ? "gym" : "gyms"} available
          </Text>
        </View>
        <Pressable 
          onPress={() => router.push("/notifications" as any)}
          style={styles.notifBtn}
        >
          <Ionicons name="notifications-outline" size={20} color="#111827" />
          <View style={styles.notifDot} />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Search gym, area, or facility..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#1F7A3E" />
            <Text style={styles.loadingText}>Discovering partner gyms...</Text>
          </View>
        ) : filteredGyms.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="barbell-outline" size={42} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No matching gyms found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching for another area or gym name.
            </Text>
            <Pressable
              onPress={() => setSearchQuery("")}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Show All Gyms</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {/* Page indicator */}
            <View style={styles.pageInfo}>
              <Text style={styles.pageInfoText}>
                Showing {currentPage * GYMS_PER_PAGE + 1}–{Math.min((currentPage + 1) * GYMS_PER_PAGE, filteredGyms.length)} of {filteredGyms.length}
              </Text>
            </View>

            {/* Gym Cards */}
            {paginatedGyms.map(renderGymCard)}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationWrap}>
                <Pressable
                  onPress={goToPrevPage}
                  disabled={currentPage === 0}
                  style={[
                    styles.pageBtn,
                    currentPage === 0 && styles.pageBtnDisabled
                  ]}
                >
                  <Ionicons 
                    name="chevron-back" 
                    size={18} 
                    color={currentPage === 0 ? "#9CA3AF" : "#1F7A3E"} 
                  />
                  <Text style={[
                    styles.pageBtnText,
                    currentPage === 0 && styles.pageBtnTextDisabled
                  ]}>Previous</Text>
                </Pressable>

                {/* Page dots */}
                <View style={styles.pageDots}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setCurrentPage(i)}
                    >
                      <View style={[
                        styles.pageDot,
                        i === currentPage && styles.pageDotActive
                      ]} />
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={goToNextPage}
                  disabled={currentPage >= totalPages - 1}
                  style={[
                    styles.pageBtn,
                    currentPage >= totalPages - 1 && styles.pageBtnDisabled
                  ]}
                >
                  <Text style={[
                    styles.pageBtnText,
                    currentPage >= totalPages - 1 && styles.pageBtnTextDisabled
                  ]}>Next</Text>
                  <Ionicons 
                    name="chevron-forward" 
                    size={18} 
                    color={currentPage >= totalPages - 1 ? "#9CA3AF" : "#1F7A3E"} 
                  />
                </Pressable>
              </View>
            )}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <Text style={styles.modalTag}>Confirm Booking</Text>
            <Text style={styles.modalTitle}>{selectedGym?.name}</Text>
            <Text style={styles.modalAddress}>📍 {selectedGym?.address}</Text>

            <View style={styles.modalDivider} />

            <Text style={styles.modalSectionTitle}>Select Time Slot</Text>
            <View style={styles.timeSlotRow}>
              {["07:00 AM", "10:00 AM", "05:00 PM", "07:00 PM"].map((time) => (
                <Pressable
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.timeSlotActive
                  ]}
                >
                  <Text style={[
                    styles.timeSlotText,
                    selectedTime === time && styles.timeSlotTextActive
                  ]}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalCostRow}>
              <View>
                <Text style={styles.modalCostLabel}>Available Balance</Text>
                <Text style={styles.modalCostValue}>{credits} Credits</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.modalCostLabel}>Session Cost</Text>
                <Text style={styles.modalCostHighlight}>⚡ {selectedGym?.cost} Credits</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setBookingModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmBooking}
                style={styles.modalConfirmBtn}
              >
                <Text style={styles.modalConfirmText}>Confirm & Book</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Booking Confirmed Modal */}
      <BookingConfirmedModal
        visible={confirmedModalVisible}
        gymName={confirmedBookingData?.gymName || "Fitness Centre"}
        gymAddress={confirmedBookingData?.gymAddress}
        gymImage={confirmedBookingData?.gymImage}
        timeSlot={confirmedBookingData?.timeSlot || "07:00 PM"}
        creditsDeducted={confirmedBookingData?.creditsDeducted || 8}
        remainingCredits={confirmedBookingData?.remainingCredits ?? credits}
        onViewPass={() => {
          setConfirmedModalVisible(false);
          router.push("/scan-modal" as any);
        }}
        onDone={() => {
          setConfirmedModalVisible(false);
          router.replace("/(tabs)" as any);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ─── Header ───
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F97316",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  // ─── Search ───
  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },

  // ─── Loading & Empty States ───
  loadingWrap: {
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 12,
    fontWeight: "500",
  },
  emptyWrap: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    margin: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#1F7A3E",
    borderRadius: 20,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // ─── List Wrapper ───
  listWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pageInfo: {
    paddingVertical: 8,
  },
  pageInfoText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },

  // ─── Gym Card ───
  gymCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  gymImageWrap: {
    height: 170,
    width: "100%",
    position: "relative",
  },
  gymImage: {
    width: "100%",
    height: "100%",
  },
  verifiedBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(31,122,62,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  favButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gymContent: {
    padding: 16,
  },
  gymHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gymName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
  },
  gymLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  gymAddress: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  costValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1F7A3E",
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  detailsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  bookBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1F7A3E",
  },
  bookBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ─── Pagination ───
  paginationWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F7A3E",
  },
  pageBtnTextDisabled: {
    color: "#9CA3AF",
  },
  pageDots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  pageDotActive: {
    width: 20,
    backgroundColor: "#1F7A3E",
  },

  // ─── Modal ───
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTag: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F7A3E",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginTop: 4,
  },
  modalAddress: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  timeSlotRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  timeSlot: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  timeSlotActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  timeSlotTextActive: {
    color: "#065F46",
  },
  modalCostRow: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#F3F4F6",
  },
  modalCostLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalCostValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginTop: 4,
  },
  modalCostHighlight: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1F7A3E",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  modalCancelText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#4B5563",
  },
  modalConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F7A3E",
  },
  modalConfirmText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#FFFFFF",
  },
});