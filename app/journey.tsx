import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock Data
const DATA = {
  month: 4,
  totalMonths: 12,
  visitsCompleted: 7,
  visitsGoal: 10,
  score: 82,
  commitment: { current: 36, total: 40 },
  discipline: { current: 29, total: 35 },
  activity: { current: 10, total: 15 },
  nextVisit: { time: "Tomorrow, 7:00 PM", gym: "Being Fitness" },
  recentActivity: [
    { id: 1, date: "AUG 6", type: "Commitment Visit", gym: "Being Fitness", time: "7:00 PM", status: "completed" },
    { id: 2, date: "AUG 4", type: "Commitment Visit", gym: "Fitness Zone", time: "6:30 PM", status: "completed" },
    { id: 3, date: "AUG 2", type: "Credit Visit", gym: "Being Fitness", time: "8:00 PM", status: "completed" },
  ]
};

export default function JourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const progressPercentage = (DATA.score / 100) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      {/* Standard Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>My Journey</Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#6B7280', marginTop: 4 }}>Your commitment. Your consistency. Your progress.</Text>
        </View>
        <Pressable onPress={() => router.push("/booking-history" as any)} style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end', position: 'relative' }}>
          <Ionicons name="notifications-outline" size={24} color="#111827" />
          <View style={{ position: 'absolute', top: 6, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingHorizontal: 16 }}>
          
          {/* Hero Card */}
          <View style={{ backgroundColor: '#F9FCF8', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F0F5EE' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#4C9A2A', marginBottom: 8 }}>Month {DATA.month} of {DATA.totalMonths}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
                  <Text style={{ fontSize: 36, fontWeight: '800', color: '#111827' }}>{DATA.visitsCompleted}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}> / {DATA.visitsGoal}</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 16 }}>Visits completed</Text>
                
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  {[...Array(10)].map((_, i) => (
                    <View key={i} style={{ width: 14, height: 10, borderRadius: 3, backgroundColor: i < DATA.visitsCompleted ? '#4C9A2A' : '#E5E7EB' }} />
                  ))}
                </View>
              </View>

              <View style={{ width: 100, height: 100, justifyContent: 'center', alignItems: 'center', borderRadius: 50, borderWidth: 6, borderColor: '#4C9A2A' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827' }}>{DATA.score}</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', marginTop: -2 }}>ZonoFit Score</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#4C9A2A', marginTop: 2 }}>Good</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: '#E5E7EB', opacity: 0.5, marginVertical: 16 }} />
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="calendar-outline" size={14} color="#4C9A2A" />
              </View>
              <Text style={{ fontSize: 12, color: '#4B5563', flex: 1, lineHeight: 18 }}>
                3 visits remaining to complete{'\n'}your August commitment
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
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 }}>Next Visit</Text>
              <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 2 }}>{DATA.nextVisit.time}</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{DATA.nextVisit.gym}</Text>
            </View>
            <Pressable style={{ backgroundColor: '#4C9A2A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginRight: 4 }}>BOOK NEXT VISIT</Text>
              <Ionicons name="arrow-forward" size={14} color="white" />
            </Pressable>
          </View>

          {/* ZonoFit Score Expanded Card */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>ZonoFit Score</Text>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#4C9A2A', marginRight: 2 }}>View score</Text>
                <Ionicons name="chevron-forward" size={12} color="#4C9A2A" />
              </Pressable>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
                  <Text style={{ fontSize: 32, fontWeight: '800', color: '#111827' }}>82</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#6B7280' }}> / 100</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#4C9A2A' }}>Good consistency</Text>
              </View>
              
              <View style={{ flexDirection: 'row', flex: 2, justifyContent: 'space-around' }}>
                {/* Commitment */}
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                    <Feather name="target" size={12} color="#4C9A2A" />
                  </View>
                  <Text style={{ fontSize: 10, color: '#4B5563', marginBottom: 2 }}>Commitment</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 6 }}>36 / 40</Text>
                  <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: '#4C9A2A' }} />
                </View>
                {/* Discipline */}
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="calendar-outline" size={12} color="#3B82F6" />
                  </View>
                  <Text style={{ fontSize: 10, color: '#4B5563', marginBottom: 2 }}>Discipline</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 6 }}>29 / 35</Text>
                  <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: '#3B82F6' }} />
                </View>
                {/* Activity */}
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="flash-outline" size={12} color="#F59E0B" />
                  </View>
                  <Text style={{ fontSize: 10, color: '#4B5563', marginBottom: 2 }}>Activity</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 6 }}>10 / 15</Text>
                  <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: '#F59E0B' }} />
                </View>
              </View>
            </View>
          </View>

          {/* Next Milestone Card */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <View style={{ width: 50, height: 50, marginRight: 16, justifyContent: 'flex-end', alignItems: 'center' }}>
              <MaterialCommunityIcons name="terrain" size={54} color="#1E3A8A" style={{ marginBottom: -8 }} />
              <View style={{ position: 'absolute', top: -4, left: 8 }}>
                <MaterialCommunityIcons name="flag-triangle" size={24} color="#4C9A2A" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Next Milestone</Text>
              <Text style={{ fontSize: 12, color: '#4B5563' }}>3 visits to complete{'\n'}Month 4 commitment</Text>
            </View>
            <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>3</Text>
              <Text style={{ fontSize: 9, color: '#6B7280' }}>remaining</Text>
            </View>
          </View>

          {/* Your Journey Path */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Your Journey Path</Text>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#4C9A2A', marginRight: 2 }}>View journey</Text>
                <Ionicons name="chevron-forward" size={12} color="#4C9A2A" />
              </Pressable>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              {/* Connecting line */}
              <View style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 2, backgroundColor: '#E5E7EB', zIndex: 0 }} />
              <View style={{ position: 'absolute', top: 16, left: 16, width: '40%', height: 2, backgroundColor: '#4C9A2A', zIndex: 1 }} />
              
              {/* M1 */}
              <View style={{ alignItems: 'center', zIndex: 2 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#4C9A2A', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'white' }}>
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#111827' }}>M1</Text>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Start</Text>
              </View>

              {/* M2 */}
              <View style={{ alignItems: 'center', zIndex: 2 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#4C9A2A', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'white' }}>
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#111827' }}>M2</Text>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Build</Text>
              </View>

              {/* M3 */}
              <View style={{ alignItems: 'center', zIndex: 2 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#4C9A2A', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'white' }}>
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#111827' }}>M3</Text>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Habit</Text>
              </View>

              {/* M4 */}
              <View style={{ alignItems: 'center', zIndex: 2 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 2, borderColor: '#4C9A2A' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>M4</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#4C9A2A' }}>Consistency</Text>
                <Text style={{ fontSize: 10, color: '#4C9A2A' }}>10 visits/mo</Text>
              </View>

              {/* M5 */}
              <View style={{ alignItems: 'center', zIndex: 2 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'white' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>M5</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Lifestyle</Text>
                <Text style={{ fontSize: 9, color: '#9CA3AF' }}>15 visits/mo</Text>
              </View>

              {/* M6 */}
              <View style={{ alignItems: 'center', zIndex: 2 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'white' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>M6</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Stronger</Text>
                <Text style={{ fontSize: 9, color: '#9CA3AF' }}>15 visits/mo</Text>
              </View>
              
              {/* Dots */}
              <View style={{ alignItems: 'center', justifyContent: 'center', height: 32, zIndex: 2 }}>
                <Text style={{ fontSize: 14, color: '#9CA3AF', letterSpacing: 2 }}>•••</Text>
              </View>

              {/* M12 */}
              <View style={{ alignItems: 'center', zIndex: 2 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'white' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>M12</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>Identity</Text>
                <Text style={{ fontSize: 9, color: '#9CA3AF' }}>15 visits/mo</Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Recent Activity</Text>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#4C9A2A', marginRight: 2 }}>View activity</Text>
                <Ionicons name="chevron-forward" size={12} color="#4C9A2A" />
              </Pressable>
            </View>
            
            <View>
              {DATA.recentActivity.map((activity, index) => (
                <View key={activity.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: index !== DATA.recentActivity.length - 1 ? 16 : 0 }}>
                  <View style={{ width: 44, height: 50, borderRadius: 12, backgroundColor: '#F9FCF8', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#F0F5EE' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#4C9A2A' }}>{activity.date.split(' ')[0]}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#4C9A2A' }}>{activity.date.split(' ')[1]}</Text>
                  </View>
                  
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <MaterialCommunityIcons name="dumbbell" size={16} color="#4B5563" />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 }}>{activity.gym}</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>{activity.time} · {activity.type === 'Credit Visit' ? <Text style={{ color: '#F59E0B' }}>{activity.type}</Text> : activity.type}</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={20} color="#4C9A2A" style={{ marginRight: 8 }} />
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </View>
                </View>
              ))}
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
