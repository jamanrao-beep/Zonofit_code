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
                className="flex-row items-center justify-between bg-white rounded-[32px] px-2 py-2 border border-black/5"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.1,
                    shadowRadius: 24,
                    elevation: 8,
                }}
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
                        <Pressable key={route.key} onPress={onPress} className="items-center mx-1 flex-1 -mt-7">
                            <View
                                className="w-14 h-14 rounded-full items-center justify-center bg-[#6BCB77] border-[4px] border-white"
                                style={{
                                    shadowColor: colors.green,
                                    shadowOpacity: 0.4,
                                    shadowRadius: 12,
                                    shadowOffset: { width: 0, height: 6 },
                                    elevation: 8,
                                }}
                            >
                                <MaterialIcons name={tab.icon} size={28} color="#FFFFFF" />
                            </View>
                            <Text className="text-[10px] mt-1.5 font-bold uppercase tracking-wider text-[#1F2520]">
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                }

                return (
                    <Pressable key={route.key} onPress={onPress} className="items-center justify-center py-1 flex-1">
                        <View className={`items-center justify-center w-12 h-9 rounded-2xl ${isFocused ? 'bg-[#EAF7EC]' : 'bg-transparent'}`}>
                            <MaterialIcons name={tab.icon} size={24} color={isFocused ? '#059669' : '#8B958E'} />
                        </View>
                        <Text 
                            className={`text-[9px] mt-1 tracking-wider ${isFocused ? 'font-bold text-[#059669]' : 'font-medium text-[#8B958E]'}`} 
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