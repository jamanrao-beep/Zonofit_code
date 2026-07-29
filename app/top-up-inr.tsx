import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore } from "@/store/useCreditsStore";

export default function TopUpInrScreen() {
  const router = useRouter();
  const { topUpCash, transactions } = useCreditsStore();
  const [amount, setAmount] = useState<string>("1000");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("All");

  const quickAmounts = ["500", "1000", "2000", "5000"];

  const handleTopUp = async () => {
    const numAmount = parseInt(amount.replace(/,/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid positive amount.");
      return;
    }

    setLoading(true);
    const result = await topUpCash(numAmount);
    setLoading(false);

    if (result.success) {
      Alert.alert("Success", `Successfully added ₹${numAmount} to your INR wallet!`, [
        { text: "OK", onPress: () => router.back() }
      ]);
    } else {
      Alert.alert("Payment Failed", result.message || "Failed to add cash.");
    }
  };

  const renderTransactionRow = (item: any, index: number) => {
    const isPositive = item.type === "credit" || item.amount > 0 || (typeof item.amount === 'string' && item.amount.toString().includes('+'));
    const isCash = item.currency === "cash" || (typeof item.description === 'string' && (item.description.includes("INR") || item.description.includes("₹") || item.description.includes("Court") || item.description.includes("Nutrition")));
    
    let iconName: any = item.icon || "leaf-outline";
    let iconBg = "#E8F5E9";
    let iconColor = "#1F7A3E";
    
    const desc = (item.description || "").toLowerCase();
    const title = (item.title || "").toLowerCase();

    if (desc.includes("gym") || desc.includes("visit") || title.includes("gym")) {
      iconName = "barbell-outline";
      iconBg = "#E8F5E9"; iconColor = "#1F7A3E";
    } else if (desc.includes("order") || desc.includes("nutrition") || desc.includes("shop") || title.includes("whey")) {
      iconName = "bag-handle-outline";
      iconBg = "#FFF3E0"; iconColor = "#F59E0B";
    } else if (desc.includes("purchase") || title.includes("purchase")) {
      iconName = "add-circle-outline";
      iconBg = "#E8F5E9"; iconColor = "#1F7A3E";
    } else if (desc.includes("top up") || title.includes("top up")) {
      iconName = "wallet-outline";
      iconBg = "#F3E5F5"; iconColor = "#9C27B0";
    } else if (desc.includes("court") || desc.includes("badminton") || title.includes("court")) {
      iconName = "tennisball-outline";
      iconBg = "#E3F2FD"; iconColor = "#2196F3";
    } else if (desc.includes("convert") || title.includes("convert")) {
      iconName = "swap-horizontal-outline";
      iconBg = "#E8F5E9"; iconColor = "#1F7A3E";
    }

    const titleText = item.title || "Transaction";
    const subtitleText = item.description || "Activity";

    const formattedAmount = isCash 
      ? `₹${Math.abs(item.amount).toLocaleString('en-IN')}`
      : `${Math.abs(item.amount)} CR`;

    const sign = isPositive ? "+" : "-";

    return (
      <View key={item.id || index} className="flex-row justify-between items-center py-4 border-b border-black/5">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: iconBg }}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-black font-bold text-[13px]">{titleText}</Text>
            <Text className="text-gray-500 text-[11px] mt-0.5">{subtitleText}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`font-bold text-[14px] ${isPositive && !isCash ? 'text-[#1F7A3E]' : 'text-black'}`}>
            {sign}{formattedAmount}
          </Text>
          <Text className="text-gray-400 text-[10px] mt-0.5">{item.date || "Today, 8:30 AM"}</Text>
        </View>
      </View>
    );
  };

  const dummyTransactions = [
    { id: 1, title: "Gold's Gym Visit", description: "Outside Primary Zone", amount: -20, currency: "credits", type: "debit", date: "Today, 8:30 AM" },
    { id: 2, title: "Optimum Nutrition Whey", description: "Order #ON12345", amount: -1299, currency: "cash", type: "debit", date: "Yesterday, 5:45 PM" },
    { id: 3, title: "Credit Purchase", description: "250 CR Package", amount: 250, currency: "credits", type: "credit", date: "2 Jul, 11:20 AM" },
    { id: 4, title: "INR Top Up", description: "Added to INR Wallet", amount: 1000, currency: "cash", type: "credit", date: "1 Jul, 9:10 PM" },
    { id: 5, title: "Badminton Court", description: "Match Booking", amount: -600, currency: "cash", type: "debit", date: "1 Jul, 6:30 PM" },
    { id: 6, title: "Credits Converted", description: "200 CR to INR", amount: 1600, currency: "cash", type: "credit", date: "28 Jun, 7:20 PM" },
  ];

  const displayTransactions = transactions?.length > 0 ? transactions : dummyTransactions;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-center px-5 pt-10 pb-6 relative">
        <Pressable onPress={() => router.back()} className="absolute left-5 top-10 z-10 p-2">
          <Ionicons name="chevron-back" size={26} color="#000" />
        </Pressable>
        <View className="items-center">
          <Text className="text-[20px] font-bold text-black">Top Up INR Wallet</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-5">
          <Text className="text-[13px] font-medium text-gray-800 mb-3">Enter amount</Text>
          
          {/* Input Box */}
          <View className="flex-row items-center border border-gray-200 rounded-[14px] px-5 py-4 mb-4">
            <Text className="text-[24px] font-bold text-black mr-2">₹</Text>
            <TextInput
              className="flex-1 text-[24px] font-bold text-black p-0 m-0"
              keyboardType="number-pad"
              value={amount}
              onChangeText={(val) => {
                const numeric = val.replace(/[^0-9]/g, "");
                setAmount(numeric ? parseInt(numeric).toLocaleString('en-IN') : "");
              }}
              placeholder="0"
              placeholderTextColor="#ccc"
            />
          </View>

          {/* Quick Amounts */}
          <View className="flex-row justify-between mb-6">
            {quickAmounts.map((amt) => {
              const isActive = amount.replace(/,/g, "") === amt;
              return (
                <Pressable
                  key={amt}
                  onPress={() => setAmount(parseInt(amt).toLocaleString('en-IN'))}
                  className={`flex-1 mx-1 rounded-[12px] py-2.5 items-center justify-center border ${
                    isActive ? "bg-[#0B711A] border-[#0B711A]" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`font-bold text-[13px] ${isActive ? "text-white" : "text-gray-600"}`}>
                    ₹{parseInt(amt).toLocaleString('en-IN')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Add to Wallet Button */}
          <Pressable
            onPress={handleTopUp}
            disabled={loading}
            className="bg-[#0B711A] rounded-[14px] py-4 items-center justify-center mb-6 flex-row active:opacity-80"
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-[15px]">Add to Wallet</Text>}
          </Pressable>

          {/* Info Banner */}
          <View className="bg-[#f9f5ff] rounded-[14px] p-5 flex-row items-center justify-between mb-8">
            <Text className="text-[#374151] text-[12px] flex-1 leading-relaxed pr-4">
              Amount will be added to your INR wallet instantly and can be used for all purchases.
            </Text>
            <View className="relative items-center justify-center">
              <Ionicons name="shield-outline" size={24} color="#A855F7" />
              <Ionicons name="arrow-down" size={10} color="#A855F7" style={{ position: 'absolute' }} />
            </View>
          </View>
        </View>

        {/* Transaction History Section */}
        <View className="bg-white rounded-t-[32px] pt-6 px-5 border-t border-gray-100 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 5 }}>
          <Text className="text-[18px] font-bold text-black mb-4">Transaction History</Text>
          
          {/* Tabs & Filter */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row gap-x-2">
              {["All", "Credits", "INR"].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    className={`px-5 py-2 rounded-full border ${
                      isActive ? "bg-[#0B711A] border-[#0B711A]" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`font-bold text-[12px] ${isActive ? "text-white" : "text-gray-700"}`}>
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable className="bg-gray-100 p-2.5 rounded-[12px]">
              <Ionicons name="filter" size={18} color="#000" />
            </Pressable>
          </View>

          {/* List */}
          <View className="pb-8">
            {displayTransactions.map((item, index) => renderTransactionRow(item, index))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
