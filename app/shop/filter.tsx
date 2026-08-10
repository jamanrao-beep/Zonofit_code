import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const CATEGORIES = ["All", "Protein", "Creatine", "Pre Workout", "BCAA", "Mass Gainer", "Vitamins", "Fat Burner", "Recovery", "Hydration"];

const BRANDS = [
  { id: "on", name: "Optimum Nutrition", logo: "ON" },
  { id: "mb", name: "MuscleBlaze", logo: "MB" },
  { id: "avv", name: "Avvatar", logo: "AV" },
  { id: "nak", name: "Nakpro", logo: "NP" },
  { id: "myp", name: "MyProtein", logo: "MP" },
];

const PROTEIN_PER_SERVING = ["Any", "10g+", "20g+", "25g+", "30g+"];
const FLAVOURS = ["Any", "Chocolate", "Vanilla", "Strawberry", "Kesar", "Mango", "Unflavoured"];
const WEIGHTS = ["Any", "250g", "500g", "1kg", "2kg", "3kg+"];
const RATINGS = ["Any", "4 ★ & above", "3 ★ & above", "2 ★ & above"];
const SORT_OPTIONS = ["Popularity", "Price: Low to High", "Price: High to Low", "Newest"];

export default function FilterScreen() {
  const router = useRouter();
  
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedProtein, setSelectedProtein] = useState("Any");
  const [selectedFlavour, setSelectedFlavour] = useState("Any");
  const [selectedWeight, setSelectedWeight] = useState("Any");
  const [selectedRating, setSelectedRating] = useState("Any");
  const [selectedSort, setSelectedSort] = useState("Popularity");

  const [expandedSections, setExpandedSections] = useState({
    category: true,
    brand: true,
    price: true,
    protein: true,
    flavour: true,
    weight: true,
    rating: true,
    sort: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderTag = (label: string, isSelected: boolean, onPress: () => void) => (
    <Pressable 
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 mb-3 border active:opacity-70 ${isSelected ? 'bg-[#1F7A3E] border-[#1F7A3E]' : 'bg-white border-gray-200'}`}
    >
      <Text className={`text-[12px] ${isSelected ? 'font-bold text-white' : 'font-medium text-gray-700'}`}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-5 py-4 flex-row justify-between items-center bg-white border-b border-gray-100 shadow-sm z-10">
        <Pressable onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
          <Ionicons name="close" size={24} color="#111827" />
        </Pressable>
        <Text className="text-[16px] font-bold text-[#111827]">Filters</Text>
        <Pressable onPress={() => {
          setSelectedCategory("All");
          setSelectedBrand("All");
          setSelectedProtein("Any");
          setSelectedFlavour("Any");
          setSelectedWeight("Any");
          setSelectedRating("Any");
          setSelectedSort("Popularity");
        }}>
          <Text className="text-[#1F7A3E] font-bold text-[13px]">Reset</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never" contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* Category Section */}
        <View className="px-5 py-5 border-b border-gray-100">
          <Pressable onPress={() => toggleSection('category')} className="flex-row justify-between items-center mb-4">
            <Text className="text-[14px] font-bold text-[#111827]">Category</Text>
            <Ionicons name={expandedSections.category ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
          </Pressable>
          {expandedSections.category && (
            <View className="flex-row flex-wrap">
              {CATEGORIES.map(cat => renderTag(cat, selectedCategory === cat, () => setSelectedCategory(cat)))}
            </View>
          )}
        </View>

        {/* Brand Section */}
        <View className="px-5 py-5 border-b border-gray-100">
          <Pressable onPress={() => toggleSection('brand')} className="flex-row justify-between items-center mb-4">
            <Text className="text-[14px] font-bold text-[#111827]">Brand</Text>
            <Text className="text-[#1F7A3E] font-bold text-[12px]">View All</Text>
          </Pressable>
          {expandedSections.brand && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {BRANDS.map(brand => (
                <Pressable 
                  key={brand.id}
                  onPress={() => setSelectedBrand(brand.name)}
                  className={`items-center mr-6 p-2 rounded-xl ${selectedBrand === brand.name ? 'bg-[#F3FAF4] border border-[#1F7A3E]/30' : 'bg-transparent'}`}
                >
                  <View className="w-12 h-12 bg-white border border-gray-200 rounded-lg items-center justify-center shadow-sm mb-2">
                    <Text className="font-black text-[12px] text-gray-800 italic">{brand.logo}</Text>
                  </View>
                  <Text className="text-[10px] text-gray-700 font-medium">{brand.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Price Range Section */}
        <View className="px-5 py-5 border-b border-gray-100">
          <Pressable onPress={() => toggleSection('price')} className="flex-row justify-between items-center mb-4">
            <Text className="text-[14px] font-bold text-[#111827]">Price Range</Text>
            <Text className="text-[#111827] font-medium text-[12px]">₹10,000+</Text>
          </Pressable>
          {expandedSections.price && (
            <View className="my-2">
              <View className="h-1 bg-[#1F7A3E] w-full rounded-full absolute top-2" />
              <View className="flex-row justify-between">
                <View className="w-5 h-5 bg-[#1F7A3E] rounded-full shadow-sm" />
                <View className="w-5 h-5 bg-[#1F7A3E] rounded-full shadow-sm" />
              </View>
              <Text className="text-[10px] text-gray-400 mt-2">₹0</Text>
            </View>
          )}
        </View>

        {/* Protein Per Serving Section */}
        <View className="px-5 py-5 border-b border-gray-100">
          <Pressable onPress={() => toggleSection('protein')} className="flex-row justify-between items-center mb-4">
            <Text className="text-[14px] font-bold text-[#111827]">Protein Per Serving</Text>
            <Ionicons name={expandedSections.protein ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
          </Pressable>
          {expandedSections.protein && (
            <View className="flex-row flex-wrap">
              {PROTEIN_PER_SERVING.map(p => renderTag(p, selectedProtein === p, () => setSelectedProtein(p)))}
            </View>
          )}
        </View>

        {/* Flavour Section */}
        <View className="px-5 py-5 border-b border-gray-100">
          <Pressable onPress={() => toggleSection('flavour')} className="flex-row justify-between items-center mb-4">
            <Text className="text-[14px] font-bold text-[#111827]">Flavour</Text>
            <Ionicons name={expandedSections.flavour ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
          </Pressable>
          {expandedSections.flavour && (
            <View className="flex-row flex-wrap">
              {FLAVOURS.map(f => renderTag(f, selectedFlavour === f, () => setSelectedFlavour(f)))}
            </View>
          )}
        </View>

        {/* Weight Section */}
        <View className="px-5 py-5 border-b border-gray-100">
          <Pressable onPress={() => toggleSection('weight')} className="flex-row justify-between items-center mb-4">
            <Text className="text-[14px] font-bold text-[#111827]">Weight</Text>
            <Ionicons name={expandedSections.weight ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
          </Pressable>
          {expandedSections.weight && (
            <View className="flex-row flex-wrap">
              {WEIGHTS.map(w => renderTag(w, selectedWeight === w, () => setSelectedWeight(w)))}
            </View>
          )}
        </View>

        {/* Rating Section */}
        <View className="px-5 py-5 border-b border-gray-100">
          <Pressable onPress={() => toggleSection('rating')} className="flex-row justify-between items-center mb-4">
            <Text className="text-[14px] font-bold text-[#111827]">Rating</Text>
            <Ionicons name={expandedSections.rating ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
          </Pressable>
          {expandedSections.rating && (
            <View className="flex-row flex-wrap">
              {RATINGS.map(r => renderTag(r, selectedRating === r, () => setSelectedRating(r)))}
            </View>
          )}
        </View>

        {/* Sort By Section */}
        <View className="px-5 py-5 border-b border-gray-100">
          <Pressable onPress={() => toggleSection('sort')} className="flex-row justify-between items-center mb-4">
            <Text className="text-[14px] font-bold text-[#111827]">Sort By</Text>
            <Ionicons name={expandedSections.sort ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
          </Pressable>
          {expandedSections.sort && (
            <View className="flex-row flex-wrap">
              {SORT_OPTIONS.map(s => renderTag(s, selectedSort === s, () => setSelectedSort(s)))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 pb-8 shadow-sm">
        <Pressable 
          onPress={() => router.back()}
          className="w-full bg-[#1F7A3E] py-3.5 rounded-xl items-center justify-center active:opacity-90 shadow-sm"
        >
          <Text className="text-white font-bold text-[14px]">Show 128 Results</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
