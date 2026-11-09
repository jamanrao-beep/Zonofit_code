import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  Image,
  StyleSheet, 
  ActivityIndicator, 
  Alert 
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { afterPaint } from "@/lib/afterPaint";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useGuestStore } from "@/store/useGuestStore";
import SignOutConfirmModal from "@/components/SignOutConfirmModal";
import { SwipeableTabScreen } from "@/components/SwipeableTabScreen";

function AccordionItem({ 
  title, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={profileStyles.accordionItem}>
      <Pressable onPress={() => setOpen(!open)} style={profileStyles.accordionSummary}>
        <Text style={profileStyles.accordionSummaryText}>{title}</Text>
        <Text style={profileStyles.accordionToggle}>{open ? "–" : "+"}</Text>
      </Pressable>
      {open && <View style={profileStyles.accordionBody}>{children}</View>}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const { 
    planName, 
    membershipStatus, 
    avatarUrl, 
    uploadAvatar, 
    totalWorkouts, 
    primaryGymName 
  } = useUserStore();
  const { isGuest, getHoursRemaining, endGuestSession } = useGuestStore();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [openingRow, setOpeningRow] = useState<string | null>(null);
  const openingLock = React.useRef<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      openingLock.current = null;
      setOpeningRow(null);
    }, [])
  );

  const openRow = (key: string, action: () => void) => {
    if (openingLock.current) return;
    openingLock.current = key;
    setOpeningRow(key);
    afterPaint(action);
  };

  const guestHours = getHoursRemaining();

  const pickImage = async () => {
    if (isGuest) {
      Alert.alert("Account Required", "Please create an account to customize your profile.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingAvatar(true);
      const { success, message } = await uploadAvatar(result.assets[0].uri);
      if (!success) {
        Alert.alert("Upload Failed", message || "Failed to upload profile picture.");
      }
      setUploadingAvatar(false);
    }
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      if (isGuest) {
        await endGuestSession();
      } else {
        await signOut();
      }
      setShowSignOutModal(false);
      router.replace("/intro" as any);
    } catch (err) {
      console.warn("Sign out handler:", err);
      setShowSignOutModal(false);
      router.replace("/intro" as any);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SwipeableTabScreen currentTab="profile">
      <SafeAreaView style={profileStyles.container} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[profileStyles.scrollContent, { paddingBottom: 160 + insets.bottom }]}
        >
          {/* HEADER */}
          <View style={profileStyles.hd}>
            <View>
              <Text style={profileStyles.hdSmall}>
                {isGuest ? "Guest account" : "My account"}
              </Text>
              <Text style={profileStyles.hdTitle}>Profile</Text>
            </View>
            <View style={profileStyles.hdRow}>
              {isGuest ? (
                <View style={profileStyles.pill}>
                  <Ionicons name="time-outline" size={14} color="#8A5A00" />
                  <Text style={profileStyles.pillText}>{guestHours}h left</Text>
                </View>
              ) : (
                <View style={[profileStyles.pill, { backgroundColor: "#E8F4EA", borderColor: "#C6E4CC" }]}>
                  <Ionicons name="shield-checkmark" size={13} color="#1F7A3F" />
                  <Text style={[profileStyles.pillText, { color: "#1F7A3F" }]}>
                    {planName || "Member"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* CARD 1: USER INFO */}
          <View style={[profileStyles.card, profileStyles.userCard]}>
            <Pressable 
              onPress={pickImage} 
              style={profileStyles.avatarWrap}
              disabled={uploadingAvatar}
            >
              {avatarUrl && !isGuest ? (
                <Image 
                  source={{ uri: avatarUrl }} 
                  style={profileStyles.avatarImage} 
                  resizeMode="cover" 
                />
              ) : (
                <View style={profileStyles.avatarCircle}>
                  <Text style={profileStyles.avatarInitial}>
                    {isGuest ? "G" : (user?.username?.[0]?.toUpperCase() || "M")}
                  </Text>
                </View>
              )}

              {uploadingAvatar && (
                <View style={profileStyles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#1F7A3F" />
                </View>
              )}

              {!isGuest && (
                <View style={profileStyles.avatarEditBadge}>
                  <MaterialIcons name="edit" size={12} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            <Text style={profileStyles.userTitle}>
              {isGuest ? "You're browsing as a guest" : (user?.username || "ZonoFit Member")}
            </Text>
            <Text style={profileStyles.userSubtitle}>
              {isGuest
                ? "Create your account to keep your plan, visits and credits."
                : (user?.email || (planName ? `${planName} • Active Membership` : "Active Member"))}
            </Text>

            {isGuest ? (
              <Pressable
                style={profileStyles.btnFull}
                disabled={openingRow === "create"}
                onPress={() => openRow("create", async () => {
                  await endGuestSession();
                  router.replace("/(auth)/create-account");
                })}
              >
                <Text style={profileStyles.btnFullText}>{openingRow === "create" ? "Opening..." : "Create Account"}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={profileStyles.btnFull}
                disabled={openingRow === "invite"}
                onPress={() => openRow("invite", () => router.push("/invite" as any))}
              >
                <Text style={profileStyles.btnFullText}>{openingRow === "invite" ? "Opening..." : "Invite Friends & Earn Credits"}</Text>
              </Pressable>
            )}
          </View>

          {/* CARD 2: POLICIES & SUPPORT ACCORDION */}
          <View style={[profileStyles.card, { paddingHorizontal: 18, paddingVertical: 6 }]}>
            <AccordionItem title="Refund policy" defaultOpen={true}>
              <Text style={profileStyles.accordionBodyText}>
                Honest details = full protection. If you were a prior member of your selected gym, refunds can be capped at 50%.
              </Text>
            </AccordionItem>

            <AccordionItem title="Help & support">
              <Text style={profileStyles.accordionBodyText}>
                Talk to us anytime from the Help section after you activate, or reach out to support@zonofit.com.
              </Text>
            </AccordionItem>

            {!isGuest && (
              <>
                <AccordionItem title="Membership details">
                  <Text style={profileStyles.accordionBodyText}>
                    Plan: {planName || "Standard Plan"}{"\n"}
                    Status: {membershipStatus || "Active"}{"\n"}
                    Primary Gym: {primaryGymName || "Partner Gym"}{"\n"}
                    Completed Workouts: {totalWorkouts || 0}
                  </Text>
                </AccordionItem>

                <AccordionItem title="Booking & credit rules">
                  <Text style={profileStyles.accordionBodyText}>
                    1 Credit = ₹10 fitness value. Visits must be booked before entry. Credits remain active with your membership and unspent credits convert to an INR wallet at expiration.
                  </Text>
                </AccordionItem>
              </>
            )}
          </View>

          {/* CARD 3: ACCOUNT & SESSION ACTIONS */}
          <View style={profileStyles.card}>
            <Text style={[profileStyles.lab, { marginBottom: 12 }]}>Account</Text>

            {!isGuest && (
              <>
                <Pressable
                  onPress={() => openRow("history", () => router.push("/booking-history"))}
                  disabled={openingRow === "history"}
                  style={profileStyles.menuRow}
                >
                  <View style={profileStyles.menuIconWrap}>
                    <Ionicons name="calendar-outline" size={18} color="#0F2417" />
                  </View>
                  <Text style={profileStyles.menuText}>{openingRow === "history" ? "Opening..." : "Booking History"}</Text>
                  <MaterialIcons name="chevron-right" size={20} color="#66756B" />
                </Pressable>

                <Pressable
                  onPress={() => openRow("credits", () => router.push("/(tabs)/credits" as any))}
                  disabled={openingRow === "credits"}
                  style={profileStyles.menuRow}
                >
                  <View style={profileStyles.menuIconWrap}>
                    <Ionicons name="wallet-outline" size={18} color="#0F2417" />
                  </View>
                  <Text style={profileStyles.menuText}>{openingRow === "credits" ? "Opening..." : "Credits & Wallet"}</Text>
                  <MaterialIcons name="chevron-right" size={20} color="#66756B" />
                </Pressable>

                <Pressable
                  onPress={() => openRow("refer", () => router.push("/invite" as any))}
                  disabled={openingRow === "refer"}
                  style={profileStyles.menuRow}
                >
                  <View style={profileStyles.menuIconWrap}>
                    <Ionicons name="gift-outline" size={18} color="#1F7A3F" />
                  </View>
                  <Text style={profileStyles.menuText}>{openingRow === "refer" ? "Opening..." : "Refer & Earn"}</Text>
                  <MaterialIcons name="chevron-right" size={20} color="#66756B" />
                </Pressable>
              </>
            )}

            {isGuest && (
              <Pressable
                disabled={openingRow === "signin"}
                onPress={() => openRow("signin", async () => {
                  await endGuestSession();
                  router.replace("/(auth)/create-account");
                })}
                style={profileStyles.menuRow}
              >
                <View style={profileStyles.menuIconWrap}>
                  <Ionicons name="log-in-outline" size={18} color="#0F2417" />
                </View>
                <Text style={profileStyles.menuText}>{openingRow === "signin" ? "Opening..." : "Sign In to Existing Account"}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#66756B" />
              </Pressable>
            )}

            <Pressable
              onPress={() => setShowSignOutModal(true)}
              style={[profileStyles.menuRow, { borderBottomWidth: 0, marginTop: 4 }]}
            >
              <View style={[profileStyles.menuIconWrap, { backgroundColor: "#FDE9E7" }]}>
                <Ionicons name="log-out-outline" size={18} color="#B3261E" />
              </View>
              <Text style={[profileStyles.menuText, { color: "#B3261E" }]}>
                {isGuest ? "Exit Guest Mode" : "Sign Out"}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#B3261E" />
            </Pressable>
          </View>
        </ScrollView>

        <SignOutConfirmModal
          visible={showSignOutModal}
          isGuest={isGuest}
          loading={isSigningOut}
          onConfirm={handleConfirmSignOut}
          onCancel={() => setShowSignOutModal(false)}
        />
      </SafeAreaView>
    </SwipeableTabScreen>
  );
}

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8F5",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  hd: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  hdSmall: {
    color: "#66756B",
    fontSize: 14,
    fontWeight: "400",
  },
  hdTitle: {
    color: "#0F2417",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.6,
    marginTop: 2,
  },
  hdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#F0D58A",
    backgroundColor: "#FFF4D9",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  pillText: {
    color: "#8A5A00",
    fontSize: 13,
    fontWeight: "700",
  },

  // CARDS
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E9E0",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    shadowColor: "rgba(15,36,23,0.08)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 2,
  },
  userCard: {
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 18,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#1F7A3F",
    fontSize: 28,
    fontWeight: "700",
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1F7A3F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F2417",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  userSubtitle: {
    fontSize: 14,
    color: "#66756B",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  btnFull: {
    width: "100%",
    height: 52,
    borderRadius: 9999,
    backgroundColor: "#1F7A3F",
    alignItems: "center",
    justifyContent: "center",
  },
  btnFullText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  // ACCORDIONS
  accordionItem: {
    borderTopWidth: 1,
    borderTopColor: "#E3E9E0",
    paddingVertical: 12,
  },
  accordionSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accordionSummaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F2417",
    flex: 1,
  },
  accordionToggle: {
    fontSize: 18,
    color: "#66756B",
    fontWeight: "500",
  },
  accordionBody: {
    marginTop: 8,
  },
  accordionBodyText: {
    fontSize: 13.5,
    color: "#66756B",
    lineHeight: 19,
  },

  // MENU
  lab: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#66756B",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E3E9E0",
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F6F8F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "600",
    color: "#0F2417",
  },
});