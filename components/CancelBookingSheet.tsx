import React from "react";
import { View, Text, Modal, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn, SlideInDown } from "react-native-reanimated";

interface CancelBookingSheetProps {
  visible: boolean;
  loading?: boolean;
  isMandatory: boolean;
  refundCredits: number;
  onKeep: () => void;
  onConfirm: () => void;
}

export default function CancelBookingSheet({
  visible,
  loading = false,
  isMandatory,
  refundCredits,
  onKeep,
  onConfirm,
}: CancelBookingSheetProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const message = isMandatory
    ? "A flat 2 credits will be charged from your wallet. Your visit will be returned to your plan."
    : `A flat 2 credits will be charged. ${refundCredits} credits will come back to your wallet.`;

  const dismiss = () => {
    if (!loading) onKeep();
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(280)} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={dismiss} />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.duration(400).easing(Easing.bezier(0.2, 0.8, 0.2, 1))}
          style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}
        >
          <View style={styles.grab} />
          <Text style={styles.title}>Cancel this booking?</Text>
          <Text style={styles.body}>{message}</Text>

          <Pressable
            onPress={onConfirm}
            disabled={loading}
            style={({ pressed }) => [styles.cancelBtn, (pressed || loading) && styles.pressed]}
          >
            {loading ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.cancelText}>Yes, cancel booking</Text>
            )}
          </Pressable>

          <Pressable
            onPress={dismiss}
            disabled={loading}
            style={({ pressed }) => [styles.keepBtn, pressed && !loading && styles.pressed]}
          >
            <Text style={styles.keepText}>Keep booking</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,16,11,0.5)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 16,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    marginBottom: 18,
  },
  cancelBtn: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },
  keepBtn: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  keepText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
