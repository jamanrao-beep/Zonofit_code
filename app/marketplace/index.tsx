import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert, Modal, ActivityIndicator } from "react-native";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { apiFetch } from "@/lib/api";

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  pricePaise: number;
  imageUrl: string;
}

import { SafeAreaView } from "react-native-safe-area-context";

export default function MarketplaceScreen() {
  const router = useRouter();
  const { credits, cashBalance, buyMarketplaceItem } = useCreditsStore();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

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

  const handlePurchase = () => {
    if (!selectedItem) return;

    Alert.alert(
      "Confirm Purchase",
      `Are you sure you want to buy ${selectedItem.title} using Converted Cash?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            const priceInr = selectedItem.pricePaise / 100;
            const result = await buyMarketplaceItem(selectedItem.id, priceInr);
            if (result.success) {
              Alert.alert("Success!", "Item purchased successfully.");
              setSelectedItem(null);
            } else {
              Alert.alert("Purchase Failed", result.message);
            }
          }
        }
      ]
    );
  };

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
        <Pressable onPress={() => router.push("/marketplace/orders")} className="bg-[#F5F7F4] p-2 rounded-full active:bg-gray-200">
          <Ionicons name="cube-outline" size={20} color="#1F2520" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#059669" />
        ) : (
          items.map((item) => (
          <View key={item.id} className="bg-white rounded-3xl overflow-hidden border border-black/5 shadow-sm mb-5">
            <Image source={{ uri: item.imageUrl }} className="w-full h-48" resizeMode="cover" />
            <View className="p-4">
              <Text className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Equipment</Text>
              <Text className="text-lg font-bold text-[#1F2520]">{item.title}</Text>
              <Text className="text-xs text-[#6B756E] mt-1 mb-4 leading-relaxed">{item.description}</Text>
              
              <View className="flex-row justify-between items-center">
                <Text className="text-xl font-black text-[#1F2520]">₹{item.pricePaise / 100}</Text>
                <Pressable 
                  onPress={() => setSelectedItem(item)}
                  className="bg-[#1F2520] px-5 py-2.5 rounded-xl active:bg-[#323b34]"
                >
                  <Text className="text-white font-bold text-sm">Buy Now</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )))}
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedItem}
        onRequestClose={() => setSelectedItem(null)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[36px] p-6 pb-10 shadow-lg">
            <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-6 mx-auto" />
            
            {selectedItem && (
              <>
                <Text className="text-2xl font-bold text-[#1F2520] mb-1">{selectedItem.title}</Text>
                <Text className="text-lg font-bold text-[#6B756E] mb-6">Price: ₹{selectedItem.pricePaise / 100}</Text>

                <Text className="text-xs font-bold text-[#1F2520] uppercase tracking-wider mb-3">Choose Payment Method</Text>
                
                {/* Pay with Cash */}
                <Pressable 
                  onPress={handlePurchase}
                  className="bg-white rounded-2xl p-4 mb-4 border border-black/10 shadow-sm flex-row items-center justify-between active:bg-gray-50"
                >
                  <View>
                    <Text className="text-base font-bold text-[#1F2520]">Pay with Converted Cash</Text>
                    <Text className="text-xs text-[#6B756E] mt-0.5">Balance: ₹{cashBalance}</Text>
                  </View>
                  <View className="bg-gray-100 px-3 py-1.5 rounded-lg">
                    <Text className="text-sm font-bold text-[#1F2520]">₹{selectedItem.pricePaise / 100}</Text>
                  </View>
                </Pressable>

                <Pressable 
                  onPress={() => setSelectedItem(null)}
                  className="w-full bg-[#F5F7F4] h-12 rounded-2xl items-center justify-center"
                >
                  <Text className="text-[#6B756E] font-bold text-sm">Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
