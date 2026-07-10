import React from 'react';
import { Pressable, ViewStyle, StyleProp, LayoutChangeEvent } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  scaleDown?: number;
  className?: string;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Animated3DCard({ children, style, onPress, scaleDown = 0.95, className, disabled }: Props) {
  const isPressed = useSharedValue(false);
  const x = useSharedValue(0.5); // 0 to 1 normalized
  const y = useSharedValue(0.5); // 0 to 1 normalized

  const width = useSharedValue(0);
  const height = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    // Scale animation
    const scale = withSpring(isPressed.value ? scaleDown : 1, {
      mass: 0.5,
      damping: 12,
      stiffness: 150
    });

    // Subtle 3D tilt
    const maxRotate = 4; // degrees
    const rotateX = withSpring(isPressed.value ? interpolate(y.value, [0, 1], [maxRotate, -maxRotate], Extrapolation.CLAMP) : 0, { mass: 0.5, damping: 12 });
    const rotateY = withSpring(isPressed.value ? interpolate(x.value, [0, 1], [-maxRotate, maxRotate], Extrapolation.CLAMP) : 0, { mass: 0.5, damping: 12 });

    return {
      transform: [
        { perspective: 800 },
        { scale },
        { rotateX: `${rotateX}deg` },
        { rotateY: `${rotateY}deg` }
      ]
    };
  });

  return (
    <AnimatedPressable
      disabled={disabled}
      onLayout={(e: LayoutChangeEvent) => {
        width.value = e.nativeEvent.layout.width;
        height.value = e.nativeEvent.layout.height;
      }}
      onPressIn={(e) => {
        isPressed.value = true;
        if (width.value > 0 && height.value > 0) {
          x.value = e.nativeEvent.locationX / width.value;
          y.value = e.nativeEvent.locationY / height.value;
        }
      }}
      onPressOut={() => {
        isPressed.value = false;
      }}
      onPress={onPress}
      style={[style, animatedStyle]}
      className={className}
    >
      {children}
    </AnimatedPressable>
  );
}
