import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import {
  categoryNameFor,
  filterShopProducts,
  GOAL_LABEL,
  SHOP_CATEGORIES,
  sortShopProducts,
  type ShopGoal,
  type ShopSort,
} from "@/data/shopCatalog";
import { useShopCatalogStore } from "@/store/useShopCatalogStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { ShopBackButton, CartIconButton } from "@/components/shop/Chrome";
import ProductCard from "@/components/shop/ProductCard";
import { shop, shopStyles } from "@/components/shop/theme";

const SORTS: { id: ShopSort; label: string }[] = [
  { id: "pop", label: "Popular" },
  { id: "rt", label: "Top rated" },
  { id: "lo", label: "Price: low to high" },
  { id: "hi", label: "Price: high to low" },
];

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default function ShopListScreen() {
  const params = useLocalSearchParams<{ id: string; q?: string; goal?: string; brand?: string; wish?: string; best?: string }>();
  const category = categoryNameFor(one(params.id));
  const goal = one(params.goal);
  const brand = one(params.brand);
  const wish = one(params.wish) === "1";
  const best = one(params.best) === "1";
  const [search, setSearch] = useState(one(params.q));
  const [sub, setSub] = useState("All");
  const [sort, setSort] = useState<ShopSort>("pop");
  const products = useShopCatalogStore((state) => state.products);
  const load = useShopCatalogStore((state) => state.load);
  const wishedIds = useWishlistStore((state) => state.ids);
  const { width } = useWindowDimensions();
  const router = useRouter();

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const title = wish
    ? "Wishlist"
    : best
      ? "Best Sellers"
      : goal && GOAL_LABEL[goal as ShopGoal]
        ? GOAL_LABEL[goal as ShopGoal]
        : brand
          ? brand
          : category || "All products";

  const base = useMemo(
    () => filterShopProducts(products, { category, goal, brand, q: search, wish, best, wishedIds }),
    [products, category, goal, brand, search, wish, best, wishedIds]
  );

  const chipKey = category ? "sub" : "category";
  const chipValues = ["All", ...Array.from(new Set(base.map((product) => (chipKey === "sub" ? product.sub : product.category))))];
  const narrowed = sub === "All"
    ? base
    : base.filter((product) => (chipKey === "sub" ? product.sub : product.category) === sub);
  const shown = sortShopProducts(narrowed, sort);
  const cardWidth = Math.floor((width - 40 - 12) / 2);

  const openSort = () => {
    Alert.alert("Sort", undefined, [
      ...SORTS.map((entry) => ({ text: entry.label, onPress: () => setSort(entry.id) })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  return (
    <SafeAreaView style={shopStyles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={[shopStyles.top, { paddingBottom: 4 }]}>
        <ShopBackButton fallback="/shop" />
        <Text style={[shopStyles.h2, { flex: 1 }]} numberOfLines={1}>{title}</Text>
        <CartIconButton />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={shopStyles.pad}>
          <View style={shopStyles.search}>
            <Ionicons name="search-outline" size={20} color={shop.muted} />
            <TextInput
              value={search}
              onChangeText={(value) => {
                setSearch(value);
                setSub("All");
              }}
              placeholder={`Search in ${title.toLowerCase()}`}
              placeholderTextColor={shop.muted}
              style={shopStyles.searchInput}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <Pressable accessibilityLabel="Clear search" onPress={() => { setSearch(""); setSub("All"); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={shop.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {chipValues.length > 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {chipValues.map((value) => {
              const on = sub === value;
              const label = value === "All" || chipKey === "sub"
                ? value
                : SHOP_CATEGORIES.find((cat) => cat.name === value)?.name || value;
              return (
                <Pressable key={value} onPress={() => setSub(value)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.meta}>
          <Text style={styles.count}>{shown.length} product{shown.length === 1 ? "" : "s"}</Text>
          <Pressable onPress={openSort} style={styles.sort}>
            <Text style={styles.sortText}>{SORTS.find((entry) => entry.id === sort)?.label}</Text>
            <Ionicons name="chevron-down" size={16} color={shop.ink} />
          </Pressable>
        </View>

        {shown.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={36} color={shop.hero} />
            </View>
            <Text style={styles.emptyTitle}>{wish ? "Nothing saved yet" : "Nothing here yet"}</Text>
            <Text style={styles.emptyCopy}>
              {wish ? "Tap the heart on a product to keep it here." : "Try another filter or search."}
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => {
                if (search) {
                  setSearch("");
                  setSub("All");
                  return;
                }
                router.push("/shop" as never);
              }}
            >
              <Text style={styles.emptyBtnText}>{search ? "Clear search" : "Browse shop"}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {shown.map((product) => (
              <ProductCard key={product.id} product={product} width={cardWidth} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: 20, gap: 8, paddingTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: shop.line,
    backgroundColor: "#fff",
    borderRadius: 99,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: shop.hero, borderColor: shop.hero },
  chipText: { fontWeight: "600", fontSize: 13.5, color: shop.ink },
  chipTextOn: { color: "#fff" },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
  },
  count: { color: shop.muted, fontSize: 13.5 },
  sort: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: shop.line,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sortText: { fontWeight: "600", color: shop.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20 },
  empty: { alignItems: "center", paddingVertical: 70, paddingHorizontal: 20 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: shop.soft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: shop.ink },
  emptyCopy: { color: shop.muted, marginTop: 6, textAlign: "center" },
  emptyBtn: { marginTop: 16, backgroundColor: shop.hero, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "700" },
});
