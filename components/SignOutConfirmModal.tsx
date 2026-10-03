import React, { useEffect } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";

interface SignOutConfirmModalProps {
  visible: boolean;
  isGuest?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SignOutConfirmModal({
  visible,
  isGuest = false,
  onConfirm,
  onCancel,
}: SignOutConfirmModalProps) {
  // Moving color pulse / breathing animation
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);
  const rotateVal = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      rotateVal.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      pulseScale.value = 1;
      glowOpacity.value = 0.4;
      rotateVal.value = 0;
    }
  }, [visible]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: glowOpacity.value,
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateVal.value}deg` }],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={styles.backdrop} onPress={onCancel} />
        </Animated.View>

        {/* Modal Card */}
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          style={styles.card}
        >
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
            {/* Rotating Decorative Border Ring */}
            <Animated.View
              style={[
                styles.rotatingRing,
                isGuest ? styles.guestRotatingRing : styles.signOutRotatingRing,
                animatedRingStyle,
              ]}
            />
            {/* Center Icon Badge */}
            <View
              style={[
                styles.centerBadge,
                isGuest ? styles.guestBadge : styles.signOutBadge,
              ]}
            >
              <Ionicons
                name={isGuest ? "compass-outline" : "log-out-outline"}
                size={28}
                color={isGuest ? "#059669" : "#EF4444"}
              />
            </View>
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
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.cancelText}>
                {isGuest ? "Keep Exploring" : "Stay Signed In"}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmButton,
                isGuest ? styles.guestConfirmButton : styles.signOutConfirmButton,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons
                name={isGuest ? "exit-outline" : "power-outline"}
                size={16}
                color="white"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.confirmText}>
                {isGuest ? "Exit Mode" : "Yes, Sign Out"}
              </Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    flex: 1,
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
