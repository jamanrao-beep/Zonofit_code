import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PARTNER_CITIES, PartnerCity } from "@/constants/fallbackGyms";

export default function PartnerCitiesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredCities = PARTNER_CITIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.state.toLowerCase().includes(search.toLowerCase()) ||
    c.tagline.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCity = (city: PartnerCity) => {
    router.push(`/partner-gyms?city=${encodeURIComponent(city.name)}` as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* ─── Top Header ─── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Select City</Text>
          <Text style={styles.headerSubtitle}>
            Choose where you want to workout today
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
      >
        {/* ─── Search Bar ─── */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color="#9CA3AF" />
          <TextInput
            placeholder="Search city (e.g. Delhi NCR, Mumbai, Udaipur...)"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* ─── Notice Banner ─── */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="airplane" size={18} color="#1F7A3E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>Visiting Another City?</Text>
            <Text style={styles.infoBannerText}>
              Your ZonoFit credits give you instant booking access across partner gyms nationwide.
            </Text>
          </View>
        </View>

        {/* ─── Cities Section ─── */}
        <Text style={styles.sectionHeading}>PARTNER NETWORK CITIES</Text>

        <View style={styles.citiesList}>
          {filteredCities.map((city) => {
            const isUdaipur = city.name.toLowerCase() === "udaipur";

            return (
              <Pressable
                key={city.id}
                onPress={() => handleSelectCity(city)}
                style={styles.cityCard}
              >
                {/* City Photo Thumbnail */}
                <Image
                  source={{ uri: city.image }}
                  style={styles.cityThumb}
                  resizeMode="cover"
                />

                {/* City Info */}
                <View style={styles.cityInfoWrap}>
                  <View style={styles.cityNameRow}>
                    <Text style={styles.cityName}>{city.name}</Text>
                    {isUdaipur ? (
                      <View style={styles.restrictedBadge}>
                        <Ionicons name="lock-closed" size={11} color="#DC2626" />
                        <Text style={styles.restrictedBadgeText}>Restricted</Text>
                      </View>
                    ) : (
                      <View style={styles.activeBadge}>
                        <Ionicons name="flash" size={11} color="#1F7A3E" />
                        <Text style={styles.activeBadgeText}>Credits</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.cityState}>
                    {city.state} • {city.centresCount}+ Centres
                  </Text>

                  <Text
                    style={[
                      styles.cityTagline,
                      isUdaipur && styles.cityTaglineRestricted,
                    ]}
                    numberOfLines={1}
                  >
                    {city.tagline}
                  </Text>
                </View>

                {/* Arrow */}
                <View style={styles.arrowWrap}>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
              </Pressable>
            );
          })}
        </View>

        {filteredCities.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="business-outline" size={38} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No matching city found</Text>
            <Text style={styles.emptySub}>
              We are expanding to more cities soon!
            </Text>
          </View>
        )}
      </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B5E20",
  },
  infoBannerText: {
    fontSize: 11,
    color: "#2E7D32",
    marginTop: 2,
    lineHeight: 16,
    fontWeight: "500",
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  citiesList: {
    gap: 12,
  },
  cityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cityThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  cityInfoWrap: {
    flex: 1,
    marginLeft: 14,
  },
  cityNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 6,
  },
  cityName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1F7A3E",
  },
  restrictedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  restrictedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },
  cityState: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  cityTagline: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 3,
    fontWeight: "400",
  },
  cityTaglineRestricted: {
    color: "#DC2626",
    fontWeight: "600",
  },
  arrowWrap: {
    paddingRight: 4,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
});
