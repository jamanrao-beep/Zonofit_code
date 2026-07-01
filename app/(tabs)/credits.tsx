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

export default function CreditsScreen() {
  const { 
    credits, 
    cashBalance, 
    transactions, 
    buyCredits, 
    topUpCash,
    convertCreditsToCash,
    addTransaction 
  } = useCreditsStore();

  const { membershipStatus, membershipExpiry } = useUserStore();

  // Modals visibility state
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [cashModalVisible, setCashModalVisible] = useState(false);

  // Form states
  const [creditsToConvert, setCreditsToConvert] = useState("");
  const [cashToTopUp, setCashToTopUp] = useState("");

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
      const value = amount * 8;
      Alert.alert("Success", `Converted ${amount} Credits into ₹${value} Cash Balance!`);
      setCreditsToConvert("");
      setConvertModalVisible(false);
      // Fetch latest wallet state to update transactions
      const token = useAuthStore.getState().token || "";
      useCreditsStore.getState().fetchWallet(token);
    } else {
      Alert.alert("Error", result.message || "Conversion failed. Please try again.");
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
      <View className="flex-row justify-between items-center py-4 border-b border-black/5">
        <View className="flex-1 mr-4">
          <Text className="text-sm font-bold text-[#1F2520]">{item.description}</Text>
          <Text className="text-[10px] text-[#6B756E] mt-1">{item.date}</Text>
        </View>
        <Text 
          className={`text-sm font-extrabold ${
            isCredit ? "text-emerald-600" : "text-[#1F2520]"
          }`}
        >
          {isCredit ? "+" : "-"}
          {isCash ? `₹${item.amount}` : `${item.amount} Credits`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-2 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-[#1F2520]">Credits & Wallet</Text>
        <View className="flex-row items-center gap-x-3">
          <Pressable 
            onPress={() => router.push("/marketplace" as any)}
            className="w-9 h-9 rounded-full bg-[#E9EBE6] items-center justify-center border border-black/5"
          >
            <Ionicons name="cart-outline" size={20} color="#6B756E" />
          </Pressable>
          <Pressable 
            onPress={() => setInfoModalVisible(true)}
            className="w-9 h-9 rounded-full bg-[#E9EBE6] items-center justify-center border border-black/5"
          >
            <Ionicons name="help-circle-outline" size={20} color="#6B756E" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Section 1: Credit Overview Card */}
        <View className="px-5 mt-4">
          <View className="bg-emerald-600 rounded-[28px] overflow-hidden shadow-sm p-6 relative">
            <View className="absolute top-[-40px] right-[-40px] w-36 h-36 rounded-full bg-emerald-500/20" />
            
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Fitness Credits</Text>
                <Text className="text-5xl font-black text-white mt-1">{credits}</Text>
              </View>
              
              <Pressable 
                onPress={handleTopUpPress}
                className="bg-white/20 px-4 py-2.5 rounded-2xl border border-white/20 active:opacity-80"
              >
                <Text className="text-white font-bold text-xs">Top Up</Text>
              </Pressable>
            </View>

            <View className="mt-5">
              <Text className="text-emerald-100 text-xs font-medium">
                ≈ ₹{credits * 10} Fitness Value · {membershipStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 1.5: Converted Cash Overview Card */}
        <View className="px-5 mt-4">
          <View className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-black/5 p-6 flex-row justify-between items-center">
            <View>
              <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider">Converted Cash</Text>
              <Text className="text-3xl font-black text-[#1F2520] mt-1">₹{cashBalance}</Text>
            </View>
            <Pressable 
              onPress={() => setConvertModalVisible(true)}
              className="bg-amber-50 px-4 py-2.5 rounded-2xl border border-amber-100 active:opacity-80"
            >
              <Text className="text-amber-800 font-bold text-xs">Convert</Text>
            </Pressable>
          </View>
        </View>

        {/* Section 2: Quick Actions Grid */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mt-6 mb-3 ml-6">Quick Actions</Text>
        <View className="px-5 flex-row gap-x-4">
          {/* Action 1: Buy Credits */}
          <Pressable 
            onPress={handleTopUpPress}
            className="flex-1 bg-white rounded-3xl p-5 border border-black/5 shadow-sm items-center active:opacity-80"
          >
            <View className="w-10 h-10 rounded-full bg-[#EAF7EC] items-center justify-center mb-3">
              <Ionicons name="add" size={20} color="#6BCB77" />
            </View>
            <Text className="font-bold text-sm text-[#1F2520]">Buy Credits</Text>
            <Text className="text-[10px] text-[#6B756E] text-center mt-1">Get more gym visits</Text>
          </Pressable>

          {/* Action 2: Convert Credits */}
          <Pressable 
            onPress={() => setConvertModalVisible(true)}
            className="flex-1 bg-white rounded-3xl p-5 border border-black/5 shadow-sm items-center active:opacity-80"
          >
            <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mb-3 border border-amber-100">
              <Ionicons name="swap-horizontal" size={18} color="#D97706" />
            </View>
            <Text className="font-bold text-sm text-[#1F2520]">Convert</Text>
            <Text className="text-[10px] text-[#6B756E] text-center mt-1">Convert credits to cash</Text>
          </Pressable>

          {/* Action 3: Learn Rules */}
          <Pressable 
            onPress={() => setInfoModalVisible(true)}
            className="flex-1 bg-white rounded-3xl p-5 border border-black/5 shadow-sm items-center active:opacity-80"
          >
            <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mb-3 border border-blue-100">
              <Ionicons name="book-outline" size={18} color="#2563EB" />
            </View>
            <Text className="font-bold text-sm text-[#1F2520]">Rules</Text>
            <Text className="text-[10px] text-[#6B756E] text-center mt-1">How credits work</Text>
          </Pressable>
        </View>

        {/* Section 3: Recent Activity Ledger */}
        <View className="flex-row justify-between items-end mt-6 mb-3 px-6">
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider">Recent Activity</Text>
          <Pressable onPress={() => router.push("/transactions" as any)} className="active:opacity-70">
            <Text className="text-xs font-bold text-emerald-600">View All</Text>
          </Pressable>
        </View>
        <View className="mx-5 bg-white rounded-[28px] p-5 border border-black/5 shadow-sm">
          {transactions.length === 0 ? (
            <Text className="text-center text-xs text-[#6B756E] py-4">No recent activity found.</Text>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id}>
                {renderTransactionRow({ item: tx })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* MODAL: Convert Credits */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={convertModalVisible}
        onRequestClose={() => setConvertModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[36px] p-6">
            <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-6 align-self-center mx-auto" />
            
            <Text className="text-xs font-bold text-[#D97706] uppercase tracking-wider">Cash Conversion</Text>
            <Text className="text-2xl font-bold text-[#1F2520] mt-1">Convert Credits to Cash</Text>
            <Text className="text-xs text-[#6B756E] mt-0.5">Conversion rate: 1 Credit = ₹8 cash balance</Text>

            <View className="h-[1px] bg-black/5 my-4" />

            <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="information-circle" size={18} color="#D97706" />
                <Text className="text-[#D97706] font-bold text-xs ml-1.5">Conversion Asymmetry</Text>
              </View>
              <Text className="text-[10px] text-amber-800 mt-1 leading-relaxed">
                Credits are worth ₹10 when booking visits in-network, but convert to ₹8 when cashed out. Cashing out reduces your overall fitness purchasing power.
              </Text>
            </View>

            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-xs font-semibold text-[#1F2520] mb-1.5 ml-1">Credits to Convert (Available: {credits})</Text>
                <TextInput
                  keyboardType="number-pad"
                  placeholder="e.g. 50"
                  placeholderTextColor="#A0A5A1"
                  value={creditsToConvert}
                  onChangeText={setCreditsToConvert}
                  style={styles.input}
                />
              </View>

              {creditsToConvert ? (
                <Text className="text-xs font-bold text-amber-700 ml-1">
                  You will receive: ₹{parseInt(creditsToConvert) * 8 || 0}
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-x-4">
              <Pressable
                onPress={() => setConvertModalVisible(false)}
                className="flex-1 bg-[#F5F7F4] h-12 rounded-2xl items-center justify-center border border-black/5"
              >
                <Text className="text-[#6B756E] font-bold text-sm">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleConvert}
                className="flex-1 bg-amber-600 h-12 rounded-2xl items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">Convert Credits</Text>
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
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[36px] p-6">
            <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-6 align-self-center mx-auto" />
            
            <Text className="text-xs font-bold text-[#6BCB77] uppercase tracking-wider">Top Up Wallet</Text>
            <Text className="text-2xl font-bold text-[#1F2520] mt-1">Add Cash Balance</Text>
            <Text className="text-xs text-[#6B756E] mt-0.5">Add test money to your wallet to buy credits packs.</Text>

            <View className="h-[1px] bg-black/5 my-4" />

            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-xs font-semibold text-[#1F2520] mb-1.5 ml-1">Top-Up Amount (INR)</Text>
                <TextInput
                  keyboardType="number-pad"
                  placeholder="e.g. 1000"
                  placeholderTextColor="#A0A5A1"
                  value={cashToTopUp}
                  onChangeText={setCashToTopUp}
                  style={styles.input}
                />
              </View>
            </View>

            <View className="flex-row gap-x-4">
              <Pressable
                onPress={() => setCashModalVisible(false)}
                className="flex-1 bg-[#F5F7F4] h-12 rounded-2xl items-center justify-center border border-black/5"
              >
                <Text className="text-[#6B756E] font-bold text-sm">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleTopUpCash}
                className="flex-1 bg-[#6BCB77] h-12 rounded-2xl items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">Add Cash</Text>
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
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[36px] p-6 max-h-[80%]">
            <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-6 align-self-center mx-auto" />
            
            <Text className="text-xs font-bold text-[#6BCB77] uppercase tracking-wider">Documentation</Text>
            <Text className="text-2xl font-bold text-[#1F2520] mt-1">ZonoFit Credit Rules</Text>

            <View className="h-[1px] bg-black/5 my-4" />

            <ScrollView className="space-y-4 mb-6" showsVerticalScrollIndicator={false}>
              <View className="flex-row gap-x-3 items-start">
                <Ionicons name="fitness-outline" size={18} color="#6BCB77" className="mt-0.5" />
                <View className="flex-1">
                  <Text className="font-bold text-sm text-[#1F2520]">1 Credit = ₹10 Fitness Value</Text>
                  <Text className="text-xs text-[#6B756E] mt-0.5">When spent in-network to book partner gym visits, credits maximize your value.</Text>
                </View>
              </View>

              <View className="flex-row gap-x-3 items-start">
                <Ionicons name="cash-outline" size={18} color="#D97706" className="mt-0.5" />
                <View className="flex-1">
                  <Text className="font-bold text-sm text-[#1F2520]">1 Credit = ₹8 Cash Value</Text>
                  <Text className="text-xs text-[#6B756E] mt-0.5">When cashing out or converting credits into spendable cash balance outside the gym network.</Text>
                </View>
              </View>

              <View className="flex-row gap-x-3 items-start">
                <Ionicons name="time-outline" size={18} color="#EF4444" className="mt-0.5" />
                <View className="flex-1">
                  <Text className="font-bold text-sm text-[#1F2520]">Credits Tied to Membership</Text>
                  <Text className="text-xs text-[#6B756E] mt-0.5">When your gym membership expires, unused credits automatically convert to cash (₹8/credit). This cash balance expires entirely after 15 days.</Text>
                </View>
              </View>

              <View className="flex-row gap-x-3 items-start">
                <Ionicons name="shield-checkmark-outline" size={18} color="#059669" className="mt-0.5" />
                <View className="flex-1">
                  <Text className="font-bold text-sm text-[#1F2520]">Pricing Control</Text>
                  <Text className="text-xs text-[#6B756E] mt-0.5">Different partner gyms require different credit amounts based on category and equipment. ZonoFit retains final pricing control.</Text>
                </View>
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setInfoModalVisible(false)}
              className="bg-[#F5F7F4] h-12 rounded-2xl items-center justify-center border border-black/5"
            >
              <Text className="text-[#6B756E] font-bold text-sm">Close Rules</Text>
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
    backgroundColor: "#F5F7F4",
    borderRadius: 16,
    color: "#1F2520",
    fontWeight: "500",
    borderWidth: 1,
    borderColor: "transparent",
  },
});