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

  const renderTransactionRow = ({ item }: { item: Transaction }) => {
    const isCredit = item.type === "credit";
    const isCash = item.currency === "cash";
    
    return (
      <View className="flex-row justify-between items-center py-4 border-b" style={{ borderBottomColor: colors.secondary }}>
        <View className="flex-1 mr-4">
          <Text className="text-sm font-bold" style={{ color: colors.text }}>{item.description}</Text>
          <Text className="text-[10px] mt-1" style={{ color: colors.muted }}>{item.date}</Text>
        </View>
        <Text 
          className="text-sm font-extrabold"
          style={{ color: isCredit ? colors.green : colors.text }}
        >
          {isCredit ? "+" : "-"}
          {isCash ? `₹${item.amount}` : `${item.amount} Credits`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-2 flex-row justify-between items-center">
        <Text className="text-2xl font-bold" style={{ color: colors.text }}>Credits & Wallet</Text>
        <View className="flex-row items-center gap-x-3">
          <Pressable 
            onPress={() => router.push("/marketplace" as any)}
            className="w-9 h-9 rounded-full items-center justify-center border active:scale-[0.95] transition-transform"
            style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
          >
            <Ionicons name="cart-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable 
            onPress={() => setInfoModalVisible(true)}
            className="w-9 h-9 rounded-full items-center justify-center border active:scale-[0.95] transition-transform"
            style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Section 1: Credit Overview Card */}
        <View className="px-5 mt-4">
          <Animated3DCard scaleDown={0.97}>
            <View 
              className="rounded-[28px] overflow-hidden p-6 relative"
              style={[{ backgroundColor: colors.green }, styles.emeraldGlow]}
            >
              <View className="absolute top-[-40px] right-[-40px] w-36 h-36 rounded-full bg-white/5" />
              
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>Fitness Credits</Text>
                  <Text className="text-5xl font-black text-white mt-1">{credits}</Text>
                </View>
                
                <Pressable 
                  onPress={handleTopUpPress}
                  className="px-4 py-2.5 rounded-2xl border active:opacity-80"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Text className="text-white font-bold text-xs">Top Up</Text>
                </Pressable>
              </View>

              <View className="mt-5">
                <Text className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  ≈ ₹{credits * 10} Fitness Value · {membershipStatus}
                </Text>
              </View>
            </View>
          </Animated3DCard>
        </View>

        {/* Section 1.5: Converted Cash Overview Card */}
        <View className="px-5 mt-4">
          <Animated3DCard scaleDown={0.98}>
            <View className="rounded-[28px] overflow-hidden border p-6" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Converted Cash</Text>
                  <Text className="text-3xl font-black mt-1" style={{ color: colors.text }}>₹{cashBalance}</Text>
                </View>
                <Pressable 
                  onPress={() => setCashModalVisible(true)}
                  className="px-4 py-2.5 rounded-2xl border active:opacity-80"
                  style={{ backgroundColor: 'rgba(217, 255, 92, 0.1)', borderColor: 'rgba(217, 255, 92, 0.2)' }}
                >
                  <Text className="font-bold text-xs" style={{ color: colors.green }}>Top Up</Text>
                </Pressable>
              </View>
              <Pressable 
                onPress={() => setConvertModalVisible(true)}
                className="w-full py-3 rounded-2xl border active:opacity-80 items-center"
                style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.amberGlowSm]}
              >
                <Text className="font-bold text-xs" style={{ color: colors.amber }}>Convert Balance</Text>
              </Pressable>
            </View>
          </Animated3DCard>
        </View>

        {/* Section 2: Quick Actions Grid */}
        <View>
          <Text className="text-xs font-bold uppercase tracking-wider mt-6 mb-3 ml-6" style={{ color: colors.muted }}>Quick Actions</Text>
          <View className="px-5 flex-row gap-x-4">
            {/* Action 1: Buy Credits */}
            <Animated3DCard style={{ flex: 1 }} scaleDown={0.93} onPress={handleTopUpPress}>
              <View 
                className="flex-1 rounded-3xl p-5 border items-center"
                style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center mb-3" style={{ backgroundColor: 'rgba(11, 110, 79, 0.1)' }}>
                  <Ionicons name="add" size={20} color={colors.green} />
                </View>
                <Text className="font-bold text-sm" style={{ color: colors.text }}>Buy Credits</Text>
                <Text className="text-[10px] text-center mt-1" style={{ color: colors.muted }}>Get more gym visits</Text>
              </View>
            </Animated3DCard>

            {/* Action 2: Convert Credits */}
            <Animated3DCard style={{ flex: 1 }} scaleDown={0.93} onPress={() => setConvertModalVisible(true)}>
              <View 
                className="flex-1 rounded-3xl p-5 border items-center"
                style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center mb-3 border" style={{ backgroundColor: 'rgba(255, 176, 32, 0.1)', borderColor: 'rgba(255, 176, 32, 0.2)' }}>
                  <Ionicons name="swap-horizontal" size={18} color={colors.amber} />
                </View>
                <Text className="font-bold text-sm" style={{ color: colors.text }}>Convert</Text>
                <Text className="text-[10px] text-center mt-1" style={{ color: colors.muted }}>Convert to cash</Text>
              </View>
            </Animated3DCard>

            {/* Action 3: Learn Rules */}
            <Animated3DCard style={{ flex: 1 }} scaleDown={0.93} onPress={() => setInfoModalVisible(true)}>
              <View 
                className="flex-1 rounded-3xl p-5 border items-center"
                style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center mb-3 border" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                  <Ionicons name="book-outline" size={18} color="#3B82F6" />
                </View>
                <Text className="font-bold text-sm" style={{ color: colors.text }}>Rules</Text>
                <Text className="text-[10px] text-center mt-1" style={{ color: colors.muted }}>How credits work</Text>
              </View>
            </Animated3DCard>
          </View>
        </View>

        {/* Section 2.5: Shop By Category */}
        <View>
          <View className="flex-row justify-between items-end mt-8 mb-3 px-6">
            <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Shop By Category</Text>
            <Pressable onPress={() => router.push("/marketplace" as any)} className="active:opacity-70">
              <Text className="text-xs font-bold" style={{ color: colors.green }}>View All</Text>
            </Pressable>
          </View>
          <View className="px-5 flex-row flex-wrap justify-between gap-y-4">
            {/* Card 1: Products */}
            <Animated3DCard style={{ width: '48%' }} scaleDown={0.96} onPress={() => router.push("/marketplace" as any)}>
              <View 
                className="rounded-[20px] p-4 border h-40 overflow-hidden relative"
                style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.softShadow]}
              >
                <View className="z-10">
                  <Text className="font-bold text-sm" style={{ color: colors.textLight }}>Products</Text>
                  <Text className="text-[10px] mt-1 pr-2 leading-tight" style={{ color: colors.muted }}>Supplements, accessories & more</Text>
                </View>
                <View className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full flex-row items-center gap-x-1 z-10" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <Text className="text-[10px] font-bold" style={{ color: colors.textLight }}>Explore</Text>
                  <Ionicons name="chevron-forward" size={10} color={colors.textLight} />
                </View>
              </View>
            </Animated3DCard>

            {/* Card 2: Sports & Activities */}
            <Animated3DCard style={{ width: '48%' }} scaleDown={0.96} onPress={() => router.push("/marketplace" as any)}>
              <View 
                className="rounded-[20px] p-4 border h-40 overflow-hidden relative"
                style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
              >
                <View className="z-10">
                  <Text className="font-bold text-sm" style={{ color: colors.text }}>Sports & Activities</Text>
                  <Text className="text-[10px] mt-1 pr-2 leading-tight" style={{ color: colors.muted }}>Book courts, sessions & classes</Text>
                </View>
                <View className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full flex-row items-center gap-x-1 z-10 border" style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}>
                  <Text className="text-[10px] font-bold" style={{ color: colors.text }}>Explore</Text>
                  <Ionicons name="chevron-forward" size={10} color={colors.text} />
                </View>
              </View>
            </Animated3DCard>

            {/* Card 3: Apparel & Gear */}
            <Animated3DCard style={{ width: '48%' }} scaleDown={0.96} onPress={() => router.push("/marketplace" as any)}>
              <View 
                className="rounded-[20px] p-4 border h-40 overflow-hidden relative"
                style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.softShadow]}
              >
                <View className="z-10">
                  <Text className="font-bold text-sm" style={{ color: colors.textLight }}>Apparel & Gear</Text>
                  <Text className="text-[10px] mt-1 pr-2 leading-tight" style={{ color: colors.muted }}>Gym wear, shoes & accessories</Text>
                </View>
                <View className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full flex-row items-center gap-x-1 z-10 border" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: colors.secondaryDark }}>
                  <Text className="text-[10px] font-bold" style={{ color: colors.textLight }}>Explore</Text>
                  <Ionicons name="chevron-forward" size={10} color={colors.textLight} />
                </View>
              </View>
            </Animated3DCard>

            {/* Card 4: Recovery & Wellness */}
            <Animated3DCard style={{ width: '48%' }} scaleDown={0.96} onPress={() => router.push("/marketplace" as any)}>
              <View 
                className="rounded-[20px] p-4 border h-40 overflow-hidden relative"
                style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
              >
                <View className="z-10">
                  <Text className="font-bold text-sm" style={{ color: colors.text }}>Recovery & Wellness</Text>
                  <Text className="text-[10px] mt-1 pr-2 leading-tight" style={{ color: colors.muted }}>Massage, physio, ice bath & more</Text>
                </View>
                <View className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full flex-row items-center gap-x-1 z-10 border" style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}>
                  <Text className="text-[10px] font-bold" style={{ color: colors.text }}>Explore</Text>
                  <Ionicons name="chevron-forward" size={10} color={colors.text} />
                </View>
              </View>
            </Animated3DCard>
          </View>
        </View>

        {/* Section 3: Recent Activity Ledger */}
        <View>
          <View className="flex-row justify-between items-end mt-6 mb-3 px-6">
            <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.muted }}>Recent Activity</Text>
            <Pressable onPress={() => router.push("/transactions" as any)} className="active:opacity-70">
              <Text className="text-xs font-bold" style={{ color: colors.green }}>View All</Text>
            </Pressable>
          </View>
          <View className="mx-5 rounded-[28px] p-5 border" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
            {transactions.length === 0 ? (
              <Text className="text-center text-xs py-4" style={{ color: colors.muted }}>No recent activity found.</Text>
            ) : (
              transactions.map((tx) => (
                <View key={tx.id}>
                  {renderTransactionRow({ item: tx })}
                </View>
              ))
            )}
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