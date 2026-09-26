import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCartStore } from "@/store/useCartStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useAddressStore } from "@/store/useAddressStore";
import DeliveryAddressModal from "@/components/DeliveryAddressModal";
import { apiFetch } from "@/lib/api";

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CartModal({ visible, onClose }: CartModalProps) {
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [creditsToUse, setCreditsToUse] = useState(0);

  const { isGuest } = useGuestStore();
  const { cashBalance, credits, checkoutCart } = useCreditsStore();
  const { getSelectedAddress } = useAddressStore();
  const selectedAddress = getSelectedAddress();
  
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

  const discountedPriceInr = getDiscountedPrice();
  // Universal Checkout Step 1: Auto-applied INR Balance
  const autoInrUsed = Math.min(cashBalance, discountedPriceInr);
  const remainingAfterInr = discountedPriceInr - autoInrUsed;
  
  // Universal Checkout Step 2: User-controlled credits (1 Credit = ₹10)
  const maxCreditsAllowed = Math.min(credits, Math.floor(remainingAfterInr / 10));

  useEffect(() => {
    // Keep creditsToUse bounded
    if (creditsToUse > maxCreditsAllowed) {
      setCreditsToUse(maxCreditsAllowed);
    }
  }, [maxCreditsAllowed, creditsToUse]);

  const creditsValueUsed = creditsToUse * 10;
  // Universal Checkout Step 3: Remaining amount to pay via gateway
  const finalPayableOnline = Math.max(0, remainingAfterInr - creditsValueUsed);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    if (isGuest) {
      Alert.alert(
        "Account Required",
        "Please create a free ZonoFit account to complete your purchase.",
        [
          { 
            text: "Create Account", 
            onPress: () => {
              onClose();
              router.push("/(auth)/create-account");
            } 
          },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    if (!selectedAddress) {
      Alert.alert(
        "Delivery Address Required",
        "Please specify a delivery address for your physical items.",
        [
          { text: "Add Address", onPress: () => setIsAddressModalOpen(true) },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    setIsCheckingOut(true);
    
    // Map items to the format required by the backend
    const checkoutItems = cartItems.map(ci => ({ itemId: ci.item.id, quantity: ci.quantity }));
    
    const result = await checkoutCart(checkoutItems, discountedPriceInr, appliedCoupon?.code, creditsToUse);
    
    if (result.success) {
      Alert.alert(
        "Order Confirmed!", 
        `Items will be delivered to ${selectedAddress.flatHouse}, ${selectedAddress.city}.` +
        (finalPayableOnline > 0 ? `\nPaid Online: ₹${finalPayableOnline}` : "\nFully covered with INR & Credits!")
      );
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
                      {(ci.item.variant || ci.item.selectedColor || ci.item.selectedSize) && (
                        <Text className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                          {ci.item.variant || [ci.item.selectedColor, ci.item.selectedSize].filter(Boolean).join(" • ")}
                        </Text>
                      )}
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

              {/* Delivery Address Row */}
              <View className="mb-4 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                <View className="flex-row justify-between items-center mb-1.5">
                  <View className="flex-row items-center">
                    <Ionicons name="location-sharp" size={16} color="#059669" />
                    <Text className="text-xs font-bold text-[#1F2520] ml-1">Delivery Address</Text>
                  </View>
                  <Pressable onPress={() => setIsAddressModalOpen(true)}>
                    <Text className="text-xs font-bold text-emerald-600">{selectedAddress ? "Change" : "+ Add"}</Text>
                  </Pressable>
                </View>

                {selectedAddress ? (
                  <View>
                    <Text className="text-xs font-semibold text-[#1F2520]">{selectedAddress.fullName} • +91 {selectedAddress.phoneNumber}</Text>
                    <Text className="text-[11px] text-[#6B756E] mt-0.5" numberOfLines={1}>
                      {selectedAddress.flatHouse}, {selectedAddress.areaStreet}, {selectedAddress.city} - {selectedAddress.pincode}
                    </Text>
                  </View>
                ) : (
                  <Pressable onPress={() => setIsAddressModalOpen(true)}>
                    <Text className="text-xs text-amber-700 font-medium">⚠️ No delivery address selected. Tap to add.</Text>
                  </Pressable>
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
                    <Text className="text-sm text-emerald-600 font-bold">Discount ({appliedCoupon.code}):</Text>
                    <Text className="text-sm text-emerald-600 font-bold">-₹{(getTotalPrice() - getDiscountedPrice())}</Text>
                  </View>
                )}

                {/* Universal Checkout Step 1: Auto-Applied INR Balance */}
                <View className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 my-2">
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-xs font-bold text-emerald-900">1. Auto-Applied INR Balance</Text>
                      <Text className="text-[10px] text-emerald-700">₹{cashBalance} available in wallet</Text>
                    </View>
                    <Text className="text-sm font-extrabold text-emerald-700">
                      {autoInrUsed > 0 ? `-₹${autoInrUsed}` : "₹0"}
                    </Text>
                  </View>
                </View>

                {/* Universal Checkout Step 2: User-Controlled Credits */}
                {credits > 0 && remainingAfterInr > 0 && (
                  <View className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 mb-2">
                    <View className="flex-row justify-between items-center mb-2">
                      <View>
                        <Text className="text-xs font-bold text-blue-900">2. Use ZonoFit Credits</Text>
                        <Text className="text-[10px] text-blue-700">{credits} Credits available (1 Cr = ₹10)</Text>
                      </View>
                      <Pressable 
                        onPress={() => setCreditsToUse(maxCreditsAllowed)}
                        className="bg-blue-600 px-2.5 py-1 rounded-lg"
                      >
                        <Text className="text-[10px] font-bold text-white">Use Max</Text>
                      </Pressable>
                    </View>
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center bg-white rounded-lg px-2 py-0.5 border border-blue-200">
                        <Pressable 
                          onPress={() => setCreditsToUse(Math.max(0, creditsToUse - 1))}
                          className="w-7 h-7 items-center justify-center"
                        >
                          <Ionicons name="remove" size={14} color="#1D4ED8" />
                        </Pressable>
                        <Text className="text-xs font-bold text-blue-900 px-2 min-w-[28px] text-center">{creditsToUse}</Text>
                        <Pressable 
                          onPress={() => setCreditsToUse(Math.min(maxCreditsAllowed, creditsToUse + 1))}
                          className="w-7 h-7 items-center justify-center"
                        >
                          <Ionicons name="add" size={14} color="#1D4ED8" />
                        </Pressable>
                      </View>
                      <Text className="text-xs font-bold text-blue-700">
                        {creditsValueUsed > 0 ? `-₹${creditsValueUsed}` : "₹0"}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Universal Checkout Step 3: Payable Online */}
                <View className="flex-row justify-between items-center mt-2 mb-4 pt-2 border-t border-dashed border-gray-300">
                  <View>
                    <Text className="text-xs uppercase font-extrabold text-gray-500 tracking-wider">3. Payable Online</Text>
                    <Text className="text-[11px] text-gray-500">
                      {finalPayableOnline === 0 ? "Covered completely by balances" : "Payment gateway remainder"}
                    </Text>
                  </View>
                  <Text className="text-2xl font-black text-[#1F2520]">₹{finalPayableOnline}</Text>
                </View>

                <Pressable 
                  onPress={handleCheckout}
                  disabled={isCheckingOut}
                  className={`bg-emerald-600 w-full py-4 rounded-2xl items-center flex-row justify-center gap-2 ${isCheckingOut ? 'opacity-70' : ''}`}
                >
                  {isCheckingOut ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Ionicons name="card-outline" size={20} color="white" />
                  )}
                  <Text className="text-white font-bold text-lg">
                    {isCheckingOut 
                      ? "Processing..." 
                      : finalPayableOnline === 0 
                        ? "Confirm Purchase (₹0 Online)" 
                        : `Pay Online ₹${finalPayableOnline}`}
                  </Text>
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

      <DeliveryAddressModal
        visible={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        initialAddress={selectedAddress}
      />
    </Modal>
  );
}
