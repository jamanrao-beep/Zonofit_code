import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "@/store/useCartStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CartModal({ visible, onClose }: CartModalProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  
  const { 
    cartItems, 
    updateQuantity, 
    getTotalPrice, 
    getDiscountedPrice, 
    getTotalItems, 
    clearCart, 
    appliedCoupon, 
    applyCoupon, 
    clearCoupon 
  } = useCartStore();

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    setIsCheckingOut(true);
    const discountedPriceInr = getDiscountedPrice();
    
    // Map items to the format required by the backend
    const checkoutItems = cartItems.map(ci => ({ itemId: ci.item.id, quantity: ci.quantity }));
    
    // Using checkoutCart from useCreditsStore which calls the backend checkout endpoint
    const { checkoutCart } = useCreditsStore.getState();
    const result = await checkoutCart(checkoutItems, discountedPriceInr, appliedCoupon?.code);
    
    if (result.success) {
      Alert.alert("Success!", "Items purchased successfully.");
      clearCart();
      onClose();
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

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
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
                onPress={onClose}
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
                      <Text className="text-sm font-bold text-[#1F2520]" numberOfLines={1}>{ci.item.name || (ci.item as any).title}</Text>
                      <Text className="text-xs text-[#6B756E] mt-1">₹{ci.item.price !== undefined ? ci.item.price : (ci.item as any).pricePaise / 100} each</Text>
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
                  <Text className="text-sm font-bold text-[#1F2520]">₹{getTotalPrice()}</Text>
                </View>
                {appliedCoupon && (
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-emerald-600 font-bold">Discount:</Text>
                    <Text className="text-sm text-emerald-600 font-bold">-₹{(getTotalPrice() - getDiscountedPrice())}</Text>
                  </View>
                )}
                <View className="flex-row justify-between mb-6">
                  <Text className="text-base font-bold text-[#1F2520]">Grand Total:</Text>
                  <Text className="text-xl font-black text-emerald-600">₹{getDiscountedPrice()}</Text>
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
                  onPress={onClose}
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
  );
}
