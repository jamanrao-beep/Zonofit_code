import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

export default function MembershipScreen() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the unified monthly membership order summary
    router.replace("/onboarding/order-summary?mode=repurchase" as any);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="small" color="#1F7A3E" />
    </View>
  );
}
