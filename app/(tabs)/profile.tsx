import React, { useState, useCallback, useRef } from "react";
import { 
  Image, 
  Text, 
  View, 
  Pressable, 
  ActivityIndicator, 
  ScrollView, 
  Alert, 
  StyleSheet 
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { afterPaint } from "@/lib/afterPaint";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useGuestStore } from "@/store/useGuestStore";
import { colors } from "@/constants/colors";
import SignOutConfirmModal from "@/components/SignOutConfirmModal";
import { SwipeableTabScreen } from "@/components/SwipeableTabScreen";

function AccordionItem({ 
  title, 
  children, 
  defaultOpen = false,
  isLast = false
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  isLast?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={[profileStyles.accordionItem, isLast && { borderBottomWidth: 0 }]}>
      <Pressable onPress={() => setOpen(!open)} style={profileStyles.accordionSummary}>
        <Text style={profileStyles.accordionSummaryText}>{title}</Text>
        <Text style={profileStyles.accordionToggle}>{open ? "–" : "+"}</Text>
      </Pressable>
      {open && <View style={profileStyles.accordionBody}>{children}</View>}
    </View>
  );
}

interface NavRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
  showChevron?: boolean;
  isLast?: boolean;
  isOpening?: boolean;
}

const NavRow = ({ 
  icon, 
  label, 
  value, 
  onPress, 
  color = "#66756B", 
  showChevron = true, 
  isLast = false,
  isOpening = false,
}: NavRowProps) => (
  <Pressable
    onPress={onPress}
    className={`flex-row items-center justify-between py-3.5 ${isLast ? "" : "border-b"}`}
    style={[
      !isLast ? { borderBottomColor: "#E3E9E0" } : undefined,
      isOpening ? { opacity: 0.6 } : undefined,
    ]}
  >
    <View className="flex-row items-center gap-x-3 flex-1 min-w-0 mr-2">
      <View 
        className="w-9 h-9 rounded-xl items-center justify-center border flex-shrink-0" 
        style={{ backgroundColor: "#F6F8F5", borderColor: "#E3E9E0" }}
      >
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <Text className="text-sm font-semibold flex-1" numberOfLines={1} style={{ color: "#0F2417" }}>
        {label}
      </Text>
    </View>
    <View className="flex-row items-center gap-x-1 flex-shrink-0 max-w-[50%]">
      {value ? (
        <Text className="text-xs mr-1" numberOfLines={1} style={{ color: "#66756B" }}>
          {value}
        </Text>
      ) : null}
      {showChevron && <MaterialIcons name="chevron-right" size={18} color="#66756B" />}
    </View>
  </Pressable>
);

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded, signOut } = useAuthStore();
  const { 
    planName, 
    membershipStatus, 
    streak, 
    totalWorkouts, 
    avatarUrl, 
    uploadAvatar, 
    memberSince, 
    identityStage 
  } = useUserStore();
  const { credits } = useCreditsStore();
  const { isGuest, getHoursRemaining, endGuestSession } = useGuestStore();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [openingRow, setOpeningRow] = useState<string | null>(null);
  const openingLock = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
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

  if (!isLoaded && !isGuest) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F8F5", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1F7A3F" />
      </SafeAreaView>
    );
  }

  const guestHours = getHoursRemaining();
  const formattedMemberSince = isGuest 
    ? "Temporary" 
    : memberSince 
      ? (memberSince.toLowerCase().includes("member") ? memberSince : `Member since ${memberSince}`) 
      : "Member";

  return (
    <SwipeableTabScreen currentTab="profile">
      <SafeAreaView style={profileStyles.container} edges={["top"]}>
        {/* Header */}
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

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          bounces={true} 
          overScrollMode="never" 
          contentContainerStyle={[profileStyles.scrollContent, { paddingBottom: 160 + insets.bottom }]}
        >
          {/* Guest Mode Callout */}
          {isGuest && (
            <View style={profileStyles.guestCallout}>
              <View style={profileStyles.guestCalloutTop}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="sparkles" size={16} color="#059669" />
                  <Text style={profileStyles.guestCalloutTitle}>Guest Mode Active</Text>
                </View>
                <View style={profileStyles.guestCalloutPill}>
                  <Text style={profileStyles.guestCalloutPillText}>{guestHours}h Left</Text>
                </View>
              </View>
              <Text style={profileStyles.guestCalloutSub}>
                You are exploring ZonoFit with temporary guest access. Create a permanent account to unlock booking, check-ins, and credits.
              </Text>
              <Pressable 
                onPress={async () => {
                  await endGuestSession();
                  router.replace("/(auth)/create-account");
                }}
                style={profileStyles.guestCalloutBtn}
              >
                <Text style={profileStyles.guestCalloutBtnText}>Create Full Account</Text>
              </Pressable>
            </View>
          )}

          {/* CARD 1: USER PROFILE HERO (CLEAN WHITE CARD STYLE AS REFERENCED) */}
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
                  <MaterialIcons name="edit" size={13} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            <Text style={profileStyles.userTitle}>
              {isGuest ? "Guest Explorer" : (user?.username ? user.username.toUpperCase() : "ZONOFIT MEMBER")}
            </Text>
            <Text style={profileStyles.userSubtitle}>
              {isGuest
                ? "48-Hour Exploration Session"
                : (user?.email || user?.phone || "Active Member")}
            </Text>

            {/* Badges */}
            <View style={profileStyles.userBadgeRow}>
              <View style={profileStyles.planPill}>
                <Text style={profileStyles.planPillText}>
                  {isGuest ? "Guest Pass" : (planName || "Monthly Membership")}
                </Text>
              </View>
              <View style={profileStyles.sincePill}>
                <Text style={profileStyles.sincePillText}>
                  {formattedMemberSince}
                </Text>
              </View>
            </View>

            {/* Quick stats row */}
            <View style={profileStyles.userStatsRow}>
              <View style={profileStyles.userStatItem}>
                <Text style={profileStyles.userStatVal}>{isGuest ? "-" : totalWorkouts}</Text>
                <Text style={profileStyles.userStatLab}>Total Visits</Text>
              </View>
              <View style={profileStyles.userStatDivider} />
              <View style={profileStyles.userStatItem}>
                <Text style={profileStyles.userStatVal}>{isGuest ? "-" : streak}</Text>
                <Text style={profileStyles.userStatLab}>Day Streak</Text>
              </View>
              <View style={profileStyles.userStatDivider} />
              <View style={profileStyles.userStatItem}>
                <Text style={[profileStyles.userStatVal, { color: "#1F7A3F" }]}>{isGuest ? "-" : credits}</Text>
                <Text style={profileStyles.userStatLab}>Credits</Text>
              </View>
            </View>

            {/* Primary Action Button (White Card Feature) */}
            {isGuest ? (
              <Pressable
                style={profileStyles.btnFull}
                disabled={openingRow === "create"}
                onPress={() => openRow("create", async () => {
                  await endGuestSession();
                  router.replace("/(auth)/create-account");
                })}
              >
                <Text style={profileStyles.btnFullText}>
                  {openingRow === "create" ? "Opening..." : "Create Full Account"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={profileStyles.btnFull}
                disabled={openingRow === "invite"}
                onPress={() => openRow("invite", () => router.push("/invite"))}
              >
                <Ionicons name="gift-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={profileStyles.btnFullText}>
                  {openingRow === "invite" ? "Opening..." : "Invite Friends & Earn Credits"}
                </Text>
                <View style={profileStyles.btnBadge}>
                  <Text style={profileStyles.btnBadgeText}>+5</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* CARD 2: POLICIES & INFORMATION ACCORDION (REFERENCED ACCORDION) */}
          <View style={[profileStyles.card, { paddingHorizontal: 18, paddingVertical: 6 }]}>
            <AccordionItem title="Refund policy" defaultOpen={false}>
              <Text style={profileStyles.accordionBodyText}>
                Honest details = full protection. If you were a prior member of your selected gym, refunds can be capped at 50%.
              </Text>
              <Pressable 
                onPress={() => openRow("refund", () => router.push({ 
                  pathname: "/content", 
                  params: { type: "refund_policy", title: "Refund & Cancellation" } 
                }))}
                style={profileStyles.accordionLink}
              >
                <Text style={profileStyles.accordionLinkText}>View full refund policy ›</Text>
              </Pressable>
            </AccordionItem>

            <AccordionItem title="Help & support">
              <Text style={profileStyles.accordionBodyText}>
                Talk to us anytime or reach out to support@zonofit.com. Need immediate guidance?
              </Text>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
                <Pressable 
                  onPress={() => openRow("faq", () => router.push({ 
                    pathname: "/content", 
                    params: { type: "faq_general", title: "General FAQ" } 
                  }))}
                >
                  <Text style={profileStyles.accordionLinkText}>General FAQ ›</Text>
                </Pressable>
                <Pressable 
                  onPress={() => openRow("announcements", () => router.push({ 
                    pathname: "/content", 
                    params: { type: "app_announcement", title: "Announcements" } 
                  }))}
                >
                  <Text style={profileStyles.accordionLinkText}>Announcements ›</Text>
                </Pressable>
              </View>
            </AccordionItem>

            <AccordionItem title="Membership details">
              <Text style={profileStyles.accordionBodyText}>
                Plan: {isGuest ? "Guest Pass" : (planName || "Monthly Membership")}{"\n"}
                Status: {isGuest ? "Temporary (48h)" : (membershipStatus || "Active")}{"\n"}
                Completed Workouts: {isGuest ? 0 : (totalWorkouts || 0)}
              </Text>
            </AccordionItem>

            <AccordionItem title="Booking & credit rules" isLast={true}>
              <Text style={profileStyles.accordionBodyText}>
                1 Credit = ₹10 fitness value. Visits must be booked before entry. Credits remain active with your membership and unspent credits convert to an INR wallet at expiration.
              </Text>
            </AccordionItem>
          </View>

          {/* CARD 3: FITNESS */}
          <Text style={profileStyles.sectionLab}>Fitness</Text>
          <View style={[profileStyles.card, { paddingHorizontal: 16, paddingVertical: 4 }]}>
            <NavRow
              icon="timeline"
              label="My Journey"
              value={isGuest ? "Locked" : (identityStage || "Beginner")}
              isOpening={openingRow === "journey"}
              onPress={() => openRow("journey", () => router.push("/journey"))}
            />
            <NavRow
              icon="calendar-today"
              label="Booking History"
              isOpening={openingRow === "booking-history"}
              onPress={() => openRow("booking-history", () => router.push("/booking-history"))}
            />
            <NavRow
              icon="explore"
              label="Discover Gyms"
              isLast={true}
              isOpening={openingRow === "explore"}
              onPress={() => openRow("explore", () => router.push("/explore"))}
            />
          </View>

          {/* CARD 4: WALLET & ORDERS */}
          <Text style={profileStyles.sectionLab}>Wallet & Orders</Text>
          <View style={[profileStyles.card, { paddingHorizontal: 16, paddingVertical: 4 }]}>
            <NavRow
              icon="account-balance-wallet"
              label="Credits & Wallet"
              value={isGuest ? "Locked" : `${credits} Credits`}
              isOpening={openingRow === "credits"}
              onPress={() => openRow("credits", () => router.push("/credits"))}
            />
            <NavRow
              icon="receipt-long"
              label="My Orders"
              isLast={true}
              isOpening={openingRow === "orders"}
              onPress={() => openRow("orders", () => router.push("/shop/orders" as any))}
            />
          </View>

          {/* CARD 5: OPPORTUNITIES (COMING SOON FEATURE PAGES) */}
          <Text style={profileStyles.sectionLab}>Opportunities</Text>
          <View style={[profileStyles.card, { paddingHorizontal: 16, paddingVertical: 4 }]}>
            <NavRow
              icon="accessibility-new"
              label="Become a Trainer"
              value="Coming Soon"
              isOpening={openingRow === "trainer"}
              onPress={() => openRow("trainer", () => router.push("/tools/trainer-program" as any))}
            />
            <NavRow
              icon="people-outline"
              label="Become a Gym Buddy"
              value="Coming Soon"
              isLast={true}
              isOpening={openingRow === "buddy"}
              onPress={() => openRow("buddy", () => router.push("/tools/buddy-program" as any))}
            />
          </View>

          {/* CARD 6: LEGAL & POLICIES */}
          <Text style={profileStyles.sectionLab}>Legal & Support</Text>
          <View style={[profileStyles.card, { paddingHorizontal: 16, paddingVertical: 4 }]}>
            <NavRow
              icon="notifications-none"
              label="Notifications"
              isOpening={openingRow === "notifications"}
              onPress={() => openRow("notifications", () => router.push("/notifications" as any))}
            />
            <NavRow
              icon="description"
              label="Terms & Conditions"
              isOpening={openingRow === "terms"}
              onPress={() => openRow("terms", () => router.push({ 
                pathname: "/content", 
                params: { type: "terms_and_conditions", title: "Terms & Conditions" } 
              }))}
            />
            <NavRow
              icon="privacy-tip"
              label="Privacy Policy"
              isOpening={openingRow === "privacy"}
              onPress={() => openRow("privacy", () => router.push({ 
                pathname: "/content", 
                params: { type: "privacy_policy", title: "Privacy Policy" } 
              }))}
            />
            <NavRow
              icon="info-outline"
              label="Disclaimer"
              isOpening={openingRow === "disclaimer"}
              onPress={() => openRow("disclaimer", () => router.push({ 
                pathname: "/content", 
                params: { type: "disclaimer", title: "Disclaimer" } 
              }))}
            />
            <NavRow
              icon="handshake"
              label="Gym Partner Agreement"
              isLast={true}
              isOpening={openingRow === "partner_agreement"}
              onPress={() => openRow("partner_agreement", () => router.push({ 
                pathname: "/content", 
                params: { type: "gym_partner_agreement", title: "Gym Partner Agreement" } 
              }))}
            />
          </View>

          {/* CARD 7: ACCOUNT */}
          <Text style={profileStyles.sectionLab}>Account</Text>
          <View style={[profileStyles.card, { paddingHorizontal: 16, paddingVertical: 4 }]}>
            {user?.authMethod === "phone" ? (
              <NavRow
                icon="phone"
                label="Phone Number"
                value={user?.phone || "N/A"}
                showChevron={false}
              />
            ) : (
              <NavRow
                icon="mail-outline"
                label="Email"
                value={isGuest ? "Not Registered" : (user?.email || "Connected")}
                showChevron={false}
              />
            )}
            <NavRow
              icon="verified-user"
              label="Verification Status"
              value={isGuest ? "Guest Access" : "Verified"}
              showChevron={false}
              isLast={true}
              color={isGuest ? "#66756B" : "#1F7A3F"}
            />
          </View>

          {/* Sign Out / Exit Guest Mode */}
          <View style={{ marginTop: 6, marginBottom: 8 }}>
            <Pressable
              onPress={() => setShowSignOutModal(true)}
              style={profileStyles.signOutBtn}
            >
              <MaterialIcons name="logout" size={18} color={colors.coral} />
              <Text style={profileStyles.signOutBtnText}>
                {isGuest ? "Exit Guest Mode" : "Sign Out"}
              </Text>
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
    paddingTop: 8,
  },
  hd: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  hdSmall: {
    color: "#66756B",
    fontSize: 13,
    fontWeight: "500",
  },
  hdTitle: {
    color: "#0F2417",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
    marginTop: 1,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  pillText: {
    color: "#8A5A00",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // GUEST CALLOUT
  guestCallout: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  guestCalloutTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  guestCalloutTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065F46",
    marginLeft: 6,
  },
  guestCalloutPill: {
    backgroundColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  guestCalloutPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  guestCalloutSub: {
    fontSize: 12.5,
    color: "#047857",
    lineHeight: 18,
    marginBottom: 12,
  },
  guestCalloutBtn: {
    backgroundColor: "#059669",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  guestCalloutBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // CARDS
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E9E0",
    borderRadius: 24,
    marginBottom: 14,
    shadowColor: "rgba(15,36,23,0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  userCard: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 18,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#E8F4EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#D1E7D5",
  },
  avatarInitial: {
    color: "#1F7A3F",
    fontSize: 30,
    fontWeight: "700",
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
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
    fontSize: 21,
    fontWeight: "800",
    color: "#0F2417",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  userSubtitle: {
    fontSize: 13.5,
    color: "#66756B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 8,
  },

  // BADGES
  userBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  planPill: {
    backgroundColor: "#E8F4EA",
    borderWidth: 1,
    borderColor: "#C6E4CC",
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 9999,
  },
  planPillText: {
    color: "#1F7A3F",
    fontSize: 11,
    fontWeight: "700",
  },
  sincePill: {
    backgroundColor: "#F6F8F5",
    borderWidth: 1,
    borderColor: "#E3E9E0",
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 9999,
  },
  sincePillText: {
    color: "#66756B",
    fontSize: 11,
    fontWeight: "600",
  },

  // STATS ROW
  userStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EBF0E9",
    borderBottomWidth: 1,
    borderBottomColor: "#EBF0E9",
    marginBottom: 16,
  },
  userStatItem: {
    flex: 1,
    alignItems: "center",
  },
  userStatVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F2417",
  },
  userStatLab: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#66756B",
    marginTop: 2,
  },
  userStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E3E9E0",
  },

  // FULL BTN
  btnFull: {
    width: "100%",
    height: 50,
    borderRadius: 16,
    backgroundColor: "#1F7A3F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnFullText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14.5,
  },
  btnBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 9999,
    marginLeft: 8,
  },
  btnBadgeText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
  },

  // ACCORDIONS
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#E3E9E0",
    paddingVertical: 13,
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
    fontWeight: "600",
  },
  accordionBody: {
    marginTop: 8,
    paddingBottom: 4,
  },
  accordionBodyText: {
    fontSize: 13,
    color: "#66756B",
    lineHeight: 18.5,
  },
  accordionLink: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  accordionLinkText: {
    color: "#1F7A3F",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // SECTIONS
  sectionLab: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#66756B",
    marginBottom: 8,
    marginLeft: 6,
  },

  // SIGN OUT BTN
  signOutBtn: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.25)",
    backgroundColor: "rgba(255, 107, 107, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.coral,
  },
});
