import React, { useState } from "react";
import { 
  ScrollView, 
  Text, 
  View, 
  Pressable, 
  Modal,
  Image,
  StyleSheet,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "@/store/useUserStore";
import { useBookingStore } from "@/store/useBookingStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { colors } from "@/constants/colors";
import { Animated3DCard } from "@/components/Animated3DCard";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Zustand Stores
  const { 
    visitsRemaining, 
    membershipStatus, 
    planName, 
    membershipExpiry,
    currentMonth,
    totalMonths,
    identityStage,
    progressPercentage,
    nextMilestone,
    streak,
    totalWorkouts,
    trainingHours,
    avatarUrl 
  } = useUserStore();

  const { 
    bookingStatus, 
    bookedGymName, 
    bookedTime, 
    checkIn, 
    cancelBooking 
  } = useBookingStore();

  const { credits } = useCreditsStore();

  // Initialize Push Notifications
  usePushNotifications();

  // Local State
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [quote, setQuote] = useState("Consistency beats intensity. Just show up today.");

  const unreadCount = notificationsList.filter(n => !n.isRead).length;

  async function fetchQuote() {
    try {
      const currentToken = useAuthStore.getState().token;
      const data = await apiFetch("/api/quotes/daily", { token: currentToken });
      if (data.text) {
        setQuote(data.text);
      }
    } catch (err) {
      console.log("Failed to fetch quote");
    }
  };

  async function fetchNotifications() {
    try {
      const currentToken = useAuthStore.getState().token;
      const data = await apiFetch("/api/users/notifications", { token: currentToken });
      if (data.success && data.notifications) {
        setNotificationsList(data.notifications);
      }
    } catch (err) {
      console.log("Failed to fetch notifications");
    }
  }

  React.useEffect(() => {
    fetchQuote();
    fetchNotifications();
  }, []);

  React.useEffect(() => {
    if (notificationsVisible && unreadCount > 0) {
      // Mark as read when opened
      const currentToken = useAuthStore.getState().token;
      apiFetch("/api/users/notifications/read", { method: "POST", token: currentToken })
        .catch(err => console.log("Failed to mark notifications read"));
      
      setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  }, [notificationsVisible]);

  const rotateQuote = () => {
    fetchQuote();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 12 }}
      >
        {/* Header Section */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.muted }}>Welcome back</Text>
            <Text className="text-2xl font-bold mt-0.5" style={{ color: colors.text }}>{user?.username || "ZonoFit Member"}</Text>
          </View>
          <View className="flex-row items-center gap-x-3">
            <Pressable 
              onPress={() => router.push("/marketplace" as any)}
              className="w-10 h-10 rounded-full items-center justify-center border active:scale-[0.95] transition-transform"
              style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
            >
              <Ionicons name="cart-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable 
              onPress={() => setNotificationsVisible(true)}
              className="w-10 h-10 rounded-full items-center justify-center border relative active:scale-[0.95] transition-transform"
              style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {/* Unread badge */}
              {unreadCount > 0 && (
                <View className="absolute top-2 right-2.5 w-2 h-2 rounded-full border border-white" style={{ backgroundColor: colors.coral }} />
              )}
            </Pressable>
            <Pressable 
              onPress={() => router.push("/profile")}
              className="w-10 h-10 rounded-full items-center justify-center border overflow-hidden active:scale-[0.95] transition-transform"
              style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={18} color={colors.text} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Section 1: Hero Access Card */}
        <View>
          <Animated3DCard scaleDown={0.97}>
            <View 
              className="rounded-[32px] p-6 mb-6 overflow-hidden relative"
              style={[
                { backgroundColor: colors.green }, 
                styles.emeraldGlow
              ]}
            >
              {/* Background subtle pattern blobs */}
              <View className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-white/5" />
              <View className="absolute bottom-[-80px] left-[-30px] w-40 h-40 rounded-full bg-black/10" />

              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>Visits Remaining</Text>
                  <Text className="text-6xl font-black text-white mt-1">{visitsRemaining}</Text>
                </View>
                <View className="px-3 py-1 rounded-full border" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
                  <Text className="text-white text-xs font-semibold">{membershipStatus}</Text>
                </View>
              </View>

              <View className="mt-4">
                <Text className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>{planName} · Expires {membershipExpiry}</Text>
              </View>

              <View className="h-[1px] my-4" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="wallet-outline" size={16} color={colors.lime} />
                  <Text className="text-sm font-bold ml-1.5" style={{ color: colors.lime }}>{credits} Credits</Text>
                </View>
                
                {bookingStatus === "Not Booked" && (
                  <Pressable 
                    onPress={() => router.push("/explore")}
                    className="px-4 py-2.5 rounded-2xl flex-row items-center active:opacity-80"
                    style={[{ backgroundColor: colors.lime }, styles.neonGlow]}
                  >
                    <Text className="font-bold text-xs mr-1" style={{ color: "#000000" }}>Book Today's Visit</Text>
                    <Ionicons name="arrow-forward" size={12} color="#000000" />
                  </Pressable>
                )}
              </View>
            </View>
          </Animated3DCard>
        </View>

        {/* Section 2: Today's Booking Section (Blackish Container) */}
        <View>
          <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-1" style={{ color: colors.muted }}>Today's Workout</Text>
          
          {bookingStatus === "Not Booked" && (
            <Animated3DCard scaleDown={0.98}>
              <View className="rounded-[28px] p-5 border mb-6 flex-row justify-between items-center" style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }]}>
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colors.muted }} />
                    <Text className="font-bold text-base" style={{ color: colors.textLight }}>No workout booked</Text>
                  </View>
                  <Text className="text-xs" style={{ color: colors.muted }}>Discover partner gyms nearby and book your session.</Text>
                </View>
                <Pressable 
                  onPress={() => router.push("/explore")}
                  className="px-4 py-2.5 rounded-2xl border active:opacity-80"
                  style={[{ backgroundColor: 'rgba(217, 255, 92, 0.1)', borderColor: 'rgba(217, 255, 92, 0.2)' }, styles.neonGlow]}
                >
                  <Text className="font-bold text-xs" style={{ color: colors.lime }}>Book Visit</Text>
                </Pressable>
              </View>
            </Animated3DCard>
          )}

          {bookingStatus === "Booked" && (
            <Animated3DCard scaleDown={0.98}>
              <View className="rounded-[28px] p-5 border mb-6" style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }]}>
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <View className="flex-row items-center mb-1">
                      <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colors.lime }} />
                      <Text className="font-bold text-base" style={{ color: colors.textLight }}>Workout Booked</Text>
                    </View>
                    <Text className="text-lg font-bold" style={{ color: colors.textLight }}>{bookedGymName}</Text>
                    <Text className="text-xs mt-0.5" style={{ color: colors.muted }}>Time Slot: {bookedTime}</Text>
                  </View>
                  <Pressable 
                    onPress={() => {
                      const refundInfo = useBookingStore.getState().calculateRefund();
                      let message = "Are you sure you want to cancel this booking?";
                      
                      if (refundInfo) {
                        if (refundInfo.percentage === 0) {
                          message = "This booking is within 6 hours of the workout time. You will be charged a 100% cancellation fee and receive NO refund. Are you sure you want to cancel?";
                        } else if (refundInfo.percentage === 75) {
                          message = `You are cancelling more than 1 hour after booking. A 25% cancellation fee applies. You will receive a refund of ${refundInfo.refundAmount} credits. Are you sure?`;
                        } else {
                          message = `You are cancelling within 1 hour of booking. You will receive a full refund of ${refundInfo.refundAmount} credits. Are you sure?`;
                        }
                      }

                      Alert.alert(
                        "Cancel Booking",
                        message,
                        [
                          { text: "Keep Booking", style: "cancel" },
                          { 
                            text: "Yes, Cancel", 
                            style: "destructive", 
                            onPress: () => {
                              cancelBooking();
                            } 
                          }
                        ]
                      );
                    }}
                    className="p-1 active:opacity-70"
                  >
                    <Text className="text-xs font-semibold" style={{ color: colors.coral }}>Cancel</Text>
                  </Pressable>
                </View>
                
                <Pressable 
                  onPress={() => router.push("/scan" as any)}
                  className="h-12 rounded-2xl items-center justify-center mt-2 flex-row gap-x-2 active:opacity-90"
                  style={[{ backgroundColor: colors.green }, styles.emeraldGlowSm]}
                >
                  <Ionicons name="scan-outline" size={16} color={colors.lime} />
                  <Text className="font-bold text-sm" style={{ color: colors.lime }}>Scan Gym QR to Check-In</Text>
                </Pressable>
              </View>
            </Animated3DCard>
          )}

          {bookingStatus === "Checked In" && (
            <Animated3DCard scaleDown={0.98}>
              <View className="rounded-[28px] p-5 border mb-6" style={[{ backgroundColor: 'rgba(217, 255, 92, 0.1)', borderColor: 'rgba(217, 255, 92, 0.2)' }, styles.neonGlow]}>
                <View className="flex-row items-center mb-1">
                  <Ionicons name="checkmark-circle" size={20} color={colors.lime} />
                  <Text className="font-bold text-base ml-2" style={{ color: colors.lime }}>Checked In Successfully</Text>
                </View>
                <Text className="text-xs mt-1" style={{ color: colors.textLight }}>
                  🔥 Great Work! You verified your check-in code at <Text className="font-bold">{bookedGymName}</Text>. Have a great workout!
                </Text>
              </View>
            </Animated3DCard>
          )}
        </View>

        {/* Section 3: Fitness Journey (White Container) */}
        <View>
          <Animated3DCard scaleDown={0.98}>
            <View className="rounded-[28px] p-5 border mb-6" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.muted }}>Fitness Journey</Text>
                  <Text className="text-lg font-bold mt-0.5" style={{ color: colors.text }}>Month {currentMonth} of {totalMonths}</Text>
                </View>
                <View className="px-3 py-1 rounded-full" style={{ backgroundColor: colors.bg }}>
                  <Text className="text-xs font-bold" style={{ color: colors.muted }}>{identityStage}</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View className="h-3 w-full rounded-full overflow-hidden mb-3 border" style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}>
                <View 
                  style={{ width: `${progressPercentage}%`, backgroundColor: colors.green }} 
                  className="h-full rounded-full" 
                />
              </View>

              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xs font-medium" style={{ color: colors.muted }}>{progressPercentage}% Complete</Text>
                <Text className="text-xs font-bold" style={{ color: colors.green }}>Next: {nextMilestone}</Text>
              </View>

              <Pressable
                onPress={() => router.push("/journey")}
                className="h-10 rounded-2xl items-center justify-center flex-row gap-x-1.5 border active:opacity-80"
                style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}
              >
                <Text className="font-bold text-xs" style={{ color: colors.text }}>View Full Journey</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.text} />
              </Pressable>
            </View>
          </Animated3DCard>
        </View>

        {/* Challenges Entry (Blackish Container) */}
        <View>
          <Animated3DCard scaleDown={0.98} onPress={() => router.push("/challenges" as any)}>
            <View 
              className="rounded-[32px] p-6 mb-6 overflow-hidden relative border"
              style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.softShadowLg]}
            >
              <View className="absolute right-[-20] top-[-20] w-32 h-32 rounded-full" style={{ backgroundColor: 'rgba(217, 255, 92, 0.05)' }} />
              <View className="absolute right-10 bottom-[-10] w-20 h-20 rounded-full" style={{ backgroundColor: 'rgba(217, 255, 92, 0.1)' }} />
              
              <View className="flex-row items-center mb-2">
                <Ionicons name="trophy" size={20} color={colors.lime} />
              </View>
              <Text className="text-xl font-black mb-1" style={{ color: colors.textLight }}>Monthly Challenges</Text>
              <Text className="text-sm mb-4 max-w-[80%]" style={{ color: colors.muted }}>Complete challenges to earn bonus credits and build consistency.</Text>
              
              <View className="self-start px-4 py-2 rounded-xl flex-row items-center border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: colors.secondaryDark }}>
                <Text className="font-bold text-xs mr-2" style={{ color: colors.textLight }}>View Challenges</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.textLight} />
              </View>
            </View>
          </Animated3DCard>
        </View>

        {/* Find Trainer / Buddy Section (White Container) */}
        <View>
          <Animated3DCard scaleDown={0.98} onPress={() => router.push("/tools/find-trainer" as any)}>
            <View 
              className="rounded-[32px] p-6 mb-6 overflow-hidden relative border"
              style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
            >
              <View className="absolute right-[-20] top-[-20] w-32 h-32 rounded-full" style={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }} />
              <View className="absolute right-10 bottom-[-10] w-20 h-20 rounded-full" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }} />
              
              <View className="flex-row items-center mb-2">
                <View className="px-2.5 py-1 rounded-full mr-2 border" style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}>
                  <Text className="text-[10px] font-bold tracking-wider" style={{ color: colors.green }}>NEW</Text>
                </View>
                <Ionicons name="people" size={16} color={colors.muted} />
              </View>
              <Text className="text-xl font-black mb-1" style={{ color: colors.text }}>Find a Trainer or Buddy</Text>
              <Text className="text-sm mb-4 max-w-[80%]" style={{ color: colors.muted }}>Discover experienced trainers or find a workout buddy at your preferred gym.</Text>
              
              <View className="self-start px-4 py-2 rounded-xl border flex-row items-center" style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}>
                <Text className="font-bold text-xs mr-2" style={{ color: colors.muted }}>Early Access</Text>
                <Ionicons name="lock-closed" size={12} color={colors.muted} />
              </View>
            </View>
          </Animated3DCard>
        </View>

        {/* Section 4: Momentum Bento Grid (White Containers) */}
        <View>
          <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-1" style={{ color: colors.muted }}>Momentum</Text>
          <View className="flex-row gap-x-4 mb-6">
            <Animated3DCard style={{ flex: 1 }} scaleDown={0.9}>
              <View className="flex-1 rounded-[24px] p-4 border items-center" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
                <Text className="text-2xl mb-1">🔥</Text>
                <Text className="text-xl font-bold" style={{ color: colors.text }}>{streak}</Text>
                <Text className="text-[10px] font-medium uppercase mt-0.5" style={{ color: colors.muted }}>Day Streak</Text>
              </View>
            </Animated3DCard>

            <Animated3DCard style={{ flex: 1 }} scaleDown={0.9}>
              <View className="flex-1 rounded-[24px] p-4 border items-center" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
                <Text className="text-2xl mb-1">🏋️</Text>
                <Text className="text-xl font-bold" style={{ color: colors.text }}>{totalWorkouts}</Text>
                <Text className="text-[10px] font-medium uppercase mt-0.5" style={{ color: colors.muted }}>Total Visits</Text>
              </View>
            </Animated3DCard>

            <Animated3DCard style={{ flex: 1 }} scaleDown={0.9}>
              <View className="flex-1 rounded-[24px] p-4 border items-center" style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}>
                <Text className="text-2xl mb-1">⏱️</Text>
                <Text className="text-xl font-bold" style={{ color: colors.text }}>{trainingHours}</Text>
                <Text className="text-[10px] font-medium uppercase mt-0.5" style={{ color: colors.muted }}>Total Hours</Text>
              </View>
            </Animated3DCard>
          </View>
        </View>

        {/* Section 6: Fitness Tools Bento Grid (Blackish Containers) */}
        <View>
          <Text className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-1" style={{ color: colors.muted }}>Fitness Tools</Text>
          <View className="flex-wrap flex-row justify-between gap-y-4 mb-6">
            <Animated3DCard scaleDown={0.95} style={{ width: '47%' }} onPress={() => router.push("/tools/ai-trainer" as any)}>
              <View className="rounded-[24px] p-4 border" style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.softShadowLg]}>
                <Text className="text-lg">🤖</Text>
                <Text className="font-bold text-sm mt-1" style={{ color: colors.textLight }}>AI Trainer</Text>
                <Text className="text-[10px] font-bold mt-0.5" style={{ color: colors.muted }}>Early Access</Text>
              </View>
            </Animated3DCard>

            <Animated3DCard scaleDown={0.95} style={{ width: '47%' }} onPress={() => router.push("/tools/meal-scan" as any)}>
              <View className="rounded-[24px] p-4 border" style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.softShadowLg]}>
                <Text className="text-lg">📸</Text>
                <Text className="font-bold text-sm mt-1" style={{ color: colors.textLight }}>Meal Scan</Text>
                <Text className="text-[10px] font-bold mt-0.5" style={{ color: colors.muted }}>Early Access</Text>
              </View>
            </Animated3DCard>

            <Animated3DCard scaleDown={0.95} style={{ width: '47%' }} onPress={() => router.push("/tools/workout-buddy" as any)}>
              <View className="rounded-[24px] p-4 border" style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.softShadowLg]}>
                <Text className="text-lg">👥</Text>
                <Text className="font-bold text-sm mt-1" style={{ color: colors.textLight }}>Workout Buddy</Text>
                <Text className="text-[10px] font-bold mt-0.5" style={{ color: colors.muted }}>Early Access</Text>
              </View>
            </Animated3DCard>

            <Animated3DCard scaleDown={0.95} style={{ width: '47%' }} onPress={() => router.push("/tools/plans" as any)}>
              <View className="rounded-[24px] p-4 border" style={[{ backgroundColor: colors.surfaceDark, borderColor: colors.secondaryDark }, styles.softShadowLg]}>
                <Text className="text-lg">📋</Text>
                <Text className="font-bold text-sm mt-1" style={{ color: colors.textLight }}>Workout Plans</Text>
                <Text className="text-[10px] font-bold mt-0.5" style={{ color: colors.muted }}>Early Access</Text>
              </View>
            </Animated3DCard>
          </View>
        </View>

        {/* Section 7: Motivation Quote (White Container) */}
        <View>
          <Animated3DCard scaleDown={0.95} onPress={rotateQuote}>
            <View 
              className="rounded-[24px] p-4 border items-center flex-row justify-between"
              style={[{ backgroundColor: colors.surface, borderColor: colors.secondary }, styles.softShadow]}
            >
              <View className="flex-1 mr-4">
                <Text className="text-xs font-bold tracking-widest uppercase" style={{ color: colors.muted }}>Motivation</Text>
                <Text className="text-sm font-semibold italic mt-1" style={{ color: colors.text }}>
                  "{quote}"
                </Text>
              </View>
              <Ionicons name="refresh" size={16} color={colors.muted} />
            </View>
          </Animated3DCard>
        </View>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={notificationsVisible}
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-[36px] p-6 h-[70%]" style={{ backgroundColor: colors.bg }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold" style={{ color: colors.text }}>Notifications</Text>
              <Pressable onPress={() => setNotificationsVisible(false)} className="w-8 h-8 rounded-full items-center justify-center border" style={{ backgroundColor: colors.surface, borderColor: colors.secondary }}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={true} overScrollMode="never">
              {notificationsList.length === 0 ? (
                <View className="py-10 items-center justify-center">
                  <Ionicons name="notifications-off-outline" size={48} color={colors.secondary} className="mb-4" />
                  <Text className="text-sm" style={{ color: colors.muted }}>No new notifications</Text>
                </View>
              ) : (
                notificationsList.map((notification, index) => (
                  <View key={notification.id || index} className={`rounded-[24px] p-4 mb-3 border flex-row`} style={{ backgroundColor: notification.isRead ? colors.surface : 'rgba(11, 110, 79, 0.05)', borderColor: notification.isRead ? colors.secondary : 'rgba(11, 110, 79, 0.1)' }}>
                    <View className="w-10 h-10 rounded-full items-center justify-center mr-3 border" style={{ backgroundColor: colors.bg, borderColor: colors.secondary }}>
                      <Ionicons name="notifications" size={18} color={notification.isRead ? colors.muted : colors.green} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold" style={{ color: colors.text }}>{notification.title}</Text>
                      <Text className="text-xs mt-0.5 leading-relaxed" style={{ color: colors.muted }}>{notification.body}</Text>
                      <Text className="text-[10px] font-medium mt-2" style={{ color: colors.muted }}>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  softShadowLg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  softShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emeraldGlow: {
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 15,
  },
  emeraldGlowSm: {
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  neonGlow: {
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  }
});