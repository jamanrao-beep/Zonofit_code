import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { apiFetch } from "@/lib/api";

type NotificationCategory = "All" | "Visits" | "Credits" | "Membership" | "Account";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  category?: NotificationCategory;
  ctaText?: string;
  ctaRoute?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const { isGuest, getHoursRemaining } = useGuestStore();

  const [activeTab, setActiveTab] = useState<NotificationCategory>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = async () => {
    if (isGuest) {
      // Guest mode notifications
      const guestNotifs: NotificationItem[] = [
        {
          id: "guest-welcome",
          title: "Welcome to Guest Mode",
          body: `You have ${getHoursRemaining()}h to explore partner gyms across the network. Choose your primary gym to unlock bookings.`,
          type: "INFO",
          isRead: false,
          createdAt: new Date().toISOString(),
          category: "Account",
          ctaText: "Explore Gyms",
          ctaRoute: "/(tabs)/explore",
        },
        {
          id: "guest-how-it-works",
          title: "How ZonoFit Credits Work",
          body: "1 Credit = ₹10 gym visit value. Buy one membership and gain access to 100+ partner gyms without locking in.",
          type: "INFO",
          isRead: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          category: "Credits",
          ctaText: "Learn More",
          ctaRoute: "/(tabs)/explore",
        },
      ];
      setNotifications(guestNotifs);
      setLoading(false);
      return;
    }

    try {
      if (!token) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      const data = await apiFetch("/api/users/notifications", { token });
      if (data.success && Array.isArray(data.notifications)) {
        // Map backend notifications to include categorisation and CTA if needed
        const mapped: NotificationItem[] = data.notifications.map((n: any) => {
          let cat: NotificationCategory = "Account";
          let ctaText: string | undefined;
          let ctaRoute: string | undefined;

          const titleLower = (n.title || "").toLowerCase();
          const bodyLower = (n.body || "").toLowerCase();

          if (titleLower.includes("visit") || titleLower.includes("booking") || titleLower.includes("check-in") || titleLower.includes("qr")) {
            cat = "Visits";
            ctaText = "View Booking";
            ctaRoute = "/booking-history";
          } else if (titleLower.includes("credit") || bodyLower.includes("credit") || titleLower.includes("wallet") || bodyLower.includes("wallet")) {
            cat = "Credits";
            ctaText = "View Wallet";
            ctaRoute = "/(tabs)/credits";
          } else if (titleLower.includes("membership") || bodyLower.includes("membership") || titleLower.includes("cycle")) {
            cat = "Membership";
            ctaText = "View Membership";
            ctaRoute = "/(tabs)/credits";
          }

          return {
            ...n,
            category: cat,
            ctaText,
            ctaRoute,
          };
        });
        setNotifications(mapped);
      }
    } catch (err) {
      console.warn("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token, isGuest]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    if (isGuest) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      return;
    }

    try {
      if (token) {
        await apiFetch("/api/users/notifications/read", { method: "POST", token });
      }
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err: any) {
      Alert.alert("Error", "Could not mark notifications as read.");
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // Mark this notification as read locally
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));

    if (item.ctaRoute) {
      router.push(item.ctaRoute as any);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "All") return true;
    return n.category === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getCategoryIcon = (cat?: NotificationCategory) => {
    switch (cat) {
      case "Visits":
        return { name: "fitness-outline" as const, color: "#059669", bg: "bg-emerald-50" };
      case "Credits":
        return { name: "wallet-outline" as const, color: "#2563EB", bg: "bg-blue-50" };
      case "Membership":
        return { name: "ribbon-outline" as const, color: "#7C3AED", bg: "bg-purple-50" };
      default:
        return { name: "notifications-outline" as const, color: "#D97706", bg: "bg-amber-50" };
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAF8" }} edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-gray-100 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center border border-gray-200"
          >
            <Ionicons name="arrow-back" size={18} color="#1F2520" />
          </Pressable>
          <View>
            <Text className="text-xl font-extrabold text-[#111827]">Notifications</Text>
            {unreadCount > 0 && (
              <Text className="text-xs text-emerald-600 font-semibold">{unreadCount} unread</Text>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAllAsRead}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 active:bg-emerald-100 border border-emerald-200"
          >
            <Text className="text-xs font-bold text-emerald-700">Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Categories Tabs (Section 16 of PRD) */}
      <View className="bg-white px-5 py-2.5 border-b border-gray-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {(["All", "Visits", "Credits", "Membership", "Account"] as NotificationCategory[]).map(tab => {
            const isSelected = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  isSelected ? "bg-emerald-600 shadow-sm" : "bg-gray-100"
                }`}
              >
                <Text className={`text-xs font-bold ${isSelected ? "text-white" : "text-[#4B5563]"}`}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#059669"]} />}
      >
        {loading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color="#059669" />
            <Text className="text-xs text-gray-400 mt-3">Loading notifications...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View className="items-center justify-center py-20 px-8">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Ionicons name="notifications-off-outline" size={30} color="#9CA3AF" />
            </View>
            <Text className="text-base font-bold text-gray-800 text-center">No notifications in {activeTab}</Text>
            <Text className="text-xs text-gray-500 text-center mt-1">
              {activeTab === "All"
                ? "You're all caught up! New updates regarding your visits and credits will appear here."
                : `No notifications under ${activeTab.toLowerCase()} right now.`}
            </Text>
          </View>
        ) : (
          filteredNotifications.map(item => {
            const iconConfig = getCategoryIcon(item.category);
            return (
              <Pressable
                key={item.id}
                onPress={() => handleNotificationPress(item)}
                className={`mb-3 p-4 rounded-2xl border transition-all ${
                  item.isRead
                    ? "bg-white border-gray-100"
                    : "bg-emerald-50/30 border-emerald-200 shadow-xs"
                }`}
              >
                <View className="flex-row items-start">
                  <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${iconConfig.bg}`}>
                    <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className={`text-sm ${item.isRead ? "font-semibold text-gray-800" : "font-extrabold text-gray-900"}`}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!item.isRead && (
                        <View className="w-2 h-2 rounded-full bg-emerald-500 ml-2" />
                      )}
                    </View>

                    <Text className="text-xs text-gray-600 leading-relaxed mb-2">
                      {item.body}
                    </Text>

                    <View className="flex-row items-center justify-between mt-1 pt-2 border-t border-gray-50">
                      <Text className="text-[10px] text-gray-400 font-medium">
                        {formatTimestamp(item.createdAt)}
                      </Text>

                      {item.ctaText && (
                        <View className="flex-row items-center">
                          <Text className="text-xs font-bold text-emerald-600 mr-1">{item.ctaText}</Text>
                          <Ionicons name="chevron-forward" size={12} color="#059669" />
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
