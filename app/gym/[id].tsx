import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, Pressable, Dimensions, StatusBar, StyleSheet, Alert, Linking, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useGuestStore } from '@/store/useGuestStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useUserStore } from '@/store/useUserStore';
import { apiFetch } from '@/lib/api';
import { gymPhotoUrls, httpUrl, stringList } from '@/lib/gymPhotos';
import BookingConfirmedModal from '@/components/BookingConfirmedModal';
import BookingModal from '@/components/BookingModal';

const { width } = Dimensions.get('window');

type PublicGym = {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  landmark?: string | null;
  lat?: number | null;
  lng?: number | null;
  creditCost?: number | null;
  facilities?: unknown;
  imageUrls?: unknown;
  rating?: number | null;
  totalRatings?: number | null;
  isVerified?: boolean;
  openingTime?: string | null;
  closingTime?: string | null;
  weekdayHours?: string | null;
  weekendHours?: string | null;
  monthlyPrice?: number | null;
  logoUrl?: string | null;
  exteriorImageUrl?: string | null;
  interiorImageUrls?: unknown;
  googleMapsUrl?: string | null;
  availableSlots?: number | null;
};

function placeLine(gym: PublicGym): string {
  const parts = [gym.address, gym.landmark, gym.city]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return [...new Set(parts)].join(" · ");
}

function mapSearchUrl(gym: PublicGym): string | null {
  const direct = httpUrl(gym.googleMapsUrl);
  if (direct) return direct;
  const query = [gym.name, gym.address, gym.landmark, gym.city]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function GymDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    rating?: string;
    distance?: string;
    image?: string;
    address?: string;
    price?: string;
  }>();
  const id = params.id;
  const isFromOnboarding = useAuthStore(state => state.isViewingOnboardingGym);
  const isGuest = useGuestStore(state => state.isGuest);
  const selectGym = useGuestStore(state => state.selectGym);
  const endGuestSession = useGuestStore(state => state.endGuestSession);
  const bookVisit = useBookingStore(state => state.bookVisit);
  const bookingStatus = useBookingStore(state => state.bookingStatus);
  const credits = useCreditsStore(state => state.credits);
  const membershipInfo = useCreditsStore(state => state.membershipInfo);
  const inrWallet = useCreditsStore(state => state.inrWallet);
  const cashBalance = inrWallet?.balanceINR ?? 0;
  const primaryGymId = useUserStore(state => state.primaryGymId);
  const visitsRemaining = useUserStore(state => state.visitsRemaining);
  const insets = useSafeAreaInsets();
  const [activeImage, setActiveImage] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [live, setLive] = useState<PublicGym | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<{
    timeSlot: string;
    isMandatoryVisit: boolean;
    mandatoryVisitsLeft: number;
    creditsDeducted: number;
    remainingCredits: number;
  } | null>(null);

  useEffect(() => {
    if (!id) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    setLive(null);
    apiFetch(`/api/gyms/${encodeURIComponent(String(id))}`, { silent: true })
      .then((data: PublicGym) => {
        if (!cancelled && data?.id) setLive(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const photos = live ? gymPhotoUrls(live) : [];
  const facilities = stringList(live?.facilities);
  const about = live?.description?.trim() || "";
  const place = live ? placeLine(live) : (typeof params.address === "string" ? params.address : "");
  const gymName = live?.name || (typeof params.name === "string" ? params.name : "") || "Gym";
  const visitCredits = typeof live?.creditCost === "number" ? live.creditCost : 0;
  const reviewCount = live?.totalRatings || 0;
  const hours = [
    live?.weekdayHours?.trim() ? { label: "Weekdays", value: live.weekdayHours.trim() } : null,
    live?.weekendHours?.trim() ? { label: "Weekends", value: live.weekendHours.trim() } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
  if (hours.length === 0 && live?.openingTime && live?.closingTime) {
    hours.push({ label: "Hours", value: `${live.openingTime} – ${live.closingTime}` });
  }

  useEffect(() => {
    setActiveImage(0);
    setAboutOpen(false);
  }, [live?.id]);

  const isPrimaryGym = Boolean(primaryGymId && primaryGymId === id);
  const isMandatoryVisit = isPrimaryGym && visitsRemaining > 0;

  const handleOpenBooking = () => {
    if (!live) {
      Alert.alert("Gym unavailable", loaded ? "This gym could not be loaded." : "Gym details are still loading.");
      return;
    }
    if (isGuest) {
      selectGym(live.id, live.name);
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

    if (!isMandatoryVisit && credits < visitCredits) {
      Alert.alert(
        "Insufficient Credits",
        `This booking requires ${visitCredits} credits, but you currently have ${credits} credits. Please buy credits to continue.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Buy Credits", onPress: () => router.push("/credits") }
        ]
      );
      return;
    }

    setShowBookingModal(true);
  };

  const handleConfirmBooking = async (slotTime: string, dateIso?: string) => {
    if (!live) return;
    const effectiveCost = isMandatoryVisit ? 0 : visitCredits;
    const dateToUse = dateIso || new Date().toISOString();
    const success = await bookVisit(
      live.id,
      live.name,
      dateToUse,
      slotTime,
      effectiveCost
    );

    if (success) {
      const remainingCredits = useCreditsStore.getState().credits;
      const updatedVisitsRemaining = useUserStore.getState().visitsRemaining;
      setConfirmedBookingData({
        timeSlot: slotTime,
        isMandatoryVisit,
        mandatoryVisitsLeft: updatedVisitsRemaining,
        creditsDeducted: effectiveCost,
        remainingCredits,
      });
      setShowBookingModal(false);
      setShowConfirmedModal(true);
    } else {
      Alert.alert("Booking Error", "Unable to confirm booking. Please check your credit balance or connection.");
    }
  };

  const openMap = () => {
    if (!live) return;
    const url = mapSearchUrl(live);
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert("Map unavailable", "The map link for this gym could not be opened.");
    });
  };

  const goBack = () => {
    if (isFromOnboarding) {
      useAuthStore.getState().setIsViewingOnboardingGym(false);
    }
    if (router.canGoBack()) {
      router.back();
    } else if (isFromOnboarding) {
      router.replace("/onboarding/choose-gym" as any);
    } else {
      router.replace("/partner-gyms" as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle={photos.length > 0 ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        bounces={false}
      >
        <View style={{ width, height: 260, position: 'relative', backgroundColor: '#E7F3EA' }}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveImage((prev) => (prev !== newIndex ? newIndex : prev));
              }}
              scrollEventThrottle={16}
            >
              {photos.map((img) => (
                <Image key={img} source={{ uri: img }} style={{ width, height: 260 }} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
              {loaded ? (
                <>
                  <Ionicons name="images-outline" size={36} color="#1F7A3E" />
                  <Text style={{ marginTop: 8, color: '#1F7A3E', fontWeight: '700', textAlign: 'center' }}>No photos yet</Text>
                </>
              ) : (
                <ActivityIndicator color="#1F7A3E" />
              )}
            </View>
          )}

          <View style={{ position: 'absolute', top: Math.max(insets.top, 16), left: 16, right: 16 }}>
            <Pressable onPress={goBack} style={styles.iconButton} hitSlop={8}>
              <Ionicons name="arrow-back" size={20} color="#000" />
            </Pressable>
          </View>

          {photos.length > 1 && (
            <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {photos.map((img, idx) => (
                <View key={img} style={[styles.dot, activeImage === idx ? styles.activeDot : styles.inactiveDot]} />
              ))}
            </View>
          )}
        </View>

        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>{gymName}</Text>
              {!isFromOnboarding && isPrimaryGym && (
                <View style={{ alignSelf: 'flex-start', backgroundColor: '#1F7A3E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>PRIMARY GYM</Text>
                </View>
              )}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6, maxWidth: 140 }}>
              {live?.isVerified && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 }}>
                  <Ionicons name="shield-checkmark" size={12} color="#16A34A" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A', marginLeft: 4 }}>Partner gym</Text>
                </View>
              )}
              {!isFromOnboarding && live && !isPrimaryGym && (
                <Pressable
                  onPress={() => {
                    useUserStore.getState().setPrimaryGym(live.id, live.name);
                    Alert.alert("Primary Gym Set", `${live.name} has been set as your Primary Gym.`);
                  }}
                  style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1F7A3E' }}>Set as Primary</Text>
                </Pressable>
              )}
            </View>
          </View>

          {reviewCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="star" size={14} color="#16A34A" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginLeft: 4 }}>{Number(live?.rating || 0).toFixed(1)}</Text>
              <Text style={{ fontSize: 13, color: '#6B7280' }}>  ·  {reviewCount} reviews</Text>
            </View>
          )}

          {!!place && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
              <Ionicons name="location-outline" size={16} color="#6B7280" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 13, color: '#4B5563', marginLeft: 6, lineHeight: 18 }}>{place}</Text>
            </View>
          )}

          {loaded && !live && (
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: '#374151', fontWeight: '600' }}>This gym profile is not available right now.</Text>
            </View>
          )}

          {hours.length > 0 && (
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
              {hours.map((row) => (
                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Ionicons name="time-outline" size={16} color="#1F7A3E" style={{ marginTop: 1 }} />
                  <Text style={{ width: 84, marginLeft: 8, fontSize: 13, fontWeight: '700', color: '#111827' }}>{row.label}</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 }}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          {facilities.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Facilities</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {facilities.map((item) => (
                  <View key={item} style={{ backgroundColor: '#F0FDF4', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#166534' }}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {about.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>About the gym</Text>
              <Text style={{ fontSize: 14, color: '#374151', lineHeight: 21 }} numberOfLines={aboutOpen ? 20 : 4}>
                {about}
              </Text>
              {about.length > 180 && (
                <Pressable onPress={() => setAboutOpen((open) => !open)} hitSlop={8} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#16A34A' }}>{aboutOpen ? "Show less" : "Read more"}</Text>
                </Pressable>
              )}
            </View>
          )}

          {photos.length > 1 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {photos.map((photo) => (
                  <Image key={photo} source={{ uri: photo }} style={{ width: 132, height: 88, borderRadius: 14, backgroundColor: '#E7F3EA' }} />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Before you visit</Text>
            <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 20 }}>
              Carry your ZonoFit booking, follow the gym dress code, and use the equipment safely. These are ZonoFit visit rules for every partner gym.
            </Text>
          </View>

          {live && (
            <Pressable onPress={openMap} style={{ marginBottom: 24, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Location</Text>
                <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 18 }}>{place || gymName}</Text>
              </View>
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Ionicons name="map-outline" size={14} color="#1F7A3E" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F7A3E', marginLeft: 4 }}>Map</Text>
              </View>
            </Pressable>
          )}

          {live && (
            <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="calendar-outline" size={20} color="#111827" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 8 }}>Your visit</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#16A34A', marginLeft: 28 }}>
                  {typeof live.availableSlots === "number" ? `${live.availableSlots} open today` : "Check times when you book"}
                </Text>
              </View>
              <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, alignItems: 'center', minWidth: 108 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{visitCredits} credits</Text>
                {typeof live.monthlyPrice === "number" && live.monthlyPrice > 0 && (
                  <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>₹{live.monthlyPrice.toLocaleString("en-IN")}/mo</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {isGuest ? (
        <Pressable 
          style={[styles.bottomBar, { bottom: Math.max(insets.bottom, 16) }]}
          onPress={() => {
            if (!live) {
              Alert.alert("Gym unavailable", "This gym could not be loaded.");
              return;
            }
            selectGym(live.id, live.name);
            Alert.alert(
              "Activate Membership",
              `Create an account to continue with activating your membership at ${live.name}.`,
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
          <Text style={styles.bottomLabel}>Activate Membership</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </Pressable>
      ) : isFromOnboarding ? (
        <Pressable 
          style={[styles.bottomBar, { bottom: Math.max(insets.bottom, 16) }]}
          onPress={() => {
            if (!live) {
              Alert.alert("Gym unavailable", loaded ? "This gym could not be loaded." : "Gym details are still loading.");
              return;
            }
            selectGym(live.id, live.name);
            useAuthStore.getState().setIsViewingOnboardingGym(false);
            router.push({
              pathname: '/onboarding/eligibility',
              params: {
                gymId: live.id,
                gymName: live.name,
                city: live.city || 'Udaipur',
                address: place || live.city || '',
                price: String(live.monthlyPrice || params.price || ''),
              },
            } as any);
          }}
        >
          <Text style={styles.bottomLabel}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </Pressable>
      ) : (
        <Pressable 
          onPress={handleOpenBooking}
          style={({ pressed }) => [styles.bookBar, {
            bottom: Math.max(insets.bottom, 16),
            backgroundColor: isMandatoryVisit ? '#1F7A3E' : '#4C9A2A',
            opacity: pressed ? 0.9 : 1,
          }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name={isMandatoryVisit ? "shield-checkmark" : "ticket-outline"} size={24} color="white" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>
                {isMandatoryVisit ? `${visitsRemaining} Mandatory Visits Left` : 'Credit Visit'}
              </Text>
              <Text style={{ color: 'white', fontSize: 12, opacity: 0.9 }}>
                {isMandatoryVisit ? 'Included (0 Credits)' : `${visitCredits} Credits`}
              </Text>
            </View>
          </View>
          <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '700', marginRight: 6 }}>BOOK VISIT</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </View>
        </Pressable>
      )}

      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onConfirm={handleConfirmBooking}
        gym={live ? {
          id: live.id,
          name: live.name,
          address: place,
          image: photos[0],
          cost: visitCredits,
        } : null}
        isPrimaryGym={isPrimaryGym}
        visitsRemaining={visitsRemaining}
        mandatoryVisitsTotal={membershipInfo?.mandatoryVisits || 10}
        availableCredits={credits}
        cashBalance={cashBalance}
      />

      {confirmedBookingData && live && (
        <BookingConfirmedModal
          visible={showConfirmedModal}
          gymName={live.name}
          gymAddress={place}
          gymImage={photos[0]}
          timeSlot={confirmedBookingData.timeSlot}
          isMandatoryVisit={confirmedBookingData.isMandatoryVisit}
          mandatoryVisitsLeft={confirmedBookingData.mandatoryVisitsLeft}
          totalMandatoryVisits={membershipInfo?.mandatoryVisits || 10}
          creditsDeducted={confirmedBookingData.creditsDeducted}
          remainingCredits={confirmedBookingData.remainingCredits}
          onViewPass={() => {
            setShowConfirmedModal(false);
            setConfirmedBookingData(null);
            router.replace("/booking-pass" as any);
          }}
          onDone={() => {
            setShowConfirmedModal(false);
            setConfirmedBookingData(null);
            router.replace("/(tabs)");
          }}
        />
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
    backgroundColor: '#84CC16',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#1F7A3E',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  bottomLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  bookBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
