import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Image, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const GYMS = [
  {
    id: "g1",
    name: "FitZone Pro",
    rating: "4.8",
    distance: "2.4 km away",
    area: "HSR Layout",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "g2",
    name: "PowerHouse Elite",
    rating: "4.9",
    distance: "3.1 km away",
    area: "Koramangala",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "g3",
    name: "Iron Paradise",
    rating: "4.7",
    distance: "4.5 km away",
    area: "Indiranagar",
    image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=400",
  },
];

export default function ChooseGymScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSelectGym = (gymId: string) => {
    // In a real app, we would store this selection in the auth store or pass as params
    // Then navigate to order summary (skipping plan selection as per mockup)
    router.push("/onboarding/order-summary");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with Progress Bar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: "100%" }]} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Primary Gym</Text>
        <Text style={styles.subtitle}>Your Primary Gym is where you'll complete most of your workouts.</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gyms..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.filterButton}>
            <Ionicons name="options" size={20} color="#111827" />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
          {GYMS.map((gym) => (
            <View key={gym.id} style={styles.gymCard}>
              <Image source={{ uri: gym.image }} style={styles.gymImage} />
              
              <View style={styles.gymInfo}>
                <View style={styles.gymHeader}>
                  <Text style={styles.gymName} numberOfLines={1}>{gym.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingText}>{gym.rating}</Text>
                  </View>
                </View>
                
                <Text style={styles.gymLocation}>
                  {gym.distance} • {gym.area}
                </Text>
                
                <View style={styles.gymFooter}>
                  <View style={styles.tagsContainer}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>Cardio</Text>
                    </View>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>Strength</Text>
                    </View>
                  </View>
                  
                  <Pressable 
                    style={styles.selectButton}
                    onPress={() => handleSelectGym(gym.id)}
                  >
                    <Text style={styles.selectButtonText}>Select</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
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
    paddingHorizontal: 24,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginLeft: -8,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    marginLeft: 16,
    marginRight: 32,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#1F7A3E",
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  filterButton: {
    padding: 8,
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
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gymImage: {
    width: 100,
    height: "100%",
    backgroundColor: "#F3F4F6",
  },
  gymInfo: {
    flex: 1,
    padding: 16,
  },
  gymHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  gymName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
    marginLeft: 4,
  },
  gymLocation: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 12,
  },
  gymFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    gap: 6,
  },
  tag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
  },
  selectButton: {
    backgroundColor: "#1F7A3E",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
