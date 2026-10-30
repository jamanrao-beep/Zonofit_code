import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { apiFetch } from "@/lib/api";
import { inr } from "@/data/shopCatalog";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { useAddressStore } from "@/store/useAddressStore";
import { useCartStore } from "@/store/useCartStore";
import { promptGuestAccount } from "@/lib/guestAccount";
import { ShopBackButton } from "@/components/shop/Chrome";
import { shop, shopStyles } from "@/components/shop/theme";

interface OrderItem {
  id: string;
  itemId: string;
  quantity: number;
  totalPaise: number;
  createdAt: string;
  selectedSize?: string | null;
  selectedColor?: string | null;
  item?: {
    id: string;
    title: string;
    imageUrl?: string;
    pricePaise: number;
  };
}

interface OrderGroup {
  id: string;
  createdAt: string;
  lines: OrderItem[];
}

function groupOrders(orders: OrderItem[]): OrderGroup[] {
  const groups: OrderGroup[] = [];
  for (const order of orders) {
    const last = groups[groups.length - 1];
    const gap = last ? Math.abs(new Date(last.createdAt).getTime() - new Date(order.createdAt).getTime()) : Number.POSITIVE_INFINITY;
    if (last && gap < 8000) last.lines.push(order);
    else groups.push({ id: order.id, createdAt: order.createdAt, lines: [order] });
  }
  return groups;
}

export default function OrdersScreen() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const isGuest = useGuestStore((state) => state.isGuest);
  const endGuestSession = useGuestStore((state) => state.endGuestSession);
  const address = useAddressStore((state) => state.addresses.find((entry) => entry.id === state.selectedAddressId) || state.addresses[0] || null);
  const addToCart = useCartStore((state) => state.addToCart);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!token || isGuest) {
      setOrders([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await apiFetch("/api/marketplace/orders", { token, silent: true });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to fetch marketplace orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isGuest]);

  useFocusEffect(useCallback(() => { void fetchOrders(); }, [fetchOrders]));

  const groups = groupOrders(orders);

  const buyAgain = (group: OrderGroup) => {
    group.lines.forEach((line) => {
      if (!line.item) return;
      const option = line.selectedSize || line.selectedColor || "";
      addToCart({
        id: line.item.id,
        name: line.item.title,
        price: line.item.pricePaise / 100,
        image: line.item.imageUrl || "",
        variant: option || undefined,
        selectedSize: line.selectedSize || undefined,
        selectedColor: line.selectedColor || undefined,
        purchasable: true,
      });
    });
    router.push("/shop/cart" as never);
  };

  return (
    <SafeAreaView style={shopStyles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={shopStyles.top}>
        <ShopBackButton fallback="/shop" />
        <Text style={[shopStyles.h2, { flex: 1 }]}>Your orders</Text>
        <Pressable accessibilityLabel="Shop" onPress={() => router.push("/shop" as never)} style={shopStyles.act}>
          <Ionicons name="bag-handle-outline" size={22} color={shop.ink} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={shop.hero} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchOrders(); }} tintColor={shop.hero} />}
        >
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={36} color={shop.hero} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyCopy}>
                {isGuest || !token
                  ? "Orders are saved to an account. You can still browse the shop and add items."
                  : "Your protein and gear orders will show up here."}
              </Text>
              <Pressable style={[shopStyles.cta, { justifyContent: "center", marginTop: 18 }]} onPress={() => router.push("/shop" as never)}>
                <Text style={shopStyles.ctaText}>Browse shop</Text>
              </Pressable>
              {(isGuest || !token) ? (
                <Pressable
                  style={styles.account}
                  onPress={() => promptGuestAccount(router, endGuestSession, "Create an account to place an order and see it here.")}
                >
                  <Text style={styles.accountText}>Create Account</Text>
                </Pressable>
              ) : null}
            </View>
          ) : groups.map((group) => {
            const open = openId === group.id;
            const total = group.lines.reduce((sum, line) => sum + line.totalPaise, 0) / 100;
            const date = new Date(group.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            const names = group.lines.map((line) => `${line.item?.title || "Item"} ×${line.quantity}`).join(", ");
            return (
              <View key={group.id} style={shopStyles.card}>
                <View style={styles.head}>
                  <Text style={styles.orderId}>#{group.id.slice(0, 8).toUpperCase()}</Text>
                  <View style={styles.tag}><Text style={styles.tagText}>Order placed</Text></View>
                </View>
                <Text style={styles.when}>{date}  {names}</Text>
                <View style={styles.tl}>
                  <View style={[styles.tlBar, styles.tlOn]} />
                  <View style={styles.tlBar} />
                  <View style={styles.tlBar} />
                </View>
                <View style={styles.tlLabels}>
                  <Text style={styles.tlLabel}>Placed</Text>
                  <Text style={styles.tlLabel}>Processing</Text>
                  <Text style={styles.tlLabel}>Completed</Text>
                </View>
                <Text style={styles.arrange}>We're arranging your order and will share delivery details with you.</Text>
                <View style={styles.money}>
                  <Text style={styles.moneyNote}>{inr(total)}</Text>
                  <Text style={styles.moneyTotal}>{inr(total)}</Text>
                </View>
                <Pressable onPress={() => setOpenId(open ? null : group.id)}>
                  <Text style={styles.link}>{open ? "Hide details" : "View details"}</Text>
                </Pressable>
                {open ? (
                  <View style={styles.more}>
                    {group.lines.map((line) => (
                      <View key={line.id} style={styles.item}>
                        {line.item?.imageUrl ? (
                          <Image source={{ uri: line.item.imageUrl }} style={styles.thumb} resizeMode="contain" />
                        ) : (
                          <View style={styles.thumb}><Ionicons name="cube-outline" size={22} color={shop.muted} /></View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{line.item?.title || "Item"}</Text>
                          <Text style={styles.itemMeta}>
                            Qty {line.quantity}
                            {line.selectedSize ? ` · ${line.selectedSize}` : ""}
                            {line.selectedColor ? ` · ${line.selectedColor}` : ""}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {address ? (
                      <Text style={styles.ship}>
                        Saved on this phone: {address.fullName}, {address.flatHouse}, {address.city}
                      </Text>
                    ) : null}
                    <View style={styles.actions}>
                      <Pressable
                        style={styles.help}
                        onPress={() => Alert.alert("Support", `Need help with order #${group.id.slice(0, 8).toUpperCase()}? Contact support from Profile, Help & Support.`)}
                      >
                        <Text style={styles.helpText}>Need help?</Text>
                      </Pressable>
                      <Pressable style={styles.again} onPress={() => buyAgain(group)}>
                        <Text style={styles.againText}>Buy again</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 70, paddingHorizontal: 12 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: shop.soft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: shop.ink },
  emptyCopy: { color: shop.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
  account: { marginTop: 10, paddingVertical: 12, paddingHorizontal: 18 },
  accountText: { color: shop.ink, fontWeight: "700" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontWeight: "700", color: shop.ink },
  tag: { backgroundColor: shop.tint, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: shop.hero, fontWeight: "700", fontSize: 12 },
  when: { color: shop.muted, marginTop: 4 },
  tl: { flexDirection: "row", gap: 6, marginTop: 14 },
  tlBar: { flex: 1, height: 5, borderRadius: 5, backgroundColor: shop.line },
  tlOn: { backgroundColor: shop.hero },
  tlLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  tlLabel: { color: shop.muted, fontSize: 12.5 },
  arrange: { color: shop.muted, fontSize: 13, marginTop: 10, lineHeight: 18 },
  money: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  moneyNote: { color: shop.muted },
  moneyTotal: { fontSize: 18, fontWeight: "700", color: shop.ink },
  link: { color: shop.hero, fontWeight: "700", marginTop: 10 },
  more: { marginTop: 12, borderTopWidth: 1, borderTopColor: shop.line, paddingTop: 8 },
  item: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 8 },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: shop.soft, alignItems: "center", justifyContent: "center" },
  itemName: { fontWeight: "700", color: shop.ink },
  itemMeta: { color: shop.muted, marginTop: 2, fontSize: 12 },
  ship: { color: shop.muted, fontSize: 12, marginTop: 6 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  help: { flex: 1, backgroundColor: shop.soft, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  helpText: { fontWeight: "700", color: shop.ink, fontSize: 12 },
  again: { flex: 1, backgroundColor: shop.tint, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  againText: { fontWeight: "700", color: shop.hero, fontSize: 12 },
});
