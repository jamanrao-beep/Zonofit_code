import { BottomNav } from "@/components/BottomNav";
import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs tabBar={(props) => <BottomNav {...props} />} screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="explore" options={{ title: "Explore" }} />
            <Tabs.Screen
                name="scan"
                options={{ title: "Scan" }}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        // "Scan" isn't a real tab screen — it opens the QR flow as a
                        // modal on top of whatever tab you're already on, then closes
                        // back to it. Stop the normal tab navigation from happening.
                        e.preventDefault();
                        navigation.getParent()?.navigate("scan-modal");
                    },
                })}
            />
            <Tabs.Screen name="credits" options={{ title: "Credits" }} />
            <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
    );
}