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
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }
              ]}
              onPress={() => handleSelectGym(gym)}
            >
              <Image source={{ uri: gym.image }} style={styles.gymImage} resizeMode="cover" />
              
              <View style={styles.gymInfo}>
                <View style={styles.gymHeader}>
                  <Text style={styles.gymName} numberOfLines={1}>{gym.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={11} color="#D97706" />
                    <Text style={styles.ratingText}>{Number(gym.rating).toFixed(1)}</Text>
                  </View>
                </View>
                
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color="#6B7280" />
                  <Text style={styles.gymLocation} numberOfLines={1}>
                    {typeof gym.distance === 'number' ? `${gym.distance} km away` : gym.distance} • {gym.address}
                  </Text>
                </View>
                
                <View style={styles.gymFooter}>
                  <View style={styles.tagsContainer}>
                    {gym.tags.slice(0, 2).map((tag, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.selectButton}>
                    <Text style={styles.selectButtonText}>Select</Text>
                  </View>
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
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gymImage: {
    width: 104,
    height: "100%",
    backgroundColor: "#F3F4F6",
  },
  gymInfo: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  gymHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  gymName: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 6,
    letterSpacing: -0.2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#D97706",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 10,
  },
  gymLocation: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
  gymFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    gap: 5,
  },
  tag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#4B5563",
  },
  selectButton: {
    backgroundColor: "#1F7A3E",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
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
