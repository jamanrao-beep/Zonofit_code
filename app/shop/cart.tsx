import React from "react";
import { View, Text, ScrollView, Pressable, Image, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { inr, SHOP_CREDIT_INR } from "@/data/shopCatalog";
import { cartLineKey, isMarketplaceId, useCartStore } from "@/store/useCartStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { ShopBackButton } from "@/components/shop/Chrome";
import ProductVisual from "@/components/shop/ProductVisual";
import { shopToast } from "@/components/shop/ShopToast";
import { shop, shopStyles } from "@/components/shop/theme";
import type { ShopShape } from "@/data/shopCatalog";

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lines = useCartStore((state) => state.cartItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const credits = useCreditsStore((state) => state.credits);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const payableLines = lines.filter((line) => line.item.purchasable !== false && isMarketplaceId(line.item.id));
  const itemTotal = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const payableTotal = payableLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const maxCredits = Math.min(credits, Math.floor(payableTotal / SHOP_CREDIT_INR));

  return (
    <SafeAreaView style={shopStyles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={shopStyles.top}>
        <ShopBackButton fallback="/shop" />
        <Text style={shopStyles.h2}>Cart {count > 0 ? <Text style={styles.count}>({count})</Text> : null}</Text>
      </View>

      {count === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="cart-outline" size={36} color={shop.hero} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyCopy}>Add protein, creatine and gear to get started.</Text>
          </View>
          <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Pressable style={[shopStyles.cta, { justifyContent: "center" }]} onPress={() => router.push("/shop" as never)}>
              <Text style={shopStyles.ctaText}>Browse shop</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 + insets.bottom }}>
            <View style={[shopStyles.card, { paddingBottom: 4 }]}>
              {lines.map((line, index) => {
                const key = cartLineKey(line.item);
                const preview = line.item.purchasable === false || !isMarketplaceId(line.item.id);
                return (
                  <View key={key} style={[styles.row, index === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
                    <Pressable onPress={() => router.push(`/shop/product/${line.item.id}` as never)} style={styles.thumb}>
                      {line.item.image ? (
                        <Image source={{ uri: line.item.image }} style={styles.thumbImage} resizeMode="contain" />
                      ) : (
                        <ProductVisual color={line.item.color || shop.hero} shape={(line.item.shape as ShopShape) || "tub"} size={40} />
                      )}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{line.item.name}</Text>
                      <Text style={styles.meta}>
                        {line.item.variant ? `${line.item.variant}  ` : ""}{line.item.weight || ""}
                        {preview ? "  · Preview" : ""}
                      </Text>
                      <View style={styles.step}>
                        <Pressable accessibilityLabel="Less" onPress={() => {
                          updateQuantity(key, line.quantity - 1);
                          if (line.quantity <= 1) shopToast("Removed from cart");
                        }}>
                          <Text style={styles.stepGlyph}>−</Text>
                        </Pressable>
                        <Text style={styles.stepCount}>{line.quantity}</Text>
                        <Pressable accessibilityLabel="More" onPress={() => {
                          if (line.quantity >= 20) {
                            shopToast("You can add up to 20 of this item");
                            return;
                          }
                          updateQuantity(key, line.quantity + 1);
                        }}>
                          <Text style={styles.stepGlyph}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.right}>
                      <Text style={styles.linePrice}>{inr(line.item.price * line.quantity)}</Text>
                      <Pressable onPress={() => { removeFromCart(key); shopToast("Removed from cart"); }}>
                        <Text style={styles.remove}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {maxCredits > 0 ? (
              <View style={styles.teaser}>
                <Ionicons name="pricetag-outline" size={18} color={shop.hero} />
                <Text style={styles.teaserText}>Save up to {inr(maxCredits * SHOP_CREDIT_INR)} with credits at checkout</Text>
              </View>
            ) : null}

            {payableLines.length !== lines.length ? (
              <Text style={styles.previewNote}>
                Preview items stay in the cart. Checkout charges only products that exist in the live marketplace.
              </Text>
            ) : null}

            <View style={shopStyles.card}>
              <Text style={shopStyles.cardTitle}>Bill details</Text>
              <BillRow label="Item total" value={inr(itemTotal)} />
              {itemTotal !== payableTotal ? <BillRow label="Preview, not charged" value={inr(itemTotal - payableTotal)} /> : null}
              <BillRow label="Delivery" value="Shared after ordering" green />
              <View style={styles.total}>
                <Text style={styles.totalLabel}>{payableLines.length > 0 ? "To checkout" : "Preview total"}</Text>
                <Text style={styles.totalValue}>{inr(payableLines.length > 0 ? payableTotal : itemTotal)}</Text>
              </View>
            </View>
          </ScrollView>
          <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Pressable style={shopStyles.cta} onPress={() => router.push("/shop/checkout" as never)}>
              <Text style={shopStyles.ctaText}>{payableLines.length > 0 ? inr(payableTotal) : "Preview"}</Text>
              <View style={styles.ctaRight}>
                <Text style={shopStyles.ctaText}>Checkout</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function BillRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={styles.bill}>
      <Text style={styles.billLabel}>{label}</Text>
      <Text style={[styles.billValue, green && { color: shop.hero }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  count: { color: shop.muted, fontWeight: "500", fontSize: 16 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: shop.soft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: shop.ink },
  emptyCopy: { color: shop.muted, marginTop: 6, textAlign: "center" },
  row: { flexDirection: "row", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: shop.line },
  thumb: { width: 68, height: 68, borderRadius: 14, backgroundColor: shop.soft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  name: { fontWeight: "700", fontSize: 15, color: shop.ink },
  meta: { color: shop.muted, marginTop: 2 },
  step: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: shop.line, borderRadius: 10, alignSelf: "flex-start", marginTop: 6 },
  stepGlyph: { width: 32, height: 30, textAlign: "center", lineHeight: 30, color: shop.hero, fontSize: 18, fontWeight: "700" },
  stepCount: { minWidth: 22, textAlign: "center", fontWeight: "700", color: shop.ink },
  right: { alignItems: "flex-end" },
  linePrice: { fontSize: 17, fontWeight: "700", color: shop.ink },
  remove: { color: shop.muted, fontSize: 12.5, fontWeight: "600", marginTop: 4 },
  teaser: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: shop.tint, borderRadius: 16, padding: 12, marginTop: 14 },
  teaserText: { flex: 1, color: shop.hero, fontWeight: "600" },
  previewNote: { color: shop.muted, fontSize: 13, marginTop: 12, lineHeight: 18 },
  bill: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  billLabel: { color: shop.muted },
  billValue: { color: shop.ink, fontWeight: "600" },
  total: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderStyle: "dashed", borderTopColor: shop.line, marginTop: 6, paddingTop: 12 },
  totalLabel: { fontSize: 18, fontWeight: "700", color: shop.ink },
  totalValue: { fontSize: 20, fontWeight: "700", color: shop.ink },
  foot: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: shop.line, paddingHorizontal: 20, paddingTop: 12 },
  ctaRight: { flexDirection: "row", alignItems: "center", gap: 6 },
});
