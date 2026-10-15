import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Image, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { FALLBACK_NETWORK_GYMS, NetworkGym } from "@/constants/fallbackGyms";

export default function ChooseGymScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Load real network gyms (Udaipur partner gyms prioritized for home city)
  const gymsList = useMemo(() => {
    const udaipurGyms = FALLBACK_NETWORK_GYMS.filter(g => g.city === "Udaipur" || !g.city);
    return udaipurGyms.length > 0 ? udaipurGyms : FALLBACK_NETWORK_GYMS;
  }, []);

  const filteredGyms = useMemo(() => {
    if (!search.trim()) return gymsList;
    const q = search.toLowerCase().trim();
    return gymsList.filter(gym => 
      gym.name.toLowerCase().includes(q) ||
      gym.address.toLowerCase().includes(q) ||
      (gym.city && gym.city.toLowerCase().includes(q)) ||
      (gym.tags && gym.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [gymsList, search]);

  const handleSelectGym = (gym: NetworkGym) => {
    useGuestStore.getState().selectGym(gym.id, gym.name);
    // Navigate to gym details page in onboarding mode
    useAuthStore.getState().setIsViewingOnboardingGym(true);
    router.push({
      pathname: `/gym/${gym.id}`,
      params: {
        name: gym.name,
        rating: String(gym.rating),
        distance: String(gym.distance),
        image: gym.image,
        address: gym.address,
        price: String(gym.membershipPrice || 3000),
      }
    } as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with Progress Bar */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/onboarding/select-city");
            }
          }} 
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: "100%" }]} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Primary Gym</Text>
        <Text style={styles.subtitle}>
          Your Primary Gym is where you'll complete your included monthly workouts.
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by gym name, area, facility..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8} style={{ marginRight: 6 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
          {filteredGyms.map((gym) => (
            <Pressable 
              key={gym.id} 
              style={({ pressed }) => [
                styles.gymCard,
                pressed && { opacity: 0.95, transform: [{ scale: 0.995 }] }
              ]}
              onPress={() => handleSelectGym(gym)}
            >
              {/* Big Gym Photo */}
              <View style={styles.gymImageWrap}>
                <Image 
                  source={{ uri: gym.image }} 
                  style={styles.gymImage} 
                  resizeMode="cover" 
                />
                {/* Floating Highlighted Membership Price Badge */}
                <View style={styles.priceFloatingBadge}>
                  <Text style={styles.priceFloatingText}>
                    ₹{(gym.membershipPrice || 3000).toLocaleString('en-IN')}
                    <Text style={styles.priceFloatingMonth}>/mo</Text>
                  </Text>
                </View>
                {gym.isBestValue && (
                  <View style={styles.topBadge}>
                    <Text style={styles.topBadgeText}>Best Value</Text>
                  </View>
                )}
                {gym.isPremium && (
                  <View style={[styles.topBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.topBadgeText, { color: '#B45309' }]}>Premium</Text>
                  </View>
                )}
              </View>
              
              {/* Bottom Strip: Circular Logo + Blue Verified Checkmark + Info + Select Pill */}
              <View style={styles.gymBottomInfo}>
                {/* Logo with Blue Verified Checkmark */}
                <View style={styles.logoWrap}>
                  <Image 
                    source={{ uri: gym.logo || gym.image }} 
                    style={styles.logoImg} 
                    resizeMode="cover" 
                  />
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
                    {gym.address} • {typeof gym.distance === 'number' ? `${gym.distance.toFixed(2)} km` : gym.distance}
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

                {/* Right Action: Select Pill with Monthly Price */}
                <View style={styles.actionWrap}>
                  <View style={styles.selectPillBtn}>
                    <Text style={styles.selectPillText}>Select</Text>
                    <Ionicons name="chevron-forward" size={12} color="#166534" />
                  </View>
                  <Text style={styles.priceSubtitle}>
                    ₹{(gym.membershipPrice || 3000).toLocaleString('en-IN')}/mo
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}

          {filteredGyms.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={42} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No gyms found</Text>
              <Text style={styles.emptySubtitle}>Try searching for another area or keyword</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 52,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    marginLeft: 12,
    marginRight: 24,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#1F7A3E",
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13.5,
    color: "#6B7280",
    marginBottom: 18,
    lineHeight: 19,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14.5,
    color: "#111827",
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 40,
  },
  gymCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  gymImageWrap: {
    width: "100%",
    height: 185,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  gymImage: {
    width: "100%",
    height: "100%",
  },
  topBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  topBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#166534",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gymBottomInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  logoWrap: {
    position: "relative",
    width: 46,
    height: 46,
  },
  logoImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    marginLeft: 12,
    marginRight: 8,
  },
  gymNameText: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  gymLocationText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
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
  actionWrap: {
    alignItems: "flex-end",
    gap: 4,
  },
  selectPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 4,
  },
  selectPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  priceSubtitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1F7A3E",
  },
  priceFloatingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  priceFloatingText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803D",
  },
  priceFloatingMonth: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});
