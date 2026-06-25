/**
 * SkiaGlowBadge
 * 
 * A 3D-looking badge/orb drawn with Skia.
 * Uses a radial gradient + highlight spot to fake a convincing 3D sphere.
 * Perfect for streak dots, milestone badges, stat icons.
 */
import React from "react";
import {
  Canvas,
  Circle,
  RadialGradient,
  vec,
} from "@shopify/react-native-skia";

interface SkiaGlowBadgeProps {
  size: number;
  color: string;
  /** Lighter shade for the highlight. Defaults to white-tinted color */
  highlightColor?: string;
  /** Dark shade for the deep shadow. Defaults to dark-tinted color */
  shadowColor?: string;
}

function lightenHex(hex: string): string {
  // Simple: mix with white for highlight
  return hex; // passthrough; we handle with gradient stops
}

export function SkiaGlowBadge({
  size,
  color,
  highlightColor = "#ffffff",
  shadowColor,
}: SkiaGlowBadgeProps) {
  const r = size / 2;
  const cx = r;
  const cy = r;

  // Highlight offset — top-left quadrant
  const hx = cx - r * 0.3;
  const hy = cy - r * 0.3;
  const hR = r * 0.55;

  const dark = shadowColor ?? color;

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Outer glow */}
      <Circle cx={cx} cy={cy} r={r * 0.95}>
        <RadialGradient
          c={vec(cx, cy)}
          r={r * 0.95}
          colors={[color, "transparent"]}
          positions={[0.7, 1]}
        />
      </Circle>

      {/* Main sphere body */}
      <Circle cx={cx} cy={cy} r={r * 0.78}>
        <RadialGradient
          c={vec(cx + r * 0.05, cy + r * 0.05)}
          r={r * 0.85}
          colors={[color, dark, "#000000"]}
          positions={[0, 0.6, 1]}
        />
      </Circle>

      {/* Highlight spot — top-left */}
      <Circle cx={hx} cy={hy} r={hR}>
        <RadialGradient
          c={vec(hx, hy)}
          r={hR}
          colors={[highlightColor, "transparent"]}
          positions={[0, 1]}
        />
      </Circle>
    </Canvas>
  );
}
