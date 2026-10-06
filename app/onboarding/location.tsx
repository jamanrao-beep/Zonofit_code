import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

export default function LocationScreen() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect directly to select-city (skipping detect location)
    router.replace("/onboarding/select-city");
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="small" color="#1F7A3E" />
    </View>
  );
}
