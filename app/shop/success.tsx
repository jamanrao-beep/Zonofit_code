import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { GYM_CREDIT_INR, inr } from "@/data/shopCatalog";
import { useShopReceiptStore } from "@/store/useShopReceiptStore";
import { shop, shopStyles } from "@/components/shop/theme";

export default function ShopSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const receipt = useShopReceiptStore((state) => state.receipt);
  const shortId = receipt?.ids[0] ? receipt.ids[0].slice(0, 8).toUpperCase() : "";

  return (
    <SafeAreaView style={shopStyles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 + insets.bottom }}>
        <View style={styles.hero}>
          <View style={styles.tick}>
            <Ionicons name="checkmark" size={42} color="#fff" />
          </View>
          <Text style={styles.title}>Order placed</Text>
          <Text style={styles.copy}>
            {shortId ? `Order #${shortId}. We'll share delivery details soon.` : "Your order is in. We'll share delivery details soon."}
          </Text>
        </View>

        <View style={shopStyles.card}>
          <Text style={shopStyles.cardTitle}>Summary</Text>
          {(receipt?.lines || ["Shop order"]).map((line) => (
            <Text key={line} style={styles.line}>{line}</Text>
          ))}
          <Row label="Item total" value={inr(receipt?.itemTotal || 0)} />
          {receipt?.cashUsed ? <Row label="Wallet cash" value={inr(receipt.cashUsed)} green /> : null}
          {receipt?.creditsUsed ? <Row label={`Credits used (${receipt.creditsUsed} CR)`} value={inr(receipt.creditsUsed * 10)} green /> : null}
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Left to pay</Text>
            <Text style={styles.totalValue}>{inr(0)}</Text>
          </View>
        </View>

        <View style={shopStyles.card}>
          <View style={styles.leftRow}>
            <View style={styles.coin}><Text style={styles.coinText}>₹</Text></View>
            <View>
              <Text style={styles.leftTitle}>{receipt?.creditsLeft ?? 0} credits left</Text>
              <Text style={styles.leftSub}>Worth {inr((receipt?.creditsLeft || 0) * GYM_CREDIT_INR)} at gyms</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.actions}>
          <Pressable style={[styles.ghost, { flex: 1 }]} onPress={() => router.replace("/shop" as never)}>
            <Text style={styles.ghostText}>Keep shopping</Text>
          </Pressable>
          <Pressable style={[shopStyles.cta, { flex: 1, justifyContent: "center" }]} onPress={() => router.replace("/shop/orders" as never)}>
            <Text style={shopStyles.ctaText}>Track order</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, green && { color: shop.hero }]}>{label}</Text>
      <Text style={[styles.rowValue, green && { color: shop.hero }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 30 },
  tick: { width: 92, height: 92, borderRadius: 46, backgroundColor: shop.hero, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 30, fontWeight: "700", color: shop.ink },
  copy: { color: shop.muted, marginTop: 6, textAlign: "center" },
  line: { color: shop.ink, paddingVertical: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { color: shop.muted },
  rowValue: { color: shop.ink, fontWeight: "600" },
  total: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderStyle: "dashed", borderTopColor: shop.line, marginTop: 6, paddingTop: 12 },
  totalLabel: { fontSize: 18, fontWeight: "700", color: shop.ink },
  totalValue: { fontSize: 20, fontWeight: "700", color: shop.ink },
  leftRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  coin: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F5C84B", alignItems: "center", justifyContent: "center" },
  coinText: { color: "#7a5600", fontWeight: "700" },
  leftTitle: { fontWeight: "700", color: shop.ink },
  leftSub: { color: shop.muted, marginTop: 2 },
  foot: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: shop.line, paddingHorizontal: 20, paddingTop: 12 },
  actions: { flexDirection: "row", gap: 10 },
  ghost: { height: 56, borderRadius: 18, borderWidth: 1.5, borderColor: shop.hero, alignItems: "center", justifyContent: "center" },
  ghostText: { color: shop.hero, fontWeight: "700", fontSize: 16 },
});
