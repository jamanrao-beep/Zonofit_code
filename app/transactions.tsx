import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreditsStore, Transaction } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function TransactionsScreen() {
  const router = useRouter();
  const { transactions, fetchTransactions } = useCreditsStore();
  const { token } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    setPage(1);
    await fetchTransactions(token!, 1);
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || loading) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    // We should ideally check if the API returns < 20 items to set hasMore=false, 
    // but the store appends them blindly right now. 
    // If the length of transactions doesn't increase after fetch, it means no more.
    const currentLength = useCreditsStore.getState().transactions.length;
    await fetchTransactions(token!, nextPage);
    const newLength = useCreditsStore.getState().transactions.length;
    
    if (newLength === currentLength) {
      setHasMore(false);
    } else {
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isCredit = item.type === "credit";
    const isCash = item.currency === "cash";

    return (
      <View className="flex-row items-center py-4 border-b border-black/5">
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          isCredit ? "bg-[#EAF7EC]" : "bg-[#F5F7F4]"
        }`}>
          <Ionicons 
            name={isCredit ? "arrow-down" : "arrow-up"} 
            size={18} 
            color={isCredit ? "#059669" : "#6B756E"} 
          />
        </View>
        <View className="flex-1 mr-2">
          <Text className="font-bold text-sm text-[#1F2520]">{item.description}</Text>
          <Text className="text-xs text-[#6B756E] mt-0.5">{item.date}</Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom"]}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: "Transaction History",
          headerTitleStyle: { fontWeight: "bold", color: "#1F2520" },
          headerStyle: { backgroundColor: "#fff" },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="mr-4 p-1">
              <Ionicons name="arrow-back" size={24} color="#1F2520" />
            </Pressable>
          ),
        }} 
      />

      {loading && page === 1 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderTransaction}
          contentContainerStyle={{ padding: 20 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#059669" />
              </View>
            ) : !hasMore && transactions.length > 0 ? (
              <View className="py-6 items-center">
                <Text className="text-xs text-[#6B756E]">No more transactions</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center py-20">
              <View className="w-16 h-16 rounded-full bg-[#F5F7F4] items-center justify-center mb-4">
                <Ionicons name="receipt-outline" size={24} color="#A0A5A1" />
              </View>
              <Text className="font-bold text-[#1F2520] mb-1">No Transactions</Text>
              <Text className="text-xs text-[#6B756E]">Your activity will appear here.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
