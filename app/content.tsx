import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";
import { 
  ZONOFIT_PRIVACY_POLICY, 
  ZONOFIT_TERMS_AND_CONDITIONS,
  ZONOFIT_REFUND_POLICY,
  ZONOFIT_DISCLAIMER,
  ZONOFIT_GYM_PARTNER_AGREEMENT
} from "@/constants/legalContent";

const STATIC_LEGAL_CONTENT: Record<string, string> = {
  privacy_policy: ZONOFIT_PRIVACY_POLICY,
  privacy: ZONOFIT_PRIVACY_POLICY,
  terms_and_conditions: ZONOFIT_TERMS_AND_CONDITIONS,
  terms: ZONOFIT_TERMS_AND_CONDITIONS,
  refund_policy: ZONOFIT_REFUND_POLICY,
  refund: ZONOFIT_REFUND_POLICY,
  cancellation_policy: ZONOFIT_REFUND_POLICY,
  disclaimer: ZONOFIT_DISCLAIMER,
  health_disclaimer: ZONOFIT_DISCLAIMER,
  gym_partner_agreement: ZONOFIT_GYM_PARTNER_AGREEMENT,
  partner_agreement: ZONOFIT_GYM_PARTNER_AGREEMENT,
};

export default function ContentScreen() {
    const router = useRouter();
    const { type, title } = useLocalSearchParams<{ type: string, title: string }>();
    
    const staticFallback = type ? STATIC_LEGAL_CONTENT[type] : null;
    const [content, setContent] = useState<string | null>(staticFallback || null);
    const [loading, setLoading] = useState(!staticFallback);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!type) {
            setError("Invalid content type");
            setLoading(false);
            return;
        }
        
        fetchContent();
    }, [type]);

    const fetchContent = async () => {
        if (!staticFallback) {
            setLoading(true);
        }
        setError(null);
        try {
            const data = await apiFetch(`/api/content/${type}`);
            if (data?.success && data?.content?.value) {
                setContent(data.content.value);
            } else if (!staticFallback) {
                setError("Content not found");
            }
        } catch (err: any) {
            console.warn("Failed to load content from server, using static content:", err?.message || err);
            if (!staticFallback) {
                setError("Failed to load content. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={["top", "bottom"]}>
            {/* Header */}
            <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-100 bg-white">
                <View className="flex-row items-center flex-1 pr-3">
                    <Pressable 
                        onPress={() => router.back()} 
                        hitSlop={12}
                        className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 items-center justify-center mr-3 active:bg-gray-100"
                    >
                        <Ionicons name="arrow-back" size={20} color="#111827" />
                    </Pressable>
                    <Text className="text-lg font-black text-gray-900" numberOfLines={1}>
                        {title || (type === "privacy_policy" ? "Privacy Policy" : type === "terms_and_conditions" ? "Terms & Conditions" : (type === "refund_policy" || type === "refund") ? "Refund & Cancellation" : (type === "gym_partner_agreement" || type === "partner_agreement") ? "Gym Partner Agreement" : "Information")}
                    </Text>
                </View>

                {/* Operator info badge */}
                <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <Text className="text-[10px] font-bold text-emerald-800">FLEX LIFESTYLE</Text>
                </View>
            </View>

            {/* Content Area */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#16A34A" />
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
                    <Text className="text-lg font-bold text-gray-900 mb-2 text-center">{error}</Text>
                    <Pressable 
                        onPress={fetchContent}
                        className="mt-4 bg-[#1F7A3E] px-6 py-3 rounded-2xl active:opacity-90"
                    >
                        <Text className="text-white font-bold text-sm">Retry</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView 
                    className="flex-1" 
                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <Text className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-normal selection:bg-emerald-100">
                            {content || "No content available yet."}
                        </Text>
                    </View>

                    {/* Footer Contact Reminder */}
                    <View className="mt-5 p-4 rounded-2xl bg-gray-50 border border-gray-100 items-center">
                        <Text className="text-xs font-bold text-gray-700">FLEX LIFESTYLE VENTURES</Text>
                        <Text className="text-[11px] text-gray-500 mt-0.5">Shastri Colony, Partapur, Banswara, Rajasthan, India</Text>
                        <Text className="text-[11px] text-[#16A34A] font-semibold mt-1">zonofitofficial@gmail.com</Text>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
