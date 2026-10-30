import React, { useEffect, useRef } from "react";
import { Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";

interface ToastState {
  message: string;
  show: (message: string) => void;
  clear: () => void;
}

export const useShopToast = create<ToastState>((set) => ({
  message: "",
  show: (message) => set({ message }),
  clear: () => set({ message: "" }),
}));

export function shopToast(message: string) {
  useShopToast.getState().show(message);
}

export default function ShopToast() {
  const message = useShopToast((state) => state.message);
  const clear = useShopToast((state) => state.clear);
  const insets = useSafeAreaInsets();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => clear(), 1600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message, clear]);

  if (!message) return null;

  return (
    <Text style={[styles.toast, { top: insets.top + 10 }]} accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    alignSelf: "center",
    left: 24,
    right: 24,
    textAlign: "center",
    backgroundColor: "#0F2417",
    color: "#fff",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    overflow: "hidden",
    fontWeight: "600",
    fontSize: 14,
    zIndex: 40,
  },
});
