import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  Image, 
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "@/constants/colors";
import { useCartStore } from "@/store/useCartStore";

const CATEGORIES = [
  { id: "supplements", name: "Supplements", icon: "nutrition-outline" },
  { id: "gear", name: "Gear", icon: "barbell-outline" },
  { id: "apparel", name: "Apparel", icon: "shirt-outline" },
  { id: "recovery", name: "Recovery", icon: "fitness-outline" },
  { id: "accessories", name: "Accessories", icon: "watch-outline" },
];

const GOALS = [
  { id: "muscle", name: "Muscle Gain", emoji: "💪" },
  { id: "fat", name: "Fat Loss", emoji: "🔥" },
  { id: "strength", name: "Strength", emoji: "🏋️‍♂️" },
  { id: "energy", name: "Energy", emoji: "⚡" },
  { id: "recovery", name: "Recovery", emoji: "🔋" },
  { id: "wellness", name: "Daily Wellness", emoji: "🌿" },
];

const BEST_SELLERS = [
  {
    id: "prod_1",
    name: "Gold Standard Whey",
    brand: "Optimum Nutrition",
    variant: "Chocolate • 1kg",
    rating: "4.8 (1.2K)",
    price: 2499,
    image: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "prod_2",
    name: "MuscleBlaze Creatine",
    brand: "MuscleBlaze",
    variant: "Monohydrate • 250g",
    rating: "4.7 (856)",
    price: 899,
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "prod_3",
    name: "MuscleBlaze Biozyme",
    brand: "MuscleBlaze",
    variant: "Performance Whey • 1kg",
    rating: "4.6 (732)",
    price: 2899,
    image: "https://images.unsplash.com/photo-1579722821273-0f137351ecf4?auto=format&fit=crop&q=80&w=400",
  }
];

const BRANDS = [
  { id: "on", name: "Optimum Nutrition", logo: "ON" },
  { id: "mb", name: "MuscleBlaze", logo: "MB" },
  { id: "avv", name: "Avvatar", logo: "AV" },
  { id: "nak", name: "Nakpro", logo: "NP" },
  { id: "myp", name: "MyProtein", logo: "MP" },
];

export default function ShopHomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const cartCount = useCartStore((state) => state.getTotalItems());
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row justify-between items-start bg-white">
        <View className="flex-1">
          <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight mb-1">Shop</Text>
          <Text className="text-[13px] font-medium text-[#6B7280]">Fitness essentials for your journey</Text>
        </View>
        <View className="flex-row items-center pt-2">
          <Pressable className="mr-5">
            <Ionicons name="heart-outline" size={24} color="#111827" />
          </Pressable>
          <Pressable className="relative" onPress={() => {}}>
            <Ionicons name="cart-outline" size={24} color="#111827" />
            {cartCount > 0 && (
              <View className="absolute -top-2 -right-2 bg-[#1F7A3E] w-4 h-4 rounded-full items-center justify-center border border-white">
                <Text className="text-white text-[9px] font-bold">{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-6">
        <View className="flex-row items-center bg-[#F3F5F4] rounded-[16px] px-4 h-[46px] border border-black/5">
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search protein, creatine, gear & more..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-[13px] font-medium text-black h-full"
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Banner */}
        <View className="px-5 mb-8">
          <View className="bg-[#111827] rounded-2xl overflow-hidden relative border border-gray-800">
            {/* Dark background pattern/glow simulation */}
            <View className="absolute inset-0 opacity-20">
              <View className="absolute right-[-40px] top-[-40px] w-48 h-48 rounded-full bg-[#1F7A3E] blur-2xl" />
            </View>
            
            <View className="p-5 pr-[140px]">
              <View className="bg-white/10 self-start px-2 py-0.5 rounded mb-2 border border-white/10">
                <Text className="text-white text-[9px] font-bold tracking-wider">LIMITED TIME OFFER</Text>
              </View>
              <Text className="text-white font-bold text-[18px] leading-tight mb-1">
                Premium Nutrition
              </Text>
              <Text className="text-[#A7F3D0] font-extrabold text-[16px] mb-4">
                Flat 15% OFF
              </Text>
              
              <Pressable className="bg-white px-4 py-1.5 rounded-full self-start flex-row items-center active:bg-gray-200">
                <Text className="text-black font-bold text-[11px] mr-1">Shop Now</Text>
                <Ionicons name="chevron-forward" size={12} color="black" />
              </Pressable>
            </View>

            {/* Simulated product image on the right */}
            <Image 
              source={{ uri: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=400" }} 
              className="absolute right-4 bottom-[-10px] w-[110px] h-[130px] z-10"
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }} className="mb-6">
          {CATEGORIES.map((cat) => (
            <Pressable 
              key={cat.id} 
              className="items-center mr-6 active:opacity-70"
              onPress={() => router.push(`/shop/category/${cat.id}` as any)}
            >
              <View className="w-14 h-14 rounded-full bg-[#F3F5F4] items-center justify-center mb-2 border border-gray-100">
                <Ionicons name={cat.icon as any} size={22} color="#111827" />
              </View>
              <Text className="text-[11px] font-medium text-gray-700">{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Shop by Goal */}
        <View className="px-5 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[16px] font-bold text-[#111827]">Shop by Goal</Text>
            <Pressable>
              <Text className="text-[#1F7A3E] font-bold text-[12px]">View All</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {GOALS.map((goal) => (
              <Pressable key={goal.id} className="w-[48%] flex-row items-center bg-white border border-gray-200 rounded-xl p-3 shadow-sm active:bg-gray-50">
                <Text className="text-[16px] mr-2">{goal.emoji}</Text>
                <Text className="text-[12px] font-bold text-gray-800 flex-1">{goal.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Best Sellers */}
        <View className="mb-8">
          <View className="px-5 flex-row justify-between items-center mb-4">
            <Text className="text-[16px] font-bold text-[#111827]">Best Sellers</Text>
            <Pressable>
              <Text className="text-[#1F7A3E] font-bold text-[12px]">View All</Text>
            </Pressable>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {BEST_SELLERS.map((prod) => (
              <Pressable 
                key={prod.id} 
                className="w-[160px] bg-white border border-gray-200 rounded-2xl p-3 mr-4 shadow-sm"
                onPress={() => router.push(`/shop/product/${prod.id}` as any)}
              >
                <View className="w-full h-32 bg-white rounded-xl mb-3 items-center justify-center">
                  <Image 
                    source={{ uri: prod.image }} 
                    className="w-full h-full rounded-xl"
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-[12px] font-bold text-[#111827] leading-tight mb-1" numberOfLines={2}>
                  {prod.name}
                </Text>
                <Text className="text-[10px] text-gray-500 mb-1.5">{prod.variant}</Text>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text className="text-[10px] text-gray-600 font-medium ml-1">{prod.rating}</Text>
                </View>
                <Text className="text-[14px] font-bold text-[#111827] mb-3">₹{prod.price.toLocaleString()}</Text>
                
                <Pressable 
                  className="w-full py-2 rounded-lg border border-[#1F7A3E] items-center justify-center active:bg-[#F3FAF4]"
                  onPress={() => addToCart({
                    id: prod.id,
                    name: prod.name,
                    brand: prod.brand,
                    price: prod.price,
                    image: prod.image,
                  })}
                >
                  <Text className="text-[#1F7A3E] font-bold text-[11px]">Add to Cart</Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Top Brands */}
        <View className="mb-8">
          <View className="px-5 flex-row justify-between items-center mb-4">
            <Text className="text-[16px] font-bold text-[#111827]">Top Brands</Text>
            <Pressable>
              <Text className="text-[#1F7A3E] font-bold text-[12px]">View All</Text>
            </Pressable>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {BRANDS.map((brand) => (
              <View key={brand.id} className="items-center mr-6">
                <View className="w-[70px] h-[40px] bg-white border border-gray-200 rounded-lg items-center justify-center shadow-sm mb-2">
                  <Text className="font-black text-gray-800 italic">{brand.logo}</Text>
                </View>
                <Text className="text-[9px] text-gray-500 font-medium">{brand.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
