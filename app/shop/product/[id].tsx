import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  StatusBar,
  Share,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  defaultOptionValue,
  GOAL_LABEL,
  highlightsFor,
  inr,
  offPercent,
  RATING_BARS,
  SHOP_CREDIT_INR,
  shopCreditsForRupees,
  SHOP_REVIEWS,
  type ShopGoal,
} from "@/data/shopCatalog";
import { useShopCatalogStore } from "@/store/useShopCatalogStore";
import { cartLineKey, useCartStore } from "@/store/useCartStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useAddressStore } from "@/store/useAddressStore";
import { useShopRequestsStore } from "@/store/useShopRequestsStore";
import { promptGuestAccount } from "@/lib/guestAccount";
import { CartIconButton, ShopBackButton } from "@/components/shop/Chrome";
import ProductCard, { toCartItem } from "@/components/shop/ProductCard";
import ProductVisual from "@/components/shop/ProductVisual";
import { shopToast } from "@/components/shop/ShopToast";
import DeliveryAddressModal from "@/components/DeliveryAddressModal";
import { shop, shopStyles } from "@/components/shop/theme";

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = one(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const products = useShopCatalogStore((state) => state.products);
  const load = useShopCatalogStore((state) => state.load);
  const product = products.find((entry) => entry.id === productId);
  const [option, setOption] = useState("");
  const [sizeChoice, setSizeChoice] = useState("");
  const [colorChoice, setColorChoice] = useState("");
  const [slide, setSlide] = useState(0);
  const [addressOpen, setAddressOpen] = useState(false);
  const [failedUris, setFailedUris] = useState<Record<string, boolean>>({});
  const carousel = useRef<ScrollView>(null);
  const credits = useCreditsStore((state) => state.credits);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const setLineQuantity = useCartStore((state) => state.setLineQuantity);
  const wished = useWishlistStore((state) => state.ids.includes(productId));
  const toggleWish = useWishlistStore((state) => state.toggle);
  const isGuest = useGuestStore((state) => state.isGuest);
  const endGuestSession = useGuestStore((state) => state.endGuestSession);
  const address = useAddressStore((state) => state.getSelectedAddress());
  const isRequested = useShopRequestsStore((state) => (product ? state.hasRequested(product.name) : false));
  const addRequest = useShopRequestsStore((state) => state.addRequest);
  const removeRequest = useShopRequestsStore((state) => state.removeRequest);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    setOption("");
    setSizeChoice("");
    setColorChoice("");
    setSlide(0);
    setFailedUris({});
  }, [productId]);

  const chosen = option || (product ? defaultOptionValue(product) : "");
  const chosenSize = sizeChoice || product?.sizeOptions?.[0] || "";
  const chosenColor = colorChoice || product?.colorOptions?.[0] || "";
  const variantLabel = [chosenColor, chosenSize, (!product?.sizeOptions?.length && !product?.colorOptions?.length) ? chosen : ""].filter(Boolean).join(" · ");
  const line = product ? {
    ...toCartItem(product, variantLabel),
    selectedSize: chosenSize || undefined,
    selectedColor: chosenColor || undefined,
    variant: variantLabel || undefined,
  } : null;
  const key = line ? cartLineKey(line) : "";
  const qty = useCartStore((state) => state.cartItems.find((ci) => cartLineKey(ci.item) === key)?.quantity || 0);

  if (!product || !line) {
    return (
      <SafeAreaView style={shopStyles.screen} edges={["top"]}>
        <View style={shopStyles.top}>
          <ShopBackButton fallback="/shop" />
          <Text style={shopStyles.h2}>Product</Text>
        </View>
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>This product is not in the shop</Text>
          <Pressable onPress={() => router.replace("/shop" as never)} style={styles.missingBtn}>
            <Text style={styles.missingBtnText}>Back to shop</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const off = offPercent(product);
  const creditsNeeded = shopCreditsForRupees(product.price);
  const slideWidth = width - 40;
  const related = products.filter((entry) => entry.category === product.category && entry.id !== product.id).slice(0, 5);
  const addressLine = address
    ? [address.flatHouse, address.areaStreet, address.city].filter(Boolean).join(", ")
    : "";

  const onWish = () => {
    if (isGuest) {
      promptGuestAccount(router, endGuestSession, "Create an account to save products. You can still add items to the cart.");
      return;
    }
    toggleWish(product.id);
    shopToast(wished ? "Removed from wishlist" : "Saved to wishlist");
  };

  const addOne = () => {
    if (!line) return;
    if (qty >= 20) {
      shopToast("You can add up to 20 of this item");
      return;
    }
    addToCart(line);
    if (qty === 0) shopToast(product.purchasable ? "Added to cart" : "Added as a preview");
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    if (next !== slide) setSlide(next);
  };

  const photos = [
    ...(product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : []),
  ];
  const variantPhoto = product.variantImages?.[chosen] || product.variantImages?.[chosenColor] || product.variantImages?.[chosenSize];
  if (variantPhoto && !photos.includes(variantPhoto)) photos.unshift(variantPhoto);
  const slides = photos.length
    ? photos.map((uri, index) => ({ key: `${uri}-${index}`, uri, bg: shop.soft }))
    : [{ key: "mark", uri: "", bg: shop.soft }];

  return (
    <SafeAreaView style={shopStyles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={shopStyles.top}>
        <ShopBackButton fallback="/shop" />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[shopStyles.h2, { flexShrink: 1 }]}>Product</Text>
          <View style={styles.comingSoonHeaderBadge}>
            <Text style={styles.comingSoonHeaderBadgeText}>COMING SOON</Text>
          </View>
        </View>
        <Pressable accessibilityLabel="Share" onPress={() => {
          Share.share({ message: `Check out ${product.name} coming soon on ZonoFit Shop.` }).catch(() => {});
        }} style={shopStyles.act}>
          <Ionicons name="share-outline" size={20} color={shop.ink} />
        </Pressable>
        <Pressable accessibilityLabel="Wishlist" onPress={onWish} style={shopStyles.act}>
          <Ionicons name={wished ? "heart" : "heart-outline"} size={22} color={wished ? shop.red : shop.ink} />
        </Pressable>
        <CartIconButton />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={{ marginHorizontal: 20, marginTop: 14 }}>
          <ScrollView
            ref={carousel}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ width: slideWidth }}
          >
            {slides.map((entry) => (
              <View key={entry.key} style={[styles.slide, { width: slideWidth, backgroundColor: entry.bg }]}>
                {entry.uri && !failedUris[entry.uri] ? (
                  <Image
                    source={{ uri: entry.uri }}
                    style={styles.slideImage}
                    resizeMode="contain"
                    onError={() => setFailedUris((prev) => ({ ...prev, [entry.uri]: true }))}
                  />
                ) : (
                  <ProductVisual color={product.color} shape={product.shape} size={160} />
                )}
              </View>
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {slides.map((entry, index) => (
              <Pressable
                key={entry.key}
                accessibilityLabel={`Photo ${index + 1}`}
                onPress={() => carousel.current?.scrollTo({ x: slideWidth * index, animated: true })}
                hitSlop={8}
              >
                <View style={[styles.dot, slide === index && styles.dotOn]} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={shopStyles.pad}>
          {/* Marketplace Announcement Banner */}
          <View style={styles.launchBanner}>
            <Ionicons name="sparkles" size={16} color="#1F7A3F" />
            <Text style={styles.launchBannerText}>Marketplace Coming Soon · Official Sneak Peek</Text>
          </View>

          {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
          <Text style={styles.name}>{product.name}</Text>
          {variantLabel || product.pack ? (
            <Text style={styles.pack}>{variantLabel ? `${variantLabel}  ` : ""}{product.pack}</Text>
          ) : null}
          {product.rating > 0 ? (
            <View style={styles.rateRow}>
              <Ionicons name="star" size={14} color={shop.star} />
              <Text style={styles.rateText}>{product.rating}</Text>
              <Text style={styles.rateCount}>({product.ratingCount} ratings)</Text>
            </View>
          ) : null}
          <View style={styles.priceRow}>
            {product.price > 0 ? <Text style={styles.price}>{inr(product.price)}</Text> : <Text style={styles.price}>Estimated Price</Text>}
            <View style={styles.comingSoonTag}>
              <Text style={styles.comingSoonTagText}>LAUNCHING SOON</Text>
            </View>
          </View>
          <View style={styles.teaser}>
            <Ionicons name="shield-checkmark-outline" size={18} color={shop.hero} />
            <Text style={styles.teaserText}>
              100% genuine & lab-verified batch guarantee. Vote below to request this item for our opening day inventory!
            </Text>
          </View>

          {product.colorOptions && product.colorOptions.length > 0 ? (
            <ChoiceRow label="Colour" values={product.colorOptions} chosen={chosenColor} onPick={setColorChoice} />
          ) : null}
          {product.sizeOptions && product.sizeOptions.length > 0 ? (
            <ChoiceRow label="Size" values={product.sizeOptions} chosen={chosenSize} onPick={setSizeChoice} />
          ) : null}
          {product.options.length > 0 && !product.sizeOptions?.length && !product.colorOptions?.length ? (
            <ChoiceRow label={product.optionLabel || "Option"} values={product.options} chosen={chosen} onPick={setOption} />
          ) : null}

          <Pressable style={shopStyles.card} onPress={() => setAddressOpen(true)}>
            <View style={styles.ship}>
              <Ionicons name="car-outline" size={22} color={shop.ink} />
              <View style={{ flex: 1 }}>
                <Text style={styles.shipTitle}>Delivery details after you order</Text>
                <Text style={styles.shipCopy}>{addressLine ? `To ${addressLine}` : "Tap to add a delivery address"}</Text>
              </View>
              <Text style={styles.change}>{addressLine ? "Change" : "Add"}</Text>
            </View>
          </Pressable>

          {product.catalogueCopy !== false ? (
            <View style={shopStyles.card}>
              <Text style={shopStyles.cardTitle}>Highlights</Text>
              {highlightsFor(product.category).map((lineText) => (
                <View key={lineText} style={styles.hl}>
                  <Ionicons name="checkmark" size={16} color={shop.hero} />
                  <Text style={styles.hlText}>{lineText}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {product.description ? (
            <View style={shopStyles.card}>
              <Text style={shopStyles.cardTitle}>About this product</Text>
              <Text style={styles.about}>{product.description}</Text>
            </View>
          ) : null}

          {product.info ? (
            <View style={shopStyles.card}>
              <Text style={shopStyles.cardTitle}>Info</Text>
              <Text style={styles.about}>{product.info}</Text>
            </View>
          ) : null}

          {product.catalogueCopy === false ? null : (
            <View style={shopStyles.card}>
              <Text style={shopStyles.cardTitle}>Details</Text>
              <Spec label="Brand" value={product.brand} />
              <Spec label="Category" value={`${product.category}  ${product.sub}`} />
              <Spec label="Pack" value={product.pack || "—"} />
              <Spec label="Best for" value={product.goals.map((goal) => GOAL_LABEL[goal]).join(", ")} />
            </View>
          )}

          {(product.specs || []).map((row) => (
            <View key={`${row.label}-${row.value}`} style={shopStyles.card}>
              <Text style={shopStyles.cardTitle}>{row.label}</Text>
              <Text style={styles.about}>{row.value}</Text>
            </View>
          ))}

          {product.rating > 0 ? (
            <View style={shopStyles.card}>
              <Text style={shopStyles.cardTitle}>Ratings & reviews</Text>
              <View style={styles.rvs}>
                <View>
                  <Text style={styles.big}>{product.rating}</Text>
                  <View style={styles.rateRow}>
                    <Ionicons name="star" size={13} color={shop.star} />
                    <Text style={styles.rateCount}>{product.ratingCount} ratings</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  {RATING_BARS.map((bar) => (
                    <View key={bar.stars} style={styles.barRow}>
                      <Text style={styles.barLabel}>{bar.stars}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${bar.pct}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.reviewNote}>Sample notes from the shop design. Member reviews are not stored yet.</Text>
              {SHOP_REVIEWS.map((review) => (
                <View key={review.name} style={styles.review}>
                  <Text style={styles.reviewName}>{review.name}  {"★".repeat(review.stars)}</Text>
                  <Text style={styles.reviewText}>{review.text}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {related.length > 0 ? (
          <>
            <View style={[shopStyles.pad, shopStyles.sectionRow]}>
              <Text style={shopStyles.sectionTitle}>You may also like</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.related}>
              {related.map((entry) => (
                <ProductCard key={entry.id} product={entry} width={172} />
              ))}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.footRow}>
          <Pressable
            style={[styles.requestActionBtn, isRequested && styles.requestActionBtnDone]}
            onPress={() => {
              if (isRequested) {
                removeRequest(product.name);
                shopToast(`Removed "${product.name}" from your launch list`);
              } else {
                addRequest(product.name, product.category);
                shopToast(`Requested "${product.name}"! Priority noted for launch.`);
              }
            }}
          >
            <Ionicons
              name={isRequested ? "checkmark-circle" : "sparkles"}
              size={18}
              color={isRequested ? "#1F7A3F" : "#FFFFFF"}
            />
            <Text style={[styles.requestActionBtnText, isRequested && styles.requestActionBtnTextDone]}>
              {isRequested ? "Requested for Launch Day ✓" : "Request This Item for Launch"}
            </Text>
          </Pressable>
        </View>
      </View>
      <DeliveryAddressModal visible={addressOpen} onClose={() => setAddressOpen(false)} initialAddress={address} />
    </SafeAreaView>
  );
}

function ChoiceRow({
  label,
  values,
  chosen,
  onPick,
}: {
  label: string;
  values: string[];
  chosen: string;
  onPick: (value: string) => void;
}) {
  return (
    <View style={shopStyles.card}>
      <Text style={shopStyles.cardTitle}>{label}</Text>
      <View style={styles.opts}>
        {values.map((value) => {
          const on = value === chosen;
          return (
            <Pressable key={value} onPress={() => onPick(value)} style={[styles.opt, on && styles.optOn]}>
              <Text style={[styles.optText, on && styles.optTextOn]}>{value}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.spec}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  missingTitle: { fontSize: 18, fontWeight: "700", color: shop.ink, textAlign: "center" },
  missingBtn: { marginTop: 16, backgroundColor: shop.hero, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
  missingBtnText: { color: "#fff", fontWeight: "700" },
  slide: { aspectRatio: 1, borderRadius: 26, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  slideImage: { width: "78%", height: "78%" },
  cap: {
    position: "absolute",
    left: 14,
    bottom: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  capText: { fontSize: 12, fontWeight: "600", color: shop.muted },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: shop.line },
  dotOn: { width: 20, backgroundColor: shop.hero, borderRadius: 7 },
  brand: { marginTop: 16, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: shop.muted },
  name: { fontSize: 26, lineHeight: 30, fontWeight: "700", color: shop.ink, marginTop: 4 },
  pack: { color: shop.muted, marginTop: 4 },
  rateRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  rateText: { fontWeight: "600", color: shop.ink },
  rateCount: { color: shop.muted },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 12 },
  price: { fontSize: 32, fontWeight: "700", color: shop.ink },
  mrp: { fontSize: 15, color: shop.muted, textDecorationLine: "line-through" },
  tag: { backgroundColor: shop.tint, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: shop.hero, fontWeight: "700", fontSize: 12 },
  teaser: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: shop.tint, borderRadius: 16, padding: 12, marginTop: 14 },
  teaserText: { flex: 1, color: shop.hero, fontWeight: "600", fontSize: 14 },
  opts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  opt: { borderWidth: 1.5, borderColor: shop.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#fff" },
  optOn: { borderColor: shop.hero, backgroundColor: shop.tint },
  optText: { fontWeight: "600", color: shop.ink },
  optTextOn: { color: shop.hero },
  ship: { flexDirection: "row", alignItems: "center", gap: 12 },
  shipTitle: { fontWeight: "700", color: shop.ink },
  shipCopy: { color: shop.muted, marginTop: 2 },
  change: { color: shop.hero, fontWeight: "700" },
  ctaOff: { backgroundColor: "#9AABA0" },
  hl: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 4 },
  hlText: { flex: 1, color: shop.ink },
  about: { color: shop.muted, lineHeight: 20 },
  spec: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: shop.line },
  specLabel: { color: shop.muted },
  specValue: { flex: 1, textAlign: "right", fontWeight: "600", color: shop.ink },
  rvs: { flexDirection: "row", gap: 16, alignItems: "center" },
  big: { fontSize: 40, fontWeight: "700", color: shop.ink },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 3 },
  barLabel: { width: 12, fontSize: 12, color: shop.muted },
  barTrack: { flex: 1, height: 6, borderRadius: 6, backgroundColor: shop.line, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: shop.star },
  reviewNote: { color: shop.muted, fontSize: 12, marginTop: 10 },
  review: { paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: shop.line },
  reviewName: { fontWeight: "700", fontSize: 14, color: shop.ink },
  reviewText: { color: shop.muted, marginTop: 4, fontSize: 14 },
  related: { paddingHorizontal: 20, gap: 12 },
  foot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: shop.line,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  add: { height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: shop.hero, alignItems: "center", justifyContent: "center" },
  addText: { color: shop.hero, fontWeight: "700" },
  addOff: { borderColor: shop.line },
  addOffText: { color: shop.muted, fontWeight: "700" },
  qty: { height: 42, borderRadius: 12, backgroundColor: shop.hero, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtyBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  qtyGlyph: { color: "#fff", fontSize: 20, fontWeight: "700" },
  qtyCount: { color: "#fff", fontWeight: "700" },
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
    backgroundColor: "#E8F4EA",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  launchBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F7A3F",
    letterSpacing: 0.3,
  },
  comingSoonTag: {
    backgroundColor: "#E8F4EA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1F7A3F",
    letterSpacing: 0.4,
  },
  requestActionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#1F7A3F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#1F7A3F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  requestActionBtnDone: {
    backgroundColor: "#E8F4EA",
    borderWidth: 1.5,
    borderColor: "#1F7A3F",
  },
  requestActionBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  requestActionBtnTextDone: {
    color: "#1F7A3F",
  },
});
