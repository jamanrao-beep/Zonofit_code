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
  StyleSheet
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useUserStore } from "@/store/useUserStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";

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
  const [isRepurchasing, setIsRepurchasing] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      fetchWallet(token);
    }
  }, [token]);

  // Derived state from membershipInfo (or fallbacks)
  const cycleNumber = membershipInfo?.cycleNumber ?? 1;
  const maxCycles = membershipInfo?.maxCycles ?? 12;
  const cyclesRemaining = membershipInfo?.cyclesRemaining ?? Math.max(0, maxCycles - cycleNumber);
  const mandatoryVisits = membershipInfo?.mandatoryVisits ?? 0;
  const completedVisits = membershipInfo?.completedVisits ?? 0;
  const mandatoryVisitsRemaining = membershipInfo?.mandatoryVisitsRemaining ?? Math.max(0, mandatoryVisits - completedVisits);
  
  const isExpired = membershipInfo ? membershipInfo.isExpired : false;
  const isMembershipActive = membershipInfo ? (!membershipInfo.isExpired && membershipInfo.status === "ACTIVE") : false;
  const daysRemaining = membershipInfo?.daysRemaining ?? 0;
  const gymName = membershipInfo?.gymName || "Primary Gym";

  // Repurchase eligibility rules (PRD Section 11, 18, 19, 23)
  const canRepurchase = isExpired && cycleNumber < maxCycles;
  const isPlanCompleted = cycleNumber >= maxCycles && isExpired;

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

  // Repurchase Membership Handler (PRD Section 11, 18, 19, 23)
  const handleRepurchaseMembership = async () => {
    if (!canRepurchase) {
      if (isMembershipActive) {
        Alert.alert(
          "Repurchase Not Allowed",
          "Your current membership is still active. Early repurchase is strictly disabled. If your credits are finished, please buy additional credits to continue.",
          [{ text: "OK" }]
        );
      } else if (isPlanCompleted) {
        Alert.alert(
          "Plan Completed",
          "You have completed all 12 membership cycles under this plan. No further repurchases are available.",
          [{ text: "OK" }]
        );
      }
      return;
    }

    // Repurchase is allowed (membership expired and cycle < 12)
    const inrWalletDiscount = hasInrWallet ? inrWallet!.balanceINR : 0;
    const basePlanPrice = 3999;
    const payableAmount = Math.max(0, basePlanPrice - inrWalletDiscount);

    Alert.alert(
      `Repurchase Membership ${cycleNumber + 1} of ${maxCycles}`,
      `Your previous cycle has expired. Repurchase next 30-day cycle for ${gymName}.\n\n` +
      `Base Price: ₹${basePlanPrice}\n` +
      (inrWalletDiscount > 0 ? `INR Wallet Auto-Deduction: -₹${inrWalletDiscount}\n` : "") +
      `Amount Payable: ₹${payableAmount}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Repurchase",
          onPress: async () => {
            setIsRepurchasing(true);
            try {
              const res = await apiFetch("/api/membership/activate", {
                method: "POST",
                token: token || "",
                body: JSON.stringify({
                  referenceId: "repurchase_" + Date.now(),
                  amountPaidPaise: payableAmount * 100,
                }),
              });
              setIsRepurchasing(false);
              Alert.alert("Membership Activated", `Membership Cycle ${cycleNumber + 1} of 12 is now active!`);
              if (token) fetchWallet(token);
            } catch (err: any) {
              setIsRepurchasing(false);
              Alert.alert("Repurchase Failed", err.message || "Failed to repurchase membership.");
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
          <View className="bg-[#1F7A3E] rounded-[26px] p-6 shadow-md mb-6 relative overflow-hidden">
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
        {/* SECTION A: CURRENT MEMBERSHIP CARD (PRD Section 5 & 22A) */}
        {/* ======================================================== */}
        <View className="px-5 pt-5 mb-5">
          <View className="bg-white rounded-[26px] p-5 border border-gray-200 shadow-sm">
            {/* Header: Gym Name + Status Badge */}
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 mr-2">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Gym</Text>
                <Text className="text-xl font-black text-[#111827] mt-0.5" numberOfLines={1}>
                  {gymName}
                </Text>
              </View>
              <View className={`px-3 py-1 rounded-full flex-row items-center ${
                isMembershipActive ? "bg-[#E8F5E9]" : "bg-red-50"
              }`}>
                <View className={`w-2 h-2 rounded-full mr-1.5 ${
                  isMembershipActive ? "bg-[#1F7A3E]" : "bg-red-500"
                }`} />
                <Text className={`text-xs font-extrabold uppercase ${
                  isMembershipActive ? "text-[#1F7A3E]" : "text-red-600"
                }`}>
                  {isMembershipActive ? "Active" : "Expired"}
                </Text>
              </View>
            </View>

            {/* Membership Counter Banner */}
            <View className="bg-gray-50 rounded-2xl p-3 mb-4 flex-row items-center justify-between border border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="fitness-outline" size={18} color="#1F7A3E" />
                <Text className="text-sm font-bold text-[#111827] ml-2">
                  Membership {cycleNumber} of {maxCycles}
                </Text>
              </View>
              <Text className="text-xs font-bold text-[#1F7A3E]">
                {cycleNumber} Used · {cyclesRemaining} Remaining
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
                  {isMembershipActive ? `${daysRemaining} Days` : "Cycle Ended"}
                </Text>
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  {isMembershipActive ? "Remaining in cycle" : "Needs repurchase"}
                </Text>
              </View>

              <View className="flex-1 bg-[#F9FAFB] rounded-2xl p-3.5 border border-gray-100">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-done-circle-outline" size={15} color="#1F7A3E" />
                  <Text className="text-xs font-semibold text-gray-500 ml-1.5">Mandatory Visits</Text>
                </View>
                <Text className="text-lg font-black text-[#1F7A3E]">
                  {mandatoryVisitsRemaining} Remaining
                </Text>
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  {completedVisits} of {mandatoryVisits} completed
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* SECTION B: CREDIT BALANCE CARD (PRD Section 5, 6 & 22B) */}
        {/* ======================================================== */}
        <View className="px-5 mb-5">
          <View className="bg-[#1F7A3E] rounded-[26px] p-6 shadow-md relative overflow-hidden">
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

            {/* Primary Action Button */}
            <Pressable
              onPress={scrollToPurchase}
              className="bg-white rounded-2xl py-3.5 px-4 items-center justify-center flex-row shadow-sm active:bg-gray-100"
            >
              <Ionicons name="add-circle" size={20} color="#1F7A3E" style={{ marginRight: 8 }} />
              <Text className="text-[#1F7A3E] font-black text-sm">Buy Additional Credits</Text>
            </Pressable>
          </View>
        </View>

        {/* ======================================================== */}
        {/* SECTION D: INR WALLET (PRD Section 13, 14, 15 & 22D)      */}
        {/* Only shown when an INR wallet exists (balance > 0)       */}
        {/* ======================================================== */}
        {hasInrWallet && (
          <View className="px-5 mb-5">
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
        <View className="px-5 mb-5">
          <View className="bg-white rounded-[26px] p-5 border border-gray-200 shadow-sm">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Additional Credits
              </Text>
              <Text className="text-xs font-bold text-[#1F7A3E]">Whole numbers only</Text>
            </View>
            <Text className="text-lg font-black text-[#111827] mb-1">Buy Additional Credits</Text>
            <Text className="text-xs text-gray-500 mb-4">
              Minimum 10 credits · Step by 1 credit (10, 11, 12, 13...)
            </Text>

            {/* Stepper Control: "− 10 +" */}
            <View className="flex-row items-center justify-between bg-gray-50 rounded-[20px] p-2.5 border border-gray-200 mb-4">
              <Pressable
                onPress={handleDecrement}
                disabled={purchaseQuantity <= MIN_CREDITS || !isMembershipActive}
                className={`w-12 h-12 rounded-xl items-center justify-center ${
                  purchaseQuantity <= MIN_CREDITS || !isMembershipActive
                    ? "bg-gray-200 opacity-50"
                    : "bg-white border border-gray-200 active:bg-gray-100 shadow-sm"
                }`}
              >
                <Ionicons name="remove" size={24} color={purchaseQuantity <= MIN_CREDITS ? "#9CA3AF" : "#111827"} />
              </Pressable>

              <View className="flex-1 items-center px-2">
                <View className="flex-row items-baseline justify-center">
                  <TextInput
                    value={purchaseQuantity.toString()}
                    onChangeText={handleDirectInput}
                    editable={isMembershipActive}
                    keyboardType="number-pad"
                    style={{
                      fontSize: 30,
                      fontWeight: "900",
                      color: "#111827",
                      textAlign: "center",
                      minWidth: 60,
                    }}
                    maxLength={4}
                  />
                  <Text className="text-base font-bold text-[#1F7A3E] ml-1">CR</Text>
                </View>
                <Text className="text-[10px] font-semibold text-gray-400">
                  = ₹{formatINR(purchaseQuantity * CREDIT_PRICE_INR)}
                </Text>
              </View>

              <Pressable
                onPress={handleIncrement}
                disabled={!isMembershipActive}
                className={`w-12 h-12 rounded-xl items-center justify-center ${
                  !isMembershipActive
                    ? "bg-gray-200 opacity-50"
                    : "bg-white border border-gray-200 active:bg-gray-100 shadow-sm"
                }`}
              >
                <Ionicons name="add" size={24} color="#111827" />
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
                    className={`flex-1 py-2 rounded-xl items-center border ${
                      isSelected
                        ? "bg-[#1F7A3E] border-[#1F7A3E]"
                        : "bg-gray-50 border-gray-200 active:bg-gray-100"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${isSelected ? "text-white" : "text-gray-700"}`}>
                      {amt} CR
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* PRD Rule #9 & #24 Note */}
            <View className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
              <Text className="text-[11px] text-gray-500 leading-relaxed">
                ℹ️ Buying additional credits does <Text className="font-bold text-gray-700">not</Text> extend membership duration or create a new cycle. Only your spendable credit balance changes.
              </Text>
            </View>

            {/* Purchase CTA */}
            <Pressable
              onPress={handleBuyAdditionalCredits}
              disabled={isPurchasing || !isMembershipActive}
              className={`h-12 rounded-xl items-center justify-center flex-row shadow-sm ${
                !isMembershipActive
                  ? "bg-gray-300"
                  : isPurchasing
                  ? "bg-[#1F7A3E]/80"
                  : "bg-[#1F7A3E] active:bg-[#165a2d]"
              }`}
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
          </View>
        </View>

        {/* ======================================================== */}
        {/* SECTION E: MEMBERSHIP PROGRESS & REPURCHASE (PRD 4, 11, 18, 19, 22E) */}
        {/* ======================================================== */}
        <View className="px-5 mb-5">
          <View className="bg-white rounded-[26px] p-5 border border-gray-200 shadow-sm">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                12-Membership Plan
              </Text>
              <Text className="text-xs font-bold text-[#1F7A3E]">
                {cycleNumber} / {maxCycles} Used
              </Text>
            </View>
            <Text className="text-base font-black text-[#111827] mb-3">
              Membership Progress: {cycleNumber} Used · {cyclesRemaining} Remaining
            </Text>

            {/* 12-segment Cycle Tracker Grid */}
            <View className="flex-row justify-between mb-4">
              {Array.from({ length: maxCycles }).map((_, index) => {
                const cycleIdx = index + 1;
                const isCompleted = cycleIdx < cycleNumber;
                const isCurrent = cycleIdx === cycleNumber;

                return (
                  <View key={index} className="items-center flex-1 mx-0.5">
                    <View className={`h-2.5 w-full rounded-full ${
                      isCompleted
                        ? "bg-[#1F7A3E]"
                        : isCurrent
                        ? isMembershipActive ? "bg-[#1F7A3E]" : "bg-red-400"
                        : "bg-gray-200"
                    }`} />
                    <Text className={`text-[9px] mt-1 font-bold ${
                      isCurrent ? "text-[#1F7A3E]" : "text-gray-400"
                    }`}>
                      {cycleIdx}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Repurchase Membership Button & Explanation (PRD Rule #11, #18, #19, #23) */}
            <View className="pt-2 border-t border-gray-100">
              {isMembershipActive ? (
                // Situation: Active membership -> Repurchase STRICTLY DISABLED
                <View>
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="lock-closed" size={16} color="#6B7280" />
                    <Text className="text-xs font-bold text-gray-700 ml-1.5">
                      Repurchase Disabled (Active Membership)
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 leading-relaxed mb-3">
                    Your current 30-day membership is active ({daysRemaining} days remaining). Early repurchase is strictly prohibited. If your credits are finished, please buy additional credits above.
                  </Text>
                  <Pressable
                    disabled={true}
                    className="h-11 rounded-xl bg-gray-100 border border-gray-200 items-center justify-center flex-row"
                  >
                    <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                    <Text className="text-gray-400 font-bold text-xs">
                      Repurchase Available After Expiry
                    </Text>
                  </Pressable>
                </View>
              ) : isPlanCompleted ? (
                // Situation: 12 Cycles Completed -> Plan completed
                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1">
                    Plan Completed (12 of 12 Cycles)
                  </Text>
                  <Text className="text-xs text-gray-500 leading-relaxed">
                    You have completed all 12 membership cycles under this plan. Thank you for your fitness commitment!
                  </Text>
                </View>
              ) : (
                // Situation: Expired + cycles remaining -> Repurchase ENABLED
                <View>
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="refresh-circle" size={18} color="#1F7A3E" />
                    <Text className="text-xs font-bold text-[#1F7A3E] ml-1.5">
                      Ready for Next Membership Cycle
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 leading-relaxed mb-3">
                    Your previous cycle has expired. Repurchase Membership {cycleNumber + 1} of {maxCycles} for 30 days of access.
                    {hasInrWallet ? ` Your ₹${formatINR(inrWallet?.balanceINR)} INR wallet will be auto-deducted.` : ""}
                  </Text>
                  <Pressable
                    onPress={handleRepurchaseMembership}
                    disabled={isRepurchasing}
                    className="h-12 rounded-xl bg-[#1F7A3E] active:bg-[#165a2d] items-center justify-center flex-row shadow-sm"
                  >
                    {isRepurchasing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="repeat" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text className="text-white font-bold text-sm">
                          Repurchase Membership (Cycle {cycleNumber + 1} of {maxCycles})
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
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