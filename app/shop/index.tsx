import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  Image, 
  StatusBar,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "@/constants/colors";
import { useCartStore } from "@/store/useCartStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import CartModal from "@/components/CartModal";
import AddToCartConfirmModal, { AddedItemDetails } from "@/components/AddToCartConfirmModal";

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
  const credits = useCreditsStore((state) => state.credits);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedItem, setAddedItem] = useState<AddedItemDetails | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-5 pt-4 pb-4 flex-row justify-between items-start bg-white">
        <View className="flex-row items-center flex-1">
          <Pressable 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/explore" as any);
              }
            }} 
            className="w-10 h-10 rounded-full bg-[#F3F4F6] items-center justify-center mr-3"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[28px] font-extrabold text-[#111827] tracking-tight mb-0.5">Shop</Text>
            <Text className="text-[12px] font-medium text-[#6B7280]">Fitness essentials for your journey</Text>
          </View>
        </View>
        <View className="flex-row items-center pt-2">
          <Pressable onPress={() => Alert.alert("Saved Items", "Your saved wishlist items will appear here.")} className="mr-5">
            <Ionicons name="heart-outline" size={24} color="#111827" />
          </Pressable>
          <Pressable className="relative" onPress={() => setIsCartOpen(true)}>
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
        
        {/* Repurchase Gym Membership with Credits — Premium Minimal Card */}
        <View className="px-5 mb-8">
          <Pressable 
            onPress={() => router.push("/partner-cities" as any)}
            className="rounded-[24px] overflow-hidden relative active:opacity-95"
            style={{
              backgroundColor: "#F4FAF5",
              borderWidth: 1,
              borderColor: "rgba(31, 122, 62, 0.15)",
              shadowColor: "#1F7A3E",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            {/* Subtle Ambient Decorative Circles */}
            <View 
              style={{
                position: "absolute",
                right: -25,
                bottom: -25,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: "rgba(31, 122, 62, 0.07)",
              }} 
            />

            <View style={{ flexDirection: "row", padding: 18, minHeight: 180 }}>
              {/* Left Column: Typography & Actions */}
              <View style={{ flex: 1.2, paddingRight: 8, justifyContent: "space-between" }}>
                <View>
                  {/* Refined Pill Badge */}
                  <View 
                    style={{
                      alignSelf: "flex-start",
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(31, 122, 62, 0.10)",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      marginBottom: 8,
                      gap: 4,
                    }}
                  >
                    <Ionicons name="sparkles" size={10} color="#166534" />
                    <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#166534", letterSpacing: 0.4 }}>
                      LOCK CREDITS • ZERO EXTRA CASH
                    </Text>
                  </View>

                  {/* Clean Minimal Title */}
                  <Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A", lineHeight: 22, letterSpacing: -0.3 }}>
                    Repurchase Your{"\n"}Gym Membership
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#166534", marginTop: 2, marginBottom: 5 }}>
                    with Remaining Credits
                  </Text>

                  {/* Minimal Subtitle */}
                  <Text style={{ fontSize: 11, color: "#64748B", lineHeight: 15, fontWeight: "500" }}>
                    Use your credits to renew your membership and keep your streak going.
                  </Text>
                </View>

                {/* Minimal Deep Emerald Pill Button */}
                <Pressable
                  onPress={() => router.push("/partner-cities" as any)}
                  style={({ pressed }) => ({
                    backgroundColor: "#166534",
                    flexDirection: "row",
                    alignItems: "center",
                    alignSelf: "flex-start",
                    paddingHorizontal: 14,
                    paddingVertical: 8.5,
                    borderRadius: 20,
                    marginTop: 10,
                    gap: 6,
                    opacity: pressed ? 0.88 : 1,
                  })}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
                    View Gyms
                  </Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Right Column: Premium Masked Photo + Floating Glass Chip */}
              <View style={{ flex: 0.8, position: "relative", alignItems: "center", justifyContent: "flex-end" }}>
                {/* Clean rounded photo frame */}
                <View 
                  style={{
                    width: "100%",
                    height: 150,
                    borderRadius: 16,
                    overflow: "hidden",
                    backgroundColor: "#E2E8F0",
                  }}
                >
                  <Image 
                    source={{ uri: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&q=80&w=400" }} 
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                  {/* Subtle vignette */}
                  <View 
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 40,
                      backgroundColor: "rgba(15, 23, 42, 0.22)",
                    }} 
                  />
                </View>

                {/* Floating Glassmorphism Credit Badge */}
                <View 
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: -14,
                    right: 6,
                    backgroundColor: "rgba(255, 255, 255, 0.94)",
                    borderRadius: 13,
                    paddingHorizontal: 9,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.9)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 8.5, fontWeight: "600", color: "#64748B", marginBottom: 2 }}>
                    Remaining Credits
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Ionicons name="flash" size={12} color="#D97706" />
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>
                        {credits > 0 ? credits.toLocaleString() : "1,240"}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 6 }}>
                      <Text style={{ fontSize: 8, fontWeight: "700", color: "#166534" }}>
                        100% Free
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
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
            <Pressable onPress={() => router.push("/shop/category/supplements" as any)}>
              <Text className="text-[#1F7A3E] font-bold text-[12px]">View All</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {GOALS.map((goal) => (
              <Pressable 
                key={goal.id} 
                onPress={() => router.push("/shop/category/supplements" as any)}
                className="w-[48%] flex-row items-center bg-white border border-gray-200 rounded-xl p-3 shadow-sm active:bg-gray-50"
              >
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
            <Pressable onPress={() => router.push("/shop/category/supplements" as any)}>
              <Text className="text-[#1F7A3E] font-bold text-[12px]">View All</Text>
            </Pressable>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {BEST_SELLERS.map((prod) => (
              <View 
                key={prod.id} 
                className="w-[160px] bg-white border border-gray-200 rounded-2xl p-3 mr-4 shadow-sm justify-between"
              >
                <Pressable
                  onPress={() => router.push(`/shop/product/${prod.id}` as any)}
                  className="active:opacity-80"
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
                </Pressable>
                
                <Pressable 
                  className="w-full py-2 rounded-lg border border-[#1F7A3E] items-center justify-center active:bg-[#F3FAF4]"
                  onPress={() => {
                    addToCart({
                      id: prod.id,
                      name: prod.name,
                      brand: prod.brand,
                      price: prod.price,
                      image: prod.image,
                      variant: prod.variant,
                    });
                    setAddedItem({
                      id: prod.id,
                      name: prod.name,
                      brand: prod.brand,
                      price: prod.price,
                      image: prod.image,
                      variant: prod.variant,
                    });
                  }}
                >
                  <Text className="text-[#1F7A3E] font-bold text-[11px]">Add to Cart</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Top Brands */}
        <View className="mb-8">
          <View className="px-5 flex-row justify-between items-center mb-4">
            <Text className="text-[16px] font-bold text-[#111827]">Top Brands</Text>
            <Pressable onPress={() => router.push("/shop/category/supplements" as any)}>
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
      <CartModal visible={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AddToCartConfirmModal
        visible={!!addedItem}
        item={addedItem}
        onViewCart={() => {
          setAddedItem(null);
          setIsCartOpen(true);
        }}
        onContinueShopping={() => setAddedItem(null)}
      />
    </SafeAreaView>
  );
}
