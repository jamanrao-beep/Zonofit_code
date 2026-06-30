import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function TrainerRegisterScreen() {
  const { type } = useLocalSearchParams<{ type: "TRAINER" | "BUDDY" }>();
  const router = useRouter();
  const { token } = useAuthStore();
  
  const isTrainer = type === "TRAINER";
  const title = isTrainer ? "Become a Trainer" : "Be a Workout Buddy";
  
  const [bio, setBio] = useState("");
  const [costPerSession, setCostPerSession] = useState("");
  const [timingInterval, setTimingInterval] = useState("");
  const [gyms, setGyms] = useState<any[]>([]);
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingGyms, setIsFetchingGyms] = useState(true);

  useEffect(() => {
    async function loadGyms() {
      if (!token) return;
      try {
        const data = await apiFetch("/api/gyms", { token });
        setGyms(data.gyms || []);
      } catch (err) {
        console.error("Failed to load gyms", err);
      } finally {
        setIsFetchingGyms(false);
      }
    }
    loadGyms();
  }, [token]);

  const toggleGymSelection = (id: string) => {
    setSelectedGymIds(prev => 
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const handleRegister = async () => {
    if (!token) return;
    if (!bio.trim()) {
      Alert.alert("Missing Info", "Please write a short bio about yourself.");
      return;
    }
    if (isTrainer && (!costPerSession || isNaN(Number(costPerSession)))) {
      Alert.alert("Invalid Cost", "Please enter a valid cost per session.");
      return;
    }
    if (!isTrainer && !timingInterval.trim()) {
      Alert.alert("Missing Info", "Please specify your usual timing interval.");
      return;
    }
    if (selectedGymIds.length === 0) {
      Alert.alert("Select Gym", "Please select at least one gym you usually visit.");
      return;
    }

    setIsLoading(true);
    try {
      await apiPost("/api/roles/register", {
        role: type,
        bio: bio.trim(),
        costPerSessionInPaise: isTrainer ? Number(costPerSession) * 100 : undefined,
        timingInterval: !isTrainer ? timingInterval.trim() : undefined,
        gymIds: selectedGymIds
      }, { token });

      Alert.alert(
        "Application Submitted! 🎉",
        isTrainer ? "Your trainer profile has been submitted and is pending admin approval." : "Your buddy profile has been created successfully!",
        [{ text: "Go to Home", onPress: () => router.push("/") }]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Failed to register profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F4" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center border-b border-black/5 bg-white">
        <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70">
          <Ionicons name="arrow-back" size={24} color="#1F2520" />
        </Pressable>
        <Text className="text-lg font-black text-[#1F2520]">{title}</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-6">
          
          <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-6 flex-row gap-x-3">
            <Ionicons name="information-circle" size={20} color="#D97706" />
            <Text className="text-amber-800 text-xs flex-1">
              {isTrainer 
                ? "Trainer profiles are manually reviewed by ZonoFit admins before being listed publicly. Payments will be credited directly in cash to your account."
                : "Workout buddy profiles are instantly visible. Help others in your community and find great partners to train with!"}
            </Text>
          </View>

          {/* Form Fields */}
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2 ml-1">About You</Text>
          <View className="bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-6">
            <Text className="text-sm font-bold text-[#1F2520] mb-2">Short Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder={isTrainer ? "Experience, certifications, training style..." : "Goals, what you're looking for in a buddy..."}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              className="bg-[#F5F7F4] rounded-xl p-4 text-[#1F2520] min-h-[100px] border border-black/5"
              textAlignVertical="top"
            />
          </View>

          {isTrainer ? (
            <View className="mb-6">
              <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2 ml-1">Pricing</Text>
              <View className="bg-white rounded-[24px] p-5 border border-black/5 shadow-sm">
                <Text className="text-sm font-bold text-[#1F2520] mb-2">Cost per Session (₹ Cash)</Text>
                <View className="flex-row items-center bg-[#F5F7F4] rounded-xl px-4 py-1 border border-black/5">
                  <Text className="text-[#6B756E] font-bold mr-2">₹</Text>
                  <TextInput
                    value={costPerSession}
                    onChangeText={setCostPerSession}
                    placeholder="e.g. 500"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    className="flex-1 h-12 text-[#1F2520] font-bold"
                  />
                </View>
              </View>
            </View>
          ) : (
            <View className="mb-6">
              <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2 ml-1">Availability</Text>
              <View className="bg-white rounded-[24px] p-5 border border-black/5 shadow-sm">
                <Text className="text-sm font-bold text-[#1F2520] mb-2">Usual Timing</Text>
                <TextInput
                  value={timingInterval}
                  onChangeText={setTimingInterval}
                  placeholder="e.g. 07:00 AM - 08:30 AM"
                  placeholderTextColor="#9CA3AF"
                  className="bg-[#F5F7F4] rounded-xl p-4 text-[#1F2520] h-14 border border-black/5"
                />
              </View>
            </View>
          )}

          {/* Gym Selection */}
          <Text className="text-xs font-bold text-[#6B756E] uppercase tracking-wider mb-2 ml-1">Partner Gyms</Text>
          <View className="bg-white rounded-[24px] p-5 border border-black/5 shadow-sm mb-6">
            <Text className="text-sm font-bold text-[#1F2520] mb-4">Where do you usually go?</Text>
            
            {isFetchingGyms ? (
              <ActivityIndicator size="small" color="#6BCB77" />
            ) : gyms.length === 0 ? (
              <Text className="text-sm text-[#6B756E]">No gyms available.</Text>
            ) : (
              gyms.map((g) => {
                const isSelected = selectedGymIds.includes(g.id);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => toggleGymSelection(g.id)}
                    className={`flex-row items-center justify-between p-3 mb-2 rounded-xl border ${isSelected ? "bg-[#EAF7EC] border-[#6BCB77]" : "bg-[#F5F7F4] border-black/5"}`}
                  >
                    <View className="flex-1 mr-2">
                      <Text className={`font-bold ${isSelected ? "text-[#059669]" : "text-[#1F2520]"}`}>{g.name}</Text>
                      <Text className="text-[10px] text-[#6B756E]" numberOfLines={1}>{g.address}</Text>
                    </View>
                    <View className={`w-6 h-6 rounded-full border items-center justify-center ${isSelected ? "bg-[#6BCB77] border-[#6BCB77]" : "border-gray-300 bg-white"}`}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

        </View>
        <View className="h-20" />
      </ScrollView>

      {/* Submit Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "white",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 32,
          borderTopWidth: 1,
          borderTopColor: "rgba(0,0,0,0.06)",
        }}
      >
        <Pressable
          onPress={handleRegister}
          disabled={isLoading}
          className={`h-14 rounded-2xl items-center justify-center ${isLoading ? "bg-gray-400" : "bg-[#6BCB77] active:opacity-90"}`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Submit Application</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
