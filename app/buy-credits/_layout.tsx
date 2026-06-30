import { Stack } from "expo-router";

export default function BuyCreditsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Select a Gym", 
          headerShown: true,
          headerBackTitle: "Back"
        }} 
      />
      <Stack.Screen 
        name="[gymId]" 
        options={{ 
          title: "Buy Subscription", 
          headerShown: true,
          headerBackTitle: "Map"
        }} 
      />
    </Stack>
  );
}
