import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useGuestStore } from "@/store/useGuestStore";
import { promptGuestAccount } from "@/lib/guestAccount";
import { shop, shopStyles } from "@/components/shop/theme";

export function ShopBackButton({ fallback = "/(tabs)/explore" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityLabel="Back"
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback as never);
      }}
      style={shopStyles.back}
    >
      <Ionicons name="arrow-back" size={20} color={shop.ink} />
    </Pressable>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={shopStyles.badge}>
      <Text style={shopStyles.badgeText}>{count > 99 ? "99" : count}</Text>
    </View>
  );
}

export function CartIconButton() {
  const router = useRouter();
  const count = useCartStore((state) => state.cartItems.reduce((sum, line) => sum + line.quantity, 0));
  return (
    <Pressable accessibilityLabel="Cart" onPress={() => router.push("/shop/cart" as never)} style={shopStyles.act}>
      <Ionicons name="cart-outline" size={22} color={shop.ink} />
      <Badge count={count} />
    </Pressable>
  );
}

export function OrdersIconButton() {
  const router = useRouter();
  return (
    <Pressable accessibilityLabel="Orders" onPress={() => router.push("/shop/orders" as never)} style={shopStyles.act}>
      <Ionicons name="receipt-outline" size={22} color={shop.ink} />
    </Pressable>
  );
}

export function WishIconButton() {
  const router = useRouter();
  const count = useWishlistStore((state) => state.ids.length);
  const isGuest = useGuestStore((state) => state.isGuest);
  const endGuestSession = useGuestStore((state) => state.endGuestSession);
  return (
    <Pressable
      accessibilityLabel="Wishlist"
      onPress={() => {
        if (isGuest) {
          promptGuestAccount(router, endGuestSession, "Create an account to save products. You can still add items to the cart.");
          return;
        }
        router.push("/shop/category/all?wish=1" as never);
      }}
      style={shopStyles.act}
    >
      <Ionicons name={count > 0 ? "heart" : "heart-outline"} size={22} color={count > 0 ? shop.red : shop.ink} />
      <Badge count={count} />
    </Pressable>
  );
}

export function ShopTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.title}>
      <ShopBackButton fallback="/(tabs)/explore" />
      <View style={{ flex: 1 }}>
        <Text style={subtitle ? shopStyles.h1 : shopStyles.h2}>{title}</Text>
        {subtitle ? <Text style={shopStyles.sub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
});
