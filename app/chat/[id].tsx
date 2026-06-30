import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const [gym, setGym] = useState<any>(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMessages() {
      if (!id) return;
      try {
        const gymData = await apiFetch(`/api/gyms/${id}`, { token });
        setGym(gymData);

        const data = await apiFetch(`/api/chat/${id}`, { token });
        const formatted = data.map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender.toLowerCase(),
          time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        
        // Add welcome message if empty
        if (formatted.length === 0) {
          formatted.push({
            id: "welcome",
            text: `Hi there! Welcome to ${gymData?.name || "ZonoFit"}. How can we help you today?`,
            sender: "gym",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
        
        setMessages(formatted);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [id, gym?.name]);

  if (!gym) {
    return (
      <View className="flex-1 bg-[#F5F7F4] items-center justify-center">
        <Text className="font-bold text-[#1F2520]">Gym not found</Text>
      </View>
    );
  }

  const handleSend = async () => {
    if (!message.trim()) return;
    
    const textToSend = message;
    // Optimistically update UI
    const tempId = Date.now().toString();
    const newMsg = {
      id: tempId,
      text: textToSend,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages((prev) => [...prev, newMsg]);
    setMessage("");

    try {
      await apiFetch(`/api/chat/${id}`, {
        token,
        method: "POST",
        body: JSON.stringify({ text: textToSend })
      });
      
      // We don't simulate a gym reply anymore, as that's one-way for MVP or 
      // gym owner will reply later.
    } catch (err) {
      console.error("Failed to send message", err);
      // Rollback on failure could be implemented here
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      {/* Header */}
      <View className="px-5 py-3 border-b border-black/5 flex-row items-center bg-white shadow-sm z-10">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-gray-100">
          <Ionicons name="arrow-back" size={24} color="#1F2520" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="text-lg font-bold text-[#1F2520]">{gym.name}</Text>
          <Text className="text-xs text-emerald-600 font-semibold">Online</Text>
        </View>
        <Pressable className="p-2 rounded-full active:bg-gray-100">
          <Ionicons name="call-outline" size={20} color="#1F2520" />
        </Pressable>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView 
          className="flex-1 bg-[#F5F7F4]" 
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          <Text className="text-center text-xs text-[#6B756E] mb-6">Today</Text>
          
          {loading ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <View key={msg.id} className={`mb-4 max-w-[80%] ${isUser ? "self-end" : "self-start"}`}>
                  <View className={`px-4 py-3 rounded-2xl ${isUser ? "bg-[#6BCB77] rounded-tr-sm" : "bg-white border border-black/5 rounded-tl-sm shadow-sm"}`}>
                    <Text className={`text-sm ${isUser ? "text-white" : "text-[#1F2520]"}`}>
                      {msg.text}
                    </Text>
                  </View>
                  <Text className={`text-[10px] text-[#6B756E] mt-1 ${isUser ? "text-right" : "text-left"}`}>
                    {msg.time}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input Area */}
        <View className="px-5 py-3 bg-white border-t border-black/5 flex-row items-center gap-x-3">
          <Pressable className="p-2 rounded-full bg-[#F5F7F4] active:bg-gray-200">
            <Ionicons name="add" size={24} color="#1F2520" />
          </Pressable>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 bg-[#F5F7F4] h-12 rounded-full px-4 text-[#1F2520]"
            onSubmitEditing={handleSend}
          />
          <Pressable 
            onPress={handleSend}
            className={`w-12 h-12 rounded-full items-center justify-center ${message.trim() ? "bg-[#6BCB77]" : "bg-gray-200"}`}
          >
            <Ionicons name="send" size={20} color={message.trim() ? "white" : "#9CA3AF"} style={{ marginLeft: 4 }} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
