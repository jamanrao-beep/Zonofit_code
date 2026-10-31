import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useInAppNoticeStore, type InAppNotice } from "@/store/useInAppNoticeStore";
import { ZonoNoticeMark } from "@/components/ZonoNoticeMark";

const HIDDEN_Y = -240;

/**
 * Frosted card that drops from the top while ZonoFit is open.
 * `overlay` is the copy drawn above a full-screen sheet. The root copy
 * stays mounted but invisible so it is already in place when the sheet closes.
 */
export function InAppNoticeBanner({
  overlay = false,
  onOpen,
}: {
  overlay?: boolean;
  onOpen?: () => void;
}) {
  const notice = useInAppNoticeStore((state) => state.notice);
  const cover = useInAppNoticeStore((state) => state.cover);
  const dismiss = useInAppNoticeStore((state) => state.dismiss);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<InAppNotice | null>(notice);
  const y = useSharedValue(HIDDEN_Y);
  const generation = useRef(0);
  const clearIfCurrent = useCallback((gen: number) => {
    if (gen === generation.current) setShown(null);
  }, []);

  useEffect(() => {
    const gen = ++generation.current;
    if (notice) {
      setShown(notice);
      y.value = HIDDEN_Y;
      y.value = withTiming(0, {
        duration: 500,
        easing: Easing.bezier(0.2, 0.9, 0.3, 1.1),
      });
      return;
    }
    y.value = withTiming(HIDDEN_Y, { duration: 280, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(clearIfCurrent)(gen);
    });
  }, [notice, y, clearIfCurrent]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  if (!shown) return null;

  const hiddenUnderSheet = !overlay && cover > 0;

  const openNotifications = () => {
    dismiss();
    onOpen?.();
    router.push("/notifications" as never);
  };

  return (
    <View
      pointerEvents={hiddenUnderSheet ? "none" : "box-none"}
      style={[
        styles.host,
        { top: insets.top + 10, opacity: hiddenUnderSheet ? 0 : 1 },
      ]}
    >
      <Animated.View style={[styles.wrap, animatedStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${shown.title}. Opens notifications.`}
          onPress={openNotifications}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <ZonoNoticeMark />
          <View style={styles.copy}>
            <View style={styles.meta}>
              <Text style={styles.app}>ZONOFIT</Text>
              <Text style={styles.now}>now</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {shown.title}
            </Text>
            <Text style={styles.body} numberOfLines={3}>
              {shown.body}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 80,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  wrap: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(245,247,245,0.96)",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.28,
        shadowRadius: 22,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  pressed: {
    opacity: 0.92,
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
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: "#6B778C",
  },
  now: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B778C",
  },
  title: {
    marginTop: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: "#0F1B2E",
  },
  body: {
    marginTop: 2,
    fontSize: 13.5,
    lineHeight: 18,
    color: "#3d4f43",
  },
});
