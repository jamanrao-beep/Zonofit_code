import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  Alert,
  StatusBar,
  StyleSheet 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SwipeableTabScreen } from "@/components/SwipeableTabScreen";

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = () => {
    router.push("/partner-cities" as any);
  };

  return (
    <SwipeableTabScreen currentTab="explore">
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Explore</Text>
          <Text style={styles.headerSubtitle}>Find experiences, products & more</Text>
        </View>

        {/* Circular Action/Settings Button */}
        <Pressable 
          onPress={() => router.push("/notifications" as any)}
          style={styles.circleBtn}
          hitSlop={8}
        >
          <Ionicons name="settings-outline" size={20} color="#4B5563" />
          <View style={styles.circleBadgeDot} />
        </Pressable>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
      >
        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Search gyms, products, and more..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Growing Together Hero Banner */}
        <View style={styles.bannerCard}>
          {/* Subtle Decorative Background Circles */}
          <View style={styles.circleDecorLarge} />
          <View style={styles.circleDecorSmall} />

          <Text style={styles.bannerTitle}>Growing Together</Text>
          <Text style={styles.bannerSubtitle}>Unlock More, Together!</Text>
          
          <Text style={styles.bannerText}>
            As more members join in your area, we unlock Sports, Studio Classes, Recovery & more for everyone!
          </Text>

          {/* Refer Now CTA */}
          <Pressable 
            onPress={() => router.push("/invite" as any)}
            style={styles.referBtn}
          >
            <Text style={styles.referBtnText}>Refer Now</Text>
          </Pressable>
        </View>

        {/* Section: AVAILABLE TODAY */}
        <Text style={styles.sectionHeader}>AVAILABLE TODAY</Text>

        <View style={styles.availableRow}>
          {/* Partner Gyms Card */}
          <Pressable 
            onPress={() => router.push("/partner-cities" as any)}
            style={styles.featureCard}
          >
            <View style={styles.partnerGymIconWrap}>
              <Ionicons name="barbell" size={24} color="#EA580C" />
            </View>

            <Text style={styles.featureTitle}>Partner Gyms</Text>
            <Text style={styles.featureDescription}>
              Book partner gyms outside your protected area using credits.
            </Text>

            <View style={styles.linkRow}>
              <Text style={styles.linkText}>Explore →</Text>
            </View>
          </Pressable>

          {/* Shop Products Card */}
          <Pressable 
            onPress={() => router.push("/shop" as any)}
            style={styles.featureCard}
          >
            <View style={styles.shopIconWrap}>
              <Ionicons name="bag-handle-outline" size={22} color="#7C3AED" />
            </View>

            <Text style={styles.featureTitle}>Shop Products</Text>
            <Text style={styles.featureDescription}>
              Buy supplements, gear & more with INR.
            </Text>

            <View style={styles.linkRow}>
              <Text style={styles.linkText}>Explore →</Text>
            </View>
          </Pressable>
        </View>

        {/* Section: UNLOCKING IN YOUR AREA */}
        <Text style={styles.sectionHeader}>UNLOCKING IN YOUR AREA</Text>

        {/* Sports Item */}
        <Pressable 
          onPress={() => Alert.alert(
            "Sports Unlocking Soon", 
            "Turf, badminton, cricket, and swimming sports access are coming soon in your area as member count grows!"
          )}
          style={styles.unlockCard}
        >
          <View style={styles.unlockLeft}>
            <View style={styles.unlockIconWrap}>
              <Ionicons name="trophy-outline" size={22} color="#9CA3AF" />
            </View>
            <View>
              <Text style={styles.unlockTitle}>Sports</Text>
              <Text style={styles.unlockSubtitle}>Sports booking coming soon in your area.</Text>
            </View>
          </View>
          <Ionicons name="lock-closed-outline" size={20} color="#10B981" />
        </Pressable>

        {/* Studio Classes Item */}
        <Pressable 
          onPress={() => Alert.alert(
            "Studio Classes Unlocking Soon", 
            "Yoga, Zumba, Boxing & Pilates studio classes are unlocking soon in your area!"
          )}
          style={styles.unlockCard}
        >
          <View style={styles.unlockLeft}>
            <View style={styles.unlockIconWrap}>
              <Ionicons name="fitness-outline" size={22} color="#9CA3AF" />
            </View>
            <View>
              <Text style={styles.unlockTitle}>Studio Classes</Text>
              <Text style={styles.unlockSubtitle}>Yoga, Zumba, Boxing & Pilates unlocking soon.</Text>
            </View>
          </View>
          <Ionicons name="lock-closed-outline" size={20} color="#10B981" />
        </Pressable>
      </ScrollView>
      </SafeAreaView>
    </SwipeableTabScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 2,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  circleBadgeDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F97316",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  bannerCard: {
    backgroundColor: "#146338",
    borderRadius: 24,
    padding: 20,
    position: "relative",
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#146338",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  circleDecorLarge: {
    position: "absolute",
    right: -30,
    bottom: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  circleDecorSmall: {
    position: "absolute",
    right: 40,
    bottom: -70,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#86EFAC",
    marginTop: 4,
  },
  bannerText: {
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 10,
    maxWidth: "82%",
    fontWeight: "400",
  },
  referBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignSelf: "flex-end",
    marginTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  referBtnText: {
    color: "#146338",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 8,
  },
  availableRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  featureCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  partnerGymIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  shopIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: 16,
    minHeight: 48,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  unlockCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  unlockLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  unlockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  unlockTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  unlockSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "400",
  },
});