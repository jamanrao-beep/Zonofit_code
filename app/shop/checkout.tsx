import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { inr, SHOP_CREDIT_INR, shopCreditsForRupees } from "@/data/shopCatalog";
import { cartLineKey, isMarketplaceId, useCartStore } from "@/store/useCartStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useAddressStore } from "@/store/useAddressStore";
import { useShopReceiptStore } from "@/store/useShopReceiptStore";
import { promptGuestAccount } from "@/lib/guestAccount";
import { apiFetch } from "@/lib/api";
import DeliveryAddressModal from "@/components/DeliveryAddressModal";
import { ShopBackButton } from "@/components/shop/Chrome";
import { shop, shopStyles } from "@/components/shop/theme";

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lines = useCartStore((state) => state.cartItems);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);
  const removeLines = useCartStore((state) => state.removeLines);
  const credits = useCreditsStore((state) => state.credits);
  const checkoutCart = useCreditsStore((state) => state.checkoutCart);
  const fetchWallet = useCreditsStore((state) => state.fetchWallet);
  const token = useAuthStore((state) => state.token);
  const isGuest = useGuestStore((state) => state.isGuest);
  const endGuestSession = useGuestStore((state) => state.endGuestSession);
  const address = useAddressStore((state) => state.addresses.find((entry) => entry.id === state.selectedAddressId) || state.addresses.find((entry) => entry.isDefault) || state.addresses[0] || null);
  const setReceipt = useShopReceiptStore((state) => state.setReceipt);

  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    if (token && !isGuest) void fetchWallet(token);
  }, [token, isGuest, fetchWallet]));

  const ready = lines.filter((line) => line.item.purchasable !== false && isMarketplaceId(line.item.id));
  const subtotal = ready.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  let discount = 0;
  if (appliedCoupon?.discountType === "PERCENTAGE") discount = Math.floor(subtotal * (appliedCoupon.discountValue / 100));
  if (appliedCoupon?.discountType === "RUPEES" || appliedCoupon?.discountType === "FIXED_AMOUNT") discount = appliedCoupon.discountValue;
  discount = Math.min(subtotal, Math.max(0, discount));
  const afterCoupon = Math.max(0, subtotal - discount);
  const creditsNeeded = shopCreditsForRupees(afterCoupon);
  const shortBy = Math.max(0, creditsNeeded - credits);

  const addressLine = address
    ? [address.flatHouse, address.areaStreet, address.city, address.state, address.pincode].filter(Boolean).join(", ")
    : "";

  const validateCoupon = async () => {
    if (!couponInput.trim()) return;
    if (isGuest || !token) {
      promptGuestAccount(router, endGuestSession, "Create an account before applying a coupon.");
      return;
    }
    setCouponLoading(true);
    try {
      const data = await apiFetch(`/api/coupons/validate?code=${encodeURIComponent(couponInput.trim())}`, { token });
      if (data.success && data.coupon) {
        if (data.coupon.discountType === "CREDITS") {
          Alert.alert("Invalid coupon", "This coupon can only be used for gym bookings.");
        } else {
          applyCoupon(data.coupon);
          Alert.alert("Coupon applied", `${data.coupon.code} is on this order.`);
        }
      } else {
        Alert.alert("Coupon", data.message || "That code is not valid.");
      }
    } catch (err: any) {
      Alert.alert("Coupon", err?.message || "Could not check that code.");
    } finally {
      setCouponLoading(false);
    }
  };

  const place = async () => {
    if (placing) return;
    if (isGuest || !token) {
      promptGuestAccount(router, endGuestSession, "Create an account to place a shop order.");
      return;
    }
    if (ready.length === 0) {
      Alert.alert("Nothing to charge", "Add a product from the shop before checking out.");
      return;
    }
    if (!address) {
      setAddressOpen(true);
      return;
    }
    if (shortBy > 0) {
      Alert.alert(
        "Not enough credits",
        `This order costs ${creditsNeeded} credits (1 credit = ${inr(SHOP_CREDIT_INR)}). You have ${credits}.`,
      );
      return;
    }

    setPlacing(true);
    const payload = ready.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      selectedSize: line.item.selectedSize || line.item.variant,
      selectedColor: line.item.selectedColor,
    }));
    const result = await checkoutCart(payload, afterCoupon, appliedCoupon?.code, creditsNeeded, {
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      flatHouse: address.flatHouse,
      areaStreet: address.areaStreet,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    });
    if (!result.success) {
      setPlacing(false);
      Alert.alert("Order not placed", result.message || "Checkout did not go through.");
      return;
    }
    try {
      await fetchWallet(token, { force: true });
    } catch {
      // The order is already placed. The wallet figure on the receipt uses the last known balance.
    }
    const left = useCreditsStore.getState().credits;
    const orders = result.orders || [];
    setReceipt({
      ids: orders.map((order) => order.id),
      lines: orders.map((order) => `${order.item?.title || "Item"}  ×${order.quantity}`),
      itemTotal: subtotal,
      cashUsed: 0,
      creditsUsed: result.breakdown?.creditsUsed || creditsNeeded,
      creditsLeft: left,
    });
    removeLines(ready.map((line) => cartLineKey(line.item)));
    setPlacing(false);
    router.replace("/shop/success" as never);
  };

  const needsAccount = isGuest || !token;
  const footerLabel = placing
    ? "Placing..."
    : needsAccount
      ? "Create account"
      : ready.length === 0
        ? "Browse shop"
        : !address
          ? "Add address"
          : shortBy > 0
            ? "Not enough credits"
            : `Pay ${creditsNeeded} credits`;
  const showAmount = !placing && !needsAccount && ready.length > 0 && !!address;

  const onFooter = () => {
    if (placing) return;
    if (needsAccount) {
      promptGuestAccount(router, endGuestSession, "Create an account to place a shop order.");
      return;
    }
    if (ready.length === 0) {
      router.push("/shop" as never);
      return;
    }
    if (!address) {
      setAddressOpen(true);
      return;
    }
    if (shortBy > 0) {
      Alert.alert(
        "Not enough credits",
        `This order costs ${creditsNeeded} credits (1 credit = ${inr(SHOP_CREDIT_INR)}). You have ${credits}.`,
      );
      return;
    }
    void place();
  };

  if (lines.length === 0) {
    return (
      <SafeAreaView style={shopStyles.screen} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <View style={shopStyles.top}>
          <ShopBackButton fallback="/shop/cart" />
          <Text style={shopStyles.h2}>Checkout</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCopy}>Add a product before checkout.</Text>
        </View>
        <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable style={[shopStyles.cta, { justifyContent: "center" }]} onPress={() => router.push("/shop" as never)}>
            <Text style={shopStyles.ctaText}>Browse shop</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={shopStyles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={shopStyles.top}>
        <ShopBackButton fallback="/shop/cart" />
        <Text style={shopStyles.h2}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 + insets.bottom }}>
        <View style={shopStyles.card}>
          <View style={styles.addrRow}>
            <View style={styles.pin}>
              <Ionicons name="location-outline" size={20} color={shop.hero} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lab}>Deliver to  {address?.fullName || "Home"}</Text>
              <Text style={styles.addr}>{addressLine || "No address saved yet"}</Text>
              {address?.phoneNumber ? <Text style={styles.phone}>+91 {address.phoneNumber}</Text> : null}
            </View>
            <Pressable onPress={() => setAddressOpen(true)}>
              <Text style={shopStyles.viewAll}>{address ? "Change" : "Add"}</Text>
            </Pressable>
          </View>
          <View style={styles.eta}>
            <Ionicons name="car-outline" size={18} color={shop.muted} />
            <Text style={styles.etaText}>We'll share delivery details after the order is placed</Text>
          </View>
        </View>

        <View style={shopStyles.card}>
          <View style={styles.creditHead}>
            <View style={styles.coin}><Text style={styles.coinText}>CR</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.creditTitle}>Pay with credits</Text>
              <Text style={styles.creditSub}>1 credit = {inr(SHOP_CREDIT_INR)} on the shop. You have {credits} credits.</Text>
            </View>
          </View>
          <View style={styles.crBox}>
            <View style={styles.crBig}>
              <Text style={styles.crValue}>{creditsNeeded} CR</Text>
              <Text style={styles.crDisc}>{inr(afterCoupon)}</Text>
            </View>
            <Text style={styles.note}>
              {shortBy > 0
                ? `You need ${shortBy} more credits to place this order.`
                : "The full order is paid in credits. Wallet cash is not used."}
            </Text>
          </View>
        </View>

        <View style={shopStyles.card}>
          <Text style={shopStyles.cardTitle}>Coupon</Text>
          <View style={styles.couponRow}>
            <TextInput
              value={couponInput}
              onChangeText={setCouponInput}
              autoCapitalize="characters"
              placeholder="Coupon code"
              placeholderTextColor={shop.muted}
              style={styles.couponInput}
            />
            <Pressable onPress={validateCoupon} style={styles.couponBtn} disabled={couponLoading}>
              {couponLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.couponBtnText}>Apply</Text>}
            </Pressable>
          </View>
          {appliedCoupon ? (
            <View style={styles.applied}>
              <Text style={styles.appliedText}>{appliedCoupon.code} applied</Text>
              <Pressable onPress={() => { clearCoupon(); setCouponInput(""); }}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={shopStyles.card}>
          <Text style={shopStyles.cardTitle}>Bill details</Text>
          <Row label="Item total" value={inr(subtotal)} />
          <Row label="Delivery" value="Free to confirm" green />
          {discount > 0 ? <Row label={`Coupon (${appliedCoupon?.code})`} value={`−${inr(discount)}`} green /> : null}
          <Row label="Credits" value={`${creditsNeeded} CR`} green />
          <View style={styles.total}>
            <Text style={styles.totalLabel}>To pay</Text>
            <Text style={styles.totalValue}>{creditsNeeded} CR</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          style={[shopStyles.cta, !showAmount && { justifyContent: "center" }]}
          onPress={onFooter}
          disabled={placing}
        >
          {showAmount ? <Text style={shopStyles.ctaText}>{creditsNeeded} CR</Text> : null}
          <View style={styles.ctaRight}>
            {placing ? <ActivityIndicator color="#fff" /> : null}
            <Text style={shopStyles.ctaText}>{footerLabel}</Text>
            {!placing ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
          </View>
        </Pressable>
        <Text style={styles.fine}>Shop orders are paid in credits · 1 credit = {inr(SHOP_CREDIT_INR)}</Text>
      </View>

      <DeliveryAddressModal visible={addressOpen} onClose={() => setAddressOpen(false)} initialAddress={address} />
    </SafeAreaView>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={styles.bill}>
      <Text style={[styles.billLabel, green && { color: shop.hero }]}>{label}</Text>
      <Text style={[styles.billValue, green && { color: shop.hero }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  addrRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pin: { width: 40, height: 40, borderRadius: 12, backgroundColor: shop.tint, alignItems: "center", justifyContent: "center" },
  lab: { fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: shop.muted },
  addr: { fontWeight: "600", color: shop.ink, marginTop: 2 },
  phone: { color: shop.muted, marginTop: 2 },
  eta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  etaText: { color: shop.muted, flex: 1 },
  creditHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  coin: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F5C84B", alignItems: "center", justifyContent: "center" },
  coinText: { color: "#7a5600", fontWeight: "700" },
  creditTitle: { fontWeight: "700", color: shop.ink },
  creditSub: { color: shop.muted, fontSize: 12, marginTop: 2 },
  sw: { width: 50, height: 30, borderRadius: 99, backgroundColor: "#D5DDD1", justifyContent: "center", padding: 3 },
  swOn: { backgroundColor: shop.hero },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },
  crBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: shop.line },
  crBig: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  crValue: { fontSize: 30, fontWeight: "700", color: shop.ink },
  crDisc: { color: shop.hero, fontWeight: "700" },
  trackHit: { marginTop: 8, marginBottom: 4, height: 28, justifyContent: "center" },
  track: { height: 8, borderRadius: 8, backgroundColor: shop.line, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: shop.hero },
  sliderKnob: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: shop.hero,
    marginLeft: -11,
    top: 3,
  },
  chips: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderColor: shop.line, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: shop.hero, borderColor: shop.hero },
  chipText: { fontWeight: "600", fontSize: 13, color: shop.ink },
  chipTextOn: { color: "#fff" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: shop.ink },
  emptyCopy: { color: shop.muted, marginTop: 6, textAlign: "center" },
  note: { color: shop.muted, fontSize: 12.5, marginTop: 12, lineHeight: 18 },
  couponRow: { flexDirection: "row", gap: 8 },
  couponInput: { flex: 1, height: 48, borderWidth: 1.5, borderColor: shop.line, borderRadius: 14, paddingHorizontal: 14, color: shop.ink },
  couponBtn: { backgroundColor: shop.hero, borderRadius: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  couponBtnText: { color: "#fff", fontWeight: "700" },
  applied: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  appliedText: { color: shop.hero, fontWeight: "700" },
  remove: { color: shop.muted, fontWeight: "600" },
  pm: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: shop.line },
  pmIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: shop.soft, alignItems: "center", justifyContent: "center" },
  pmTitle: { fontWeight: "700", color: shop.ink },
  pmDetail: { color: shop.muted, fontSize: 12 },
  soon: { color: shop.muted, fontSize: 12, fontWeight: "700" },
  paid: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 14, backgroundColor: shop.tint, borderRadius: 16, padding: 14 },
  paidText: { color: shop.hero, fontWeight: "700", flex: 1 },
  bill: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: 12 },
  billLabel: { color: shop.muted, flex: 1 },
  billValue: { color: shop.ink, fontWeight: "600" },
  total: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderStyle: "dashed", borderTopColor: shop.line, marginTop: 6, paddingTop: 12 },
  totalLabel: { fontSize: 18, fontWeight: "700", color: shop.ink },
  totalValue: { fontSize: 20, fontWeight: "700", color: shop.ink },
  foot: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: shop.line, paddingHorizontal: 20, paddingTop: 12 },
  ctaRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  fine: { textAlign: "center", color: shop.muted, fontSize: 12, marginTop: 8 },
});
