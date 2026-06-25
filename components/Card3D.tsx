/**
 * Card3D
 * 
 * A wrapper that adds realistic 3D perspective tilt to any card on press.
 * Uses Reanimated worklets — no Skia dependency so it works everywhere.
 * 
 * Usage:
 *   <Card3D style={styles.card}>
 *     <YourCardContent />
 *   </Card3D>
 */
import React, { useCallback } from "react";
import { ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

const SPRING = { damping: 15, stiffness: 200, mass: 0.5 };
const MAX_TILT = 14; // degrees
const PERSPECTIVE = 800;

interface Card3DProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How strong the tilt is. 0–1, default 1 */
  intensity?: number;
  /** Press-in scale. Default 0.97 */
  pressScale?: number;
}

export function Card3D({
  children,
  style,
  intensity = 1,
  pressScale = 0.97,
}: Card3DProps) {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Layout is measured once on first gesture
  const cardWidth = useSharedValue(0);
  const cardHeight = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin((e) => {
      "worklet";
      scale.value = withSpring(pressScale, SPRING);
      // Compute tilt from touch position relative to card center
      const cx = cardWidth.value / 2;
      const cy = cardHeight.value / 2;
      const dx = (e.x - cx) / cx; // -1 to +1
      const dy = (e.y - cy) / cy;
      rotateY.value = withSpring(dx * MAX_TILT * intensity, SPRING);
      rotateX.value = withSpring(-dy * MAX_TILT * intensity, SPRING);
    })
    .onChange((e) => {
      "worklet";
      const cx = cardWidth.value / 2;
      const cy = cardHeight.value / 2;
      const dx = (e.x - cx) / cx;
      const dy = (e.y - cy) / cy;
      rotateY.value = dx * MAX_TILT * intensity;
      rotateX.value = -dy * MAX_TILT * intensity;
    })
    .onEnd(() => {
      "worklet";
      rotateX.value = withSpring(0, SPRING);
      rotateY.value = withSpring(0, SPRING);
      scale.value = withSpring(1, SPRING);
    })
    .onFinalize(() => {
      "worklet";
      rotateX.value = withSpring(0, SPRING);
      rotateY.value = withSpring(0, SPRING);
      scale.value = withSpring(1, SPRING);
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scale.value },
    ],
  }));

  const onLayout = useCallback(
    (e: any) => {
      cardWidth.value = e.nativeEvent.layout.width;
      cardHeight.value = e.nativeEvent.layout.height;
    },
    [cardWidth, cardHeight]
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[style, animStyle]} onLayout={onLayout}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
