import React, { useCallback, useEffect, useState } from "react";
import { ackPush } from "@/lib/tapAck";
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
  const loaded = useShopCatalogStore((state) => state.loaded);
  const loadError = useShopCatalogStore((state) => state.loadError);
  const load = useShopCatalogStore((state) => state.load);
  const cartCount = useCartStore((state) => state.cartItems.reduce((sum, line) => sum + line.quantity, 0));
  const cartTotal = useCartStore((state) => state.getTotalPrice());
  const credits = useCreditsStore((state) => state.credits);
  const membershipInfo = useCreditsStore((state) => state.membershipInfo);
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
  const cycleNumber = membershipInfo?.cycleNumber || 1;
  const includedVisits = (cycleNumber > 4 || membershipInfo?.mandatoryVisits === 15) ? 15 : 10;
  const planCostCredits = Math.round(((membershipInfo as any)?.priceINR || (membershipInfo as any)?.planPriceINR || 1500) / 10);
  const hasEnoughCredits = !isGuest && credits >= planCostCredits;
  const creditShortfall = Math.max(0, planCostCredits - (isGuest ? 0 : credits));
  const fillPercent = planCostCredits > 0 ? Math.min(100, Math.round(((isGuest ? 0 : credits) / planCostCredits) * 100)) : 0;
  const gymDisplayName = primaryGym || "ZonoFit Test Arena";
  const q = search.trim().toLowerCase();
  const matchesSearch = products.filter((product) => {
    if (!q) return true;
    return `${product.name} ${product.brand} ${product.sub} ${product.pack}`.toLowerCase().includes(q);
  });
  const sellers = matchesSearch.slice(0, 12);
  const brands = Array.from(new Set(products.map((product) => product.brand.trim()).filter(Boolean))).slice(0, 8);
  const hasGoals = products.some((product) => product.goals.length > 0);
  const storeEmpty = loaded && products.length === 0;
  const waiting = !loaded && products.length === 0 && !loadError;
  const cardWidth = Math.min(172, Math.max(150, width * 0.42));

  const openList = (href: string) => ackPush(router, href);

  return (
    <SafeAreaView style={shopStyles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={shopStyles.top}>
        <ShopBackButton />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={shopStyles.h1}>Shop</Text>
            <View style={styles.comingSoonHeaderBadge}>
              <Text style={styles.comingSoonHeaderBadgeText}>COMING SOON</Text>
            </View>
          </View>
          <Text style={shopStyles.sub}>Marketplace preview & launch priority</Text>
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
          {/* Marketplace Announcement Banner */}
          <View style={styles.launchBanner}>
            <View style={styles.launchBannerIconWrap}>
              <Ionicons name="sparkles" size={18} color="#1F7A3F" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <Text style={styles.launchBannerTitle}>Marketplace Coming Soon</Text>
                <View style={styles.miniPill}>
                  <Text style={styles.miniPillText}>SNEAK PEEK</Text>
                </View>
              </View>
              <Text style={styles.launchBannerSubtitle}>
                We are curating 100% genuine supplements, apparel, and training gear. Preview upcoming categories below!
              </Text>
            </View>
          </View>

          <View style={shopStyles.search}>
            <Ionicons name="search-outline" size={20} color={shop.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search upcoming supplements, gear & more"
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


          {/* ─── Hero Repurchase Membership Card (Mockup Exact Match) ─── */}
          <View style={heroStyles.hero}>
            <View style={heroStyles.heroAmbient} />

            {/* Chip */}
            <View style={heroStyles.chip}>
              <View style={heroStyles.chipDot} />
              <Text style={heroStyles.chipText}>Your primary gym</Text>
            </View>

            {/* Title */}
            <Text style={heroStyles.heroTitle}>
              Renew your membership at{" "}
              <Text style={heroStyles.heroTitleSpan}>{gymDisplayName}</Text>
            </Text>

            {/* Subtitle */}
            <Text style={heroStyles.heroSub}>
              Keep your progress going. Renew with your credits in one tap.
            </Text>

            {/* Credit Comparison Box */}
            <View style={heroStyles.cr}>
              <View style={heroStyles.crRow}>
                <View>
                  <Text style={heroStyles.crSmall}>Your credits</Text>
                  <Text style={heroStyles.crBig}>
                    {isGuest ? "0" : credits}
                    <Text style={heroStyles.crBigSpan}> credits</Text>
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={heroStyles.crSmall}>Monthly plan</Text>
                  <Text style={heroStyles.crCostVal}>{planCostCredits} credits</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={heroStyles.bar}>
                <View style={[heroStyles.barFill, { width: `${fillPercent}%` }]} />
              </View>

              {/* Dynamic Note */}
              <View style={heroStyles.note}>
                {hasEnoughCredits ? (
                  <>
                    <Ionicons name="checkmark-circle" size={15} color="#6BCB77" />
                    <Text style={heroStyles.noteText}>
                      You have enough. {credits - planCostCredits} credits left after renewing.
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="alert-circle-outline" size={15} color="#FCD34D" />
                    <Text style={[heroStyles.noteText, { color: "#FEF3C7" }]}>
                      You need {creditShortfall} more credits to renew.
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* CTA Button */}
            <Pressable
              onPress={() => {
                if (isGuest) {
                  promptGuestAccount(router, endGuestSession, "Create an account to renew your membership.");
                  return;
                }
                if (hasEnoughCredits) {
                  ackPush(router, "/onboarding/order-summary?mode=repurchase");
                } else {
                  ackPush(router, "/(tabs)/credits");
                }
              }}
              style={({ pressed }) => [heroStyles.ctaBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            >
              <Text style={heroStyles.ctaText}>
                {isGuest
                  ? "Create Account to Renew"
                  : hasEnoughCredits
                    ? "Renew now"
                    : `Add ${creditShortfall} credits & renew`}
              </Text>
            </Pressable>

            {/* View plan details link */}
            <Pressable
              onPress={() => {
                if (isGuest) {
                  promptGuestAccount(router, endGuestSession, "Create an account to view plan details.");
                  return;
                }
                ackPush(router, "/onboarding/order-summary?mode=repurchase");
              }}
              style={{ marginTop: 14 }}
            >
              <Text style={heroStyles.planDetailsLink}>View plan details</Text>
            </Pressable>
          </View>

          {/* ─── 3-Column Included Benefits Card (.inc Exact Match) ─── */}
          <View style={heroStyles.incCard}>
            <View style={heroStyles.incCol}>
              <Ionicons name="calendar-outline" size={20} color="#1F7A3F" />
              <Text style={heroStyles.incBold}>30 days</Text>
              <Text style={heroStyles.incSub}>of access</Text>
            </View>
            <View style={heroStyles.incDivider} />
            <View style={heroStyles.incCol}>
              <Ionicons name="barbell-outline" size={20} color="#1F7A3F" />
              <Text style={heroStyles.incBold}>{includedVisits} visits</Text>
              <Text style={heroStyles.incSub}>included</Text>
            </View>
            <View style={heroStyles.incDivider} />
            <View style={heroStyles.incCol}>
              <Ionicons name="sparkles-outline" size={20} color="#1F7A3F" />
              <Text style={heroStyles.incBold}>Rest as credits</Text>
              <Text style={heroStyles.incSub}>use anywhere</Text>
            </View>
          </View>
        </View>

        {waiting ? (
          <View style={[styles.emptyStore, shopStyles.pad]}>
            <Text style={styles.emptyCopy}>Loading the store</Text>
          </View>
        ) : storeEmpty || (loadError && products.length === 0) ? (
          <View style={[styles.emptyStore, shopStyles.pad]}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-handle-outline" size={36} color={shop.hero} />
            </View>
            <Text style={styles.emptyTitle}>{loadError && !loaded ? "The store could not be loaded" : "The store is empty"}</Text>
            <Text style={styles.emptyCopy}>
              {loadError && !loaded
                ? "Open the shop again in a moment."
                : "Products show up here after they are added in the admin marketplace."}
            </Text>
          </View>
        ) : (
          <>
            <View style={shopStyles.pad}>
              <View style={shopStyles.sectionRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={shopStyles.sectionTitle}>Categories</Text>
                  <View style={styles.catComingSoonBadge}>
                    <Text style={styles.catComingSoonBadgeText}>COMING SOON</Text>
                  </View>
                </View>
                <Pressable onPress={() => openList("/shop/category/all")}>
                  <Text style={shopStyles.viewAll}>Explore All</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
              {SHOP_CATEGORIES.map((cat) => (
                <Pressable key={cat.id} style={styles.cat} onPress={() => openList(`/shop/category/${cat.id}`)}>
                  <View style={styles.catIcon}>
                    <Ionicons name={cat.icon as never} size={24} color={shop.ink} />
                  </View>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <View style={styles.catTag}>
                    <Text style={styles.catTagText}>Soon</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <View style={shopStyles.pad}>
              {hasGoals ? (
                <>
                  <View style={shopStyles.sectionRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={shopStyles.sectionTitle}>Shop by Goal</Text>
                      <View style={styles.catComingSoonBadge}>
                        <Text style={styles.catComingSoonBadgeText}>PREVIEW</Text>
                      </View>
                    </View>
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
                </>
              ) : null}

              <View style={shopStyles.sectionRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={shopStyles.sectionTitle}>Upcoming Drops</Text>
                  <View style={styles.catComingSoonBadge}>
                    <Text style={styles.catComingSoonBadgeText}>COMING SOON</Text>
                  </View>
                </View>
                <Pressable onPress={() => openList("/shop/category/all")}>
                  <Text style={shopStyles.viewAll}>View All</Text>
                </Pressable>
              </View>
            </View>

            {sellers.length === 0 ? (
              <View style={[styles.emptySearch, shopStyles.pad]}>
                <Text style={styles.emptyTitle}>No products match “{search.trim()}”</Text>
                <Text style={styles.emptyCopy}>Try another name or brand.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {sellers.map((product) => (
                  <ProductCard key={product.id} product={product} width={cardWidth} />
                ))}
              </ScrollView>
            )}

            {brands.length > 0 ? (
              <>
                <View style={shopStyles.pad}>
                  <View style={shopStyles.sectionRow}>
                    <Text style={shopStyles.sectionTitle}>Brands</Text>
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
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {cartCount > 0 ? (
        <Pressable
          onPress={() => ackPush(router, "/shop/cart" as never)}
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
  repActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  cred: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: shop.line,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    overflow: "hidden",
  },
  credLabel: { color: shop.muted, fontSize: 11.5, fontWeight: "500" },
  credValue: { fontSize: 19, fontWeight: "800", color: shop.ink, lineHeight: 23 },
  credWorth: { color: shop.muted, fontSize: 10.5, fontWeight: "400", marginTop: 1 },
  details: {
    height: 48,
    borderRadius: 99,
    backgroundColor: shop.hero,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  detailsText: { color: "#fff", fontWeight: "700", fontSize: 13 },
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
  emptyStore: { alignItems: "center", paddingVertical: 28 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: shop.tint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontWeight: "700", color: shop.ink, textAlign: "center" },
  emptyCopy: { color: shop.muted, marginTop: 4, textAlign: "center", lineHeight: 20 },
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
  comingSoonHeaderBadge: {
    backgroundColor: "#E8F4EA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C5DBCB",
  },
  comingSoonHeaderBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1F7A3F",
    letterSpacing: 0.5,
  },
  launchBanner: {
    backgroundColor: "#F4FBF6",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CCE4D2",
    padding: 14,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  launchBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F4EA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  launchBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F2417",
  },
  launchBannerSubtitle: {
    fontSize: 12,
    color: "#526357",
    lineHeight: 17,
  },
  miniPill: {
    backgroundColor: "#1F7A3F",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  miniPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  catComingSoonBadge: {
    backgroundColor: "#E8F4EA",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catComingSoonBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#1F7A3F",
    letterSpacing: 0.4,
  },
  catTag: {
    marginTop: 4,
    backgroundColor: "#F0F5F1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catTagText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#526357",
  },
});

const heroStyles = StyleSheet.create({
  hero: {
    marginTop: 12,
    borderRadius: 30,
    backgroundColor: "#0A3D25",
    padding: 22,
    position: "relative",
    overflow: "hidden",
  },
  heroAmbient: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(107, 203, 119, 0.14)",
  },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#6BCB77",
  },
  chipText: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: "#FFFFFF",
    marginTop: 14,
  },
  heroTitleSpan: {
    color: "#6BCB77",
  },
  heroSub: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  cr: {
    marginTop: 20,
  },
  crRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  crSmall: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  crBig: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1.5,
    lineHeight: 40,
    color: "#FFFFFF",
  },
  crBigSpan: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0,
    color: "rgba(255, 255, 255, 0.7)",
  },
  crCostVal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "right",
  },
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    marginTop: 12,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#6BCB77",
  },
  note: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteText: {
    fontSize: 12.5,
    color: "#FFFFFF",
    fontWeight: "500",
    flex: 1,
  },
  ctaBtn: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A3D25",
  },
  planDetailsLink: {
    textAlign: "center",
    fontSize: 13.5,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
  },
  incCard: {
    flexDirection: "row",
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E9E3",
    borderRadius: 22,
    overflow: "hidden",
  },
  incCol: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  incDivider: {
    width: 1,
    backgroundColor: "#E2E9E3",
    marginVertical: 10,
  },
  incBold: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F1C14",
    marginTop: 4,
  },
  incSub: {
    fontSize: 11,
    color: "#76867B",
    marginTop: 1,
  },
});
