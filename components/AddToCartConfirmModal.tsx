import React, { useEffect } from "react";
import { View, Text, Modal, Pressable, Image, StyleSheet } from "react-native";
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
  SlideInUp,
} from "react-native-reanimated";

export interface AddedItemDetails {
  id: string;
  name: string;
  brand?: string;
  price: number;
  image?: string;
  variant?: string;
}

interface AddToCartConfirmModalProps {
  visible: boolean;
  item: AddedItemDetails | null;
  onViewCart: () => void;
  onContinueShopping: () => void;
}

export default function AddToCartConfirmModal({
  visible,
  item,
  onViewCart,
  onContinueShopping,
}: AddToCartConfirmModalProps) {
  // Moving color pulse / glow animation
  const scaleGlow = useSharedValue(1);
  const opacityGlow = useSharedValue(0.4);
  const spinVal = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scaleGlow.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacityGlow.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      spinVal.value = withRepeat(
        withTiming(360, { duration: 6000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      scaleGlow.value = 1;
      opacityGlow.value = 0.4;
      spinVal.value = 0;
    }
  }, [visible]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleGlow.value }],
    opacity: opacityGlow.value,
  }));

  const animatedSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinVal.value}deg` }],
  }));

  if (!visible || !item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onContinueShopping}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={styles.backdrop} onPress={onContinueShopping} />
        </Animated.View>

        <Animated.View
          entering={SlideInUp.springify().damping(18)}
          style={styles.card}
        >
          {/* Top Badge: Moving Color Ring + Checkmark */}
          <View style={styles.iconContainer}>
            <Animated.View style={[styles.glowRing, animatedGlowStyle]} />
            <Animated.View style={[styles.dashedRing, animatedSpinStyle]} />
            <View style={styles.centerCheck}>
              <Ionicons name="checkmark" size={26} color="#FFFFFF" />
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Added to Bag!</Text>
          <Text style={styles.subheading}>Great choice for your fitness routine</Text>

          {/* Product Mini Preview Box */}
          <View style={styles.previewBox}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.previewImage} resizeMode="contain" />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Ionicons name="bag-handle-outline" size={22} color="#1F7A3E" />
              </View>
            )}
            <View style={styles.previewInfo}>
              {item.brand && <Text style={styles.previewBrand}>{item.brand}</Text>}
              <Text style={styles.previewName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.variant && <Text style={styles.previewVariant}>{item.variant}</Text>}
              <Text style={styles.previewPrice}>₹{item.price.toLocaleString()}</Text>
            </View>
          </View>

          {/* Action CTAs */}
          <View style={styles.actionButtons}>
            <Pressable
              onPress={onViewCart}
              style={({ pressed }) => [
                styles.viewCartButton,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="cart" size={17} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.viewCartText}>View Bag & Checkout</Text>
            </Pressable>

            <Pressable
              onPress={onContinueShopping}
              style={({ pressed }) => [
                styles.continueButton,
                pressed && { backgroundColor: "#F3F4F6" },
              ]}
            >
              <Text style={styles.continueText}>Continue Shopping</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    flex: 1,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(31, 122, 62, 0.25)",
  },
  dashedRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(31, 122, 62, 0.55)",
    borderStyle: "dashed",
  },
  centerCheck: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1F7A3E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 18,
  },
  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 20,
  },
  previewImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    marginRight: 12,
  },
  previewPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewBrand: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  previewName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  previewVariant: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 3,
  },
  previewPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F7A3E",
  },
  actionButtons: {
    width: "100%",
    gap: 10,
  },
  viewCartButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#1F7A3E",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1F7A3E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  viewCartText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  continueButton: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  continueText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
  },
});
