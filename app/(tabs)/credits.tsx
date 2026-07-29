import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  Modal, 
  TextInput, 
  Alert,
  FlatList,
  StyleSheet
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore, Transaction } from "@/store/useCreditsStore";
import { useUserStore } from "@/store/useUserStore";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { apiFetch } from "@/lib/api";
import { colors } from "@/constants/colors";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Animated3DCard } from "@/components/Animated3DCard";

export default function CreditsScreen() {
  const { 
    credits, 
    cashBalance, 
    transactions, 
    buyCredits, 
    topUpCash,
    convertCreditsToCash,
    convertCashToCredits,
    addTransaction 
  } = useCreditsStore();

  const { membershipStatus, membershipExpiry } = useUserStore();

  // Modals visibility state
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [cashModalVisible, setCashModalVisible] = useState(false);

  // Form states
  const [conversionType, setConversionType] = useState<"creditsToCash" | "cashToCredits">("creditsToCash");
  const [creditsToConvert, setCreditsToConvert] = useState("");
  const [cashToConvert, setCashToConvert] = useState("");
  const [cashToTopUp, setCashToTopUp] = useState("");

  const [sysSettings, setSysSettings] = useState({ creditPurchasePrice: 10, creditConversionValue: 8, cashExpiryDays: 15, initialVisitCut: 10 });

  React.useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await apiFetch("/api/content/settings");
        if (data.success && data.settings) {
          setSysSettings(data.settings);
        }
      } catch (err) {
        console.log("Failed to fetch settings", err);
      }
    }
    fetchSettings();
  }, []);

  const handleTopUpPress = () => {
    if (!membershipStatus || !membershipStatus.toLowerCase().includes("active")) {
      Alert.alert(
        "Membership Required", 
        "You must have an active gym membership to purchase additional credits. Let's get you a membership first!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Find a Gym", onPress: () => router.push("/buy-credits" as any) }
        ]
      );
      return;
    }
    router.push("/top-up-credits" as any);
  };

  const handleConvert = async () => {
    if (conversionType === "creditsToCash") {
      const amount = parseInt(creditsToConvert);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Invalid Input", "Please enter a valid positive number of credits.");
        return;
      }

      if (credits < amount) {
        Alert.alert("Insufficient Credits", `You only have ${credits} credits available.`);
        return;
      }

      const result = await convertCreditsToCash(amount);
      if (result.success) {
        const value = amount * sysSettings.creditConversionValue;
        Alert.alert("Success", `Converted ${amount} Credits into ₹${value} Cash Balance!`);
        setCreditsToConvert("");
        setConvertModalVisible(false);
        const token = useAuthStore.getState().token || "";
        useCreditsStore.getState().fetchWallet(token);
      } else {
        Alert.alert("Error", result.message || "Conversion failed. Please try again.");
      }
    } else {
      const amount = parseInt(cashToConvert); // This is credits to buy with cash
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Invalid Input", "Please enter a valid positive number of credits to buy.");
        return;
      }

      const cashRequired = amount * sysSettings.creditPurchasePrice;
      if (cashBalance < cashRequired) {
        Alert.alert("Insufficient Cash", `You need ₹${cashRequired} cash to buy ${amount} credits.`);
        return;
      }

      const result = await convertCashToCredits(amount);
      if (result.success) {
        Alert.alert("Success", `Converted ₹${cashRequired} Cash into ${amount} Credits!`);
        setCashToConvert("");
        setConvertModalVisible(false);
        const token = useAuthStore.getState().token || "";
        useCreditsStore.getState().fetchWallet(token);
      } else {
        Alert.alert("Error", result.message || "Conversion failed. Please try again.");
      }
    }
  };

  const handleTopUpCash = async () => {
    const amount = parseFloat(cashToTopUp);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid positive amount.");
      return;
    }

    const result = await topUpCash(amount);
    if (result.success) {
      Alert.alert("Success", `Successfully added ₹${amount} to your cash balance!`);
      setCashToTopUp("");
      setCashModalVisible(false);
    } else {
      Alert.alert("Payment Failed", result.message || "Failed to add cash.");
    }
  };

  const renderTransactionRow = (item: any) => {
    const isPositive = item.type === "credit" || item.amount > 0 || (typeof item.amount === 'string' && item.amount.toString().includes('+'));
    const isCash = item.currency === "cash" || (typeof item.description === 'string' && (item.description.includes("INR") || item.description.includes("₹") || item.description.includes("Court") || item.description.includes("Nutrition")));
    
    let iconName: any = item.icon || "leaf-outline";
    if (!item.icon) {
      const desc = (item.description || "").toLowerCase();
      if (desc.includes("gym") || desc.includes("visit")) iconName = "barbell-outline";
      else if (desc.includes("order") || desc.includes("nutrition") || desc.includes("shop") || desc.includes("product")) iconName = "bag-handle-outline";
      else if (desc.includes("purchase") || desc.includes("buy")) iconName = "add-circle-outline";
      else if (desc.includes("top up") || desc.includes("inr") || desc.includes("wallet")) iconName = "wallet-outline";
      else if (desc.includes("court") || desc.includes("badminton") || desc.includes("sports")) iconName = "trophy-outline";
    }

    const subtitle = item.subtitle || (
      (item.description || "").includes("Visit") ? "Outside Primary Zone" :
      (item.description || "").includes("Nutrition") ? "Order #ON12345" :
      (item.description || "").includes("Purchase") ? "250 CR Package" :
      (item.description || "").includes("Top Up") ? "Added to INR Wallet" :
      (item.description || "").includes("Court") ? "Match Booking" :
      item.date
    );

    const amountNum = Math.abs(item.amount);
    const amountStr = isCash ? `₹${amountNum.toLocaleString()}` : `${amountNum} CR`;

    return (
      <View key={item.id} className="flex-row justify-between items-center py-3.5 border-b border-gray-100 last:border-b-0">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-11 h-11 rounded-2xl bg-[#E8F5E9] items-center justify-center mr-3.5">
            <Ionicons name={iconName} size={20} color="#1F7A3E" />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-black" numberOfLines={1}>{item.description}</Text>
            <Text className="text-xs font-medium text-gray-400 mt-0.5" numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`text-[15px] font-bold ${isPositive ? "text-[#1F7A3E]" : "text-black"}`}>
            {isPositive ? "+" : "-"}{amountStr}
          </Text>
          <Text className="text-[11px] font-medium text-gray-400 mt-0.5">{item.date}</Text>
        </View>
      </View>
    );
  };

  const displayTransactions = transactions && transactions.length > 0 ? transactions : [
    { id: "tx-1", type: "debit", currency: "credit", amount: 20, description: "Gold's Gym Visit", subtitle: "Outside Primary Zone", date: "Today, 8:30 AM", icon: "barbell-outline" },
    { id: "tx-2", type: "debit", currency: "cash", amount: 1299, description: "Optimum Nutrition Wh...", subtitle: "Order #ON12345", date: "Yesterday, 5:45 PM", icon: "bag-handle-outline" },
    { id: "tx-3", type: "credit", currency: "credit", amount: 250, description: "Credit Purchase", subtitle: "250 CR Package", date: "2 Jul, 11:20 AM", icon: "add-circle-outline" },
    { id: "tx-4", type: "credit", currency: "cash", amount: 1000, description: "INR Top Up", subtitle: "Added to INR Wallet", date: "1 Jul, 9:10 PM", icon: "wallet-outline" },
    { id: "tx-5", type: "debit", currency: "cash", amount: 600, description: "Badminton Court", subtitle: "Match Booking", date: "1 Jul, 6:30 PM", icon: "trophy-outline" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Header */}
      <View className="flex-row justify-between items-start mb-6 px-5 pt-4">
        <View>
          <Text className="text-[32px] font-black text-black tracking-tight leading-10">Wallet</Text>
          <Text className="text-gray-400 text-[14px] font-medium mt-1">Manage your credits and INR wallet</Text>
        </View>
        <View className="flex-row items-center gap-x-3 mt-2">
          <Pressable 
            onPress={() => router.push("/booking-history" as any)}
            className="w-10 h-10 rounded-full border border-gray-200 items-center justify-center relative bg-white active:bg-gray-100 shadow-sm"
          >
            <Ionicons name="notifications-outline" size={20} color="black" />
            <View className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-orange-500 border border-white" />
          </Pressable>
          <Pressable 
            onPress={() => router.push("/profile" as any)}
            className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shadow-sm active:opacity-80 bg-gray-100 items-center justify-center"
          >
            <Ionicons name="person" size={22} color="#6B7280" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Section 1: FITNESS WALLET Hero Card */}
        <View className="px-5 mb-6">
          <View className="bg-[#1F7A3E] rounded-[28px] p-6 relative overflow-hidden border border-black/5" style={styles.cardShadow}>
            {/* Top row badge */}
            <View className="flex-row items-center mb-4">
              <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255, 255, 255, 0.85)" />
              <Text className="text-white/85 font-bold text-[11px] tracking-[1.5px] uppercase ml-1.5">FITNESS WALLET</Text>
            </View>

            {/* Split values row */}
            <View className="flex-row justify-between items-start mb-5">
              <View>
                <Text className="text-white/80 font-medium text-[13px] mb-1">Available Credits</Text>
                <View className="flex-row items-baseline">
                  <Text className="text-white font-black text-4xl mr-1">{credits}</Text>
                  <Text className="text-white font-bold text-lg">CR</Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="information-circle-outline" size={13} color="rgba(255, 255, 255, 0.75)" />
                  <Text className="text-white/75 text-xs font-medium ml-1">₹{credits * 10} Value</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-white/80 font-medium text-[13px] mb-1">INR Wallet</Text>
                <Text className="text-white font-black text-4xl">₹{cashBalance}</Text>
              </View>
            </View>

            {/* Bottom white capsule box */}
            <View className="bg-white rounded-[16px] h-9 w-full shadow-sm" />
          </View>
        </View>

        {/* Section 2: Quick Actions Row (4 Buttons) */}
        <View className="px-5 mb-8">
          <View className="flex-row justify-between gap-x-2.5">
            {/* Buy Credits */}
            <Pressable 
              onPress={handleTopUpPress}
              className="flex-1 bg-white rounded-[20px] py-4 px-1 items-center border border-black/5 shadow-sm active:bg-gray-50"
              style={styles.cardShadow}
            >
              <View className="w-11 h-11 rounded-2xl bg-[#E8F5E9] items-center justify-center mb-2">
                <Ionicons name="add-circle-outline" size={24} color="#1F7A3E" />
              </View>
              <Text className="text-black font-bold text-xs text-center">Buy Credits</Text>
            </Pressable>

            {/* Top Up INR */}
            <Pressable 
              onPress={() => router.push("/top-up-inr" as any)}
              className="flex-1 bg-white rounded-[20px] py-4 px-1 items-center border border-black/5 shadow-sm active:bg-gray-50"
              style={styles.cardShadow}
            >
              <View className="w-11 h-11 rounded-2xl bg-[#E8F5E9] items-center justify-center mb-2">
                <Text className="text-[#1F7A3E] font-extrabold text-lg">₹</Text>
              </View>
              <Text className="text-black font-bold text-xs text-center">Top Up INR</Text>
            </Pressable>

            {/* Convert */}
            <Pressable 
              onPress={() => router.push("/convert" as any)}
              className="flex-1 bg-white rounded-[20px] py-4 px-1 items-center border border-black/5 shadow-sm active:bg-gray-50"
              style={styles.cardShadow}
            >
              <View className="w-11 h-11 rounded-2xl bg-[#E8F5E9] items-center justify-center mb-2">
                <Ionicons name="swap-horizontal-outline" size={22} color="#1F7A3E" />
              </View>
              <Text className="text-black font-bold text-xs text-center">Convert</Text>
            </Pressable>

            {/* History */}
            <Pressable 
              onPress={() => router.push("/booking-history" as any)}
              className="flex-1 bg-white rounded-[20px] py-4 px-1 items-center border border-black/5 shadow-sm active:bg-gray-50"
              style={styles.cardShadow}
            >
              <View className="w-11 h-11 rounded-2xl bg-[#E8F5E9] items-center justify-center mb-2">
                <Ionicons name="time-outline" size={22} color="#1F7A3E" />
              </View>
              <Text className="text-black font-bold text-xs text-center">History</Text>
            </Pressable>
          </View>
        </View>

        {/* Section 3: Two Side-by-Side Cards (Use Credits For & Use INR For) */}
        {/* Note: Convert Credits -> INR box is intentionally excluded per user instructions */}
        <View className="px-5 mb-8">
          <View className="flex-row gap-x-3">
            {/* Use Credits For */}
            <View 
              className="flex-1 bg-[#EDF7EC] rounded-[24px] p-5 border border-[#1F7A3E]/15 flex-col justify-between min-h-[220px]"
              style={styles.cardShadow}
            >
              <View>
                <Text className="text-black font-bold text-[13px] mb-3">Use Credits For</Text>
                <View className="w-10 h-10 rounded-2xl bg-[#1F7A3E] items-center justify-center mb-3 shadow-sm">
                  <Ionicons name="barbell-outline" size={20} color="white" />
                </View>
                <Text className="text-[#1F7A3E] font-bold text-[15px] mb-1">Partner Gyms</Text>
                <Text className="text-gray-600 text-[11px] leading-relaxed mb-4 pr-1">Use at partner gyms outside your primary zone</Text>
              </View>
              <Pressable 
                onPress={() => router.push("/explore" as any)}
                className="bg-white border border-[#1F7A3E] px-4 py-2 rounded-full self-start shadow-sm active:bg-gray-50"
              >
                <Text className="text-[#1F7A3E] font-bold text-xs">View Gyms</Text>
              </Pressable>
            </View>

            {/* Use INR For */}
            <View 
              className="flex-1 bg-[#FFF9F5] rounded-[24px] p-5 border border-[#F59E0B]/20 flex-col justify-between min-h-[220px]"
              style={styles.cardShadow}
            >
              <View>
                <Text className="text-black font-bold text-[13px] mb-3">Use INR For</Text>
                <View className="flex-col gap-y-3.5 mb-6 mt-2">
                  <View className="flex-row items-center">
                    <Ionicons name="bag-handle" size={20} color="#F59E0B" />
                    <Text className="text-gray-900 font-bold text-[15px] ml-2.5">Products</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="trophy" size={20} color="#F59E0B" />
                    <Text className="text-gray-900 font-bold text-[15px] ml-2.5">Sports</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="heart" size={20} color="#F59E0B" />
                    <Text className="text-gray-900 font-bold text-[15px] ml-2.5">Services</Text>
                  </View>
                </View>
              </View>
              <Pressable 
                onPress={() => router.push("/marketplace" as any)}
                className="bg-[#F59E0B] px-5 py-2 rounded-full self-start shadow-sm active:opacity-90"
              >
                <Text className="text-white font-bold text-xs">Shop Now</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Section 4: You Saved with ZonoFit Card */}
        <View className="px-5 mb-8">
          <View className="bg-white rounded-[24px] p-5 border border-black/5" style={styles.cardShadow}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-black font-bold text-[15px]">You Saved with ZonoFit</Text>
              <Pressable onPress={() => setInfoModalVisible(true)} className="active:opacity-70">
                <Text className="text-[#1F7A3E] font-bold text-xs">View Details</Text>
              </Pressable>
            </View>
            <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
              <View className="flex-1">
                <Text className="text-[#1F7A3E] font-bold text-xl mb-0.5">₹4,820</Text>
                <Text className="text-gray-400 font-medium text-[11px]">Total savings</Text>
              </View>
              <View className="w-[1px] h-8 bg-gray-200 mx-2" />
              <View className="flex-1 pl-2">
                <Text className="text-black font-bold text-xl mb-0.5">38</Text>
                <Text className="text-gray-400 font-medium text-[11px]">Gym Visits</Text>
              </View>
              <View className="w-[1px] h-8 bg-gray-200 mx-2" />
              <View className="flex-1 pl-2">
                <Text className="text-black font-bold text-xl mb-0.5">12</Text>
                <Text className="text-gray-400 font-medium text-[11px]">Products</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 5: Recent Activity */}
        <View className="px-5 mb-4">
          <View className="flex-row justify-between items-end mb-3 px-1">
            <Text className="text-black font-bold text-base">Recent Activity</Text>
            <Pressable onPress={() => router.push("/booking-history" as any)} className="active:opacity-70">
              <Text className="text-[#1F7A3E] font-bold text-xs">View All</Text>
            </Pressable>
          </View>
          <View className="bg-white rounded-[24px] px-4 py-1 border border-black/5 mb-6" style={styles.cardShadow}>
            {displayTransactions.map((tx) => renderTransactionRow(tx))}
          </View>
        </View>
      </ScrollView>

      {/* MODAL: Convert Credits/Cash */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={convertModalVisible}
        onRequestClose={() => setConvertModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/80">
          <View className="rounded-t-[36px] p-6" style={{ backgroundColor: colors.bg }}>
            <View className="w-12 h-1.5 rounded-full mb-6 align-self-center mx-auto" style={{ backgroundColor: colors.secondary }} />
            
            <View className="flex-row rounded-2xl p-1 mb-6 border" style={{ backgroundColor: colors.surface, borderColor: colors.secondary }}>
              <Pressable
                onPress={() => setConversionType("creditsToCash")}
                className={`flex-1 py-2 rounded-xl items-center ${conversionType === "creditsToCash" ? "border" : ""}`}
                style={{
                  backgroundColor: conversionType === "creditsToCash" ? colors.bg : 'transparent',
                  borderColor: conversionType === "creditsToCash" ? colors.secondary : 'transparent'
                }}
              >
                <Text className="text-xs font-bold" style={{ color: conversionType === "creditsToCash" ? colors.amber : colors.muted }}>Credits → Cash</Text>
              </Pressable>
              <Pressable
                onPress={() => setConversionType("cashToCredits")}
                className={`flex-1 py-2 rounded-xl items-center ${conversionType === "cashToCredits" ? "border" : ""}`}
                style={{
                  backgroundColor: conversionType === "cashToCredits" ? colors.bg : 'transparent',
                  borderColor: conversionType === "cashToCredits" ? colors.secondary : 'transparent'
                }}
              >
                <Text className="text-xs font-bold" style={{ color: conversionType === "cashToCredits" ? colors.green : colors.muted }}>Cash → Credits</Text>
              </Pressable>
            </View>
            
            <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.amber }}>
              {conversionType === "creditsToCash" ? "Cash Out" : "Buy Credits"}
            </Text>
            <Text className="text-2xl font-bold mt-1" style={{ color: colors.text }}>
              {conversionType === "creditsToCash" ? "Convert Credits to Cash" : "Convert Cash to Credits"}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>
              {conversionType === "creditsToCash" 
                ? `Conversion rate: 1 Credit = ₹${sysSettings.creditConversionValue} cash balance`
                : `Conversion rate: ₹${sysSettings.creditPurchasePrice} cash balance = 1 Credit`
              }
            </Text>

            <View className="h-[1px] my-4" style={{ backgroundColor: colors.secondary }} />

            <View className="rounded-2xl p-4 border mb-6" style={{ backgroundColor: 'rgba(255, 176, 32, 0.1)', borderColor: 'rgba(255, 176, 32, 0.2)' }}>
              <View className="flex-row items-center">
                <Ionicons name="information-circle" size={18} color={colors.amber} />
                <Text className="font-bold text-xs ml-1.5" style={{ color: colors.amber }}>Conversion Asymmetry</Text>
              </View>
              <Text className="text-[10px] mt-1 leading-relaxed" style={{ color: colors.text }}>
                Credits are worth ₹{sysSettings.creditPurchasePrice} when booking visits in-network, but convert to ₹{sysSettings.creditConversionValue} when cashed out. Cashing out reduces your overall fitness purchasing power.
              </Text>
            </View>

            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-xs font-semibold mb-1.5 ml-1" style={{ color: colors.text }}>
                  {conversionType === "creditsToCash" 
                    ? `Credits to Convert (Available: ${credits})` 
                    : `Credits to Buy (Available Cash: ₹${cashBalance})`
                  }
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  placeholder={conversionType === "creditsToCash" ? "e.g. 50" : "e.g. 5"}
                  placeholderTextColor={colors.muted}
                  value={conversionType === "creditsToCash" ? creditsToConvert : cashToConvert}
                  onChangeText={conversionType === "creditsToCash" ? setCreditsToConvert : setCashToConvert}
                  style={styles.input}
                />
              </View>

              {conversionType === "creditsToCash" && creditsToConvert ? (
                <Text className="text-xs font-bold ml-1" style={{ color: colors.amber }}>
                  You will receive: ₹{parseInt(creditsToConvert) * sysSettings.creditConversionValue || 0}
                </Text>
              ) : null}

              {conversionType === "cashToCredits" && cashToConvert ? (
                <Text className="text-xs font-bold ml-1" style={{ color: colors.green }}>
                  Cash required: ₹{parseInt(cashToConvert) * sysSettings.creditPurchasePrice || 0}
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-x-4">
              <Pressable
                onPress={() => setConvertModalVisible(false)}
                className="flex-1 h-12 rounded-2xl items-center justify-center border active:opacity-70"
                style={{ backgroundColor: colors.surface, borderColor: colors.secondary }}
              >
                <Text className="font-bold text-sm" style={{ color: colors.text }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConvert}
                className={`flex-1 h-12 rounded-2xl items-center justify-center active:opacity-80`}
                style={[
                  { backgroundColor: conversionType === "creditsToCash" ? colors.amber : colors.green },
                  conversionType === "creditsToCash" ? styles.amberGlowSm : styles.emeraldGlowSm
                ]}
              >
                <Text className="font-bold text-sm" style={{ color: conversionType === "creditsToCash" ? colors.surface : colors.surface }}>Convert</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Cash Top Up */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cashModalVisible}
        onRequestClose={() => setCashModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/80">
          <View className="rounded-t-[36px] p-6" style={{ backgroundColor: colors.bg }}>
            <View className="w-12 h-1.5 rounded-full mb-6 align-self-center mx-auto" style={{ backgroundColor: colors.secondary }} />
            
            <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.green }}>Top Up Wallet</Text>
            <Text className="text-2xl font-bold mt-1" style={{ color: colors.text }}>Add Cash Balance</Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>Add test money to your wallet to buy credits packs.</Text>

            <View className="h-[1px] my-4" style={{ backgroundColor: colors.secondary }} />

            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-xs font-semibold mb-1.5 ml-1" style={{ color: colors.text }}>Top-Up Amount (INR)</Text>
                <TextInput
                  keyboardType="number-pad"
                  placeholder="e.g. 1000"
                  placeholderTextColor={colors.muted}
                  value={cashToTopUp}
                  onChangeText={setCashToTopUp}
                  style={styles.input}
                />
              </View>
            </View>

            <View className="flex-row gap-x-4">
              <Pressable
                onPress={() => setCashModalVisible(false)}
                className="flex-1 h-12 rounded-2xl items-center justify-center border active:opacity-70"
                style={{ backgroundColor: colors.surface, borderColor: colors.secondary }}
              >
                <Text className="font-bold text-sm" style={{ color: colors.text }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleTopUpCash}
                className="flex-1 h-12 rounded-2xl items-center justify-center active:opacity-80"
                style={[{ backgroundColor: colors.green }, styles.emeraldGlowSm]}
              >
                <Text className="font-bold text-sm" style={{ color: colors.surface }}>Add Cash</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: How Credits Work */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/80">
          <View className="rounded-t-[36px] p-6 max-h-[80%]" style={{ backgroundColor: colors.bg }}>
            <View className="w-12 h-1.5 rounded-full mb-6 align-self-center mx-auto" style={{ backgroundColor: colors.secondary }} />
            
            <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.green }}>Documentation</Text>
            <Text className="text-2xl font-bold mt-1" style={{ color: colors.text }}>ZonoFit Credit Rules</Text>

            <View className="h-[1px] my-4" style={{ backgroundColor: colors.secondary }} />

            <ScrollView className="space-y-4 mb-6" showsVerticalScrollIndicator={false}>
              <View className="flex-row gap-x-3 items-start">
                <Ionicons name="fitness-outline" size={18} color={colors.green} className="mt-0.5" />
                <View className="flex-1">
                  <Text className="font-bold text-sm" style={{ color: colors.text }}>1 Credit = ₹10 Fitness Value</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>When spent in-network to book partner gym visits, credits maximize your value.</Text>
                </View>
              </View>

              <View className="flex-row gap-x-3 items-start">
                <Ionicons name="cash-outline" size={18} color={colors.amber} className="mt-0.5" />
                <View className="flex-1">
                  <Text className="font-bold text-sm" style={{ color: colors.text }}>1 Credit = ₹8 Cash Value</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>When cashing out or converting credits into spendable cash balance outside the gym network.</Text>
                </View>
              </View>

              <View className="flex-row gap-x-3 items-start">
                <Ionicons name="time-outline" size={18} color={colors.coral} className="mt-0.5" />
                <View className="flex-1">
                  <Text className="font-bold text-sm" style={{ color: colors.text }}>Credits Tied to Membership</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>When your gym membership expires, unused credits automatically convert to cash (₹{sysSettings.creditConversionValue}/credit). This cash balance expires entirely after {sysSettings.cashExpiryDays} days.</Text>
                </View>
              </View>

              <View className="flex-row gap-x-3 items-start">
                <Ionicons name="shield-checkmark-outline" size={18} color="#059669" className="mt-0.5" />
                <View className="flex-1">
                  <Text className="font-bold text-sm" style={{ color: colors.text }}>Pricing Control</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>Different partner gyms require different credit amounts based on category and equipment. ZonoFit retains final pricing control.</Text>
                </View>
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setInfoModalVisible(false)}
              className="h-12 rounded-2xl items-center justify-center border active:opacity-70"
              style={{ backgroundColor: colors.surface, borderColor: colors.secondary }}
            >
              <Text className="font-bold text-sm" style={{ color: colors.text }}>Close Rules</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    color: colors.text,
    fontWeight: "500",
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  softShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emeraldGlow: {
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 15,
  },
  emeraldGlowSm: {
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  neonGlowSm: {
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  amberGlowSm: {
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  }
});