import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../lib/api";

export default function ContentScreen() {
    const router = useRouter();
    const { type, title } = useLocalSearchParams<{ type: string, title: string }>();
    
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
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
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch(`/api/content/${type}`);
            if (data.success && data.content) {
                setContent(data.content.value);
            } else {
                setError("Content not found");
            }
        } catch (err: any) {
            console.error("Failed to load content:", err);
            setError("Failed to load content. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }}>
            {/* Header */}
            <View className="px-5 py-4 flex-row items-center justify-between border-b border-black/5 bg-white">
                <View className="flex-row items-center">
                    <Pressable 
                        onPress={() => router.back()} 
                        className="w-10 h-10 rounded-full bg-[#F5F7F4] items-center justify-center mr-3"
                    >
                        <Ionicons name="arrow-back" size={20} color="#1F2520" />
                    </Pressable>
                    <Text className="text-xl font-bold text-[#1F2520]">{title || "Information"}</Text>
                </View>
            </View>

            {/* Content Area */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6BCB77" />
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={48} color="#EF4444" className="mb-4" />
                    <Text className="text-lg font-bold text-[#1F2520] mb-2">{error}</Text>
                    <Pressable 
                        onPress={fetchContent}
                        className="mt-4 bg-black px-6 py-3 rounded-xl"
                    >
                        <Text className="text-white font-bold">Retry</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView 
                    className="flex-1" 
                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
                        <Text className="text-[#1F2520] text-base leading-relaxed">
                            {content || "No content available yet."}
                        </Text>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
