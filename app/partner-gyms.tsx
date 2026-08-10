import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  Image, 
  StyleSheet,
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function PartnerGymsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Nearby");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 pt-2 pb-3">
        <Pressable onPress={() => router.back()} className="w-10 h-10 justify-center">
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </Pressable>
        <View className="items-center flex-1">
          <Text className="text-[16px] font-bold text-[#000000]">Partner Gyms</Text>
          <Text className="text-[11px] text-[#6B7280] mt-0.5">Find gyms where you can use your</Text>
          <Text className="text-[11px] text-[#6B7280]">ZonoFit Credits.</Text>
        </View>
        <View className="w-16 flex-row justify-end items-center gap-x-3">
          <Pressable>
            <Ionicons name="search-outline" size={22} color="#000000" />
          </Pressable>
          <Pressable>
            <Ionicons name="options-outline" size={22} color="#000000" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Search Bar */}
        <View className="px-5 mb-4 mt-2">
          <View className="flex-row items-center bg-[#F9FAFB] rounded-[16px] px-4 h-12 border border-gray-100">
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search by gym or location"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-sm text-black"
            />
          </View>
        </View>

        {/* Filters */}
        <View className="px-5 mb-5 flex-row gap-x-2">
          {["Nearby", "Open Now", "Top Rated"].map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`flex-row items-center px-4 py-2 rounded-full border ${
                activeFilter === filter ? 'bg-[#1F7A3E] border-[#1F7A3E]' : 'bg-white border-gray-200'
              }`}
            >
              {filter === "Nearby" && <Ionicons name="navigate" size={14} color={activeFilter === filter ? "white" : "#4B5563"} className="mr-1.5" />}
              {filter === "Open Now" && <Ionicons name="time-outline" size={14} color={activeFilter === filter ? "white" : "#4B5563"} className="mr-1.5" />}
              {filter === "Top Rated" && <Ionicons name="star-outline" size={14} color={activeFilter === filter ? "white" : "#4B5563"} className="mr-1.5" />}
              <Text className={`text-xs font-semibold ${activeFilter === filter ? 'text-white' : 'text-[#4B5563]'} ${filter !== "Top Rated" ? 'ml-0.5' : 'ml-0.5'}`}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </View>



        {/* Primary Gym Card */}
        <View className="px-5 mb-6">
          <View className="bg-[#064E3B] rounded-[16px] p-4" style={styles.cardShadow}>
            <Text className="text-[#34D399] text-[10px] font-bold tracking-wider uppercase mb-3">PRIMARY GYM</Text>
            <View className="flex-row justify-between items-center mb-5">
              <View>
                <Text className="text-white text-[20px] font-bold mb-1">Gold's Gym</Text>
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={12} color="white" />
                  <Text className="text-white text-[11px] ml-1">1.2 km away</Text>
                </View>
              </View>
              <Image 
                source={require('@/assets/images/Zonofit logo.jpeg')} 
                style={{width: 48, height: 48, borderRadius: 24, backgroundColor: 'white'}}
              />
            </View>
            
            <View className="flex-row justify-between items-center border-t border-[#047857] pt-3">
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={16} color="#A7F3D0" className="mr-2" />
                <View className="ml-1">
                  <Text className="text-[#A7F3D0] text-[9px] mb-0.5">Current Membership</Text>
                  <Text className="text-white text-[11px] font-semibold">Annual Plan</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#A7F3D0" className="mr-2" />
                <View className="ml-1 mr-4">
                  <Text className="text-[#A7F3D0] text-[9px] mb-0.5">Primary Zone</Text>
                  <Text className="text-white text-[11px] font-semibold">3 km Radius</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="white" />
              </View>
            </View>
          </View>
        </View>

        {/* Partner Gyms Section */}
        <View className="px-5 mb-4 flex-row justify-between items-center mt-2">
          <Text className="text-[#000000] font-bold text-[14px]">Partner Gyms Outside Your Primary Zone</Text>
          <Text className="text-[#1F7A3E] font-semibold text-[11px]">View on Map</Text>
        </View>

        <View className="px-5 mb-6">
          {[
            { name: "Anytime Fitness", distance: "5.2 km away", rating: "4.6 (128)", tags: ["WiFi", "Locker", "Parking"], img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=400" },
            { name: "Fitline Gym", distance: "6.8 km away", rating: "4.4 (96)", tags: ["WiFi", "Locker", "Cardio"], img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=400" },
            { name: "The Strength Co.", distance: "7.1 km away", rating: "4.5 (73)", tags: ["WiFi", "Parking", "Shower"], img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=400" }
          ].map((gym, idx) => (
            <View key={idx} className="flex-row bg-white rounded-[16px] mb-4 border border-gray-200 overflow-hidden" style={{ height: 110 }}>
              <View className="w-[120px] relative">
                <Image source={{ uri: gym.img }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute top-2 left-2 bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                  <Text className="text-[#166534] text-[9px] font-bold">Credit Eligible</Text>
                </View>
              </View>
              <View className="flex-1 p-3 py-2.5 flex-col justify-between">
                <View>
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className="text-[#000000] font-bold text-[14px]">{gym.name}</Text>
                    <Ionicons name="heart-outline" size={16} color="#000000" />
                  </View>
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="location-outline" size={10} color="#6B7280" />
                    <Text className="text-[#6B7280] text-[10px] ml-1 mr-2">{gym.distance}</Text>
                    <Ionicons name="star" size={10} color="#F59E0B" />
                    <Text className="text-[#6B7280] text-[10px] ml-1">{gym.rating}</Text>
                  </View>
                  <View className="flex-row gap-x-1.5 flex-wrap">
                    {gym.tags.map(tag => (
                      <View key={tag} className="flex-row items-center bg-[#F9FAFB] px-1.5 py-0.5 rounded border border-gray-100">
                        {tag === "WiFi" && <Ionicons name="wifi" size={10} color="#4B5563" />}
                        {tag === "Locker" && <Ionicons name="lock-closed-outline" size={10} color="#4B5563" />}
                        {tag === "Parking" && <Ionicons name="car-outline" size={10} color="#4B5563" />}
                        {tag === "Cardio" && <Ionicons name="fitness-outline" size={10} color="#4B5563" />}
                        {tag === "Shower" && <Ionicons name="water-outline" size={10} color="#4B5563" />}
                        <Text className="text-[#4B5563] text-[9px] ml-1">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Pressable className="w-full py-1.5 rounded-lg border border-[#1F7A3E] items-center mt-2 bg-white">
                  <Text className="text-[#1F7A3E] font-bold text-[11px]">Book with Credits</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Gyms Inside Primary Zone Section */}
        <View className="px-5 mb-4 flex-row items-center mt-2">
          <Text className="text-[#000000] font-bold text-[14px] mr-1.5">Gyms Inside Your Primary Zone</Text>
          <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
        </View>

        <View className="px-5 mb-6">
          <View className="flex-row bg-[#F9FAFB] rounded-[16px] border border-gray-200 overflow-hidden" style={{ height: 100 }}>
            <View className="w-[120px] relative">
              <Image source={{ uri: "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&q=80&w=400" }} className="w-full h-full grayscale opacity-70" resizeMode="cover" />
              <View className="absolute top-2 left-2 bg-white px-2 py-0.5 rounded-full border border-gray-200 shadow-sm">
                <Text className="text-[#4B5563] text-[9px] font-bold">Protected Area</Text>
              </View>
            </View>
            <View className="flex-1 p-3 py-2.5 flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-[#000000] font-bold text-[14px] mb-1">Anytime Fitness</Text>
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="location-outline" size={10} color="#6B7280" />
                  <Text className="text-[#6B7280] text-[10px] ml-1">0.8 km away</Text>
                </View>
                <Text className="text-[#6B7280] text-[9px] leading-tight pr-1">This gym is inside your Primary Zone and is reserved for your primary gym.</Text>
              </View>
              <Pressable className="px-3.5 py-1.5 rounded-lg border border-[#1F7A3E] bg-white">
                <Text className="text-[#1F7A3E] font-bold text-[11px]">Why?</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Bottom Banners */}
        <View className="px-5 mb-4">
          <View className="bg-[#F9FAFB] rounded-[16px] p-4 border border-gray-200 flex-row items-center">
            <View className="flex-1">
              <Text className="text-[#000000] font-bold text-[14px] mb-1">Can't find a gym you need?</Text>
              <Text className="text-[#6B7280] text-[11px] leading-snug">Tell us which gym you want in your area. We'll try to get them on ZonoFit!</Text>
            </View>
            <View className="ml-3 items-center">
              <View className="w-[52px] h-[52px] bg-[#EDE9FE] rounded-[12px] items-center justify-center mb-2">
                <Text className="text-[24px]">🏬</Text>
              </View>
              <Pressable className="border border-[#1F7A3E] px-3 py-1 rounded-full bg-white">
                <Text className="text-[#1F7A3E] font-bold text-[10px]">Vote for a Gym</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Help Grow Banner */}
        <View className="px-5 mb-8">
          <View className="bg-[#2A8737] rounded-2xl overflow-hidden relative" style={{ minHeight: 130 }}>
            {/* The character image on the right */}
            <Image 
              source={require('@/assets/images/refer-characters.png')} 
              className="absolute right-[-10px] bottom-[-10px] w-[160px] h-[140px] z-0"
              resizeMode="contain"
            />
            {/* Gradient Overlay for text readability (optional, but helps if image clashes) */}
            <View className="absolute inset-0 bg-black/5 z-0" />
            
            {/* Content */}
            <View className="p-4 pr-[120px] z-10 justify-center flex-1">
              <Text className="text-white font-extrabold text-[15px] mb-1.5 leading-tight">
                Help Grow ZonoFit in Your City
              </Text>
              <Text className="text-white/90 text-[11px] mb-3 leading-snug font-medium">
                More members = More gyms, sports,{"\n"}trainers & services for everyone!
              </Text>
              <Pressable className="bg-white px-4 py-1.5 rounded-lg self-start active:opacity-80 shadow-sm">
                <Text className="text-[#2A8737] font-bold text-[12px]">Invite Friends</Text>
              </Pressable>
            </View>
          </View>
        </View>


        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  }
});
