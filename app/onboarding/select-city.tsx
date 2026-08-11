import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SelectCityScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleCitySelect = (city: string) => {
    // Navigate to next screen: choose gym
    router.push("/onboarding/choose-gym");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Select City</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for city..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Recent Cities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Cities</Text>
          
          <Pressable style={styles.cityRow} onPress={() => handleCitySelect("Bangalore")}>
            <View style={styles.cityIcon}>
              <Ionicons name="location" size={16} color="#1F7A3E" />
            </View>
            <View style={styles.cityInfo}>
              <Text style={styles.cityName}>Bangalore</Text>
              <Text style={styles.cityDetail}>24 Partner Gyms</Text>
            </View>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.cityRow} onPress={() => handleCitySelect("Delhi")}>
            <View style={styles.cityIcon}>
              <Ionicons name="location" size={16} color="#1F7A3E" />
            </View>
            <View style={styles.cityInfo}>
              <Text style={styles.cityName}>Delhi</Text>
              <Text style={styles.cityDetail}>32 Partner Gyms</Text>
            </View>
          </Pressable>
        </View>

        {/* Suggested Cities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Cities</Text>
          
          <View style={styles.suggestedGrid}>
            <Pressable style={styles.suggestedCard} onPress={() => handleCitySelect("Mumbai")}>
              <View style={[styles.suggestedIcon, { backgroundColor: "#FFF7ED" }]}>
                <Ionicons name="business" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.suggestedName}>Mumbai</Text>
            </Pressable>

            <Pressable style={styles.suggestedCard} onPress={() => handleCitySelect("Pune")}>
              <View style={[styles.suggestedIcon, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="business" size={20} color="#6366F1" />
              </View>
              <Text style={styles.suggestedName}>Pune</Text>
            </Pressable>

            <Pressable style={styles.suggestedCard} onPress={() => handleCitySelect("Ahmedabad")}>
              <View style={[styles.suggestedIcon, { backgroundColor: "#FDF2F8" }]}>
                <Ionicons name="business" size={20} color="#EC4899" />
              </View>
              <Text style={styles.suggestedName}>Ahmedabad</Text>
            </Pressable>

            <Pressable style={styles.suggestedCard} onPress={() => handleCitySelect("Hyderabad")}>
              <View style={[styles.suggestedIcon, { backgroundColor: "#F0FDF4" }]}>
                <Ionicons name="business" size={20} color="#22C55E" />
              </View>
              <Text style={styles.suggestedName}>Hyderabad</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Can't find your city? <Text style={styles.linkText}>Bring ZonoFit to Your City</Text>
        </Text>
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
    justifyContent: "space-between",
    paddingHorizontal: 24,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
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
    marginBottom: 32,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  cityIcon: {
    width: 48,
    height: 48,
    backgroundColor: "#F3FAF4",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cityDetail: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  suggestedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  suggestedCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  suggestedName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  footer: {
    paddingVertical: 24,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  linkText: {
    color: "#1F7A3E",
    fontWeight: "700",
  },
});
