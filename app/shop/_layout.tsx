import React from "react";
import { View } from "react-native";
import { Slot } from "expo-router";
import ShopToast from "@/components/shop/ShopToast";

export default function ShopLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <ShopToast />
    </View>
  );
}
