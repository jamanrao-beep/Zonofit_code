import { BottomNav } from "@/components/BottomNav";
import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs tabBar={(props) => <BottomNav {...props} />} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="explore" options={{ title: "Explore" }} />
            <Tabs.Screen name="credits" options={{ title: "Credits" }} />
            <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
    );
}