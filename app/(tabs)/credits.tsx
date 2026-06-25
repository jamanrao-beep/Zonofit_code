import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  Modal, 
  TextInput, 
  Alert,
  FlatList
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore, Transaction } from "@/store/useCreditsStore";
import { useUserStore } from "@/store/useUserStore";

export default function CreditsScreen() {
  const { 
    credits, 
    cashBalance, 
    transactions, 
    buyCredits, 
    convertCreditsToCash,
    addTransaction 
  } = useCreditsStore();

  const { membershipStatus, membershipExpiry } = useUserStore();

  // Modals visibility state
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [cashModalVisible, setCashModalVisible] = useState(false);

  // Form states
  const [creditsToConvert, setCreditsToConvert] = useState("");
  const [cashToTopUp, setCashToTopUp] = useState("");

  const creditPacks = [
    { id: "pack-1", credits: 50, cost: 500, label: "Starter Pack" },
    { id: "pack-2", credits: 100, cost: 1000, label: "Popular Pack" },
    { id: "pack-3", credits: 250, cost: 2300, label: "Value Pack (Save ₹200)" },
    { id: "pack-4", credits: 500, cost: 4500, label: "Mega Pack (Save ₹500)" },
  ];

  const handleBuyPack = (pack: typeof creditPacks[0]) => {
    if (cashBalance < pack.cost) {
      Alert.alert(
        "Insufficient Cash Balance",
        `This pack costs ₹${pack.cost}, but your cash balance is ₹${cashBalance}. Please top up your cash balance first.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top Up Cash", onPress: () => {
              setBuyModalVisible(false);
              setCashModalVisible(true);
            } 
          }
        ]
      );
      return;
    }

    const success = buyCredits(pack.credits, pack.cost);
    if (success) {
      Alert.alert("Success", `Successfully purchased ${pack.credits} Credits for ₹${pack.cost}!`);
      setBuyModalVisible(false);
    }
  };

  const handleConvert = () => {
    const amount = parseInt(creditsToConvert);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid positive number of credits.");
      return;
    }

    if (credits < amount) {
      Alert.alert("Insufficient Credits", `You only have ${credits} credits available.`);
      return;
    }

    const success = convertCreditsToCash(amount);
    if (success) {
      const value = amount * 8;
      Alert.alert("Success", `Converted ${amount} Credits into ₹${value} Cash Balance!`);
      setCreditsToConvert("");
      setConvertModalVisible(false);
    } else {
      Alert.alert("Error", "Conversion failed. Please try again.");
    }
  };

  const handleTopUpCash = () => {
    const amount = parseFloat(cashToTopUp);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid positive amount.");
      return;
    }

    useCreditsStore.setState((state) => ({
      cashBalance: state.cashBalance + amount,
    }));
    addTransaction("credit", amount, "cash", "Topped Up Cash Balance");
    
    Alert.alert("Success", `Successfully added ₹${amount} to your cash balance!`);
    setCashToTopUp("");
    setCashModalVisible(false);
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
        <Pressable 
          onPress={() => setInfoModalVisible(true)}
          className="w-9 h-9 rounded-full bg-[#E9EBE6] items-center justify-center border border-black/5"
        >
          <Ionicons name="help-circle-outline" size={20} color="#6B756E" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Section 1: Credit & Cash Overview Split Card */}
        <View className="px-5 mt-4">
          <View className="bg-white rounded-[28px] overflow-hidden border border-black/5 shadow-sm">
            {/* Top section: Fitness Credits */}
            <View className="bg-emerald-600 p-6 relative">
              <View className="absolute top-[-40px] right-[-40px] w-36 h-36 rounded-full bg-emerald-500/20" />
              <Text className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Fitness Credits</Text>
              <Text className="text-4xl font-black text-white mt-1">{credits}</Text>
              <Text className="text-emerald-100 text-xs mt-1.5 font-medium">
                ≈ ₹{credits * 10} Fitness Value · {membershipStatus}
              </Text>
              <Text className="text-emerald-200 text-[10px] mt-0.5">
                Valid until {membershipExpiry}
              </Text>
            </View>

            {/* Bottom section: Cash Balance */}
            <View className="p-6 bg-white flex-row justify-between items-center">
              <View>
                <Text className="text-[#6B756E] text-xs font-semibold uppercase tracking-wider">INR Cash Balance</Text>
                <Text className="text-2xl font-bold text-[#1F2520] mt-0.5">₹{cashBalance}</Text>
                <Text className="text-[10px] text-[#6B756E] mt-0.5">Spendable outside the gym network</Text>
              </View>
              <Pressable 
                onPress={() => setCashModalVisible(true)}
                className="bg-[#EAF7EC] px-4 py-2.5 rounded-2xl"
              >
                <Text className="text-[#6BCB77] font-bold text-xs">Top Up</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Section 2: Quick Actions Grid */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mt-6 mb-3 ml-6">Quick Actions</Text>
        <View className="px-5 flex-row gap-x-4">
          {/* Action 1: Buy Credits */}
          <Pressable 
            onPress={() => setBuyModalVisible(true)}
            className="flex-1 bg-white rounded-3xl p-5 border border-black/5 shadow-sm items-center active:scale-95"
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
            className="flex-1 bg-white rounded-3xl p-5 border border-black/5 shadow-sm items-center active:scale-95"
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
            className="flex-1 bg-white rounded-3xl p-5 border border-black/5 shadow-sm items-center active:scale-95"
          >
            <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mb-3 border border-blue-100">
              <Ionicons name="book-outline" size={18} color="#2563EB" />
            </View>
            <Text className="font-bold text-sm text-[#1F2520]">Rules</Text>
            <Text className="text-[10px] text-[#6B756E] text-center mt-1">How credits work</Text>
          </Pressable>
        </View>

        {/* Section 3: Recent Activity Ledger */}
        <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mt-6 mb-3 ml-6">Recent Activity</Text>
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

      {/* MODAL: Buy Credits */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={buyModalVisible}
        onRequestClose={() => setBuyModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[36px] p-6 max-h-[85%]">
            <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-6 align-self-center mx-auto" />
            
            <Text className="text-xs font-bold text-[#6BCB77] uppercase tracking-wider">Purchase</Text>
            <Text className="text-2xl font-bold text-[#1F2520] mt-1">Choose Credits Pack</Text>
            <Text className="text-xs text-[#6B756E] mt-0.5">Your cash balance: ₹{cashBalance}</Text>

            <View className="h-[1px] bg-black/5 my-4" />

            <ScrollView className="space-y-3 mb-6" showsVerticalScrollIndicator={false}>
              {creditPacks.map((pack) => (
                <Pressable
                  key={pack.id}
                  onPress={() => handleBuyPack(pack)}
                  className="bg-[#F5F7F4] border border-black/5 rounded-2xl p-4 flex-row justify-between items-center active:bg-[#EAF7EC] active:border-[#6BCB77]"
                >
                  <View>
                    <Text className="font-bold text-sm text-[#1F2520]">{pack.label}</Text>
                    <Text className="text-xs text-[#6B756E] mt-0.5">Adds {pack.credits} Credits</Text>
                  </View>
                  <View className="bg-white border border-black/5 px-4 py-2 rounded-xl">
                    <Text className="text-emerald-700 font-extrabold text-sm">₹{pack.cost}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => setBuyModalVisible(false)}
              className="bg-[#F5F7F4] h-12 rounded-2xl items-center justify-center border border-black/5"
            >
              <Text className="text-[#6B756E] font-bold text-sm">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
                  className="h-12 px-4 bg-[#F5F7F4] rounded-2xl text-[#1F2520] font-medium border border-transparent focus:border-amber-500"
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
                  className="h-12 px-4 bg-[#F5F7F4] rounded-2xl text-[#1F2520] font-medium border border-transparent focus:border-[#6BCB77]"
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
                  <Text className="font-bold text-sm text-[#1F2520]">Credit Expiration Rules</Text>
                  <Text className="text-xs text-[#6B756E] mt-0.5">Credits remain active during an active membership. They expire 15 days after membership expiration and are non-recoverable.</Text>
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