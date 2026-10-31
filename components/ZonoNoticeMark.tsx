import { View, Text, StyleSheet } from "react-native";
import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";

/** Green ZonoFit mark used on the in-app banner and the painted lock cards. */
export function ZonoNoticeMark({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: Math.round(size * 0.28) }]}>
      <Canvas style={{ width: size, height: size }} pointerEvents="none">
        <Rect x={0} y={0} width={size} height={size}>
          <LinearGradient start={vec(0, 0)} end={vec(0, size)} colors={["#92BB2B", "#3F8230"]} />
        </Rect>
      </Canvas>
      <View style={styles.letter} pointerEvents="none">
        <Text style={[styles.z, { fontSize: Math.round(size * 0.42) }]}>Z</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: "hidden",
  },
  letter: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  z: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
