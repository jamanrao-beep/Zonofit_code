import { colors } from "@/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BottomTabBarProps = NonNullable<ComponentProps<typeof Tabs>["tabBar"]> extends (props: infer P) => unknown ? P : never;

type IconName = keyof typeof MaterialIcons.glyphMap;

const TAB_CONFIG: Record<string, { label: string; icon: IconName }> = {
    index: { label: "Home", icon: "home" },
    explore: { label: "Explore", icon: "explore" },
    scan: { label: "Scan", icon: "qr-code-scanner" },
    credits: { label: "Credits", icon: "account-balance-wallet" },
    profile: { label: "Profile", icon: "person" },
};

export function BottomNav({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            // Insets vary per device -> dynamic, so this stays inline per the
            // Style Exception Rules rather than a NativeWind class.
            style={{ paddingBottom: insets.bottom || 12 }}
            className="absolute bottom-0 left-0 right-0 flex-row items-end justify-around bg-white/90 border-t border-black/5 rounded-t-[28px] px-2 pt-2"
        >
            {state.routes.map((route: { key: string; name: string }, index: number) => {
                const isFocused = state.index === index;
                const isScan = route.name === "scan";
                const tab = TAB_CONFIG[route.name];
                if (!tab) return null;

                const onPress = () => {
                    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                if (isScan) {
                    return (
                        <Pressable key={route.key} onPress={onPress} className="items-center -mb-1">
                            <View
                                className="w-[52px] h-[52px] rounded-2xl items-center justify-center bg-[#6BCB77]"
                                style={{
                                    // Shadow syntax differs per platform -> StyleSheet/inline, per the Style Exception Rules.
                                    shadowColor: colors.green,
                                    shadowOpacity: 0.35,
                                    shadowRadius: 10,
                                    shadowOffset: { width: 0, height: 6 },
                                    elevation: 8,
                                }}
                            >
                                <MaterialIcons name={tab.icon} size={28} color="#fff" />
                            </View>
                            <Text className="text-[10px] mt-1 font-semibold" style={{ color: colors.green }}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                }

                return (
                    <Pressable key={route.key} onPress={onPress} className="flex-1 items-center py-1">
                        <MaterialIcons name={tab.icon} size={23} color={isFocused ? colors.green : colors.navInactive} />
                        <Text
                            className="text-[10px] mt-0.5 font-medium"
                            style={{ color: isFocused ? colors.green : colors.navInactive }}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}