import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, Pressable, Dimensions, StatusBar, StyleSheet, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useGuestStore } from '@/store/useGuestStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { FALLBACK_NETWORK_GYMS } from '@/constants/fallbackGyms';
import { apiFetch } from '@/lib/api';

const { width } = Dimensions.get('window');

// Default Fallback Data
const DEFAULT_GYM_DATA = {
  id: "gym-default",
  name: "Being Fitness",
  rating: 4.7,
  reviews: 128,
  distance: "2.4 km away",
  status: "Open",
  closesAt: "11:00 PM",
  isPartner: true,
  images: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1470&auto=format&fit=crop"
  ],
  about: "Spacious gym with a strong strength-training setup, cardio equipment and functional training area.",
  photos: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=400&auto=format&fit=crop"
  ],
  credits: 8,
  visitsAvailable: 1
};

export default function GymDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isFromOnboarding = useAuthStore(state => state.isViewingOnboardingGym);
  const { isGuest, selectGym, endGuestSession } = useGuestStore();
  const { bookVisit, bookingStatus } = useBookingStore();
  const { credits } = useCreditsStore();
  const { token } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Fetch saved/favorite status from database on mount
  useEffect(() => {
    if (!token || isGuest || !id) return;
    (async () => {
      try {
        const data = await apiFetch(`/api/gyms/${id}/favorite`, { token });
        setIsFavorite(data.isSaved);
        if (typeof data.favoritesCount === "number") {
          setFavoritesCount(data.favoritesCount);
        }
      } catch (e) {
        // Silently fail — default to not favorited
      }
    })();
  }, [id, token, isGuest]);

  const handleToggleFavorite = async () => {
    if (isGuest) {
      Alert.alert(
        "Account Required",
        "Create an account to save your favorite gyms.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Create Account", 
            onPress: async () => {
              await endGuestSession();
              router.replace("/(auth)/create-account");
            } 
          }
        ]
      );
      return;
    }
    if (!token || favoriteLoading) return;
    setFavoriteLoading(true);
    // Optimistic update
    const wasFavorite = isFavorite;
    const prevCount = favoritesCount;
    setIsFavorite(!wasFavorite);
    setFavoritesCount(wasFavorite ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      const data = await apiFetch(`/api/gyms/${id}/favorite`, { method: "POST", token });
      setIsFavorite(data.isSaved);
      if (typeof data.favoritesCount === "number") {
        setFavoritesCount(data.favoritesCount);
      }
    } catch (e) {
      // Revert on failure
      setIsFavorite(wasFavorite);
      setFavoritesCount(prevCount);
      Alert.alert("Error", "Could not update favorite status.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Find gym in fallback dataset if available
  const matchedGym = FALLBACK_NETWORK_GYMS.find(g => g.id === id);
  const GYM_DATA = {
    ...DEFAULT_GYM_DATA,
    id: id || DEFAULT_GYM_DATA.id,
    name: matchedGym?.name || DEFAULT_GYM_DATA.name,
    rating: matchedGym?.rating || DEFAULT_GYM_DATA.rating,
    distance: matchedGym ? `${matchedGym.distance} km away` : DEFAULT_GYM_DATA.distance,
    credits: matchedGym?.cost || DEFAULT_GYM_DATA.credits,
    images: matchedGym?.image ? [matchedGym.image, ...DEFAULT_GYM_DATA.images.slice(1)] : DEFAULT_GYM_DATA.images,
  };

  const handleBookVisit = async () => {
    if (isGuest) {
      selectGym(GYM_DATA.id, GYM_DATA.name);
      Alert.alert(
        "Account Required",
        "Create an account and activate your membership to book gym visits.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Create Account", 
            onPress: async () => {
              await endGuestSession();
              router.replace("/(auth)/create-account");
            } 
          }
        ]
      );
      return;
    }

    if (bookingStatus !== "Not Booked") {
      Alert.alert(
        "Active Booking Exists",
        "You already have an active gym booking today. Please complete or cancel it before booking another."
      );
      return;
    }

    if (credits < GYM_DATA.credits) {
      Alert.alert(
        "Insufficient Credits",
        `This booking requires ${GYM_DATA.credits} credits, but you currently have ${credits} credits. Please buy credits to continue.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Buy Credits", onPress: () => router.push("/credits") }
        ]
      );
      return;
    }

    Alert.alert(
      "Confirm Workout Booking",
      `Book a workout session at ${GYM_DATA.name} for ${GYM_DATA.credits} Credits?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            const success = await bookVisit(
              GYM_DATA.id,
              GYM_DATA.name,
              new Date().toISOString(),
              "7:00 PM - 8:30 PM",
              GYM_DATA.credits
            );
            if (success) {
              Alert.alert(
                "Workout Booked! 🎉",
                `Your visit to ${GYM_DATA.name} has been booked. You can check in at the gym anytime today using the Scan tab.`,
                [
                  { text: "Go to Home", onPress: () => router.replace("/(tabs)") }
                ]
              );
            } else {
              Alert.alert("Booking Error", "Unable to confirm booking. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
        bounces={false}
      >
        
        {/* Header Images Carousel */}
        <View style={{ width, height: 260, position: 'relative' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={16}
          >
            {GYM_DATA.images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={{ width, height: 260 }} resizeMode="cover" />
            ))}
          </ScrollView>

          {/* Top Actions */}
          <View style={{ position: 'absolute', top: Math.max(insets.top, 40), left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={20} color="#000" />
            </Pressable>
            <Pressable 
              onPress={handleToggleFavorite}
              style={[
                styles.iconButton, 
                favoritesCount > 0 && { width: 'auto', minWidth: 44, paddingHorizontal: 10, flexDirection: 'row', gap: 4 },
                favoriteLoading && { opacity: 0.5 }
              ]}
              disabled={favoriteLoading}
            >
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={20} color={isFavorite ? "#EF4444" : "#000"} />
              {favoritesCount > 0 && (
                <Text style={{ fontSize: 13, fontWeight: '700', color: isFavorite ? "#EF4444" : "#111827" }}>
                  {favoritesCount}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Pagination Dots */}
          <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {GYM_DATA.images.map((_, idx) => (
              <View key={idx} style={[styles.dot, activeImage === idx ? styles.activeDot : styles.inactiveDot]} />
            ))}
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {/* Title Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>{GYM_DATA.name}</Text>
            {GYM_DATA.isPartner && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 }}>
                <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A', marginLeft: 4 }}>Partner Gym</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="star" size={14} color="#16A34A" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginLeft: 4 }}>{GYM_DATA.rating}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>  ·  {GYM_DATA.reviews} reviews</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 4 }}>{GYM_DATA.distance}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <Ionicons name="diamond" size={12} color="#16A34A" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#16A34A', marginLeft: 4 }}>{GYM_DATA.status}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>  ·  Closes {GYM_DATA.closesAt}</Text>
          </View>

          {/* Quick Info Grid */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="dumbbell" size={20} color="#16A34A" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Equipment</Text>
              <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', lineHeight: 14 }}>Strength · Cardio{'\n'}Functional</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#F3F4F6', marginHorizontal: 4 }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="shower" size={20} color="#111827" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Facilities</Text>
              <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', lineHeight: 14 }}>Shower · Changing{'\n'}Parking</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#F3F4F6', marginHorizontal: 4 }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="people-outline" size={20} color="#111827" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Crowd</Text>
              <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', lineHeight: 14 }}>Moderate</Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FBBF24', marginTop: 4 }} />
            </View>
            <View style={{ width: 1, backgroundColor: '#F3F4F6', marginHorizontal: 4 }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="time-outline" size={20} color="#111827" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Timings</Text>
              <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', lineHeight: 14 }}>5:30 AM –{'\n'}11:00 PM</Text>
            </View>
          </View>

          {/* About the Gym */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>About the Gym</Text>
            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 8 }}>{GYM_DATA.about}</Text>
            <Pressable>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#16A34A' }}>Read more {'>'}</Text>
            </Pressable>
          </View>

          {/* Gym Photos */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Gym Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {GYM_DATA.photos.map((photo, idx) => (
                <Image key={idx} source={{ uri: photo }} style={{ width: 120, height: 80, borderRadius: 12, backgroundColor: '#F3F4F6' }} />
              ))}
            </ScrollView>
          </View>

          {/* Gym Rules */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Gym Rules</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 16, paddingBottom: 16 }}>
              <View style={styles.ruleItem}>
                <View style={styles.ruleIconWrapper}>
                  <Ionicons name="qr-code-outline" size={22} color="#4B5563" />
                </View>
                <Text style={styles.ruleText}>Carry your{'\n'}ZonoFit booking</Text>
              </View>
              <View style={styles.ruleItem}>
                <View style={styles.ruleIconWrapper}>
                  <Ionicons name="shirt-outline" size={22} color="#4B5563" />
                </View>
                <Text style={styles.ruleText}>Follow gym{'\n'}dress code</Text>
              </View>
              <View style={styles.ruleItem}>
                <View style={styles.ruleIconWrapper}>
                  <Ionicons name="layers-outline" size={22} color="#4B5563" />
                </View>
                <Text style={styles.ruleText}>Carry towel{'\n'}if required</Text>
              </View>
              <View style={styles.ruleItem}>
                <View style={styles.ruleIconWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#4B5563" />
                </View>
                <Text style={styles.ruleText}>Use equipment{'\n'}safely</Text>
              </View>
              <View style={styles.ruleItem}>
                <View style={styles.ruleIconWrapper}>
                  <Ionicons name="people-outline" size={22} color="#4B5563" />
                </View>
                <Text style={styles.ruleText}>Respect gym{'\n'}staff & members</Text>
              </View>
            </ScrollView>
            <Pressable style={{ alignItems: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#16A34A' }}>View all rules {'>'}</Text>
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 24 }} />

          {/* Location */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Location</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location-outline" size={20} color="#4B5563" />
                <Text style={{ fontSize: 13, color: '#4B5563', marginLeft: 8 }}>{GYM_DATA.distance}</Text>
              </View>
              <View style={{ width: 140, height: 48, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                <Image source={{ uri: "https://maps.googleapis.com/maps/api/staticmap?center=40.714728,-73.998672&zoom=13&size=400x150&maptype=roadmap" }} style={{ width: '100%', height: '100%' }} />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 }}>
                    <Ionicons name="location" size={12} color="#16A34A" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A', marginLeft: 4 }}>View on Map</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 24 }} />

          {/* Your Visit */}
          <View style={{ marginBottom: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="calendar-outline" size={20} color="#111827" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Your Visit</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#16A34A', marginLeft: 28 }}>Available to book</Text>
            </View>
            <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{GYM_DATA.visitsAvailable} Visit</Text>
              <Text style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>{GYM_DATA.credits} Credits</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Bottom Fixed Action Bar */}
      {isGuest ? (
        <Pressable 
          style={{ position: 'absolute', bottom: Math.max(insets.bottom, 16), left: 16, right: 16, backgroundColor: '#1F7A3E', borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, justifyContent: 'center', shadowColor: '#1F7A3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}
          onPress={() => {
            selectGym((id as string) || "gym_1", GYM_DATA.name);
            Alert.alert(
              "Activate Membership",
              `Create an account to continue with activating your membership at ${GYM_DATA.name}.`,
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Create Account", 
                  onPress: async () => {
                    await endGuestSession();
                    router.replace("/(auth)/create-account");
                  } 
                }
              ]
            );
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', marginRight: 8 }}>Activate Membership</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </Pressable>
      ) : isFromOnboarding ? (
        <Pressable 
          style={{ position: 'absolute', bottom: Math.max(insets.bottom, 16), left: 16, right: 16, backgroundColor: '#1F7A3E', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, justifyContent: 'center', shadowColor: '#1F7A3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
          onPress={() => {
            selectGym(GYM_DATA.id, GYM_DATA.name);
            useAuthStore.getState().setIsViewingOnboardingGym(false);
            router.push('/onboarding/order-summary' as any);
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', marginRight: 8 }}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </Pressable>
      ) : (
        <Pressable 
          onPress={handleBookVisit}
          style={({ pressed }) => [{
            position: 'absolute', 
            bottom: Math.max(insets.bottom, 16), 
            left: 16, 
            right: 16, 
            backgroundColor: '#4C9A2A', 
            borderRadius: 12, 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingVertical: 14, 
            paddingHorizontal: 16, 
            shadowColor: '#4C9A2A', 
            shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.2, 
            shadowRadius: 8, 
            elevation: 4,
            opacity: pressed ? 0.9 : 1
          }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialCommunityIcons name="ticket-outline" size={24} color="white" />
            <View style={{ marginLeft: 12 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>1 Visit Available</Text>
              <Text style={{ color: 'white', fontSize: 12, opacity: 0.9 }}>{GYM_DATA.credits} Credits</Text>
            </View>
          </View>
          <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '700', marginRight: 8, letterSpacing: 0.5 }}>BOOK VISIT</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 1,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#84CC16', // A brighter green like the image
  },
  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  ruleItem: {
    alignItems: 'center',
    width: 80,
  },
  ruleIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 10,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 14,
  }
});
