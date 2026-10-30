import React from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  defaultOptionValue,
  inr,
  offPercent,
  type ShopProduct,
} from "@/data/shopCatalog";
import { cartLineKey, useCartStore, type ShopItem } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useGuestStore } from "@/store/useGuestStore";
import { promptGuestAccount } from "@/lib/guestAccount";
import ProductVisual from "@/components/shop/ProductVisual";
import { shopToast } from "@/components/shop/ShopToast";
import { shop } from "@/components/shop/theme";

export function toCartItem(product: ShopProduct, option: string): ShopItem {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: product.price,
    originalPrice: product.mrp,
    image: product.imageUrl || "",
    weight: product.pack,
    variant: option || undefined,
    selectedSize: option || undefined,
    purchasable: product.purchasable,
    color: product.color,
    shape: product.shape,
  };
}

export default function ProductCard({
  product,
  width = 172,
}: {
  product: ShopProduct;
  width?: number;
}) {
  const router = useRouter();
  const option = defaultOptionValue(product);
  const line = toCartItem(product, option);
  const key = cartLineKey(line);
  const qty = useCartStore((state) => state.cartItems.find((ci) => cartLineKey(ci.item) === key)?.quantity || 0);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const wished = useWishlistStore((state) => state.ids.includes(product.id));
  const toggleWish = useWishlistStore((state) => state.toggle);
  const isGuest = useGuestStore((state) => state.isGuest);
  const endGuestSession = useGuestStore((state) => state.endGuestSession);
  const off = offPercent(product);

  const open = () => router.push(`/shop/product/${product.id}` as never);

  const onWish = () => {
    if (isGuest) {
      promptGuestAccount(router, endGuestSession, "Create an account to save products. You can still add items to the cart.");
      return;
    }
    toggleWish(product.id);
    shopToast(wished ? "Removed from wishlist" : "Saved to wishlist");
  };

  const addOne = () => {
    if (qty >= 20) {
      shopToast("You can add up to 20 of this item");
      return;
    }
    addToCart(line);
    if (qty === 0) shopToast(product.purchasable ? "Added to cart" : "Added as a preview");
  };

  const removeOne = () => {
    updateQuantity(key, qty - 1);
    if (qty <= 1) shopToast("Removed from cart");
  };

  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.imageBox}>
        <Pressable onPress={open} style={styles.imageTap} accessibilityRole="button">
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" />
          ) : (
            <ProductVisual color={product.color} shape={product.shape} size={Math.min(96, width * 0.55)} />
          )}
        </Pressable>
        {off > 0 ? (
          <View style={styles.off} pointerEvents="none">
            <Text style={styles.offText}>{off}% off</Text>
          </View>
        ) : null}
        {!product.purchasable ? (
          <View style={[styles.preview, off > 0 ? { top: 32 } : null]} pointerEvents="none">
            <Text style={styles.previewText}>{product.inStock ? "Preview" : "Out of stock"}</Text>
          </View>
        ) : null}
        <Pressable accessibilityLabel="Wishlist" onPress={onWish} style={styles.heart}>
          <Ionicons name={wished ? "heart" : "heart-outline"} size={18} color={wished ? shop.red : shop.muted} />
        </Pressable>
      </View>

      <Pressable onPress={open}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      </Pressable>
      <Text style={styles.meta} numberOfLines={1}>
        {option ? `${option}  ` : ""}{product.pack}
      </Text>
      {product.rating > 0 ? (
        <View style={styles.rating}>
          <Ionicons name="star" size={13} color={shop.star} />
          <Text style={styles.ratingText}>{product.rating}</Text>
          {product.ratingCount ? <Text style={styles.ratingCount}>({product.ratingCount})</Text> : null}
        </View>
      ) : (
        <Text style={styles.live}>Live item</Text>
      )}
      <Text style={styles.price}>
        {inr(product.price)}
        {off > 0 ? <Text style={styles.mrp}>  {inr(product.mrp)}</Text> : null}
      </Text>

      {!product.inStock ? (
        <View style={[styles.add, styles.addOff]}>
          <Text style={styles.addOffText}>Out of stock</Text>
        </View>
      ) : qty > 0 ? (
        <View style={styles.qty}>
          <Pressable accessibilityLabel="Less" onPress={removeOne} style={styles.qtyBtn}>
            <Text style={styles.qtyGlyph}>−</Text>
          </Pressable>
          <Text style={styles.qtyCount}>{qty}</Text>
          <Pressable accessibilityLabel="More" onPress={addOne} style={styles.qtyBtn}>
            <Text style={styles.qtyGlyph}>+</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={addOne} style={styles.add}>
          <Text style={styles.addText}>Add to Cart</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: shop.line,
    borderRadius: 22,
    padding: 10,
  },
  imageBox: {
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: shop.soft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageTap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  off: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: shop.hero,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  preview: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewText: { color: shop.ink, fontWeight: "700", fontSize: 11 },
  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14.5, fontWeight: "700", lineHeight: 18, color: shop.ink, marginTop: 10, marginHorizontal: 2, minHeight: 36 },
  meta: { color: shop.muted, fontSize: 12.5, marginHorizontal: 2 },
  rating: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, marginHorizontal: 2 },
  ratingText: { fontSize: 12.5, fontWeight: "600", color: shop.ink },
  ratingCount: { fontSize: 12.5, color: shop.muted },
  live: { marginTop: 8, marginHorizontal: 2, fontSize: 12.5, color: shop.hero, fontWeight: "600" },
  price: { fontSize: 21, fontWeight: "700", color: shop.ink, marginTop: 6, marginBottom: 10, marginHorizontal: 2 },
  mrp: { fontSize: 12.5, fontWeight: "500", color: shop.muted, textDecorationLine: "line-through" },
  add: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: shop.hero,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  addText: { color: shop.hero, fontWeight: "700" },
  addOff: { borderColor: shop.line },
  addOffText: { color: shop.muted, fontWeight: "700" },
  qty: {
    height: 42,
    borderRadius: 12,
    backgroundColor: shop.hero,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  qtyBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  qtyGlyph: { color: "#fff", fontSize: 20, fontWeight: "700" },
  qtyCount: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
