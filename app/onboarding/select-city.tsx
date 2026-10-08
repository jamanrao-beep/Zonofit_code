import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  TextInput, 
  ScrollView, 
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

const OFFICIAL_EMAIL = "zonofitofficial@gmail.com";

const POPULAR_SUGGESTIONS = [
  "Jaipur",
  "Jodhpur",
  "Kota",
  "Indore",
  "Ahmedabad",
  "Delhi NCR",
  "Mumbai",
];

export default function SelectCityScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState("");
  const [voteCity, setVoteCity] = useState("");
  const [voteContact, setVoteContact] = useState(user?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedCity, setSubmittedCity] = useState("");

  const handleCitySelect = (city: string) => {
    // Navigate directly to choose gym
    router.push("/onboarding/choose-gym");
  };

  const handleVoteSubmit = async () => {
    const cityClean = voteCity.trim();
    if (!cityClean) {
      Alert.alert("City Name Required", "Please enter your city name to vote.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Send to backend endpoint
      await apiFetch("/api/feedback/city-vote", {
        method: "POST",
        body: JSON.stringify({
          city: cityClean,
          contact: voteContact.trim() || undefined,
        }),
      }).catch((err) => console.log("Backend city-vote note:", err?.message));

      // 2. Prepare Mailto link directly to zonofitofficial@gmail.com
      const subject = encodeURIComponent(`Excited for ZonoFit! Please launch in ${cityClean}`);
      const bodyLines = [
        `Hello ZonoFit Team,`,
        ``,
        `I am super excited to workout with ZonoFit and want you to launch in my city!`,
        ``,
        `📍 Requested City: ${cityClean}`,
        voteContact.trim() ? `📞 Contact: ${voteContact.trim()}` : ``,
        ``,
        `Please bring the ZonoFit fitness access network to ${cityClean} soon!`,
        ``,
        `Cheers,`,
        `Fitness Member`
      ].filter(Boolean).join("\n");

      const mailtoUrl = `mailto:${OFFICIAL_EMAIL}?subject=${subject}&body=${encodeURIComponent(bodyLines)}`;

      // Open mail client if supported
      const canOpen = await Linking.canOpenURL(mailtoUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(mailtoUrl).catch(() => null);
      }

      setSubmittedCity(cityClean);
      setShowSuccessModal(true);
      setVoteCity("");
    } catch (e: any) {
      Alert.alert("Error", "Could not submit your vote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSearching = search.trim().length > 0;
  const matchesUdaipur = !isSearching || "udaipur".includes(search.trim().toLowerCase());

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(auth)/profile-details");
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Select City</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
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
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* Quick Notice when searching for another city */}
          {isSearching && !matchesUdaipur && (
            <View style={styles.searchNoticeCard}>
              <View style={styles.searchNoticeHeader}>
                <Ionicons name="sparkles" size={18} color="#D97706" />
                <Text style={styles.searchNoticeTitle}>Not in "{search.trim()}" yet!</Text>
              </View>
              <Text style={styles.searchNoticeBody}>
                We currently operate in Udaipur. Tap below to vote for {search.trim()} and bring ZonoFit there next!
              </Text>
              <Pressable 
                style={styles.quickVoteButton}
                onPress={() => {
                  setVoteCity(search.trim());
                  setSearch("");
                }}
              >
                <Ionicons name="hand-right-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.quickVoteButtonText}>Vote for "{search.trim()}"</Text>
              </Pressable>
            </View>
          )}

          {/* Available Launch City Section */}
          {matchesUdaipur && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Launch City</Text>
              
              {/* Udaipur Single Clean Card */}
              <Pressable 
                style={styles.cityCard} 
                onPress={() => handleCitySelect("Udaipur")}
              >
                <View style={styles.cityIconBox}>
                  <Ionicons name="location" size={22} color="#1F7A3E" />
                </View>

                <View style={styles.cityInfo}>
                  <View style={styles.cityNameRow}>
                    <Text style={styles.cityName}>Udaipur</Text>
                    <View style={styles.liveTag}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveTagText}>Live Now</Text>
                    </View>
                  </View>
                  <Text style={styles.cityDetail}>12 Partner Gyms • The City of Lakes</Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#1F7A3E" />
              </Pressable>
            </View>
          )}

          {/* ======================================================== */}
          {/* SECTION: DON'T HAVE YOUR CITY? VOTE FOR YOUR CITY        */}
          {/* ======================================================== */}
          <View style={styles.voteSection}>
            <View style={styles.voteCard}>
              <Text style={styles.voteTitle}>Don't see your city?</Text>
              <Text style={styles.voteSubtitle}>
                Are you excited to workout with us? Vote for your city and let us know where you want ZonoFit next!
              </Text>

              {/* Quick Suggestion Chips */}
              <Text style={styles.chipsLabel}>Quick Suggestions:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {POPULAR_SUGGESTIONS.map((city) => (
                  <Pressable
                    key={city}
                    style={[
                      styles.chip,
                      voteCity === city && styles.chipActive
                    ]}
                    onPress={() => setVoteCity(city)}
                  >
                    <Text style={[styles.chipText, voteCity === city && styles.chipTextActive]}>
                      {city}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* The Blank: City Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your City Name</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="business-outline" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter city name (e.g. Jaipur, Kota...)"
                    placeholderTextColor="#9CA3AF"
                    value={voteCity}
                    onChangeText={setVoteCity}
                  />
                  {voteCity.length > 0 && (
                    <Pressable onPress={() => setVoteCity("")} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Contact Info (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone or Email (Optional)</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Get notified when we launch in your city"
                    placeholderTextColor="#9CA3AF"
                    value={voteContact}
                    onChangeText={setVoteContact}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Vote & Mail CTA Button */}
              <Pressable
                style={[styles.voteButton, isSubmitting && { opacity: 0.7 }]}
                onPress={handleVoteSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="mail" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.voteButtonText}>Vote & Mail to ZonoFit</Text>
                  </>
                )}
              </Pressable>

              {/* Discreet Email Note */}
              <Text style={styles.emailNote}>
                Mailed directly to {OFFICIAL_EMAIL}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="checkmark-done" size={32} color="#1F7A3E" />
            </View>
            <Text style={styles.modalTitle}>🎉 Vote Received!</Text>
            <Text style={styles.modalMessage}>
              Thank you for letting us know! We have registered your vote for{" "}
              <Text style={{ fontWeight: "700", color: "#111827" }}>{submittedCity}</Text>{" "}
              and emailed it to <Text style={{ fontWeight: "700" }}>{OFFICIAL_EMAIL}</Text>.
            </Text>
            <Text style={styles.modalSubMessage}>
              We are expanding rapidly and will notify you as soon as partner gyms go live in your city!
            </Text>

            <Pressable
              style={styles.modalPrimaryBtn}
              onPress={() => {
                setShowSuccessModal(false);
                handleCitySelect("Udaipur");
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>Explore Udaipur Gyms</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </Pressable>

            <Pressable
              style={styles.modalSecondaryBtn}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalSecondaryBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginLeft: -6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  searchNoticeCard: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  searchNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  searchNoticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  searchNoticeBody: {
    fontSize: 13,
    color: "#B45309",
    lineHeight: 18,
    marginBottom: 12,
  },
  quickVoteButton: {
    backgroundColor: "#D97706",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
  },
  quickVoteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  cityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cityInfo: {
    flex: 1,
  },
  cityNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cityName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  cityDetail: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
    fontWeight: "500",
  },
  voteSection: {
    marginTop: 8,
  },
  voteCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  voteTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  voteSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    marginBottom: 16,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  chipActive: {
    backgroundColor: "#1F7A3E",
    borderColor: "#1F7A3E",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  voteButton: {
    backgroundColor: "#1F7A3E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  voteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  emailNote: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 8,
  },
  modalSubMessage: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 18,
  },
  modalPrimaryBtn: {
    backgroundColor: "#1F7A3E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 12,
    width: "100%",
    marginBottom: 8,
  },
  modalPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalSecondaryBtn: {
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  modalSecondaryBtnText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
});
