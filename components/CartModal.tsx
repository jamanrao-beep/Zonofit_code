import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { cartLineKey, isMarketplaceId, useCartStore } from "@/store/useCartStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useAddressStore } from "@/store/useAddressStore";
import DeliveryAddressModal from "@/components/DeliveryAddressModal";
import { apiFetch } from "@/lib/api";
import { SHOP_CREDIT_INR, shopCreditsForRupees } from "@/data/shopCatalog";

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

  const { isGuest, endGuestSession } = useGuestStore();
  const { credits, checkoutCart } = useCreditsStore();
  const { getSelectedAddress } = useAddressStore();
  const selectedAddress = getSelectedAddress();
  
  const { 
    cartItems, 
    updateQuantity, 
    getTotalItems, 
    clearCart,
    removeLines,
    appliedCoupon, 
    applyCoupon, 
    clearCoupon 
  } = useCartStore();

  const payableLines = cartItems.filter((ci) => isMarketplaceId(ci.item.id) && ci.item.purchasable !== false);
  const payableTotal = payableLines.reduce((sum, ci) => sum + (Number(ci.item.price) || 0) * ci.quantity, 0);
  let payableDiscount = 0;
  if (appliedCoupon?.discountType === "PERCENTAGE") payableDiscount = Math.floor(payableTotal * (appliedCoupon.discountValue / 100));
  if (appliedCoupon?.discountType === "RUPEES" || appliedCoupon?.discountType === "FIXED_AMOUNT") payableDiscount = appliedCoupon.discountValue;
  payableDiscount = Math.min(payableTotal, Math.max(0, payableDiscount));
  const discountedPriceInr = Math.max(0, payableTotal - payableDiscount);
  const creditsNeeded = shopCreditsForRupees(discountedPriceInr);
  const shortBy = Math.max(0, creditsNeeded - credits);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    if (isGuest) {
      Alert.alert(
        "Account Required",
        "Please create a free ZonoFit account to complete your purchase.",
        [
          { 
            text: "Create Account", 
            onPress: async () => {
              onClose();
              await endGuestSession();
              router.replace("/(auth)/create-account");
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
    const ready = cartItems.filter((ci) => isMarketplaceId(ci.item.id));
    if (ready.length === 0) {
      Alert.alert(
        "Preview items",
        "These items are no longer in the store. Remove them and add a product from the shop."
      );
      setIsCheckingOut(false);
      return;
    }
    if (shortBy > 0) {
      Alert.alert(
        "Not enough credits",
        `This order costs ${creditsNeeded} credits (1 credit = ₹${SHOP_CREDIT_INR}). You have ${credits}.`,
      );
      setIsCheckingOut(false);
      return;
    }

    const checkoutItems = ready.map((ci) => ({
      itemId: ci.item.id,
      quantity: ci.quantity,
      selectedSize: ci.item.selectedSize || ci.item.variant,
      selectedColor: ci.item.selectedColor,
    }));
    
    const result = await checkoutCart(checkoutItems, discountedPriceInr, appliedCoupon?.code, creditsNeeded, {
      fullName: selectedAddress.fullName,
      phoneNumber: selectedAddress.phoneNumber,
      flatHouse: selectedAddress.flatHouse,
      areaStreet: selectedAddress.areaStreet,
      landmark: selectedAddress.landmark,
      city: selectedAddress.city,
      state: selectedAddress.state,
      pincode: selectedAddress.pincode,
    });
    
    if (result.success) {
      const skipped = cartItems.length - ready.length;
      Alert.alert(
        "Order Confirmed!",
        `Items will be delivered to ${selectedAddress.flatHouse}, ${selectedAddress.city}. ${result.breakdown?.creditsUsed ?? creditsNeeded} credits were used.` +
        (skipped > 0 ? " Preview items were left in the cart." : "")
      );
      removeLines(ready.map((ci) => cartLineKey(ci.item)));
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
                  <View key={cartLineKey(ci.item)} className="flex-row items-center justify-between border-b border-black/5 py-4">
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
                        onPress={() => updateQuantity(cartLineKey(ci.item), ci.quantity - 1)}
                        className="w-8 h-8 items-center justify-center"
                      >
                        <Ionicons name="remove" size={16} color="#1F2520" />
                      </Pressable>
                      <Text className="font-bold text-[#1F2520] w-6 text-center">{ci.quantity}</Text>
                      <Pressable 
                        onPress={() => updateQuantity(cartLineKey(ci.item), ci.quantity + 1)}
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
                  <Text className="text-sm font-bold text-[#1F2520]">₹{Math.round(payableTotal)}</Text>
                </View>
                {appliedCoupon && payableDiscount > 0 && (
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-emerald-600 font-bold">Discount ({appliedCoupon.code}):</Text>
                    <Text className="text-sm text-emerald-600 font-bold">-₹{Math.round(payableDiscount)}</Text>
                  </View>
                )}

                <View className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 my-2">
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-xs font-bold text-emerald-900">Pay with credits</Text>
                      <Text className="text-[10px] text-emerald-700">1 credit = ₹{SHOP_CREDIT_INR}. You have {credits}.</Text>
                    </View>
                    <Text className="text-sm font-extrabold text-emerald-700">{creditsNeeded} CR</Text>
                  </View>
                  {shortBy > 0 ? (
                    <Text className="text-[11px] text-amber-700 mt-2">You need {shortBy} more credits for this order.</Text>
                  ) : null}
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
                    {isCheckingOut ? "Processing..." : `Pay ${creditsNeeded} credits`}
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
