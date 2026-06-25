/**
 * SkiaProgressRing
 * 
 * A GPU-accelerated circular progress ring drawn with Skia.
 * Gives a premium 3D arc look with gradient stroke and glow.
 */
import React from "react";
import { View } from "react-native";
import {
  Canvas,
  Circle,
  Path,
  Skia,
  BlurMask,
  LinearGradient,
  vec,
  Paint,
} from "@shopify/react-native-skia";

interface SkiaProgressRingProps {
  size: number;
  progress: number; // 0–1
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function SkiaProgressRing({
  size,
  progress,
  strokeWidth = 10,
  color,
  trackColor = "rgba(0,0,0,0.08)",
  children,
}: SkiaProgressRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  // Build the arc path
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + 2 * Math.PI * Math.min(Math.max(progress, 0), 1);

  const arcPath = Skia.Path.Make();
  arcPath.addArc(
    { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
    -90,
    360 * Math.min(Math.max(progress, 0), 1)
  );

  const trackPath = Skia.Path.Make();
  trackPath.addArc(
    { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
    0,
    360
  );

  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      <Canvas style={{ width: size, height: size, position: "absolute" }}>
        {/* Track ring */}
        <Path
          path={trackPath}
          color={trackColor}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
        />

        {/* Glow layer */}
        <Path
          path={arcPath}
          color={color}
          style="stroke"
          strokeWidth={strokeWidth + 6}
          strokeCap="round"
          opacity={0.3}
        >
          <BlurMask blur={8} style="normal" />
        </Path>

        {/* Progress arc */}
        <Path
          path={arcPath}
          color={color}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
        />

        {/* Dot at end */}
        {progress > 0 && (
          <Circle
            cx={cx + r * Math.cos(endAngle)}
            cy={cy + r * Math.sin(endAngle)}
            r={strokeWidth / 2}
            color={color}
          />
        )}
      </Canvas>

      {/* Center content */}
      {children && (
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}
