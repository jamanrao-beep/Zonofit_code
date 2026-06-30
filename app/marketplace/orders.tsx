import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const token = useAuthStore.getState().token;
        const data = await apiFetch("/api/marketplace/orders", { token });
        setOrders(data);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrders();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-white items-center justify-center border border-black/5 shadow-sm"
        >
          <Ionicons name="arrow-back" size={18} color="#1F2520" />
        </Pressable>
        <Text className="text-lg font-bold text-[#1F2520]">My Orders</Text>
        <View className="w-9" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#059669" />
        ) : orders.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-[#6B756E] font-bold">No orders found.</Text>
          </View>
        ) : (
          orders.map((order) => (
          <View key={order.id} className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider">{order.id.slice(0, 8)}</Text>
              <View className={`px-2 py-1 rounded-md ${order.status === 'COMPLETED' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <Text className={`text-[10px] font-bold ${order.status === 'COMPLETED' ? 'text-emerald-700' : 'text-amber-700'}`}>{order.status}</Text>
              </View>
            </View>
            
            <View className="h-[1px] bg-black/5 mb-3" />
            
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#1F2520]">{order.item?.title}</Text>
                <Text className="text-xs text-[#6B756E] mt-1">{new Date(order.createdAt).toLocaleDateString()}</Text>
              </View>
              <View className="items-end ml-4">
                <Text className="text-sm font-black text-[#1F2520]">₹{order.totalPaise / 100}</Text>
              </View>
            </View>
            
            <Pressable className="mt-4 flex-row items-center justify-center py-2 bg-[#F5F7F4] rounded-xl active:bg-gray-200">
              <Text className="text-xs font-bold text-[#1F2520]">Track Order</Text>
            </Pressable>
          </View>
        )))}
      </ScrollView>
    </SafeAreaView>
  );
}
