import React, { useEffect, useState, useRef } from "react";
import { View, Text, Modal, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";

interface SignOutConfirmModalProps {
  visible: boolean;
  isGuest?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SignOutConfirmModal({
  visible,
  isGuest = false,
  loading = false,
  onConfirm,
  onCancel,
}: SignOutConfirmModalProps) {
  const [modalRendered, setModalRendered] = useState(visible);
  const isClosingRef = useRef(false);

  // Smooth entrance & exit values (replaces abrupt SlideInDown)
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const cardTranslateY = useSharedValue(16);
  const cardOpacity = useSharedValue(0);

  // Icon micro-interactions
  const iconScale = useSharedValue(0.85);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.35);
  const rotateVal = useSharedValue(0);

  const performClose = (cb?: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // Graceful, polished exit animation (200-220ms)
    backdropOpacity.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.quad),
    });
    cardOpacity.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
    cardScale.value = withTiming(0.94, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    });
    cardTranslateY.value = withTiming(
      10,
      {
        duration: 200,
        easing: Easing.out(Easing.quad),
      },
      (finished) => {
        if (finished) {
          runOnJS(finalizeClose)(cb);
        }
      }
    );
  };

  const finalizeClose = (cb?: () => void) => {
    isClosingRef.current = false;
    setModalRendered(false);
    if (cb) cb();
  };

  const handleDismiss = () => {
    if (loading) return;
    performClose(onCancel);
  };

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setModalRendered(true);

      // Starting positions
      backdropOpacity.value = 0;
      cardOpacity.value = 0;
      cardScale.value = 0.92;
      cardTranslateY.value = 16;
      iconScale.value = 0.85;

      // 1. Gentle backdrop fade-in
      backdropOpacity.value = withTiming(1, {
        duration: 320,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });

      // 2. Card opacity and refined spring scale + float (luxurious, calm pace)
      cardOpacity.value = withTiming(1, {
        duration: 280,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });

      cardScale.value = withSpring(1, {
        damping: 18,
        stiffness: 140,
        mass: 0.8,
      });

      cardTranslateY.value = withSpring(0, {
        damping: 18,
        stiffness: 140,
        mass: 0.8,
      });

      // 3. Staggered icon badge micro-spring
      iconScale.value = withDelay(
        70,
        withSpring(1, {
          damping: 14,
          stiffness: 160,
        })
      );

      // 4. Calm ambient breathing glow (2.6s cycle)
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 2400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // 5. Very subtle, calm ambient rotation for dashed ring (16s cycle)
      rotateVal.value = withRepeat(
        withTiming(360, { duration: 16000, easing: Easing.linear }),
        -1,
        false
      );
    } else if (modalRendered && !isClosingRef.current) {
      performClose();
    }
  }, [visible]);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
  }));

  const animatedIconBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: glowOpacity.value,
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateVal.value}deg` }],
  }));

  if (!modalRendered) return null;

  return (
    <Modal
      visible={modalRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Modal Card */}
        <Animated.View style={[styles.card, animatedCardStyle]}>
          {/* Animated Glowing Icon Container */}
          <View style={styles.iconWrapper}>
            {/* Moving Glow Ring */}
            <Animated.View
              style={[
                styles.glowRing,
                isGuest ? styles.guestGlowRing : styles.signOutGlowRing,
                animatedGlowStyle,
              ]}
            />
            {/* Subtle Rotating Decorative Border Ring */}
            <Animated.View
              style={[
                styles.rotatingRing,
                isGuest ? styles.guestRotatingRing : styles.signOutRotatingRing,
                animatedRingStyle,
              ]}
            />
            {/* Center Icon Badge */}
            <Animated.View
              style={[
                styles.centerBadge,
                isGuest ? styles.guestBadge : styles.signOutBadge,
                animatedIconBadgeStyle,
              ]}
            >
              <Ionicons
                name={isGuest ? "compass-outline" : "log-out-outline"}
                size={28}
                color={isGuest ? "#059669" : "#EF4444"}
              />
            </Animated.View>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>
            {isGuest ? "Exit Guest Mode?" : "Sign Out of ZonoFit?"}
          </Text>
          <Text style={styles.subtitle}>
            {isGuest
              ? "Your temporary exploration session will end. You can create a permanent account or explore again anytime."
              : "You'll need to sign back in with your credentials to access your membership pass, wallet credits, and booking history."}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleDismiss}
              disabled={loading}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.cancelText}>
                {isGuest ? "Keep Exploring" : "Stay Signed In"}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.confirmButton,
                isGuest ? styles.guestConfirmButton : styles.signOutConfirmButton,
                (pressed || loading) && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmText}>Signing out...</Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name={isGuest ? "exit-outline" : "power-outline"}
                    size={16}
                    color="white"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.confirmText}>
                    {isGuest ? "Exit Mode" : "Yes, Sign Out"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  signOutGlowRing: {
    backgroundColor: "rgba(239, 68, 68, 0.25)",
  },
  guestGlowRing: {
    backgroundColor: "rgba(5, 150, 105, 0.25)",
  },
  rotatingRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  signOutRotatingRing: {
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  guestRotatingRing: {
    borderColor: "rgba(5, 150, 105, 0.5)",
  },
  centerBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutBadge: {
    backgroundColor: "#FEE2E2",
  },
  guestBadge: {
    backgroundColor: "#D1FAE5",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    height: 48,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  signOutConfirmButton: {
    backgroundColor: "#EF4444",
  },
  guestConfirmButton: {
    backgroundColor: "#059669",
  },
  confirmText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
