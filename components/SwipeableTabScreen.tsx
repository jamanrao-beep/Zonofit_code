import React, { useRef, useEffect } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useNavigation, useRouter } from "expo-router";
import { colors } from "@/constants/colors";

export type TabKey = "index" | "explore" | "credits" | "profile";

const TAB_ORDER: TabKey[] = ["index", "explore", "credits", "profile"];

const ROUTE_MAP: Record<TabKey, string> = {
  index: "/(tabs)",
  explore: "/(tabs)/explore",
  credits: "/(tabs)/credits",
  profile: "/(tabs)/profile",
};

interface Props {
  currentTab: TabKey;
  children: React.ReactNode;
}

export function SwipeableTabScreen({ currentTab, children }: Props) {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;
  const isNavigating = useRef(false);

  // Reset offset whenever tab changes
  useEffect(() => {
    isNavigating.current = false;
    translateX.setValue(0);
  }, [currentTab]);

  const currentIndex = TAB_ORDER.indexOf(currentTab);

  const navigateTo = (targetTab: TabKey) => {
    try {
      if (navigation && typeof navigation.navigate === "function") {
        navigation.navigate(targetTab);
      } else {
        router.replace(ROUTE_MAP[targetTab] as any);
      }
    } catch {
      router.replace(ROUTE_MAP[targetTab] as any);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,

      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isNavigating.current) return false;
        const dx = Math.abs(gestureState.dx);
        const dy = Math.abs(gestureState.dy);
        return dx > 20 && dx > dy * 1.6;
      },

      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        if (isNavigating.current) return false;
        const dx = Math.abs(gestureState.dx);
        const dy = Math.abs(gestureState.dy);
        // Only capture horizontal swipes so vertical ScrollViews work uninterrupted
        return dx > 20 && dx > dy * 1.6;
      },

      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },

      onPanResponderMove: (evt, gestureState) => {
        if (isNavigating.current) return;
        const dx = gestureState.dx;
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < TAB_ORDER.length - 1;

        if (dx > 0 && !hasPrev) {
          // Dragging right, but on first tab (Home) -> rubber-band resistance
          translateX.setValue(dx * 0.2);
        } else if (dx < 0 && !hasNext) {
          // Dragging left, but on last tab (Profile) -> rubber-band resistance
          translateX.setValue(dx * 0.2);
        } else {
          translateX.setValue(dx);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (isNavigating.current) return;

        const dx = gestureState.dx;
        const vx = gestureState.vx;
        const screenWidth = Dimensions.get("window").width;
        const SWIPE_THRESHOLD = 50;
        const VELOCITY_THRESHOLD = 0.35;

        const swipedLeft =
          dx < -SWIPE_THRESHOLD || (dx < -20 && vx < -VELOCITY_THRESHOLD);
        const swipedRight =
          dx > SWIPE_THRESHOLD || (dx > 20 && vx > VELOCITY_THRESHOLD);

        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < TAB_ORDER.length - 1;

        if (swipedLeft && hasNext) {
          isNavigating.current = true;
          const nextTab = TAB_ORDER[currentIndex + 1];
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}

          Animated.timing(translateX, {
            toValue: -screenWidth * 0.35,
            duration: 120,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            navigateTo(nextTab);
            setTimeout(() => {
              isNavigating.current = false;
            }, 100);
          });
        } else if (swipedRight && hasPrev) {
          isNavigating.current = true;
          const prevTab = TAB_ORDER[currentIndex - 1];
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}

          Animated.timing(translateX, {
            toValue: screenWidth * 0.35,
            duration: 120,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            navigateTo(prevTab);
            setTimeout(() => {
              isNavigating.current = false;
            }, 100);
          });
        } else {
          // Snap back if threshold not reached
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
            speed: 16,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[styles.animatedContainer, { transform: [{ translateX }] }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  animatedContainer: {
    flex: 1,
  },
});
