import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/colors";

export type TabKey = "index" | "explore" | "credits" | "profile";

interface Props {
  currentTab?: TabKey;
  children: React.ReactNode;
}

/**
 * Tab Screen Container
 * Removed unstable JS PanResponder swipe which caused pages to get stuck halfway
 * and introduced touch lag with inner ScrollViews/Carousels.
 */
export function SwipeableTabScreen({ children }: Props) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
