import React from 'react';
import { Pressable, ViewStyle, StyleProp, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
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

export function Animated3DCard({ children, style, onPress, scaleDown = 0.96, className, disabled }: Props) {
  const isPressed = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(isPressed.value ? scaleDown : 1, {
      mass: 0.4,
      damping: 14,
      stiffness: 180,
    });

    return {
      transform: [{ scale }],
    };
  });

  // If no onPress is provided or card is disabled, render as non-interactive View to avoid hijacking inner touches
  if (!onPress || disabled) {
    return (
      <View style={style} className={className}>
        {children}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPressIn={() => {
        isPressed.value = true;
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

