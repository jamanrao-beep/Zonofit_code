import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useAddressStore } from "@/store/useAddressStore";

interface OrderItem {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  totalPaise: number;
  createdAt: string;
  item?: {
    id: string;
    title: string;
    brand?: string;
    imageUrl?: string;
    pricePaise: number;
    category?: string;
  };
}

export default function OrdersScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const selectedAddress = useAddressStore((s) => s.getSelectedAddress());

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch("/api/marketplace/orders", { token, silent: true });
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (err) {
      console.warn("Failed to fetch marketplace orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/shop" as any);
              }
            }}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <View>
            <Text className="text-[22px] font-black text-[#111827] tracking-tight">My Orders</Text>
            <Text className="text-xs text-gray-500">Track supplements & store deliveries</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/shop" as any)}
          className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center"
        >
          <Ionicons name="bag-handle-outline" size={18} color="#1F7A3E" />
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1F7A3E" />
          <Text className="text-xs text-gray-400 mt-3 font-semibold">Loading your order history...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1F7A3E"]} />}
        >
          {orders.length === 0 ? (
            <View className="items-center justify-center py-20 px-6 bg-white rounded-[28px] border border-gray-100 shadow-sm mt-4">
              <View className="w-20 h-20 rounded-full bg-emerald-50 items-center justify-center mb-4 border border-emerald-100">
                <Ionicons name="receipt-outline" size={38} color="#1F7A3E" />
              </View>
              <Text className="text-xl font-black text-[#111827] mb-2 text-center">No Orders Yet</Text>
              <Text className="text-xs text-gray-500 text-center leading-relaxed mb-6">
                You haven't placed any marketplace or supplement orders yet. Explore genuine supplements, activewear, and workout gear in the shop.
              </Text>
              <Pressable
                onPress={() => router.push("/shop" as any)}
                className="bg-[#1F7A3E] px-6 py-3.5 rounded-2xl flex-row items-center active:bg-[#186031]"
              >
                <Ionicons name="cart-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-black text-sm">Explore Shop</Text>
              </Pressable>
            </View>
          ) : (
            orders.map((order, idx) => {
              const isExpanded = expandedOrderId === order.id;
              const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const formattedTime = new Date(order.createdAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const orderPriceInr = Math.round(order.totalPaise / 100);
              const orderShortId = order.id ? order.id.slice(0, 8).toUpperCase() : `ZF-${idx + 101}`;

              return (
                <View
                  key={order.id}
                  className="bg-white rounded-[24px] p-5 mb-4 border border-gray-100 shadow-sm"
                >
                  {/* Order Card Header */}
                  <View className="flex-row justify-between items-start pb-3 border-b border-gray-100 mb-3">
                    <View>
                      <View className="flex-row items-center gap-x-1.5 mb-1">
                        <Text className="text-xs font-bold text-gray-400">ORDER</Text>
                        <Text className="text-xs font-black text-[#111827]">#{orderShortId}</Text>
                      </View>
                      <Text className="text-[11px] text-gray-400 font-medium">
                        {formattedDate} • {formattedTime}
                      </Text>
                    </View>

                    <View className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex-row items-center">
                      <Ionicons name="checkmark-circle" size={13} color="#1F7A3E" style={{ marginRight: 4 }} />
                      <Text className="text-[11px] font-extrabold text-[#1F7A3E]">Confirmed</Text>
                    </View>
                  </View>

                  {/* Item Preview */}
                  <View className="flex-row items-center mb-3">
                    {order.item?.imageUrl ? (
                      <Image
                        source={{ uri: order.item.imageUrl }}
                        className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 mr-3.5"
                        resizeMode="contain"
                      />
                    ) : (
                      <View className="w-16 h-16 rounded-xl bg-gray-100 items-center justify-center mr-3.5 border border-gray-200">
                        <Ionicons name="bag-handle" size={24} color="#6B7280" />
                      </View>
                    )}

                    <View className="flex-1 mr-2">
                      {order.item?.brand && (
                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                          {order.item.brand}
                        </Text>
                      )}
                      <Text className="text-sm font-bold text-[#111827]" numberOfLines={2}>
                        {order.item?.title || "ZonoFit Fitness Item"}
                      </Text>
                      <Text className="text-xs text-gray-500 font-medium mt-1">
                        Qty: {order.quantity} • ₹{orderPriceInr.toLocaleString()}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-base font-black text-[#111827]">
                        ₹{orderPriceInr.toLocaleString()}
                      </Text>
                      <Text className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                        Paid
                      </Text>
                    </View>
                  </View>

                  {/* Delivery Status Bar */}
                  <View className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-3 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 mr-2">
                      <Ionicons name="cube-outline" size={16} color="#4B5563" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-semibold text-gray-700">
                        Estimated Delivery: <Text className="font-bold text-[#111827]">3-5 Business Days</Text>
                      </Text>
                    </View>
                    <Pressable onPress={() => toggleExpand(order.id)}>
                      <Text className="text-xs font-bold text-[#1F7A3E]">
                        {isExpanded ? "Hide Details" : "View Details"}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Expanded Order Details */}
                  {isExpanded && (
                    <View className="pt-2 border-t border-gray-100">
                      {/* Tracking Milestones */}
                      <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2.5">
                        Order Status
                      </Text>
                      <View className="pl-1 mb-4">
                        <View className="flex-row items-center mb-2">
                          <View className="w-5 h-5 rounded-full bg-[#1F7A3E] items-center justify-center mr-2.5">
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                          <Text className="text-xs font-bold text-[#111827]">Order Confirmed & Payment Verified</Text>
                        </View>
                        <View className="w-0.5 h-3 bg-emerald-300 ml-2.5 mb-2" />
                        <View className="flex-row items-center mb-2">
                          <View className="w-5 h-5 rounded-full bg-emerald-100 items-center justify-center mr-2.5 border border-emerald-300">
                            <Ionicons name="time" size={10} color="#1F7A3E" />
                          </View>
                          <Text className="text-xs font-semibold text-gray-600">Dispatched from Partner Warehouse</Text>
                        </View>
                        <View className="w-0.5 h-3 bg-gray-200 ml-2.5 mb-2" />
                        <View className="flex-row items-center">
                          <View className="w-5 h-5 rounded-full bg-gray-100 items-center justify-center mr-2.5">
                            <Ionicons name="home-outline" size={10} color="#9CA3AF" />
                          </View>
                          <Text className="text-xs font-semibold text-gray-400">Delivered to Address</Text>
                        </View>
                      </View>

                      {/* Delivery Address */}
                      {selectedAddress && (
                        <View className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-3">
                          <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Shipping Address
                          </Text>
                          <Text className="text-xs font-bold text-[#111827]">
                            {selectedAddress.fullName} • +91 {selectedAddress.phoneNumber}
                          </Text>
                          <Text className="text-xs text-gray-500 mt-0.5">
                            {selectedAddress.flatHouse}, {selectedAddress.areaStreet}, {selectedAddress.city} - {selectedAddress.pincode}
                          </Text>
                        </View>
                      )}

                      {/* Action Button */}
                      <View className="flex-row gap-x-2 pt-1">
                        <Pressable
                          onPress={() => Alert.alert("Support", "Need help with order #" + orderShortId + "? Contact support via Profile > Help & Support.")}
                          className="flex-1 bg-gray-100 py-2.5 rounded-xl items-center justify-center active:bg-gray-200"
                        >
                          <Text className="text-xs font-bold text-gray-700">Need Help?</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => router.push("/shop" as any)}
                          className="flex-1 bg-emerald-50 py-2.5 rounded-xl items-center justify-center active:bg-emerald-100 border border-emerald-200"
                        >
                          <Text className="text-xs font-bold text-[#1F7A3E]">Buy Again</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
