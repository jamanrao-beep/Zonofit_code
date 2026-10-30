import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ShopShape } from "@/data/shopCatalog";

const ICONS: Record<ShopShape, keyof typeof Ionicons.glyphMap> = {
  tub: "flask-outline",
  bottle: "water-outline",
  tee: "shirt-outline",
  dumb: "barbell-outline",
  roller: "fitness-outline",
  watch: "watch-outline",
  bag: "bag-handle-outline",
  bands: "ellipse-outline",
  mat: "tablet-landscape-outline",
};

export default function ProductVisual({
  color,
  shape,
  size = 72,
}: {
  color: string;
  shape: ShopShape;
  size?: number;
}) {
  return (
    <View style={[styles.wrap, { width: size, height: size * 1.15, backgroundColor: color }]}>
      <View style={styles.label} />
      <Ionicons name={ICONS[shape] || "cube-outline"} size={size * 0.38} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: {
    position: "absolute",
    left: "18%",
    right: "18%",
    top: "38%",
    height: "22%",
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
});
