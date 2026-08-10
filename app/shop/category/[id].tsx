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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCartStore } from "@/store/useCartStore";

const FILTERS = ["All", "Protein", "Creatine", "Pre Workout", "BCAA"];

const PRODUCTS = [
  {
    id: "prod_1",
    name: "Gold Standard Whey",
    brand: "Optimum Nutrition",
    variant: "Chocolate • 1kg",
    rating: "4.8 (1.2K)",
    price: 2499,
    image: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=400",
    isBestSeller: true
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
  },
  {
    id: "prod_4",
    name: "Avvatar Isorich",
    brand: "Avvatar",
    variant: "Whey Protein • 1kg",
    rating: "4.5 (508)",
    price: 2399,
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400",
  }
];

export default function CategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  
  const cartCount = useCartStore((state) => state.getTotalItems());
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row justify-between items-center bg-white">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-[18px] font-bold text-[#111827]">Supplements</Text>
          <Text className="text-[12px] font-medium text-[#6B7280]">Fuel your performance</Text>
        </View>
        <View className="flex-row items-center w-16 justify-end">
          <Pressable className="mr-4">
            <Ionicons name="heart-outline" size={22} color="#111827" />
          </Pressable>
          <Pressable className="relative" onPress={() => {}}>
            <Ionicons name="cart-outline" size={22} color="#111827" />
            {cartCount > 0 && (
              <View className="absolute -top-1.5 -right-1.5 bg-[#1F7A3E] w-[14px] h-[14px] rounded-full items-center justify-center border border-white">
                <Text className="text-white text-[8px] font-bold">{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Search Bar */}
        <View className="px-5 mb-4 mt-2">
          <View className="flex-row items-center bg-[#F3F5F4] rounded-[16px] px-4 h-[46px] border border-black/5">
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search supplements..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-[13px] font-medium text-black h-full"
            />
          </View>
        </View>

        {/* Filters */}
        <View className="px-5 mb-6 flex-row items-center">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 mr-3">
            {FILTERS.map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full mr-2 ${activeFilter === filter ? 'bg-[#1F7A3E]' : 'bg-transparent'}`}
              >
                <Text className={`text-[12px] font-bold ${activeFilter === filter ? 'text-white' : 'text-gray-500'}`}>
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable 
            onPress={() => router.push("/shop/filter" as any)}
            className="w-[34px] h-[34px] items-center justify-center bg-gray-50 rounded-lg border border-gray-200 shadow-sm active:bg-gray-100"
          >
            <Ionicons name="options-outline" size={18} color="#111827" />
          </Pressable>
        </View>

        {/* Wallet Banner */}
        <View className="px-5 mb-6">
          <View className="bg-[#F3FAF4] rounded-2xl p-4 flex-row items-center border border-[#1F7A3E]/20">
            <Ionicons name="wallet-outline" size={24} color="#1F7A3E" className="mr-3" />
            <View className="flex-1 px-3">
              <Text className="text-[#111827] text-[12px] font-bold mb-1">Use your wallet or convert credits to INR</Text>
              <Text className="text-gray-500 text-[10px] font-medium">1 CR = ₹10  •  After conversion 1 CR = ₹8</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#1F7A3E" />
          </View>
        </View>

        {/* Product Grid */}
        <View className="px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[16px] font-bold text-[#111827]">Best Sellers</Text>
            <Pressable>
              <Text className="text-[#1F7A3E] font-bold text-[12px]">View All</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {PRODUCTS.map((prod) => (
              <Pressable 
                key={prod.id} 
                className="w-[48%] bg-white border border-gray-200 rounded-2xl p-3 mb-4 shadow-sm"
                onPress={() => router.push(`/shop/product/${prod.id}` as any)}
              >
                {prod.isBestSeller && (
                  <View className="absolute top-0 left-0 bg-[#1F7A3E] px-2 py-0.5 rounded-br-lg rounded-tl-2xl z-10">
                    <Text className="text-white text-[8px] font-bold uppercase">Bestseller</Text>
                  </View>
                )}
                <View className="w-full h-32 bg-white rounded-xl mb-3 items-center justify-center">
                  <Image 
                    source={{ uri: prod.image }} 
                    className="w-full h-full rounded-xl"
                    resizeMode="contain"
                  />
                  <View className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
                    <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
                  </View>
                </View>
                
                <Text className="text-[12px] font-bold text-[#111827] leading-tight mb-1" numberOfLines={2}>
                  {prod.name}
                </Text>
                <Text className="text-[10px] text-gray-500 mb-1.5">{prod.variant}</Text>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text className="text-[10px] text-gray-600 font-medium ml-1">{prod.rating}</Text>
                </View>
                
                <Text className="text-[14px] font-bold text-[#111827] mb-2">₹{prod.price.toLocaleString()}</Text>
                
                <View className="bg-[#F5F3FF] self-start px-1.5 py-0.5 rounded border border-[#8B5CF6]/20 mb-3 flex-row items-center">
                  <Ionicons name="wallet-outline" size={10} color="#8B5CF6" />
                  <Text className="text-[#8B5CF6] text-[8px] font-bold ml-1">Wallet Accepted</Text>
                </View>
                
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
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
