import React, { useCallback, useEffect, useState } from "react";
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
  GestureResponderEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { inr, SHOP_CREDIT_INR, GYM_CREDIT_INR } from "@/data/shopCatalog";
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

const METHODS = [
  { id: "upi", title: "UPI", detail: "GPay, PhonePe, Paytm & more", icon: "qr-code-outline" },
  { id: "card", title: "Credit / Debit card", detail: "Visa, Mastercard, RuPay", icon: "card-outline" },
  { id: "net", title: "Netbanking", detail: "All major banks", icon: "business-outline" },
] as const;

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lines = useCartStore((state) => state.cartItems);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);
  const removeLines = useCartStore((state) => state.removeLines);
  const credits = useCreditsStore((state) => state.credits);
  const cashBalance = useCreditsStore((state) => state.cashBalance);
  const checkoutCart = useCreditsStore((state) => state.checkoutCart);
  const fetchWallet = useCreditsStore((state) => state.fetchWallet);
  const token = useAuthStore((state) => state.token);
  const isGuest = useGuestStore((state) => state.isGuest);
  const endGuestSession = useGuestStore((state) => state.endGuestSession);
  const address = useAddressStore((state) => state.addresses.find((entry) => entry.id === state.selectedAddressId) || state.addresses.find((entry) => entry.isDefault) || state.addresses[0] || null);
  const setReceipt = useShopReceiptStore((state) => state.setReceipt);

  const [useCredits, setUseCredits] = useState(false);
  const [creditsToUse, setCreditsToUse] = useState(0);
  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [trackWidth, setTrackWidth] = useState(1);

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
  const cashUsed = Math.min(cashBalance, afterCoupon);
  const remainder = afterCoupon - cashUsed;
  const maxCredits = Math.min(credits, Math.floor(remainder / SHOP_CREDIT_INR));
  const chosenCredits = useCredits ? Math.min(creditsToUse, maxCredits) : 0;
  const creditValue = chosenCredits * SHOP_CREDIT_INR;
  const stillDue = Math.max(0, remainder - creditValue);
  const halfCredits = Math.floor(maxCredits / 2);

  const setCreditsFromX = (x: number) => {
    if (maxCredits <= 0 || trackWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    setCreditsToUse(Math.round(ratio * maxCredits));
  };

  const onSlide = (event: GestureResponderEvent) => setCreditsFromX(event.nativeEvent.locationX);

  useEffect(() => {
    if (creditsToUse > maxCredits) setCreditsToUse(maxCredits);
  }, [creditsToUse, maxCredits]);

  const addressLine = address
    ? [address.flatHouse, address.areaStreet, address.city, address.state, address.pincode].filter(Boolean).join(", ")
    : "";

  const explainPayment = () => {
    Alert.alert(
      "Online payment is not connected",
      `This order still needs ${inr(stillDue)}. UPI, cards, and netbanking are not taking shop payments yet. Cover the rest with wallet cash or credits, or add funds from Credits.`
    );
  };

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
      Alert.alert("Nothing to charge", "The cart only has catalogue previews. Add a live marketplace product to check out.");
      return;
    }
    if (!address) {
      setAddressOpen(true);
      return;
    }
    if (stillDue > 0) {
      explainPayment();
      return;
    }

    setPlacing(true);
    const payload = ready.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      selectedSize: line.item.selectedSize || line.item.variant,
      selectedColor: line.item.selectedColor,
    }));
    const result = await checkoutCart(payload, afterCoupon, appliedCoupon?.code, chosenCredits);
    if (!result.success) {
      setPlacing(false);
      Alert.alert("Order not placed", result.message || "Checkout did not go through.");
      return;
    }
    try {
      await fetchWallet(token);
    } catch {
      // The order is already placed. The wallet figure on the receipt uses the last known balance.
    }
    const left = useCreditsStore.getState().credits;
    const orders = result.orders || [];
    setReceipt({
      ids: orders.map((order) => order.id),
      lines: orders.map((order) => `${order.item?.title || "Item"}  ×${order.quantity}`),
      itemTotal: subtotal,
      cashUsed: (result.breakdown?.inrPaiseUsed || 0) / 100,
      creditsUsed: result.breakdown?.creditsUsed || chosenCredits,
      creditsLeft: left,
    });
    removeLines(ready.map((line) => cartLineKey(line.item)));
    setPlacing(false);
    router.replace("/shop/success" as never);
  };

  const needsAccount = isGuest || !token;
  const footerLabel = placing
    ? "Placing"
    : needsAccount
      ? "Create account"
      : ready.length === 0
        ? "Browse shop"
        : !address
          ? "Add address"
          : stillDue > 0
            ? "Add funds"
            : "Place order";
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
    if (stillDue > 0) {
      router.push("/(tabs)/credits" as never);
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
            <View style={styles.coin}><Text style={styles.coinText}>₹</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.creditTitle}>Use ZonoFit credits</Text>
              <Text style={styles.creditSub}>{credits} CR available · 1 CR = {inr(SHOP_CREDIT_INR)} here · {inr(GYM_CREDIT_INR)} at gyms</Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: useCredits }}
              accessibilityLabel="Use credits"
              onPress={() => {
                const next = !useCredits;
                setUseCredits(next);
                if (next) setCreditsToUse(maxCredits);
              }}
              style={[styles.sw, useCredits && styles.swOn]}
            >
              <View style={[styles.knob, useCredits && styles.knobOn]} />
            </Pressable>
          </View>
          {useCredits ? (
            <View style={styles.crBox}>
              <View style={styles.crBig}>
                <Text style={styles.crValue}>{chosenCredits} CR</Text>
                <Text style={styles.crDisc}>{inr(creditValue)}</Text>
              </View>
              <View
                onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => maxCredits > 0}
                onMoveShouldSetResponder={() => maxCredits > 0}
                onResponderGrant={onSlide}
                onResponderMove={onSlide}
                style={styles.trackHit}
              >
                <View style={styles.track}>
                  <View style={[styles.fill, { width: maxCredits ? `${(chosenCredits / maxCredits) * 100}%` : "0%" }]} />
                </View>
                <View
                  pointerEvents="none"
                  style={[styles.sliderKnob, { left: maxCredits ? `${(chosenCredits / maxCredits) * 100}%` : 0 }]}
                />
              </View>
              <View style={styles.chips}>
                <Pressable onPress={() => setCreditsToUse(0)} style={[styles.chip, chosenCredits === 0 && styles.chipOn]}>
                  <Text style={[styles.chipText, chosenCredits === 0 && styles.chipTextOn]}>None</Text>
                </Pressable>
                <Pressable onPress={() => setCreditsToUse(halfCredits)} style={[styles.chip, halfCredits > 0 && chosenCredits === halfCredits && halfCredits !== maxCredits && styles.chipOn]}>
                  <Text style={[styles.chipText, halfCredits > 0 && chosenCredits === halfCredits && halfCredits !== maxCredits && styles.chipTextOn]}>Half</Text>
                </Pressable>
                <Pressable onPress={() => setCreditsToUse(maxCredits)} style={[styles.chip, maxCredits > 0 && chosenCredits === maxCredits && styles.chipOn]}>
                  <Text style={[styles.chipText, maxCredits > 0 && chosenCredits === maxCredits && styles.chipTextOn]}>Use max</Text>
                </Pressable>
              </View>
              <Text style={styles.note}>
                Wallet cash is applied first. Credits then cover what's left, at {inr(SHOP_CREDIT_INR)} each, up to your balance.
              </Text>
            </View>
          ) : null}
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

        {stillDue > 0 ? (
          <View style={shopStyles.card}>
            <Text style={shopStyles.cardTitle}>Pay {inr(stillDue)} with</Text>
            {METHODS.map((method) => (
              <Pressable key={method.id} onPress={explainPayment} style={styles.pm}>
                <View style={styles.pmIcon}><Ionicons name={method.icon} size={18} color={shop.hero} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pmTitle}>{method.title}</Text>
                  <Text style={styles.pmDetail}>{method.detail}</Text>
                </View>
                <Text style={styles.soon}>Not live</Text>
              </Pressable>
            ))}
          </View>
        ) : ready.length > 0 ? (
          <View style={styles.paid}>
            <Ionicons name="lock-closed-outline" size={18} color={shop.hero} />
            <Text style={styles.paidText}>Fully covered by your wallet. No payment needed.</Text>
          </View>
        ) : (
          <View style={styles.paid}>
            <Text style={styles.paidText}>No live products in this cart yet.</Text>
          </View>
        )}

        <View style={shopStyles.card}>
          <Text style={shopStyles.cardTitle}>Bill details</Text>
          <Row label="Item total" value={inr(subtotal)} />
          <Row label="Delivery" value="Free to confirm" green />
          {discount > 0 ? <Row label={`Coupon (${appliedCoupon?.code})`} value={`−${inr(discount)}`} green /> : null}
          {cashUsed > 0 ? <Row label="Wallet cash" value={`−${inr(cashUsed)}`} green /> : null}
          {chosenCredits > 0 ? <Row label={`Credits (${chosenCredits} CR × ${inr(SHOP_CREDIT_INR)})`} value={`−${inr(creditValue)}`} green /> : null}
          <View style={styles.total}>
            <Text style={styles.totalLabel}>To pay</Text>
            <Text style={styles.totalValue}>{inr(stillDue)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          style={[shopStyles.cta, !showAmount && { justifyContent: "center" }]}
          onPress={onFooter}
          disabled={placing}
        >
          {showAmount ? <Text style={shopStyles.ctaText}>{inr(stillDue)}</Text> : null}
          <View style={styles.ctaRight}>
            {placing ? <ActivityIndicator color="#fff" /> : null}
            <Text style={shopStyles.ctaText}>{footerLabel}</Text>
            {!placing ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
          </View>
        </Pressable>
        <Text style={styles.fine}>Secure checkout · wallet cash and credits only</Text>
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
