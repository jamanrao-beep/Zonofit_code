import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { usePathname } from "expo-router";
import { useSyncExternalStore } from "react";
import { endTap, getTapWait, subscribeTapWait } from "@/lib/tapAck";

const GREEN = "#1F7A3E";

/**
 * Full-screen acknowledgement for a tap. It paints before the navigation
 * or request, and adds a patient line when that work is still running.
 */
export function TapWaitOverlay() {
  const wait = useSyncExternalStore(subscribeTapWait, getTapWait, getTapWait);
  const path = usePathname();
  const prevPath = useRef<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (prevPath.current == null) {
      prevPath.current = path;
      return;
    }
    if (prevPath.current !== path) {
      prevPath.current = path;
      if (getTapWait().hold === "route") endTap();
    }
  }, [path]);

  useEffect(() => {
    if (!wait.active) return;
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [wait.active, spin]);

  if (!wait.active) return null;

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.fill} pointerEvents="auto" accessibilityRole="progressbar" accessibilityLabel={wait.title}>
      <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
      <Text style={styles.title}>{wait.title}</Text>
      {wait.patient ? <Text style={styles.patient}>Thank you for being patient.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    zIndex: 100000,
    elevation: 100000,
    backgroundColor: "#F7FBF8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  ring: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: "#D7EBD9",
    borderTopColor: GREEN,
    marginBottom: 22,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#122018",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  patient: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 22,
    color: "#3E5346",
    textAlign: "center",
  },
});
