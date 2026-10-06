import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useAuthStore } from '@/store/useAuthStore';

const { width } = Dimensions.get('window');

export default function JourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, isSignedIn } = useAuthStore();

  const { totalWorkouts, currentMonth, totalMonths, streak, identityStage } = useUserStore();
  const { membershipInfo } = useCreditsStore();
  const { bookingStatus, bookedGymName, bookedTime, pastBookings } = useBookingStore();

  // Refresh live progress from backend on mount
  useEffect(() => {
    if (isSignedIn && token) {
      useUserStore.getState().fetchProfile(token);
      useCreditsStore.getState().fetchWallet(token);
      useBookingStore.getState().fetchBookings(token);
    }
  }, [isSignedIn, token]);

  const cycleMonth = membershipInfo?.cycleNumber ?? currentMonth ?? 1;
  const cycleTotalMonths = membershipInfo?.maxCycles ?? totalMonths ?? 12;
  // Ensure we accurately count visits completed across membership & user workout records
  const visitsCompleted = Math.max(membershipInfo?.completedVisits || 0, totalWorkouts || 0);
  const visitsGoal = membershipInfo?.mandatoryVisits ?? 10;
  const visitsRemaining = Math.max(0, visitsGoal - visitsCompleted);

  const monthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      {/* Standard Header with Back Button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Pressable 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)");
              }
            }} 
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>My Journey</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#6B7280', marginTop: 1 }}>Consistency • Progress • Habit</Text>
          </View>
        </View>

        <Pressable onPress={() => router.push("/notifications" as any)} style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end', position: 'relative' }}>
          <Ionicons name="notifications-outline" size={22} color="#111827" />
          <View style={{ position: 'absolute', top: 8, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          
          {/* Hero Card */}
          <View style={{ backgroundColor: '#F9FCF8', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F0F5EE' }}>
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#4C9A2A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.2 }}>Month {cycleMonth} of {cycleTotalMonths}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 }}>
                <Text style={{ fontSize: 48, fontWeight: '900', color: '#111827' }}>{visitsCompleted}</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#9CA3AF' }}> / {visitsGoal}</Text>
              </View>
              <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 20, fontWeight: '500' }}>Visits completed this month</Text>
              
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[...Array(Math.max(visitsGoal, 1))].map((_, i) => (
                  <View key={i} style={{ width: 22, height: 12, borderRadius: 6, backgroundColor: i < visitsCompleted ? '#4C9A2A' : '#E5E7EB' }} />
                ))}
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: '#E5E7EB', opacity: 0.5, marginVertical: 16 }} />
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="calendar-outline" size={16} color="#4C9A2A" />
              </View>
              <Text style={{ fontSize: 12, color: '#4B5563', flex: 1, lineHeight: 18 }}>
                {visitsRemaining > 0 
                  ? `${visitsRemaining} visits remaining to complete your ${monthName} commitment` 
                  : `Monthly commitment completed! Great work on building your fitness habit.`}
              </Text>
            </View>
          </View>

          {/* Next Visit Card */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Ionicons name="calendar-outline" size={20} color="#4C9A2A" />
              <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'white', borderRadius: 6 }}>
                <Ionicons name="checkmark-circle" size={12} color="#4C9A2A" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
                {bookingStatus === "Booked" ? "Upcoming Workout" : "Next Visit"}
              </Text>
              <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 2 }}>
                {bookingStatus === "Booked" ? (bookedTime || "Today") : "No active booking"}
              </Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                {bookingStatus === "Booked" ? (bookedGymName || "Partner Gym") : "Choose a gym to workout"}
              </Text>
            </View>
            <Pressable 
              onPress={() => {
                if (bookingStatus === "Booked") {
                  router.push("/scan-modal" as any);
                } else {
                  router.push("/partner-gyms" as any);
                }
              }}
              style={{ backgroundColor: '#4C9A2A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginRight: 4 }}>
                {bookingStatus === "Booked" ? "VIEW PASS" : "BOOK VISIT"}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="white" />
            </Pressable>
          </View>

          {/* ZonoFit Score Expanded Card */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>ZonoFit Score</Text>
              <Pressable 
                onPress={() => {
                  const cScore = visitsGoal > 0 ? Math.min(40, Math.round((visitsCompleted / visitsGoal) * 40)) : 0;
                  const dScore = Math.min(35, Math.round((Math.min(streak, 15) / 15) * 35));
                  const aScore = Math.min(25, Math.round((Math.min(visitsCompleted, 10) / 10) * 25));
                  const tScore = cScore + dScore + aScore;
                  Alert.alert(
                    `ZonoFit Score: ${tScore}/100`, 
                    `• Commitment: ${cScore}/40\n• Discipline (Streak): ${dScore}/35\n• Overall Activity: ${aScore}/25\n\nConsistency builds habits. Keep checking in at gyms to increase your score.`
                  );
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#4C9A2A', marginRight: 2 }}>View breakdown</Text>
                <Ionicons name="chevron-forward" size={12} color="#4C9A2A" />
              </Pressable>
            </View>
            
            {(() => {
              const cScore = visitsGoal > 0 ? Math.min(40, Math.round((visitsCompleted / visitsGoal) * 40)) : 0;
              const dScore = Math.min(35, Math.round((Math.min(streak, 15) / 15) * 35));
              const aScore = Math.min(25, Math.round((Math.min(visitsCompleted, 10) / 10) * 25));
              const tScore = cScore + dScore + aScore;
              return (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
                      <Text style={{ fontSize: 32, fontWeight: '800', color: '#111827' }}>{tScore}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#6B7280' }}> / 100</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: tScore > 0 ? '#4C9A2A' : '#6B7280' }}>
                      {tScore > 60 ? 'Consistent Habit 🔥' : tScore > 20 ? 'Building Momentum ⚡' : 'Start your first workout'}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', flex: 2, justifyContent: 'space-around' }}>
                    {/* Commitment */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                        <Feather name="target" size={12} color="#4C9A2A" />
                      </View>
                      <Text style={{ fontSize: 10, color: '#4B5563', marginBottom: 2 }}>Visits</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 6 }}>{cScore} / 40</Text>
                      <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: '#4C9A2A' }} />
                    </View>
                    {/* Discipline */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="flame-outline" size={12} color="#3B82F6" />
                      </View>
                      <Text style={{ fontSize: 10, color: '#4B5563', marginBottom: 2 }}>Streak</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 6 }}>{dScore} / 35</Text>
                      <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: '#3B82F6' }} />
                    </View>
                    {/* Activity */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                        <Ionicons name="flash-outline" size={12} color="#F59E0B" />
                      </View>
                      <Text style={{ fontSize: 10, color: '#4B5563', marginBottom: 2 }}>Activity</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 6 }}>{aScore} / 25</Text>
                      <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: '#F59E0B' }} />
                    </View>
                  </View>
                </View>
              );
            })()}
          </View>

          {/* Next Milestone Card */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
              <Ionicons name="trophy" size={26} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Next Milestone</Text>
              <Text style={{ fontSize: 12, color: '#4B5563', lineHeight: 16 }}>
                {visitsRemaining > 0 
                  ? `${visitsRemaining} visits to complete Month ${cycleMonth} commitment`
                  : `Month ${cycleMonth} commitment completed!`}
              </Text>
            </View>
            <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>{visitsRemaining}</Text>
              <Text style={{ fontSize: 9, color: '#6B7280' }}>remaining</Text>
            </View>
          </View>

          {/* Your Journey Path */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Your 12-Month Journey Path</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              {/* Connecting line */}
              <View style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 2, backgroundColor: '#E5E7EB', zIndex: 0 }} />
              <View style={{ position: 'absolute', top: 16, left: 16, width: `${Math.min(100, Math.max(5, (cycleMonth / 6) * 100))}%`, height: 2, backgroundColor: '#4C9A2A', zIndex: 1 }} />
              
              {[
                { m: 1, label: "Start", target: "10 visits/month", focus: "Foundation habit: show up regularly at your home gym." },
                { m: 2, label: "Build", target: "10 visits/month", focus: "Consistency building: establish your weekly schedule." },
                { m: 3, label: "Habit", target: "10 visits/month", focus: "Automatic routine: working out becomes second nature." },
                { m: 4, label: "Consistency", target: "12 visits/month", focus: "Expanding frequency: start exploring network partner gyms." },
                { m: 5, label: "Lifestyle", target: "15 visits/month", focus: "Identity transformation: fitness is who you are." },
                { m: 6, label: "Stronger", target: "15 visits/month", focus: "Peak performance: solid habit & community participation." },
              ].map(({ m, label, target, focus }) => {
                const isCompleted = cycleMonth > m;
                const isCurrent = cycleMonth === m;
                return (
                  <Pressable 
                    key={m} 
                    onPress={() => Alert.alert(`Month ${m} — ${label}`, `Target: ${target}\nFocus: ${focus}`)}
                    style={{ alignItems: 'center', zIndex: 2 }}
                  >
                    <View style={{ 
                      width: isCurrent ? 36 : 32, 
                      height: isCurrent ? 36 : 32, 
                      borderRadius: isCurrent ? 18 : 16, 
                      backgroundColor: isCompleted ? '#4C9A2A' : isCurrent ? 'white' : '#F3F4F6', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      marginBottom: isCurrent ? 6 : 8, 
                      borderWidth: isCurrent ? 2 : 0, 
                      borderColor: '#4C9A2A' 
                    }}>
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={16} color="white" />
                      ) : (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isCurrent ? '#4C9A2A' : '#6B7280' }}>
                          M{m}
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: isCurrent ? '700' : '500', color: isCurrent ? '#4C9A2A' : '#6B7280' }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Recent Activity</Text>
              {pastBookings && pastBookings.length > 0 && (
                <Pressable onPress={() => router.push("/booking-history" as any)}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#4C9A2A' }}>View all</Text>
                </Pressable>
              )}
            </View>
            
            <View>
              {pastBookings && pastBookings.length > 0 ? (
                pastBookings.slice(0, 5).map((activity, index) => (
                  <View key={activity.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: index !== Math.min(pastBookings.length, 5) - 1 ? 16 : 0 }}>
                    <View style={{ width: 44, height: 50, borderRadius: 12, backgroundColor: '#F9FCF8', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#F0F5EE' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#4C9A2A' }}>VISIT</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#4C9A2A' }}>#{index + 1}</Text>
                    </View>
                    
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="barbell" size={16} color="#4B5563" />
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 }}>{activity.gymName}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>{activity.date} • {activity.time} · <Text style={{ color: '#4C9A2A', fontWeight: '600' }}>{activity.status}</Text></Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-circle" size={20} color="#4C9A2A" />
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <Ionicons name="fitness-outline" size={32} color="#9CA3AF" style={{ marginBottom: 6 }} />
                  <Text style={{ fontSize: 13, color: '#374151', fontWeight: '700', marginBottom: 4 }}>No completed workouts yet</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>Your verified check-ins and completed gym visits will automatically appear here.</Text>
                </View>
              )}
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
