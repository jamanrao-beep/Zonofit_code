import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert, Modal, ActivityIndicator, TextInput } from "react-native";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { apiFetch } from "@/lib/api";

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
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const { cartItems, addToCart, removeFromCart, updateQuantity, getTotalPrice, getDiscountedPrice, getTotalItems, clearCart, appliedCoupon, applyCoupon, clearCoupon } = useCartStore();

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

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    setIsCheckingOut(true);
    const discountedPriceInr = getDiscountedPrice() / 100;
    
    // Map items to the format required by the backend
    const checkoutItems = cartItems.map(ci => ({ itemId: ci.item.id, quantity: ci.quantity }));
    
    // Using checkoutCart from useCreditsStore which calls the backend checkout endpoint
    const { checkoutCart } = useCreditsStore.getState();
    const result = await checkoutCart(checkoutItems, discountedPriceInr, appliedCoupon?.code);
    
    if (result.success) {
      Alert.alert("Success!", "Items purchased successfully.");
      clearCart();
      setIsCartModalOpen(false);
    } else {
      Alert.alert("Purchase Failed", result.message || "Failed to process checkout.");
    }
    setIsCheckingOut(false);
  };

  const validateCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const { token } = useAuthStore.getState();
      const data = await apiFetch(`/api/coupons/validate?code=${couponInput.trim()}`, {
        token
      });
      if (data.success && data.coupon) {
        if (data.coupon.discountType === "CREDITS") {
          Alert.alert("Invalid Coupon", "This coupon can only be used for gym bookings.");
        } else {
          applyCoupon(data.coupon);
          Alert.alert("Success", "Coupon applied successfully!");
        }
      } else {
        Alert.alert("Error", data.message || "Invalid coupon code");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

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
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCartModalOpen}
        onRequestClose={() => setIsCartModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[36px] p-6 pb-10 shadow-lg max-h-[85%]">
            <View className="w-12 h-1.5 bg-[#E9EBE6] rounded-full mb-6 mx-auto" />
            
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-[#1F2520]">Your Cart</Text>
              {cartItems.length > 0 && (
                <Pressable onPress={clearCart}>
                  <Text className="text-sm font-bold text-red-500">Clear</Text>
                </Pressable>
              )}
            </View>

            {cartItems.length === 0 ? (
              <View className="items-center py-10">
                <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
                <Text className="text-[#6B756E] font-medium mt-4">Your cart is empty.</Text>
                <Pressable 
                  onPress={() => setIsCartModalOpen(false)}
                  className="mt-6 bg-[#F5F7F4] px-6 py-3 rounded-xl"
                >
                  <Text className="text-[#1F2520] font-bold">Continue Shopping</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <ScrollView className="mb-6 max-h-[60%]">
                  {cartItems.map((ci) => (
                    <View key={ci.item.id} className="flex-row items-center justify-between border-b border-black/5 py-4">
                      <View className="flex-1 mr-4">
                        <Text className="text-sm font-bold text-[#1F2520]" numberOfLines={1}>{ci.item.title}</Text>
                        <Text className="text-xs text-[#6B756E] mt-1">₹{ci.item.pricePaise / 100} each</Text>
                      </View>
                      
                      <View className="flex-row items-center bg-[#F5F7F4] rounded-full px-2 py-1">
                        <Pressable 
                          onPress={() => updateQuantity(ci.item.id, ci.quantity - 1)}
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Ionicons name="remove" size={16} color="#1F2520" />
                        </Pressable>
                        <Text className="font-bold text-[#1F2520] w-6 text-center">{ci.quantity}</Text>
                        <Pressable 
                          onPress={() => updateQuantity(ci.item.id, ci.quantity + 1)}
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Ionicons name="add" size={16} color="#1F2520" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View className="mb-4">
                  <View className="flex-row gap-2">
                    <TextInput 
                      className="flex-1 bg-gray-100 px-4 py-3 rounded-xl"
                      placeholder="Coupon Code"
                      value={couponInput}
                      onChangeText={setCouponInput}
                      autoCapitalize="characters"
                    />
                    <Pressable 
                      onPress={validateCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="bg-black px-6 items-center justify-center rounded-xl"
                    >
                      {couponLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Apply</Text>}
                    </Pressable>
                  </View>
                  {appliedCoupon && (
                    <View className="flex-row justify-between items-center mt-2 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                      <Text className="text-emerald-700 font-bold">{appliedCoupon.code} Applied!</Text>
                      <Pressable onPress={() => { clearCoupon(); setCouponInput(""); }}>
                        <Ionicons name="close-circle" size={20} color="#059669" />
                      </Pressable>
                    </View>
                  )}
                </View>

                <View className="pt-4 border-t border-black/5">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-[#6B756E]">Total Items:</Text>
                    <Text className="text-sm font-bold text-[#1F2520]">{getTotalItems()}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-[#6B756E]">Subtotal:</Text>
                    <Text className="text-sm font-bold text-[#1F2520]">₹{getTotalPrice() / 100}</Text>
                  </View>
                  {appliedCoupon && (
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-sm text-emerald-600 font-bold">Discount:</Text>
                      <Text className="text-sm text-emerald-600 font-bold">-₹{(getTotalPrice() - getDiscountedPrice()) / 100}</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between mb-6">
                    <Text className="text-base font-bold text-[#1F2520]">Grand Total:</Text>
                    <Text className="text-xl font-black text-emerald-600">₹{getDiscountedPrice() / 100}</Text>
                  </View>

                  <Pressable 
                    onPress={handleCheckout}
                    disabled={isCheckingOut}
                    className={`bg-emerald-600 w-full py-4 rounded-2xl items-center flex-row justify-center gap-2 ${isCheckingOut ? 'opacity-70' : ''}`}
                  >
                    {isCheckingOut ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                    )}
                    <Text className="text-white font-bold text-lg">{isCheckingOut ? "Processing..." : "Checkout with Cash"}</Text>
                  </Pressable>
                  
                  <Pressable 
                    onPress={() => setIsCartModalOpen(false)}
                    className="w-full mt-3 h-12 rounded-2xl items-center justify-center"
                  >
                    <Text className="text-[#6B756E] font-bold text-sm">Cancel</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
