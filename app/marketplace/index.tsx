import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert, Modal, ActivityIndicator, TextInput } from "react-native";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { apiFetch } from "@/lib/api";
import CartModal from "@/components/CartModal";

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  pricePaise: number;
  imageUrl: string;
  storeCategory: string;
}

const CATEGORIES = [
  { id: "ALL", label: "All Items" },
  { id: "ZONOFIT_COMMON", label: "ZonoFit Common" },
  { id: "PRODUCTS", label: "Products" },
  { id: "SPORTS_ACTIVITIES", label: "Sports & Activities" },
  { id: "APPAREL_GEAR", label: "Apparel & Gear" },
  { id: "RECOVERY_WELLNESS", label: "Recovery & Wellness" },
];

import { SafeAreaView } from "react-native-safe-area-context";

export default function MarketplaceScreen() {
  const router = useRouter();
  const { credits, cashBalance, buyMarketplaceItem } = useCreditsStore();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const { addToCart, getTotalItems } = useCartStore();

  useEffect(() => {
    async function loadItems() {
      try {
        const token = useAuthStore.getState().token;
        const data = await apiFetch("/api/marketplace/items", { token });
        setItems(data);
      } catch (err) {
        console.error("Failed to load marketplace items:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadItems();
  }, []);

  const filteredItems = items.filter(
    (item) => selectedCategory === "ALL" || item.storeCategory === selectedCategory
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7F4]">
      {/* Screen Header */}
      <View className="bg-white px-5 py-4 flex-row justify-between items-center border-b border-black/5">
        <Text className="text-xl font-bold text-[#1F2520]">ZonoFit Store</Text>
        <Pressable onPress={() => router.navigate("/")} className="bg-[#F5F7F4] p-2 rounded-full active:bg-gray-200">
          <Ionicons name="close" size={20} color="#1F2520" />
        </Pressable>
      </View>

      {/* Mini Wallet Header */}
      <View className="bg-white border-b border-black/5 px-5 py-3 flex-row justify-between items-center">
        <View>
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider">Your Balances</Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-sm font-bold text-[#1F2520] mr-4">₹{cashBalance} Cash</Text>
            <Text className="text-sm font-bold text-emerald-700">{credits} Credits</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.push("/marketplace/orders")} className="bg-[#F5F7F4] p-2 rounded-full active:bg-gray-200">
            <Ionicons name="cube-outline" size={20} color="#1F2520" />
          </Pressable>
          <Pressable onPress={() => setIsCartModalOpen(true)} className="bg-[#F5F7F4] p-2 rounded-full active:bg-gray-200 relative">
            <Ionicons name="cart-outline" size={20} color="#1F2520" />
            {getTotalItems() > 0 && (
              <View className="absolute -top-1 -right-1 bg-emerald-600 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                <Text className="text-[10px] font-bold text-white leading-tight">{getTotalItems()}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Category Tabs */}
      <View className="bg-white border-b border-black/5">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 12 }}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full border ${
                selectedCategory === cat.id 
                  ? "bg-emerald-600 border-emerald-600" 
                  : "bg-white border-gray-200"
              }`}
            >
              <Text className={`text-xs font-bold ${
                selectedCategory === cat.id ? "text-white" : "text-gray-600"
              }`}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#059669" />
        ) : filteredItems.length === 0 ? (
          <View className="items-center justify-center mt-10">
            <Text className="text-[#6B756E] text-center font-medium">No items found in this category.</Text>
          </View>
        ) : (
          filteredItems.map((item) => (
          <View key={item.id} className="bg-white rounded-3xl overflow-hidden border border-black/5 shadow-sm mb-5">
            <Image source={{ uri: item.imageUrl }} className="w-full h-48" resizeMode="cover" />
            <View className="p-4">
              <Text className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                {item.storeCategory?.replace(/_/g, " ")}
              </Text>
              <Text className="text-lg font-bold text-[#1F2520]">{item.title}</Text>
              <Text className="text-xs text-[#6B756E] mt-1 mb-4 leading-relaxed">{item.description}</Text>
              
              <View className="flex-row justify-between items-center">
                <Text className="text-xl font-black text-[#1F2520]">₹{item.pricePaise / 100}</Text>
                <Pressable 
                  onPress={() => addToCart(item)}
                  className="bg-emerald-600 px-5 py-2.5 rounded-xl active:bg-emerald-700 flex-row items-center gap-x-2"
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text className="text-white font-bold text-sm">Add</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )))}
      </ScrollView>

      {/* Cart Modal */}
      <CartModal visible={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} />
    </SafeAreaView>
  );
}
