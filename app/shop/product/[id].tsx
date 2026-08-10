import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  Image, 
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCartStore } from "@/store/useCartStore";

const FLAVOURS = ["Chocolate", "Vanilla", "Strawberry", "Cookies & Cream"];
const SIZES = ["1kg", "2kg", "5lb (2.27kg)"];

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [selectedFlavour, setSelectedFlavour] = useState("Chocolate");
  const [selectedSize, setSelectedSize] = useState("1kg");

  const addToCart = useCartStore((state) => state.addToCart);

  // Hardcoded product data to match the design EXACTLY
  const product = {
    id: typeof id === 'string' ? id : "prod_1",
    name: "Gold Standard 100% Whey",
    brand: "Optimum Nutrition",
    variant: `${selectedFlavour} • ${selectedSize}`,
    price: 2499,
    discountedPrice: 2249,
    image: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=600",
  };

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image,
    });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row justify-between items-center bg-white z-10">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <View className="flex-row items-center w-16 justify-end">
          <Pressable className="mr-4">
            <Ionicons name="heart-outline" size={22} color="#111827" />
          </Pressable>
          <Pressable>
            <Ionicons name="share-social-outline" size={22} color="#111827" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 160 }}>
        
        {/* Product Images Section */}
        <View className="flex-row px-5 py-4 h-[320px]">
          {/* Thumbnails */}
          <View className="w-14 justify-between mr-6">
            {[1, 2, 3, 4].map((index) => (
              <View key={index} className={`w-14 h-14 rounded-lg border items-center justify-center overflow-hidden mb-3 relative ${index === 1 ? 'border-[#111827]' : 'border-gray-200'}`}>
                <Image 
                  source={{ uri: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=200" }} 
                  className="w-10 h-10"
                  resizeMode="contain"
                />
                {index === 4 && (
                  <View className="absolute inset-0 bg-black/60 items-center justify-center">
                    <Text className="text-white font-bold text-[12px]">+2</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          
          {/* Main Image */}
          <View className="flex-1 bg-white items-center justify-center">
            <Image 
              source={{ uri: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=600" }} 
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Product Title and Price */}
        <View className="px-5 mt-2">
          <View className="flex-row justify-between items-start">
            <Text className="text-[#6B7280] text-[12px] font-medium mb-1">{product.brand}</Text>
            <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
          </View>
          <Text className="text-[#111827] text-[20px] font-bold leading-tight mb-1">{product.name}</Text>
          <Text className="text-[#6B7280] text-[12px] mb-2">{product.variant}</Text>
          
          <View className="flex-row items-center mb-4">
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text className="text-[#F59E0B] font-bold text-[11px] ml-1 mr-2">4.8 (1,247 ratings)</Text>
            <View className="w-[1px] h-3 bg-gray-300 mr-2" />
            <Text className="text-gray-500 text-[11px]">2.1K+ bought this month</Text>
          </View>

          <View className="flex-row items-center mb-3">
            <Text className="text-[24px] font-extrabold text-[#111827] mr-3">₹{product.price.toLocaleString()}</Text>
            <View className="bg-[#F5F3FF] px-2 py-1 rounded border border-[#8B5CF6]/20 flex-row items-center">
              <Ionicons name="wallet-outline" size={12} color="#8B5CF6" />
              <Text className="text-[#8B5CF6] text-[10px] font-bold ml-1">Wallet Accepted</Text>
            </View>
          </View>

          {/* Wallet Discount Banner */}
          <Pressable className="bg-[#F3FAF4] p-3 rounded-xl flex-row justify-between items-center border border-[#1F7A3E]/20 mb-4 active:opacity-80">
            <Text className="text-[#166534] text-[12px] font-bold">Get it for ₹{product.discountedPrice.toLocaleString()} with Wallet</Text>
            <Ionicons name="chevron-forward" size={16} color="#166534" />
          </Pressable>

          {/* Authentic Product Banner */}
          <View className="bg-[#EDF7EC] py-2 rounded-lg items-center justify-center flex-row mb-6">
            <Ionicons name="checkmark-circle" size={14} color="#1F7A3E" />
            <Text className="text-[#1F7A3E] text-[11px] font-bold ml-1.5">Authentic Product • Quality Assured</Text>
          </View>
        </View>

        {/* Highlights */}
        <View className="px-5 mb-6">
          <Text className="text-[14px] font-bold text-[#111827] mb-3">Highlights</Text>
          <View className="flex-row justify-between items-center bg-gray-50 rounded-xl p-4 border border-gray-100">
            <View className="items-center flex-1">
              <Text className="text-[14px] font-bold text-[#111827]">24g</Text>
              <Text className="text-[8px] text-gray-500 uppercase mt-1 text-center">Protein Per Serving</Text>
            </View>
            <View className="w-[1px] h-8 bg-gray-200" />
            <View className="items-center flex-1">
              <Text className="text-[14px] font-bold text-[#111827]">5.5g</Text>
              <Text className="text-[8px] text-gray-500 uppercase mt-1">BCAAs</Text>
            </View>
            <View className="w-[1px] h-8 bg-gray-200" />
            <View className="items-center flex-1">
              <Text className="text-[14px] font-bold text-[#111827]">4g</Text>
              <Text className="text-[8px] text-gray-500 uppercase mt-1">Glutamine</Text>
            </View>
            <View className="w-[1px] h-8 bg-gray-200" />
            <View className="items-center flex-1">
              <Text className="text-[14px] font-bold text-[#111827]">100%</Text>
              <Text className="text-[8px] text-gray-500 uppercase mt-1 text-center">Whey Protein</Text>
            </View>
          </View>
        </View>

        {/* Flavour Options */}
        <View className="px-5 mb-6">
          <Text className="text-[14px] font-bold text-[#111827] mb-3">Flavour</Text>
          <View className="flex-row flex-wrap">
            {FLAVOURS.map((f) => (
              <Pressable 
                key={f}
                onPress={() => setSelectedFlavour(f)}
                className={`px-4 py-2 rounded-lg border mr-2 mb-2 ${selectedFlavour === f ? 'bg-[#F3FAF4] border-[#1F7A3E]' : 'bg-white border-gray-200'}`}
              >
                <Text className={`text-[12px] font-semibold ${selectedFlavour === f ? 'text-[#1F7A3E]' : 'text-gray-700'}`}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Size Options */}
        <View className="px-5 mb-6">
          <Text className="text-[14px] font-bold text-[#111827] mb-3">Size</Text>
          <View className="flex-row flex-wrap">
            {SIZES.map((s) => (
              <Pressable 
                key={s}
                onPress={() => setSelectedSize(s)}
                className={`px-4 py-2 rounded-lg border mr-2 mb-2 ${selectedSize === s ? 'bg-[#F3FAF4] border-[#1F7A3E]' : 'bg-white border-gray-200'}`}
              >
                <Text className={`text-[12px] font-semibold ${selectedSize === s ? 'text-[#1F7A3E]' : 'text-gray-700'}`}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 shadow-lg flex-row items-center justify-between z-20">
        <View className="flex-1 mr-4">
          <Text className="text-[#111827] text-[20px] font-black leading-tight">₹{product.price.toLocaleString()}</Text>
          <Text className="text-[#166534] text-[10px] font-bold">Get it for ₹{product.discountedPrice.toLocaleString()}</Text>
        </View>
        
        <View className="flex-row flex-1 justify-end gap-x-2">
          <Pressable 
            onPress={handleAddToCart}
            className="flex-1 bg-[#1F7A3E] py-3 rounded-xl flex-row items-center justify-center active:opacity-90 shadow-sm"
          >
            <Ionicons name="cart-outline" size={16} color="white" className="mr-1.5" />
            <Text className="text-white font-bold text-[13px] ml-1">Add to Cart</Text>
          </Pressable>
          
          <Pressable 
            className="flex-1 bg-white border border-[#1F7A3E] py-3 rounded-xl items-center justify-center active:bg-gray-50"
          >
            <Text className="text-[#1F7A3E] font-bold text-[13px]">Buy Now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
