import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function RoleApplicationRedirect() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();

  useEffect(() => {
    const roleType = (type?.toUpperCase() === "BUDDY") ? "BUDDY" : "TRAINER";
    router.replace(`/trainers/register?type=${roleType}` as any);
  }, [type]);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#1F7A3E" />
    </View>
  );
}
