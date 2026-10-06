import React, { useState, useEffect, useRef } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  Modal, 
  TextInput, 
  Alert,
  ActivityIndicator,
  StyleSheet,
  Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useUserStore } from "@/store/useUserStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";

function BlinkingRedDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DC2626',
        opacity,
      }}
    />
  );
}

const MIN_CREDITS = 10;
const CREDIT_PRICE_INR = 10; // 1 Credit = ₹10
const PRESET_AMOUNTS = [10, 25, 50, 100];

const formatINR = (n: number | undefined | null) => {
  const val = Math.round(n || 0);
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export default function CreditsScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const { 
    credits, 
    inrWallet, 
    membershipInfo, 
    transactions, 
    fetchWallet, 
    buyCredits,
    loading: creditsLoading 
  } = useCreditsStore();

  const { membershipStatus, membershipExpiry } = useUserStore();
  const token = useAuthStore((s) => s.token);
  const { isGuest, hoursRemaining, endGuestSession } = useGuestStore();

  // Additional Credits state (PRD Section 7 & 22C)
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(10);
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      fetchWallet(token);
    }
  }, [token]);

  // Derived state from membershipInfo (or fallbacks)
  const hasMembership = !!membershipInfo && membershipInfo.status !== "NONE" && membershipInfo.status !== "INACTIVE";
  const isExpired = membershipInfo ? (membershipInfo.isExpired || membershipInfo.status === "EXPIRED") : false;
  const isMembershipActive = membershipInfo ? (!membershipInfo.isExpired && membershipInfo.status === "ACTIVE") : false;
  const daysRemaining = membershipInfo?.daysRemaining ?? 0;
  const isExpiringSoon = isMembershipActive && daysRemaining <= 3 && daysRemaining > 0;
  const showRenewalBanner = isExpired || isExpiringSoon;
  const gymName = membershipInfo?.gymName || "Primary Gym";

  const cycleNumber = membershipInfo?.cycleNumber ?? (hasMembership ? 1 : 0);
  const maxCycles = membershipInfo?.maxCycles ?? 12;
  const cyclesRemaining = membershipInfo?.cyclesRemaining ?? (hasMembership ? Math.max(0, maxCycles - cycleNumber) : 12);
  const mandatoryVisits = membershipInfo?.mandatoryVisits ?? 0;
  const completedVisits = membershipInfo?.completedVisits ?? 0;
  const mandatoryVisitsRemaining = membershipInfo?.mandatoryVisitsRemaining ?? Math.max(0, mandatoryVisits - completedVisits);

  // Status Badge Configuration (Text, Background, Color, Indicator Dot)
  const badgeConfig = (() => {
    if (isExpired) {
      return {
        text: "Expired",
        bgColor: "#FEF2F2",
        textColor: "#DC2626",
        dot: <BlinkingRedDot />,
      };
    }
    if (isExpiringSoon) {
      return {
        text: `Expiring Soon (${daysRemaining}d)`,
        bgColor: "#FEF2F2",
        textColor: "#DC2626",
        dot: <BlinkingRedDot />,
      };
    }
    if (isMembershipActive) {
      return {
        text: "Active",
        bgColor: "#E8F5E9",
        textColor: "#1F7A3E",
        dot: <View className="w-2 h-2 rounded-full bg-[#1F7A3E]" />,
      };
    }
    return {
      text: "Inactive",
      bgColor: "#F3F4F6",
      textColor: "#6B7280",
      dot: <View className="w-2 h-2 rounded-full bg-[#9CA3AF]" />,
    };
  })();

  // INR Wallet rules (PRD Section 13, 14, 15, 22D)
  const hasInrWallet = !!(inrWallet && inrWallet.isValid && inrWallet.balanceINR > 0);

  // Stepper handlers: step by 1, min 10, whole numbers only
  const handleIncrement = () => {
    setPurchaseQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setPurchaseQuantity((prev) => Math.max(MIN_CREDITS, prev - 1));
  };

  const handlePresetSelect = (amount: number) => {
    setPurchaseQuantity(Math.max(MIN_CREDITS, Math.floor(amount)));
  };

  const handleDirectInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (!cleaned) {
      setPurchaseQuantity(MIN_CREDITS);
      return;
    }
    const val = parseInt(cleaned, 10);
    if (!isNaN(val)) {
      setPurchaseQuantity(Math.max(MIN_CREDITS, val));
    }
  };

  const scrollToPurchase = () => {
    scrollRef.current?.scrollTo({ y: 380, animated: true });
  };

  // Buy Additional Credits Handler
  const handleBuyAdditionalCredits = async () => {
    if (!isMembershipActive) {
      Alert.alert(
        "Active Membership Required",
        "Additional credits can only be purchased while your current membership is active.",
        [{ text: "OK" }]
      );
      return;
    }

    if (purchaseQuantity < MIN_CREDITS || !Number.isInteger(purchaseQuantity)) {
      Alert.alert("Invalid Amount", `Minimum purchase is ${MIN_CREDITS} whole credits.`);
      return;
    }

    const price = purchaseQuantity * CREDIT_PRICE_INR;

    Alert.alert(
      "Confirm Purchase",
      `Buy ${purchaseQuantity} Additional Credits for ₹${formatINR(price)}?\n\nNote: Additional credits do not extend membership duration or create a new cycle.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Pay",
          onPress: async () => {
            setIsPurchasing(true);
            const result = await buyCredits(purchaseQuantity, price);
            setIsPurchasing(false);

            if (result.success) {
              Alert.alert("Success", `You successfully purchased ${purchaseQuantity} credits!`);
              if (token) fetchWallet(token);
            } else {
              Alert.alert("Payment Failed", result.message || "Could not complete purchase.");
            }
          },
        },
      ]
    );
  };



  const renderTransactionRow = (item: any) => {
    const isPositive = item.type === "credit" || item.amount > 0;
    const amountNum = Math.abs(item.amount);

    return (
      <View key={item.id} className="flex-row justify-between items-center py-3.5 border-b border-gray-100 last:border-b-0">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-10 h-10 rounded-2xl bg-[#E8F5E9] items-center justify-center mr-3">
            <Ionicons 
              name={isPositive ? "arrow-down" : "arrow-up"} 
              size={18} 
              color="#1F7A3E" 
            />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-bold text-[#111827]" numberOfLines={1}>{item.description}</Text>
            <Text className="text-xs font-medium text-gray-400 mt-0.5">{item.date}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`text-[15px] font-bold ${isPositive ? "text-[#1F7A3E]" : "text-[#111827]"}`}>
            {isPositive ? "+" : "-"}{amountNum} CR
          </Text>
        </View>
      </View>
    );
  };

  const displayTransactions = transactions || [];

  if (isGuest) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
        {/* Top App Bar */}
        <View className="flex-row justify-between items-center px-5 pt-3 pb-3 bg-white border-b border-gray-100">
          <View>
            <Text className="text-[26px] font-black text-[#111827] tracking-tight">Credits & Wallet</Text>
            <Text className="text-xs font-medium text-gray-500 mt-0.5">Membership access & spending balance</Text>
          </View>
          <View className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex-row items-center">
            <Ionicons name="time-outline" size={13} color="#D97706" />
            <Text className="text-xs font-bold text-amber-700 ml-1">{hoursRemaining}h Guest</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* Guest Locked Hero Card */}
          <View style={{ backgroundColor: '#1F7A3E', borderRadius: 26, padding: 24, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <View style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.08)" }} />
            
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center mr-3">
                <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-xs font-bold text-white/80 uppercase tracking-wider">Members Only Feature</Text>
                <Text className="text-xl font-black text-white">Credit Wallet</Text>
              </View>
            </View>

            <Text className="text-white/90 text-sm leading-relaxed mb-5">
              Guest users can explore partner gyms and pricing. Activate your ZonoFit membership or create an account to unlock credits and book workouts at any gym.
            </Text>

            <Pressable
              onPress={async () => {
                await endGuestSession();
                router.replace("/(auth)/create-account");
              }}
              className="bg-white rounded-2xl py-3.5 px-4 items-center justify-center flex-row shadow-sm active:bg-gray-100 mb-3"
            >
              <Ionicons name="person-add" size={18} color="#1F7A3E" style={{ marginRight: 8 }} />
              <Text className="text-[#1F7A3E] font-black text-sm">Create Account to Unlock Wallet</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/explore" as any)}
              className="bg-white/10 border border-white/30 rounded-2xl py-3 px-4 items-center justify-center flex-row active:bg-white/20"
            >
              <Ionicons name="compass-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-xs">Explore Partner Gyms</Text>
            </Pressable>
          </View>

          {/* How Credits Work Educational Section (PRD Section 3 & 4) */}
          <View className="bg-white rounded-[24px] p-5 border border-gray-200 shadow-sm mb-6">
            <Text className="text-base font-black text-[#111827] mb-1">How ZonoFit Credits Work</Text>
            <Text className="text-xs text-gray-500 mb-4">The flexible currency for all your workouts</Text>

            <View className="space-y-4">
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mr-3 mt-0.5">
                  <Text className="text-sm font-black text-[#1F7A3E]">₹</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#111827]">1 Credit = ₹10 Gym Value</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Guaranteed transparent pricing pegged directly to INR value.</Text>
                </View>
              </View>

              <View className="flex-row items-start mt-3">
                <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="fitness" size={16} color="#1F7A3E" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#111827]">Universal Network Access</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Spend credits across 100+ partner gyms without separate memberships.</Text>
                </View>
              </View>

              <View className="flex-row items-start mt-3">
                <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="shield-checkmark" size={16} color="#1F7A3E" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-[#111827]">Anti-Wastage Protection</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Unused credits convert into an INR Wallet at cycle end for repurchase discounts.</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Top App Bar */}
      <View className="flex-row justify-between items-center px-5 pt-3 pb-3 bg-white border-b border-gray-100">
        <View>
          <Text className="text-[26px] font-black text-[#111827] tracking-tight">Credits & Wallet</Text>
          <Text className="text-xs font-medium text-gray-500 mt-0.5">Membership access & spending balance</Text>
        </View>
        <View className="flex-row items-center gap-x-2.5">
          <Pressable 
            onPress={() => router.push("/booking-history" as any)}
            className="w-10 h-10 rounded-full border border-gray-200 items-center justify-center bg-white active:bg-gray-50 shadow-sm"
          >
            <Ionicons name="time-outline" size={20} color="#111827" />
          </Pressable>
          <Pressable 
            onPress={() => router.push("/profile" as any)}
            className="w-10 h-10 rounded-full border border-gray-200 bg-gray-100 items-center justify-center active:opacity-80"
          >
            <Ionicons name="person" size={18} color="#4B5563" />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        ref={scrollRef}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ======================================================== */}
        {/* MEMBERSHIP EXPIRY / RENEWAL ALERT BANNER                  */}
        {/* ======================================================== */}
        {/* ======================================================== */}
        {/* MEMBERSHIP EXPIRY / RENEWAL ALERT BANNER                  */}
        {/* ======================================================== */}
        {showRenewalBanner ? (
          <View key="sec-renewal-banner" className="px-5 pt-4">
            <View className="bg-red-50 border border-red-200 rounded-[24px] p-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="mr-2.5">
                    <BlinkingRedDot />
                  </View>
                  <Text className="text-sm font-black text-red-700">
                    {isExpired
                      ? "Membership Expired"
                      : `Plan Expiring Soon (${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left)`}
                  </Text>
                </View>
                <View className="bg-red-100 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-extrabold text-red-700 uppercase">
                    {isExpired ? "Action Required" : "Renew Plan"}
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-red-600 mb-3 leading-relaxed">
                {isExpired
                  ? "Your membership has ended. Renew your plan to unlock gym check-ins, visits, and credit top-ups."
                  : "Your plan is expiring soon. Renew now so your workouts continue seamlessly without interruption."}
              </Text>

              <Pressable
                onPress={() => router.push("/membership" as any)}
                className="bg-red-600 active:bg-red-700 rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm"
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-black text-xs uppercase tracking-wider">
                  {isExpired ? "Renew Membership Now" : "Renew Plan Now"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : !isMembershipActive && (
          <View key="sec-no-membership-banner" className="px-5 pt-4">
            <View className="bg-emerald-50 border border-emerald-200 rounded-[24px] p-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons name="sparkles" size={18} color="#1F7A3E" style={{ marginRight: 8 }} />
                  <Text className="text-sm font-black text-[#1F7A3E]">
                    No Active Membership
                  </Text>
                </View>
                <View className="bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-extrabold text-[#1F7A3E] uppercase">
                    Get Access
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-gray-600 mb-3 leading-relaxed">
                Get a ZonoFit membership to access partner gyms, receive workout credits, and unlock instant top-ups.
              </Text>

              <Pressable
                onPress={() => router.push("/membership" as any)}
                className="bg-[#1F7A3E] active:bg-[#186031] rounded-xl py-3 px-4 flex-row items-center justify-center shadow-sm"
              >
                <Ionicons name="card-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-black text-xs uppercase tracking-wider">
                  Explore Membership Plans
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* SECTION A: CURRENT MEMBERSHIP CARD (PRD Section 5 & 22A) */}
        {/* ======================================================== */}
        <View key="sec-membership" className="px-5 pt-4 mb-5">
          <View className="bg-white rounded-[26px] p-5 border border-gray-200 shadow-sm">
            {/* Header: Gym Name + Status Badge */}
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 mr-2">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Gym</Text>
                <Text className="text-xl font-black text-[#111827] mt-0.5" numberOfLines={1}>
                  {gymName}
                </Text>
              </View>
              <View 
                className="px-3 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: badgeConfig.bgColor }}
              >
                <View className="mr-1.5">
                  {badgeConfig.dot}
                </View>
                <Text 
                  className="text-xs font-extrabold uppercase"
                  style={{ color: badgeConfig.textColor }}
                >
                  {badgeConfig.text}
                </Text>
              </View>
            </View>

            {/* Membership Counter Banner */}
            <View className="bg-gray-50 rounded-2xl p-3 mb-4 flex-row items-center justify-between border border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="fitness-outline" size={18} color="#1F7A3E" />
                <Text className="text-sm font-bold text-[#111827] ml-2">
                  {hasMembership ? `Membership ${cycleNumber} of ${maxCycles}` : "12-Month Habit Engine"}
                </Text>
              </View>
              <Text className="text-xs font-bold text-[#1F7A3E]">
                {hasMembership 
                  ? `${cycleNumber} Used · ${cyclesRemaining} Remaining` 
                  : "12 Cycles Available"}
              </Text>
            </View>

            {/* 2-Column Info Grid: Days Remaining + Mandatory Visits Remaining */}
            <View className="flex-row gap-x-3">
              <View className="flex-1 bg-[#F9FAFB] rounded-2xl p-3.5 border border-gray-100">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="calendar-outline" size={15} color="#4B5563" />
                  <Text className="text-xs font-semibold text-gray-500 ml-1.5">Duration</Text>
                </View>
                <Text className="text-lg font-black text-[#111827]">
                  {isMembershipActive 
                    ? `${daysRemaining} Days` 
                    : isExpired 
                    ? "Cycle Ended" 
                    : "No Plan"}
                </Text>
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  {isMembershipActive 
                    ? "Remaining in cycle" 
                    : isExpired 
                    ? "Needs repurchase" 
                    : "Join a membership"}
                </Text>
              </View>

              <View className="flex-1 bg-[#F9FAFB] rounded-2xl p-3.5 border border-gray-100">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-done-circle-outline" size={15} color="#1F7A3E" />
                  <Text className="text-xs font-semibold text-gray-500 ml-1.5">Mandatory Visits</Text>
                </View>
                <Text className="text-lg font-black text-[#1F7A3E]">
                  {isMembershipActive ? `${mandatoryVisitsRemaining} Remaining` : "0 Remaining"}
                </Text>
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  {isMembershipActive 
                    ? `${completedVisits} of ${mandatoryVisits} completed` 
                    : isExpired 
                    ? "Cycle completed" 
                    : "Unlock with plan"}
                </Text>
              </View>
            </View>

            {showRenewalBanner ? (
              <Pressable
                onPress={() => router.push("/membership" as any)}
                className="mt-4 bg-red-600 active:bg-red-700 rounded-2xl py-3 px-4 flex-row items-center justify-center shadow-sm"
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-black text-xs uppercase tracking-wider">
                  {isExpired ? "Renew Membership" : "Renew Plan Early"}
                </Text>
              </Pressable>
            ) : !isMembershipActive && (
              <Pressable
                onPress={() => router.push("/membership" as any)}
                className="mt-4 bg-[#1F7A3E] active:bg-[#186031] rounded-2xl py-3 px-4 flex-row items-center justify-center shadow-sm"
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-black text-xs uppercase tracking-wider">
                  Explore Membership Plans
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ======================================================== */}
        {/* SECTION B: CREDIT BALANCE CARD (PRD Section 5, 6 & 22B) */}
        {/* ======================================================== */}
        <View key="sec-credits-balance" className="px-5 mb-5">
          <View style={{ backgroundColor: '#1F7A3E', borderRadius: 26, padding: 24, position: 'relative', overflow: 'hidden' }}>
            {/* Subtle background decoration */}
            <View style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.08)" }} />

            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-white/80 font-bold text-xs uppercase tracking-wider">
                Available Credits
              </Text>
              <View className="bg-white/20 px-2.5 py-0.5 rounded-full">
                <Text className="text-white text-[11px] font-bold">1 CR = ₹10</Text>
              </View>
            </View>

            <View className="flex-row items-baseline mb-2">
              <Text className="text-white font-black text-5xl mr-2">{credits}</Text>
              <Text className="text-white/90 font-bold text-xl">Credits</Text>
            </View>

            <Text className="text-white/80 text-xs font-medium mb-5">
              ≈ ₹{formatINR(credits * 10)} Fitness Value
            </Text>

            {/* PRD Section 6 Alert Banner if credits == 0 and membership active */}
            {credits === 0 && isMembershipActive && (
              <View className="bg-[#FFF3E0] rounded-xl p-3 mb-4 flex-row items-start border border-[#FFE0B2]">
                <Ionicons name="alert-circle" size={18} color="#D84315" style={{ marginRight: 8, marginTop: 1 }} />
                <Text className="text-xs font-bold text-[#BF360C] flex-1 leading-relaxed">
                  Your membership is still active, but your credits are finished. Buy additional credits to continue.
                </Text>
              </View>
            )}

            {/* Primary Action Button — Redirects to Credit Purchase Flow or Membership */}
            <Pressable
              onPress={() => {
                if (isMembershipActive) {
                  router.push("/top-up-credits" as any);
                } else {
                  router.push("/membership" as any);
                }
              }}
              className="bg-white rounded-2xl py-3.5 px-4 items-center justify-center flex-row shadow-sm active:bg-gray-100"
            >
              <Ionicons 
                name={isMembershipActive ? "add-circle" : "card-outline"} 
                size={20} 
                color="#1F7A3E" 
                style={{ marginRight: 8 }} 
              />
              <Text className="text-[#1F7A3E] font-black text-sm">
                {isMembershipActive 
                  ? "Buy Additional Credits" 
                  : isExpired 
                  ? "Renew Membership to Unlock" 
                  : "Get Membership to Unlock Credits"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ======================================================== */}
        {/* SECTION D: INR WALLET (PRD Section 13, 14, 15 & 22D)      */}
        {/* Only shown when an INR wallet exists (balance > 0)       */}
        {/* ======================================================== */}
        {hasInrWallet && (
          <View key="sec-inr-wallet" className="px-5 mb-5">
            <View className="bg-[#FFFBEB] rounded-[24px] p-5 border border-[#FDE68A] shadow-sm">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-[#F59E0B] items-center justify-center mr-2.5">
                    <Ionicons name="wallet" size={16} color="#FFFFFF" />
                  </View>
                  <Text className="text-sm font-extrabold text-[#92400E]">INR Wallet</Text>
                </View>
                <View className="bg-[#FEF3C7] border border-[#FCD34D] px-2.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-[#B45309]">Auto-Deducted</Text>
                </View>
              </View>

              <View className="flex-row items-baseline mb-1">
                <Text className="text-3xl font-black text-[#78350F]">
                  ₹{formatINR(inrWallet?.balanceINR)}
                </Text>
                <Text className="text-xs font-bold text-[#92400E] ml-2">available</Text>
              </View>

              <View className="flex-row items-center mb-3">
                <Ionicons name="time-outline" size={13} color="#B45309" />
                <Text className="text-xs font-semibold text-[#B45309] ml-1">
                  Valid for {inrWallet!.daysRemaining} more days
                </Text>
              </View>

              <View className="bg-white/80 rounded-xl p-3 border border-[#FDE68A]">
                <Text className="text-[11px] text-[#92400E] leading-relaxed">
                  Created from your unused credits upon membership expiry. Automatically deducted at checkout from your next eligible membership repurchase or marketplace order. <Text className="font-bold">No toggle required.</Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* SECTION C: ADDITIONAL CREDIT PURCHASE (PRD Section 7 & 22C)*/}
        {/* ======================================================== */}
        <View key="sec-additional-purchase" className="px-5 mb-5">
          <View className="bg-white rounded-[26px] p-5 border border-gray-200 shadow-sm">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Instant Top-Up
              </Text>
              <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <Text className="text-[10px] font-bold text-[#1F7A3E]">1 CR = ₹10</Text>
              </View>
            </View>
            <Text className="text-lg font-black text-[#111827] mb-1">Buy Additional Credits</Text>
            <Text className="text-xs text-gray-500 mb-4">
              Select credit quantity (minimum 10 credits)
            </Text>

            {/* Stepper Control: Large touch targets with immediate visual updates */}
            <View className="flex-row items-center justify-between bg-gray-50 rounded-[20px] p-2.5 border border-gray-200 mb-4">
              <Pressable
                onPress={handleDecrement}
                disabled={purchaseQuantity <= MIN_CREDITS || !isMembershipActive}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={[
                  { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
                  (purchaseQuantity <= MIN_CREDITS || !isMembershipActive)
                    ? { backgroundColor: "#E5E7EB", opacity: 0.5 }
                    : { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
                ]}
              >
                <Ionicons name="remove" size={26} color={purchaseQuantity <= MIN_CREDITS ? "#9CA3AF" : "#111827"} />
              </Pressable>

              <View className="flex-1 items-center px-2">
                <View className="flex-row items-baseline justify-center">
                  <TextInput
                    value={purchaseQuantity.toString()}
                    onChangeText={handleDirectInput}
                    editable={isMembershipActive}
                    keyboardType="number-pad"
                    style={{
                      fontSize: 32,
                      fontWeight: "900",
                      color: "#111827",
                      textAlign: "center",
                      minWidth: 70,
                    }}
                    maxLength={4}
                  />
                  <Text className="text-base font-bold text-[#1F7A3E] ml-1">CR</Text>
                </View>
                <Text className="text-xs font-bold text-gray-500 mt-0.5">
                  Total: ₹{formatINR(purchaseQuantity * CREDIT_PRICE_INR)}
                </Text>
              </View>

              <Pressable
                onPress={handleIncrement}
                disabled={!isMembershipActive}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={[
                  { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
                  (!isMembershipActive)
                    ? { backgroundColor: "#E5E7EB", opacity: 0.5 }
                    : { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" },
                ]}
              >
                <Ionicons name="add" size={26} color="#111827" />
              </Pressable>
            </View>

            {/* Preset Buttons */}
            <View className="flex-row gap-x-2 mb-4">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = purchaseQuantity === amt;
                return (
                  <Pressable
                    key={amt}
                    onPress={() => handlePresetSelect(amt)}
                    disabled={!isMembershipActive}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    style={[
                      { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", borderWidth: 1 },
                      isSelected
                        ? { backgroundColor: "#1F7A3E", borderColor: "#1F7A3E" }
                        : { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" },
                    ]}
                  >
                    <Text className={`text-xs font-bold ${isSelected ? "text-white" : "text-gray-700"}`}>
                      {amt} CR
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Notice Note */}
            <View className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
              <Text className="text-[11px] text-gray-500 leading-relaxed">
                ℹ️ Additional credits are added immediately to your spendable balance for any network gym visit.
              </Text>
            </View>

            {/* Purchase CTA */}
            <Pressable
              onPress={() => {
                if (!isMembershipActive) {
                  Alert.alert(
                    "Active Membership Required",
                    "Additional credits can only be purchased while your membership is active. Would you like to explore membership plans?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Explore Plans", onPress: () => router.push("/membership" as any) },
                    ]
                  );
                } else {
                  handleBuyAdditionalCredits();
                }
              }}
              disabled={isPurchasing}
              style={({ pressed }) => [
                {
                  height: 48,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  backgroundColor: !isMembershipActive
                    ? "#D1D5DB"
                    : isPurchasing
                    ? "#1F7A3ECC"
                    : pressed
                    ? "#165a2d"
                    : "#1F7A3E",
                },
              ]}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-sm">
                  {isMembershipActive 
                    ? `Buy ${purchaseQuantity} Credits (₹${formatINR(purchaseQuantity * CREDIT_PRICE_INR)})`
                    : "Active Membership Required"}
                </Text>
              )}
            </Pressable>

            {!isMembershipActive && (
              <Pressable
                onPress={() => router.push("/membership" as any)}
                className="mt-3 items-center"
              >
                <Text className="text-xs font-bold text-[#1F7A3E]">
                  {isExpired ? "Renew your membership to top up credits →" : "Explore membership plans to get credits →"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ======================================================== */}
        {/* RECENT ACTIVITY & TRANSACTIONS                           */}
        {/* ======================================================== */}
        <View className="px-5 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#111827] font-bold text-base">Recent Activity</Text>
            <Pressable 
              onPress={() => router.push("/booking-history" as any)} 
              className="active:opacity-70"
            >
              <Text className="text-[#1F7A3E] font-bold text-xs">View All</Text>
            </Pressable>
          </View>

          <View className="bg-white rounded-[24px] px-4 py-1 border border-gray-200 shadow-sm">
            {displayTransactions.length > 0 ? (
              displayTransactions.map((tx) => renderTransactionRow(tx))
            ) : (
              <View className="py-8 items-center justify-center">
                <Ionicons name="receipt-outline" size={28} color="#9CA3AF" />
                <Text className="text-sm font-semibold text-gray-500 mt-2">No transactions yet</Text>
                <Text className="text-xs text-gray-400 mt-0.5">Your credit history will appear here</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}