import { Stack } from "expo-router";

export default function MarketplaceLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "ZonoFit Store", 
          headerShown: false,
          headerBackTitle: "Back"
        }} 
      />
    </Stack>
  );
}
