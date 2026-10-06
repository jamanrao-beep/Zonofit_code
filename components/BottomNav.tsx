import { colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BottomTabBarProps = NonNullable<ComponentProps<typeof Tabs>["tabBar"]> extends (props: infer P) => unknown ? P : never;

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_CONFIG: Record<string, { label: string; icon: IconName; iconOutline: IconName }> = {
    index: { label: "Home", icon: "home", iconOutline: "home-outline" },
    explore: { label: "Explore", icon: "compass", iconOutline: "compass-outline" },
    credits: { label: "Credits", icon: "wallet", iconOutline: "wallet-outline" },
    profile: { label: "Profile", icon: "person", iconOutline: "person-outline" },
};

export function BottomNav({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={{ 
                paddingBottom: insets.bottom || 24,
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: 20,
            }}
            className="pointer-events-box-none"
        >
            <View 
                className="flex-row items-center justify-between rounded-[32px] px-3 py-2"
                style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.secondary,
                    borderWidth: 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 10,
                }}
            >
            {state.routes.map((route: { key: string; name: string }, index: number) => {
                const isFocused = state.index === index;
                const tab = TAB_CONFIG[route.name];
                if (!tab) return null;

                const onPress = () => {
                    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <Pressable key={route.key} onPress={onPress} className="items-center justify-center py-1 flex-1">
                        <View 
                            className="items-center justify-center w-14 h-9 rounded-2xl" 
                            style={{ backgroundColor: isFocused ? '#E8F5E9' : 'transparent' }}
                        >
                            <Ionicons name={isFocused ? tab.icon : tab.iconOutline} size={22} color={isFocused ? '#1F7A3E' : colors.muted} />
                        </View>
                        <Text 
                            className={`text-[10px] mt-1 tracking-wider ${isFocused ? 'font-bold' : 'font-medium'}`} 
                            style={{ color: isFocused ? '#1F7A3E' : colors.muted }}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
            </View>
        </View>
    );
}