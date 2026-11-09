import React, { useRef, useEffect, useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  StyleSheet,
  BackHandler,
  ToastAndroid,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useBookingStore } from "@/store/useBookingStore";
import { ZonoNoticeMark } from "@/components/ZonoNoticeMark";
import BookingModal from "@/components/BookingModal";
import BookingConfirmedModal from "@/components/BookingConfirmedModal";
import CancelBookingSheet from "@/components/CancelBookingSheet";
import { SwipeableTabScreen } from "@/components/SwipeableTabScreen";
import { promptGuestAccount } from "@/lib/guestAccount";
import { afterPaint } from "@/lib/afterPaint";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

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
    <View style={homeStyles.accordionItem}>
      <Pressable onPress={() => setOpen(!open)} style={homeStyles.accordionSummary}>
        <Text style={homeStyles.accordionSummaryText}>{title}</Text>
        <Text style={homeStyles.accordionToggle}>{open ? "–" : "+"}</Text>
      </Pressable>
      {open && <View style={homeStyles.accordionBody}>{children}</View>}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuthStore();
  const { 
    visitsRemaining, 
    membershipStatus,
    planName, 
    primaryGymName: userPrimaryGymName,
    primaryGymId: userPrimaryGymId,
    totalWorkouts, 
    currentMonth, 
    identityStage, 
  } = useUserStore();
  const { credits, membershipInfo } = useCreditsStore();
  const { isGuest, checkExpiry, endGuestSession, selectedGymName, selectedGymId, getHoursRemaining } = useGuestStore();
  const { bookingStatus, bookedGymName, bookedTime, bookedCost } = useBookingStore();

  const [isCancellingTodayBooking, setIsCancellingTodayBooking] = useState(false);
  const [opening, setOpening] = useState<null | "pass" | "journey" | "wallet" | "invite" | "gym">(null);
  const openingLock = useRef<string | null>(null);
  const [cancelPrompt, setCancelPrompt] = useState<{
    isMandatory: boolean;
    refundAmount: number;
  } | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<{
    timeSlot: string;
    isMandatoryVisit: boolean;
    mandatoryVisitsLeft: number;
    creditsDeducted: number;
    remainingCredits: number;
  } | null>(null);

  const resolvedGymName = (
    membershipInfo?.gymName && 
    membershipInfo.gymName !== "None" && 
    membershipInfo.gymName !== "Select a Gym" && 
    membershipInfo.gymName !== "Primary Gym" &&
    membershipInfo.gymName !== "ZonoFit Partner Gym" &&
    membershipInfo.gymName !== "FitZone Pro"
  ) ? membershipInfo.gymName 
    : (userPrimaryGymName || selectedGymName || user?.primaryGym || "Being Fitness");

  const cycleNum = membershipInfo?.cycleNumber || currentMonth || 1;
  const mandatoryVisits = membershipInfo?.mandatoryVisits || (cycleNum <= 4 ? 10 : 15);
  const completedVisits = typeof membershipInfo?.completedVisits === "number"
    ? Math.max(0, membershipInfo.completedVisits)
    : Math.max(0, totalWorkouts || 0);
  const hasBookedMandatory = bookingStatus === "Booked" && (bookedCost === 0 || bookedCost === undefined);
  const visitsLeft = typeof visitsRemaining === "number" && visitsRemaining < mandatoryVisits
    ? Math.max(0, visitsRemaining)
    : Math.max(0, mandatoryVisits - completedVisits - (hasBookedMandatory ? 1 : 0));

  const effectiveCredits = credits;
  const guestHours = getHoursRemaining();

  useEffect(() => {
    if (token) {
      useCreditsStore.getState().fetchWallet(token);
      useUserStore.getState().fetchProfile(token);
      useBookingStore.getState().fetchBookings(token);
    }
  }, [token]);

  const scrollRef = useRef<ScrollView>(null);
  const lastBackPressTime = useRef<number>(0);

  useFocusEffect(
    React.useCallback(() => {
      openingLock.current = null;
      setOpening(null);
      const onBackPress = () => {
        const now = Date.now();
        if (now - lastBackPressTime.current < 2000) {
          BackHandler.exitApp();
          return true;
        }

        lastBackPressTime.current = now;
        if (Platform.OS === "android") {
          ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        }
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const askCancelToday = () => {
    if (isCancellingTodayBooking) return;
    const currentCost = useBookingStore.getState().bookedCost;
    const isMandatory = currentCost === 0 || currentCost === undefined;
    const currentCredits = useCreditsStore.getState().credits;

    if (isMandatory && currentCredits < 2) {
      Alert.alert(
        "Cannot Cancel Booking",
        `Cancelling a mandatory visit requires a flat 2 Credits fee, but your wallet balance is only ${currentCredits} Credits.\n\nPlease buy credits to cancel this booking.`,
        [
          { text: "OK", style: "cancel" },
          { text: "Buy Credits", onPress: () => router.push("/(tabs)/credits" as any) }
        ]
      );
      return;
    }

    setCancelPrompt({
      isMandatory,
      refundAmount: Math.max(0, (currentCost || 8) - 2),
    });
  };

  const confirmCancelToday = async () => {
    if (!cancelPrompt || isCancellingTodayBooking) return;
    setIsCancellingTodayBooking(true);
    try {
      const result = await useBookingStore.getState().cancelBooking();
      if (!result?.success) {
        Alert.alert("Cancellation Failed", result?.message || "Could not cancel booking.");
        return;
      }
      setCancelPrompt(null);
    } catch (err: unknown) {
      const message = typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
        ? err.message
        : "Could not cancel booking.";
      Alert.alert("Cancellation Failed", message);
    } finally {
      setIsCancellingTodayBooking(false);
    }
  };

  const handleOpenPrimaryBooking = () => {
    if (isGuest) {
      promptGuestAccount(router, endGuestSession, "Activate your membership to book visits at partner gyms.");
      return;
    }

    if (bookingStatus !== "Not Booked") {
      Alert.alert(
        "Active Booking Exists",
        "You already have an active gym booking today. Please complete or cancel it before booking another."
      );
      return;
    }

    if (visitsLeft === 0 && credits < 8) {
      Alert.alert(
        "Insufficient Credits",
        `This booking requires 8 credits, but you currently have ${credits} credits. Please buy credits to continue.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Buy Credits", onPress: () => router.push("/(tabs)/credits" as any) }
        ]
      );
      return;
    }

    setShowBookingModal(true);
  };

  const handleConfirmPrimaryBooking = async (slotTime: string, dateIso?: string) => {
    const isMandatory = visitsLeft > 0;
    const effectiveCost = isMandatory ? 0 : 8;
    const gymId = userPrimaryGymId || "primary_gym_default";
    const dateToUse = dateIso || new Date().toISOString();

    const success = await useBookingStore.getState().bookVisit(
      gymId,
      resolvedGymName,
      dateToUse,
      slotTime,
      effectiveCost
    );

    if (success) {
      const remainingCredits = useCreditsStore.getState().credits;
      const updatedVisitsRemaining = useUserStore.getState().visitsRemaining;
      setConfirmedBookingData({
        timeSlot: slotTime,
        isMandatoryVisit: isMandatory,
        mandatoryVisitsLeft: updatedVisitsRemaining,
        creditsDeducted: effectiveCost,
        remainingCredits,
      });
      setShowBookingModal(false);
      setTimeout(() => {
        setShowConfirmedModal(true);
      }, 150);
    } else {
      Alert.alert("Booking Error", "Unable to confirm booking. Please check your credit balance or connection.");
    }
  };

  useEffect(() => {
    if (isGuest && checkExpiry()) {
      router.replace("/guest-expired" as any);
    }
  }, [isGuest]);

  const clearOpening = () => {
    openingLock.current = null;
    setOpening(null);
  };

  const openScreen = (key: "pass" | "journey" | "wallet" | "invite", path: string) => {
    if (openingLock.current) return;
    openingLock.current = key;
    setOpening(key);
    afterPaint(() => {
      try {
        router.push(path as any);
      } catch {
        clearOpening();
      }
    });
  };

  const openGymPick = () => {
    if (openingLock.current) return;
    openingLock.current = "gym";
    setOpening("gym");
    afterPaint(() => {
      try {
        if (isGuest && selectedGymId) {
          router.push({
            pathname: `/gym/${selectedGymId}`,
            params: { name: selectedGymName || "" },
          } as any);
          return;
        }
        if (isGuest) {
          router.push("/partner-gyms?city=Udaipur" as any);
          return;
        }
        if (userPrimaryGymId) {
          router.push({
            pathname: `/gym/${userPrimaryGymId}`,
            params: { name: resolvedGymName },
          } as any);
          return;
        }
        router.push("/partner-gyms" as any);
      } catch {
        clearOpening();
      }
    });
  };

  return (
    <SwipeableTabScreen currentTab="index">
      <SafeAreaView style={homeStyles.container} edges={["top"]}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[homeStyles.scrollContent, { paddingBottom: 160 + insets.bottom }]}
        >
          {/* HEADER */}
          <View style={homeStyles.hd}>
            <View>
              <Text style={homeStyles.hdSmall}>{getGreeting()}</Text>
              <Text style={homeStyles.hdTitle}>
                Hi, {isGuest ? "Guest" : (user?.username?.split(" ")[0] || "Member")}
              </Text>
            </View>
            <View style={homeStyles.hdRow}>
              {isGuest ? (
                <View style={homeStyles.pill}>
                  <Ionicons name="time-outline" size={14} color="#8A5A00" />
                  <Text style={homeStyles.pillText}>{guestHours}h left</Text>
                </View>
              ) : (
                <View style={[homeStyles.pill, { backgroundColor: "#E8F4EA", borderColor: "#C6E4CC" }]}>
                  <Ionicons name="shield-checkmark" size={13} color="#1F7A3F" />
                  <Text style={[homeStyles.pillText, { color: "#1F7A3F" }]}>
                    {planName || "Member"}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => router.push("/(tabs)/profile" as any)}
                style={homeStyles.ibAv}
                accessibilityLabel="Profile"
              >
                <Text style={homeStyles.ibAvText}>
                  {isGuest ? "G" : (user?.username?.[0]?.toUpperCase() || "M")}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* HERO CARD */}
          <View style={homeStyles.hero}>
            <View style={homeStyles.heroDecoCircle} pointerEvents="none" />

            <View style={homeStyles.heroEyeRow}>
              <Text style={homeStyles.eye}>
                Primary gym{" "}
                <Text style={homeStyles.sam}>
                  {isGuest ? "SAMPLE" : (membershipStatus || "ACTIVE")}
                </Text>
              </Text>
            </View>

            <Pressable
              onPress={openGymPick}
              disabled={opening === "gym"}
              style={homeStyles.heroGymRow}
            >
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                <Text style={homeStyles.heroH2} numberOfLines={1}>
                  {opening === "gym"
                    ? "Opening..."
                    : isGuest
                      ? (selectedGymName || "Choose your gym")
                      : resolvedGymName}
                </Text>
                <Text style={{ fontSize: 22, color: "#FFFFFF", marginLeft: 6 }}>›</Text>
              </View>
              <View style={homeStyles.heroLogo}>
                <ZonoNoticeMark size={28} />
              </View>
            </Pressable>

            <View style={homeStyles.heroStats}>
              <View>
                <Text style={homeStyles.heroStatSmall}>Completed Visits</Text>
                <Text style={homeStyles.heroBig}>
                  {completedVisits} <Text style={homeStyles.heroBigSpan}>/ {mandatoryVisits}</Text>
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={homeStyles.heroStatSmall}>Visits Left</Text>
                <Text style={homeStyles.heroBig}>{visitsLeft}</Text>
              </View>
            </View>

            {/* Dash Line (10 dashes) */}
            <View style={homeStyles.dash}>
              {Array.from({ length: 10 }).map((_, i) => {
                const isFilled = i < (completedVisits % 10 === 0 && completedVisits > 0 ? 10 : completedVisits % 10);
                return (
                  <View 
                    key={i} 
                    style={[homeStyles.dashItem, isFilled && homeStyles.dashItemFilled]} 
                  />
                );
              })}
            </View>

            {/* Credits row */}
            <View style={homeStyles.cr}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={homeStyles.coin}>
                  <Text style={homeStyles.coinText}>₹</Text>
                </View>
                <Text style={homeStyles.crText}>Available Credits: {effectiveCredits}</Text>
              </View>
              <Pressable onPress={() => openScreen("wallet", "/(tabs)/credits")} disabled={opening === "wallet"}>
                <Text style={homeStyles.crLink}>{opening === "wallet" ? "Opening..." : "View Wallet"}</Text>
              </Pressable>
            </View>

            {/* White Action Button */}
            <Pressable
              style={homeStyles.wbtn}
              disabled={opening === "gym" || (!isGuest && bookingStatus === "Booked" && opening === "pass")}
              onPress={
                isGuest 
                  ? openGymPick 
                  : (bookingStatus === "Booked" 
                      ? () => openScreen("pass", "/booking-pass") 
                      : handleOpenPrimaryBooking)
              }
            >
              <Text style={homeStyles.wbtnText}>
                {isGuest
                  ? (opening === "gym"
                      ? "Opening..."
                      : selectedGymName
                        ? `Continue with ${selectedGymName}`
                        : "Choose your primary gym")
                  : (bookingStatus === "Booked"
                      ? (opening === "pass" ? "Opening..." : "View Today's Pass")
                      : "Book Today's Visit")}
              </Text>
            </Pressable>
          </View>

          {/* CARD 1: TODAY */}
          <View style={homeStyles.card}>
            <Text style={homeStyles.lab}>Today</Text>
            {bookingStatus === "Not Booked" ? (
              <View style={homeStyles.todayRow}>
                <View style={homeStyles.todayIconWrap}>
                  <Ionicons name="calendar-outline" size={22} color="#0F2417" />
                </View>
                <Text style={homeStyles.todayTitle}>No workout booked</Text>
                <Pressable
                  style={homeStyles.btn}
                  onPress={
                    isGuest
                      ? () => promptGuestAccount(router, endGuestSession, "Activate your membership to book visits.")
                      : handleOpenPrimaryBooking
                  }
                >
                  <Text style={homeStyles.btnText}>Book Visit</Text>
                </Pressable>
              </View>
            ) : bookingStatus === "Booked" ? (
              <View style={homeStyles.todayRow}>
                <View style={[homeStyles.todayIconWrap, { backgroundColor: "#E8F4EA" }]}>
                  <Ionicons name="checkmark-circle" size={22} color="#1F7A3F" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={homeStyles.todayTitle}>Workout Booked</Text>
                  <Text style={homeStyles.todaySub} numberOfLines={1}>
                    {bookedGymName || resolvedGymName} • {bookedTime || "Today"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Pressable
                    style={[homeStyles.btn, { backgroundColor: "#FDE9E7", paddingHorizontal: 12 }]}
                    onPress={askCancelToday}
                    disabled={isCancellingTodayBooking}
                  >
                    <Text style={[homeStyles.btnText, { color: "#B3261E" }]}>
                      {isCancellingTodayBooking ? "Cancelling..." : "Cancel"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={homeStyles.btn}
                    disabled={opening === "pass"}
                    onPress={() => openScreen("pass", "/booking-pass")}
                  >
                    <Text style={homeStyles.btnText}>{opening === "pass" ? "Opening..." : "View Pass"}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={homeStyles.todayRow}>
                <View style={[homeStyles.todayIconWrap, { backgroundColor: "#E8F4EA" }]}>
                  <Ionicons name="checkmark-circle" size={22} color="#1F7A3F" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={homeStyles.todayTitle}>Checked In Successfully</Text>
                  <Text style={homeStyles.todaySub}>Great work today! Keep it up.</Text>
                </View>
              </View>
            )}
          </View>

          {/* CARD 2: YOUR JOURNEY */}
          <View style={homeStyles.card}>
            <View style={homeStyles.cardHeaderRow}>
              <Text style={homeStyles.cardH3}>Your Journey</Text>
              <Pressable onPress={() => openScreen("journey", "/journey")} disabled={opening === "journey"}>
                <Text style={homeStyles.lnkText}>{opening === "journey" ? "Opening..." : "View ›"}</Text>
              </Pressable>
            </View>

            <View style={[homeStyles.cardHeaderRow, { marginTop: 12, alignItems: "flex-end" }]}>
              <View>
                <Text style={homeStyles.journeyLab}>12-Month Journey Progress</Text>
                <Text style={homeStyles.journeyMonth}>
                  Month {membershipInfo?.cycleNumber ?? currentMonth ?? 1}{" "}
                  <Text style={homeStyles.journeyMonthSub}>/ 12</Text>
                </Text>
              </View>
              <View style={homeStyles.tag}>
                <Text style={homeStyles.tagText}>{identityStage || "Beginner"}</Text>
              </View>
            </View>

            {/* 12 Segments */}
            <View style={homeStyles.seg}>
              {Array.from({ length: 12 }).map((_, i) => {
                const active = i < (membershipInfo?.cycleNumber ?? currentMonth ?? 1);
                return (
                  <View 
                    key={i} 
                    style={[homeStyles.segItem, active && homeStyles.segItemOn]} 
                  />
                );
              })}
            </View>

            <View style={homeStyles.two}>
              <View>
                <Text style={homeStyles.twoLab}>Completed Visits</Text>
                <Text style={homeStyles.twoVal}>{completedVisits}</Text>
              </View>
              <View>
                <Text style={homeStyles.twoLab}>Value Protected</Text>
                <Text style={homeStyles.twoVal}>
                  ₹{((completedVisits || 1) * 120).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* CARD 3: REFER & EARN */}
          <View style={[homeStyles.card, homeStyles.refCard]}>
            <View style={homeStyles.cardHeaderRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={homeStyles.refH3}>Refer &amp; Earn</Text>
                <Text style={homeStyles.refSub}>Invite a friend, you both earn credits.</Text>
              </View>
              <Pressable
                style={homeStyles.btn}
                disabled={opening === "invite"}
                onPress={() => openScreen("invite", "/invite")}
              >
                <Text style={homeStyles.btnText}>{opening === "invite" ? "Opening..." : "Invite now"}</Text>
              </Pressable>
            </View>
          </View>

          {/* CARD 4: HOW ZONOFIT WORKS */}
          <View style={homeStyles.card}>
            <Text style={homeStyles.cardH3}>How Zonofit works</Text>
            <View style={homeStyles.step}>
              <View style={homeStyles.stepNum}><Text style={homeStyles.stepNumText}>1</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={homeStyles.stepTitle}>Choose your primary gym</Text>
                <Text style={homeStyles.stepDesc}>Home gym from 100+ verified partners.</Text>
              </View>
            </View>

            <View style={homeStyles.step}>
              <View style={homeStyles.stepNum}><Text style={homeStyles.stepNumText}>2</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={homeStyles.stepTitle}>30-day flexible cycle</Text>
                <Text style={homeStyles.stepDesc}>Set visits at home gym, plus flexible credits.</Text>
              </View>
            </View>

            <View style={homeStyles.step}>
              <View style={homeStyles.stepNum}><Text style={homeStyles.stepNumText}>3</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={homeStyles.stepTitle}>Work out across the network</Text>
                <Text style={homeStyles.stepDesc}>Use credits at any partner gym, anytime.</Text>
              </View>
            </View>
          </View>

          {/* CARD 5: QUESTIONS (FAQ ACCORDION) */}
          <View style={homeStyles.card}>
            <Text style={[homeStyles.cardH3, { marginBottom: 6 }]}>Questions</Text>
            
            <AccordionItem title="Can I explore without paying?" defaultOpen={true}>
              <Text style={homeStyles.accordionBodyText}>
                Yes. For 48 hours you can look at every partner gym, facility and plan price. No payment.
              </Text>
            </AccordionItem>

            <AccordionItem title="Can I try multiple gyms?">
              <Text style={homeStyles.accordionBodyText}>
                Yes. You commit visits to your primary gym, and credits unlock any partner gym.
              </Text>
            </AccordionItem>

            <AccordionItem title="What happens to unused credits?">
              <Text style={homeStyles.accordionBodyText}>
                They convert into an INR wallet at the end of the cycle, valid for 15 days.
              </Text>
            </AccordionItem>
          </View>
        </ScrollView>

        {/* STICKY GUEST ACTIVATION BAR */}
        {isGuest && (
          <View style={[homeStyles.floatingBar, { bottom: Math.max(insets.bottom, 12) + 68 }]}>
            <Text style={homeStyles.floatingBarText} numberOfLines={2}>
              Like what you see? Activate to book visits and unlock credits.
            </Text>
            <Pressable
              style={homeStyles.floatingBarBtn}
              onPress={() => promptGuestAccount(router, endGuestSession, "Activate your membership to unlock visits and credits.")}
            >
              <Text style={homeStyles.floatingBarBtnText}>Activate</Text>
            </Pressable>
          </View>
        )}

        {/* MODALS */}
        <BookingModal
          visible={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onConfirm={handleConfirmPrimaryBooking}
          gym={{
            id: userPrimaryGymId || "primary_gym_default",
            name: resolvedGymName,
            address: "Primary Gym (Home Base)",
            cost: 8,
          }}
          isPrimaryGym={true}
          visitsRemaining={visitsLeft}
          mandatoryVisitsTotal={mandatoryVisits}
          availableCredits={credits}
        />

        {confirmedBookingData && (
          <BookingConfirmedModal
            visible={showConfirmedModal}
            gymName={resolvedGymName}
            gymAddress="Primary Gym (Home Base)"
            timeSlot={confirmedBookingData.timeSlot}
            isMandatoryVisit={confirmedBookingData.isMandatoryVisit}
            mandatoryVisitsLeft={confirmedBookingData.mandatoryVisitsLeft}
            totalMandatoryVisits={mandatoryVisits}
            creditsDeducted={confirmedBookingData.creditsDeducted}
            remainingCredits={confirmedBookingData.remainingCredits}
            onViewPass={() => {
              setShowConfirmedModal(false);
              setConfirmedBookingData(null);
              router.push("/booking-pass" as any);
            }}
            onDone={() => {
              setShowConfirmedModal(false);
              setConfirmedBookingData(null);
            }}
          />
        )}

        <CancelBookingSheet
          visible={cancelPrompt !== null}
          loading={isCancellingTodayBooking}
          isMandatory={cancelPrompt?.isMandatory ?? false}
          refundCredits={cancelPrompt?.refundAmount ?? 0}
          onKeep={() => setCancelPrompt(null)}
          onConfirm={confirmCancelToday}
        />
      </SafeAreaView>
    </SwipeableTabScreen>
  );
}

const homeStyles = StyleSheet.create({
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
  ibAv: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  ibAvText: {
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 16,
  },

  // HERO CARD
  hero: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#1F7A3F",
    borderRadius: 28,
    padding: 22,
    marginBottom: 14,
    shadowColor: "#1F7A3F",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  heroDecoCircle: {
    position: "absolute",
    right: -70,
    top: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroEyeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  eye: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.8)",
  },
  sam: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 9999,
    overflow: "hidden",
    color: "#FFFFFF",
  },
  heroGymRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  heroH2: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  heroLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#2B8A4B",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 18,
  },
  heroStatSmall: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  heroBig: {
    fontSize: 42,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 46,
  },
  heroBigSpan: {
    fontSize: 20,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  dash: {
    flexDirection: "row",
    gap: 5,
    marginVertical: 16,
  },
  dashItem: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dashItemFilled: {
    backgroundColor: "#8DBE2A",
  },
  cr: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F5C84B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  coinText: {
    color: "#7A5600",
    fontSize: 12,
    fontWeight: "700",
  },
  crText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  crLink: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  wbtn: {
    width: "100%",
    height: 52,
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  wbtnText: {
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 16,
  },

  // CARDS GENERAL
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
  lab: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#66756B",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardH3: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F2417",
    letterSpacing: -0.2,
  },
  btn: {
    backgroundColor: "#1F7A3F",
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  lnkText: {
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 14,
  },

  // TODAY CARD
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  todayIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F6F8F5",
    alignItems: "center",
    justifyContent: "center",
  },
  todayTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F2417",
    flex: 1,
  },
  todaySub: {
    fontSize: 12,
    color: "#66756B",
    marginTop: 2,
  },

  // JOURNEY CARD
  journeyLab: {
    fontSize: 13,
    color: "#66756B",
  },
  journeyMonth: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F2417",
    marginTop: 2,
  },
  journeyMonthSub: {
    fontSize: 16,
    color: "#66756B",
    fontWeight: "500",
  },
  tag: {
    backgroundColor: "#E8F4EA",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  tagText: {
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 13,
  },
  seg: {
    flexDirection: "row",
    gap: 5,
    marginVertical: 14,
  },
  segItem: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#E3E9E0",
  },
  segItemOn: {
    backgroundColor: "#1F7A3F",
  },
  two: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E3E9E0",
    paddingTop: 14,
  },
  twoLab: {
    fontSize: 13,
    color: "#66756B",
    marginBottom: 4,
  },
  twoVal: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F2417",
  },

  // REFER & EARN
  refCard: {
    backgroundColor: "#E8F4EA",
    borderColor: "transparent",
  },
  refH3: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F7A3F",
  },
  refSub: {
    fontSize: 13,
    color: "#66756B",
    marginTop: 3,
  },

  // HOW IT WORKS
  step: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginTop: 14,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    color: "#1F7A3F",
    fontWeight: "700",
    fontSize: 14,
  },
  stepTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F2417",
  },
  stepDesc: {
    fontSize: 13,
    color: "#66756B",
    marginTop: 2,
    lineHeight: 18,
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
    fontSize: 14.5,
    fontWeight: "600",
    color: "#0F2417",
    flex: 1,
    paddingRight: 10,
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

  // STICKY BOTTOM GUEST BAR
  floatingBar: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#0F2417",
    borderRadius: 18,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  floatingBarText: {
    flex: 1,
    color: "#F6F8F5",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  floatingBarBtn: {
    backgroundColor: "#8DBE2A",
    borderRadius: 9999,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  floatingBarBtnText: {
    color: "#0F2417",
    fontWeight: "700",
    fontSize: 13,
  },
});