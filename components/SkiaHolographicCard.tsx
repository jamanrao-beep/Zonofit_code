/**
 * SkiaHolographicCard
 * 
 * A premium 3D holographic card effect.
 * Combines:
 *   - Reanimated perspective tilt (rotateX/Y from touch position)
 *   - Skia shimmer gradient that moves with tilt direction
 *   - Spring-back when released
 * 
 * Usage:
 *   <SkiaHolographicCard style={styles.heroCard}>
 *     <YourCardContent />
 *   </SkiaHolographicCard>
 */
import React, { useCallback, useRef } from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

const SPRING_CONFIG = { damping: 18, stiffness: 220, mass: 0.6 };
const MAX_TILT = 12;
const PERSPECTIVE = 900;

interface SkiaHolographicCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Color of the shimmer gradient, defaults to white */
  shimmerColor?: string;
  width: number;
  height: number;
}

export function SkiaHolographicCard({
  children,
  style,
  shimmerColor = "rgba(255,255,255,0.22)",
  width,
  height,
}: SkiaHolographicCardProps) {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Normalized touch position for shimmer (0–1)
  const shimmerX = useSharedValue(0.5);
  const shimmerY = useSharedValue(0.3);

  const pan = Gesture.Pan()
    .onBegin((e) => {
      "worklet";
      scale.value = withSpring(0.975, SPRING_CONFIG);
      const nx = e.x / width;
      const ny = e.y / height;
      shimmerX.value = nx;
      shimmerY.value = ny;
      rotateY.value = withSpring((nx - 0.5) * 2 * MAX_TILT, SPRING_CONFIG);
      rotateX.value = withSpring(-(ny - 0.5) * 2 * MAX_TILT, SPRING_CONFIG);
    })
    .onChange((e) => {
      "worklet";
      const nx = e.x / width;
      const ny = e.y / height;
      shimmerX.value = nx;
      shimmerY.value = ny;
      rotateY.value = (nx - 0.5) * 2 * MAX_TILT;
      rotateX.value = -(ny - 0.5) * 2 * MAX_TILT;
    })
    .onEnd(() => {
      "worklet";
      rotateX.value = withSpring(0, SPRING_CONFIG);
      rotateY.value = withSpring(0, SPRING_CONFIG);
      scale.value = withSpring(1, SPRING_CONFIG);
      shimmerX.value = withSpring(0.5, SPRING_CONFIG);
      shimmerY.value = withSpring(0.3, SPRING_CONFIG);
    })
    .onFinalize(() => {
      "worklet";
      rotateX.value = withSpring(0, SPRING_CONFIG);
      rotateY.value = withSpring(0, SPRING_CONFIG);
      scale.value = withSpring(1, SPRING_CONFIG);
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[style, animStyle]}>
        {children}

        {/* Skia shimmer overlay — absolutely positioned over card content */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: "hidden" }]} pointerEvents="none">
          <Canvas style={{ width, height }}>
            <Rect x={0} y={0} width={width} height={height}>
              <LinearGradient
                start={vec(shimmerX.value * width - width * 0.4, shimmerY.value * height - height * 0.4)}
                end={vec(shimmerX.value * width + width * 0.6, shimmerY.value * height + height * 0.6)}
                colors={["transparent", shimmerColor, "transparent"]}
                positions={[0, 0.5, 1]}
              />
            </Rect>
          </Canvas>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
