import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Canvas, Circle, LinearGradient, RadialGradient, Rect, vec } from "@shopify/react-native-skia";
import Animated, { Easing, FadeInDown } from "react-native-reanimated";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useGuestStore } from "@/store/useGuestStore";
import { ZonoNoticeMark } from "@/components/ZonoNoticeMark";

type LockCard = {
  id: string;
  title: string;
  body: string;
  when: string;
};

function formatWhen(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function clockParts(now: Date) {
  return {
    time: now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: false }),
    date: now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
  };
}

export default function LockPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const token = useAuthStore((state) => state.token);
  const isGuest = useGuestStore((state) => state.isGuest);
  const hoursRemaining = useGuestStore((state) => state.getHoursRemaining());
  const [now, setNow] = useState(() => new Date());
  const [cards, setCards] = useState<LockCard[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (isGuest || !token) {
        const guestCards: LockCard[] = isGuest
          ? [
              {
                id: "guest-welcome",
                title: "Welcome to Guest Mode",
                body: `You have ${hoursRemaining}h to explore partner gyms across the network.`,
                when: "now",
              },
              {
                id: "guest-credits",
                title: "How ZonoFit Credits Work",
                body: "1 Credit = ₹10 gym visit value. The wallet stays locked until you create an account.",
                when: "1h ago",
              },
            ]
          : [];
        if (!cancelled) setCards(guestCards);
        return;
      }

      try {
        const data = await apiFetch("/api/users/notifications", { token, silent: true });
        const list = Array.isArray(data?.notifications) ? data.notifications : [];
        const next: LockCard[] = list.slice(0, 3).map((item: { id: string; title?: string; body?: string; createdAt?: string }) => ({
          id: String(item.id),
          title: item.title || "ZonoFit",
          body: item.body || "",
          when: item.createdAt ? formatWhen(item.createdAt) : "",
        }));
        if (!cancelled) setCards(next);
      } catch {
        if (!cancelled) setCards([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token, isGuest, hoursRemaining]);

  const { time, date } = clockParts(now);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(width * 0.15, 0)}
            end={vec(width * 0.85, height)}
            colors={["#0C2416", "#14532B", "#08150D"]}
          />
        </Rect>
        <Circle cx={width * 0.2} cy={height * 0.1} r={220}>
          <RadialGradient
            c={vec(width * 0.2, height * 0.1)}
            r={220}
            colors={["rgba(141,190,42,0.50)", "rgba(141,190,42,0)"]}
          />
        </Circle>
        <Circle cx={width * 0.9} cy={height * 0.9} r={260}>
          <RadialGradient
            c={vec(width * 0.9, height * 0.9)}
            r={260}
            colors={["rgba(43,138,75,0.70)", "rgba(43,138,75,0)"]}
          />
        </Circle>
      </Canvas>

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.date}>{date}</Text>

        <View style={styles.stack}>
          {cards.length === 0 ? (
            <View style={styles.card}>
              <ZonoNoticeMark size={38} />
              <View style={styles.copy}>
                <View style={styles.meta}>
                  <Text style={styles.app}>ZONOFIT</Text>
                </View>
                <Text style={styles.title}>You're all caught up</Text>
                <Text style={styles.body}>New booking and credit notices will stack here.</Text>
              </View>
            </View>
          ) : (
            cards.map((card, index) => (
              <Animated.View
                key={card.id}
                entering={FadeInDown.delay(index * 120)
                  .duration(500)
                  .easing(Easing.bezier(0.2, 0.8, 0.2, 1))}
              >
                <View style={styles.card}>
                  <ZonoNoticeMark size={38} />
                  <View style={styles.copy}>
                    <View style={styles.meta}>
                      <Text style={styles.app}>ZONOFIT</Text>
                      <Text style={styles.when}>{card.when}</Text>
                    </View>
                    <Text style={styles.title}>{card.title}</Text>
                    <Text style={styles.body}>{card.body}</Text>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close lock screen preview"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.closeText}>Close preview</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0C2416",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  time: {
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 84,
    lineHeight: 88,
    fontWeight: "700",
    letterSpacing: -2,
  },
  date: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 30,
  },
  stack: {
    width: "100%",
    maxWidth: 420,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  copy: {
    flex: 1,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  app: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
  when: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 1,
  },
  body: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13.5,
    lineHeight: 18,
    marginTop: 2,
  },
  close: {
    marginTop: "auto",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 99,
    paddingVertical: 12,
    paddingHorizontal: 26,
  },
  closeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
