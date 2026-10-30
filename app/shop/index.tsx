import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { filterShopProducts, GYM_CREDIT_INR, inr, SHOP_CATEGORIES, SHOP_GOALS } from "@/data/shopCatalog";
import { useShopCatalogStore } from "@/store/useShopCatalogStore";
import { useCartStore } from "@/store/useCartStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useUserStore } from "@/store/useUserStore";
import { promptGuestAccount } from "@/lib/guestAccount";
import { CartIconButton, OrdersIconButton, ShopBackButton, WishIconButton } from "@/components/shop/Chrome";
import ProductCard from "@/components/shop/ProductCard";
import { shop, shopStyles } from "@/components/shop/theme";

export default function ShopHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(typeof params.q === "string" ? params.q : "");
  useEffect(() => {
    if (typeof params.q === "string") setSearch(params.q);
  }, [params.q]);
  const products = useShopCatalogStore((state) => state.products);
  const load = useShopCatalogStore((state) => state.load);
  const cartCount = useCartStore((state) => state.cartItems.reduce((sum, line) => sum + line.quantity, 0));
  const cartTotal = useCartStore((state) => state.getTotalPrice());
  const credits = useCreditsStore((state) => state.credits);
  const fetchWallet = useCreditsStore((state) => state.fetchWallet);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const primaryGymName = useUserStore((state) => state.primaryGymName);
  const membershipGymName = useCreditsStore((state) => state.membershipInfo?.gymName);
  const selectedGymName = useGuestStore((state) => state.selectedGymName);
  const isGuest = useGuestStore((state) => state.isGuest);
  const endGuestSession = useGuestStore((state) => state.endGuestSession);

  useFocusEffect(
    useCallback(() => {
      void load();
      if (token && !isGuest) void fetchWallet(token);
    }, [load, token, isGuest, fetchWallet])
  );

  const primaryGym = primaryGymName || membershipGymName || user?.primaryGym || selectedGymName || "";
  const q = search.trim().toLowerCase();
  const matchesSearch = products.filter((product) => {
    if (!q) return true;
    return `${product.name} ${product.brand} ${product.sub} ${product.pack}`.toLowerCase().includes(q);
  });
  const best = matchesSearch.filter((product) => product.best);
  const liveExtras = matchesSearch.filter((product) => product.purchasable && !best.includes(product));
  const sellers = (q ? matchesSearch : [...best, ...liveExtras]).slice(0, 12);

  const brands = Array.from(new Set(products.map((product) => product.brand))).slice(0, 8);
  const liveCount = products.filter((product) => product.purchasable).length;
  const cardWidth = Math.min(172, Math.max(150, width * 0.42));

  const openList = (href: string) => router.push(href as never);

  return (
    <SafeAreaView style={shopStyles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={shopStyles.top}>
        <ShopBackButton />
        <View style={{ flex: 1 }}>
          <Text style={shopStyles.h1}>Shop</Text>
          <Text style={shopStyles.sub}>Fitness essentials for your journey</Text>
        </View>
        <OrdersIconButton />
        <WishIconButton />
        <CartIconButton />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: cartCount > 0 ? 130 + insets.bottom : 40 }}
      >
        <View style={shopStyles.pad}>
          <View style={shopStyles.search}>
            <Ionicons name="search-outline" size={20} color={shop.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search protein, creatine, gear & more"
              placeholderTextColor={shop.muted}
              style={shopStyles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (search.trim()) openList(`/shop/category/all?q=${encodeURIComponent(search.trim())}`);
              }}
            />
            {search.length > 0 ? (
              <Pressable accessibilityLabel="Clear search" onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={shop.muted} />
              </Pressable>
            ) : null}
          </View>
          {q ? (
            <Pressable
              onPress={() => openList(`/shop/category/all?q=${encodeURIComponent(search.trim())}`)}
              style={styles.seeAll}
            >
              <Text style={styles.seeAllText}>
                See all {filterShopProducts(products, { q: search }).length} results
              </Text>
              <Ionicons name="arrow-forward" size={16} color={shop.hero} />
            </Pressable>
          ) : null}

          {liveCount === 0 ? (
            <View style={styles.note}>
              <Text style={styles.noteText}>
                These products are catalogue previews. An order goes through only after the same item is added in the admin marketplace.
              </Text>
            </View>
          ) : null}

          <View style={styles.rep}>
            <View style={styles.blob} />
            <View style={styles.chip}>
              <Ionicons name="fitness-outline" size={14} color={shop.hero} />
              <Text style={styles.chipText}>Your primary gym</Text>
            </View>
            <Text style={styles.repTitle}>{isGuest ? "Membership is locked" : "Repurchase Your Membership"}</Text>
            <View style={styles.gymRow}>
              <Text style={styles.gymName}>
                {isGuest
                  ? selectedGymName ? `Pick: ${selectedGymName}` : "Choose a gym first"
                  : primaryGym ? `at ${primaryGym}` : "Choose your gym"}
              </Text>
              {!isGuest && primaryGym ? <Ionicons name="checkmark-circle" size={18} color={shop.hero} /> : null}
            </View>
            <Text style={styles.repCopy}>
              {isGuest
                ? "Guest mode can browse products. Renewing a membership and spending credits needs an account."
                : `Keep your progress going with ${primaryGym || "your gym"}. Use your remaining credits to renew your monthly plan.`}
            </Text>
            <View style={styles.repActions}>
              <Pressable
                onPress={() => router.push("/(tabs)/credits" as never)}
                style={styles.cred}
              >
                <Ionicons name="wallet-outline" size={22} color={shop.ink} />
                <View>
                  <Text style={styles.credLabel}>Your Credits</Text>
                  <Text style={styles.credValue}>
                    {isGuest ? "Locked" : credits}
                    {!isGuest ? <Text style={styles.credWorth}>  {inr(credits * GYM_CREDIT_INR)} at gyms</Text> : null}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (isGuest) {
                    promptGuestAccount(router, endGuestSession, "Create an account before renewing a membership.");
                    return;
                  }
                  if (!primaryGym) {
                    router.push("/onboarding/select-city" as never);
                    return;
                  }
                  router.push("/onboarding/order-summary?mode=repurchase" as never);
                }}
                style={styles.details}
              >
                <Text style={styles.detailsText}>{isGuest ? "Create Account" : "View Details"}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
          {SHOP_CATEGORIES.map((cat) => (
            <Pressable key={cat.id} style={styles.cat} onPress={() => openList(`/shop/category/${cat.id}`)}>
              <View style={styles.catIcon}>
                <Ionicons name={cat.icon as never} size={24} color={shop.ink} />
              </View>
              <Text style={styles.catName}>{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={shopStyles.pad}>
          <View style={shopStyles.sectionRow}>
            <Text style={shopStyles.sectionTitle}>Shop by Goal</Text>
            <Pressable onPress={() => openList("/shop/category/all")}>
              <Text style={shopStyles.viewAll}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.goals}>
            {SHOP_GOALS.map((goal) => (
              <Pressable key={goal.id} style={styles.goal} onPress={() => openList(`/shop/category/all?goal=${goal.id}`)}>
                <View style={styles.goalIcon}>
                  <Ionicons name={goal.icon as never} size={18} color={shop.hero} />
                </View>
                <Text style={styles.goalName}>{goal.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={shopStyles.sectionRow}>
            <Text style={shopStyles.sectionTitle}>Best Sellers</Text>
            <Pressable onPress={() => openList("/shop/category/all?best=1")}>
              <Text style={shopStyles.viewAll}>View All</Text>
            </Pressable>
          </View>
        </View>

        {sellers.length === 0 ? (
          <View style={[styles.emptySearch, shopStyles.pad]}>
            <Text style={styles.emptyTitle}>No products match “{search.trim()}”</Text>
            <Text style={styles.emptyCopy}>Try protein, creatine, or a brand name.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {sellers.map((product) => (
              <ProductCard key={product.id} product={product} width={cardWidth} />
            ))}
          </ScrollView>
        )}

        <View style={shopStyles.pad}>
          <View style={shopStyles.sectionRow}>
            <Text style={shopStyles.sectionTitle}>Top Brands</Text>
            <Pressable onPress={() => openList("/shop/category/all")}>
              <Text style={shopStyles.viewAll}>View All</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {brands.map((brand) => (
            <Pressable key={brand} style={styles.brand} onPress={() => openList(`/shop/category/all?brand=${encodeURIComponent(brand)}`)}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>{brand.slice(0, 2).toUpperCase()}</Text>
              </View>
              <Text style={styles.brandName} numberOfLines={2}>{brand}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      {cartCount > 0 ? (
        <Pressable
          onPress={() => router.push("/shop/cart" as never)}
          style={[styles.cbar, { bottom: insets.bottom + 16 }]}
        >
          <View>
            <Text style={styles.cbarCount}>{cartCount} item{cartCount === 1 ? "" : "s"}</Text>
            <Text style={styles.cbarTotal}>{inr(cartTotal)}</Text>
          </View>
          <View style={styles.cbarRight}>
            <Text style={styles.cbarGo}>View Cart</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </View>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  seeAll: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: shop.tint,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  seeAllText: { color: shop.hero, fontWeight: "700" },
  note: { backgroundColor: shop.tint, borderRadius: 16, padding: 12, marginTop: 8 },
  noteText: { color: shop.hero, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  rep: {
    marginTop: 16,
    borderRadius: 26,
    padding: 20,
    backgroundColor: "#F4FBF6",
    borderWidth: 1,
    borderColor: "#cfe5d3",
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    right: -60,
    bottom: -70,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(31,122,63,0.08)",
  },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: shop.tint,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
  },
  chipText: { color: shop.hero, fontWeight: "700", fontSize: 11.5, letterSpacing: 0.8, textTransform: "uppercase" },
  repTitle: { fontSize: 24, lineHeight: 28, fontWeight: "700", color: shop.ink, marginTop: 12 },
  gymRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  gymName: { color: shop.hero, fontWeight: "700", fontSize: 20 },
  repCopy: { color: shop.muted, marginTop: 8, marginBottom: 16, fontSize: 14, lineHeight: 20 },
  repActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  cred: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: shop.line,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  credLabel: { color: shop.muted, fontSize: 12 },
  credValue: { fontSize: 22, fontWeight: "700", color: shop.ink },
  credWorth: { color: shop.muted, fontSize: 12, fontWeight: "400" },
  details: {
    height: 50,
    borderRadius: 99,
    backgroundColor: shop.hero,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailsText: { color: "#fff", fontWeight: "700" },
  cats: { paddingHorizontal: 20, paddingTop: 22, gap: 10 },
  cat: { width: 76, alignItems: "center" },
  catIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: shop.soft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  catName: { fontSize: 12.5, color: shop.ink, textAlign: "center" },
  goals: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  goal: {
    width: "48%",
    marginBottom: 10,
    height: 56,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: shop.line,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
  },
  goalIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: shop.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  goalName: { flex: 1, fontWeight: "600", color: shop.ink, fontSize: 14 },
  row: { paddingHorizontal: 20, gap: 12 },
  emptySearch: { paddingVertical: 12 },
  emptyTitle: { fontWeight: "700", color: shop.ink },
  emptyCopy: { color: shop.muted, marginTop: 4 },
  brand: { width: 84, alignItems: "center" },
  brandMark: {
    height: 58,
    width: 84,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: shop.line,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
    backgroundColor: "#fff",
  },
  brandMarkText: { fontSize: 19, fontWeight: "700", fontStyle: "italic", color: shop.ink },
  brandName: { fontSize: 11.5, color: shop.muted, textAlign: "center" },
  cbar: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: shop.hero,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cbarCount: { color: "#fff", fontWeight: "700" },
  cbarTotal: { color: "rgba(255,255,255,0.85)", fontSize: 12.5, marginTop: 2 },
  cbarRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  cbarGo: { color: "#fff", fontWeight: "700" },
});
