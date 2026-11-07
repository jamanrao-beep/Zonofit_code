import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useShopRequestsStore } from "@/store/useShopRequestsStore";
import { shopToast } from "@/components/shop/ShopToast";

const SUGGESTIONS = [
  { name: "Whey Protein Isolate", icon: "flask-outline" },
  { name: "Creatine Monohydrate", icon: "sparkles-outline" },
  { name: "Pre-Workout Energy", icon: "flash-outline" },
  { name: "Daily Multivitamins", icon: "fitness-outline" },
  { name: "Lifting Straps & Belt", icon: "barbell-outline" },
  { name: "Oversized Gym Tee", icon: "shirt-outline" },
  { name: "Steel Shaker Bottle", icon: "water-outline" },
  { name: "High-Protein Bars", icon: "nutrition-outline" },
  { name: "Electrolytes & BCAA", icon: "shield-checkmark-outline" },
];

interface FirstOrderWishlistProps {
  categoryHint?: string;
}

export default function FirstOrderWishlist({ categoryHint }: FirstOrderWishlistProps) {
  const [customInput, setCustomInput] = useState("");
  const requests = useShopRequestsStore((state) => state.requests);
  const addRequest = useShopRequestsStore((state) => state.addRequest);
  const removeRequest = useShopRequestsStore((state) => state.removeRequest);
  const hasRequested = useShopRequestsStore((state) => state.hasRequested);

  const handleToggle = (name: string) => {
    if (hasRequested(name)) {
      removeRequest(name);
      shopToast(`Removed "${name}" from your launch wishlist`);
    } else {
      addRequest(name, categoryHint);
      shopToast(`Added "${name}"! We'll notify you at launch`);
    }
  };

  const handleSubmitCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) {
      Alert.alert("Empty Request", "Please type a product or brand name you'd like to see.");
      return;
    }
    if (hasRequested(trimmed)) {
      shopToast(`"${trimmed}" is already on your wishlist`);
      setCustomInput("");
      return;
    }
    addRequest(trimmed, categoryHint);
    shopToast(`Requested "${trimmed}"! Added to launch priority`);
    setCustomInput("");
  };

  return (
    <View style={styles.card}>
      {/* Header Badge */}
      <View style={styles.badgeRow}>
        <View style={styles.comingSoonBadge}>
          <Ionicons name="sparkles" size={13} color="#1F7A3F" />
          <Text style={styles.comingSoonBadgeText}>MARKETPLACE COMING SOON</Text>
        </View>
        <Text style={styles.priorityText}>Priority Stocking Poll</Text>
      </View>

      {/* Main Question */}
      <Text style={styles.title}>What do you want to order first when we open?</Text>
      <Text style={styles.subtitle}>
        ZonoFit Marketplace is launching soon with 100% genuine supplements, apparel, and gym gear. Tell us what you want us to stock first!
      </Text>

      {/* Quick Suggestions */}
      <Text style={styles.sectionHeading}>Tap to vote for essentials:</Text>
      <View style={styles.chipGrid}>
        {SUGGESTIONS.map((item) => {
          const selected = hasRequested(item.name);
          return (
            <Pressable
              key={item.name}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => handleToggle(item.name)}
            >
              <Ionicons
                name={selected ? "checkmark-circle" : (item.icon as never)}
                size={15}
                color={selected ? "#1F7A3F" : "#526357"}
              />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Custom input */}
      <View style={styles.inputWrap}>
        <TextInput
          value={customInput}
          onChangeText={setCustomInput}
          placeholder="Type any brand or supplement (e.g. MB Biozyme, ON)"
          placeholderTextColor="#8C9A91"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handleSubmitCustom}
        />
        <Pressable
          style={[styles.submitBtn, !customInput.trim() && styles.submitBtnDisabled]}
          onPress={handleSubmitCustom}
          disabled={!customInput.trim()}
        >
          <Text style={styles.submitBtnText}>Request</Text>
          <Ionicons name="paper-plane-outline" size={14} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* User's Current Wishlist for Launch */}
      {requests.length > 0 && (
        <View style={styles.myRequestsBox}>
          <View style={styles.myRequestsHeader}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{requests.length}</Text>
            </View>
            <Text style={styles.myRequestsTitle}>Your Launch Day Priority Items</Text>
          </View>
          <View style={styles.myRequestsList}>
            {requests.map((req) => (
              <View key={req.id} style={styles.requestedItemChip}>
                <Ionicons name="checkmark-circle" size={15} color="#1F7A3F" />
                <Text style={styles.requestedItemText} numberOfLines={1}>
                  {req.name}
                </Text>
                <Pressable
                  onPress={() => removeRequest(req.id)}
                  hitSlop={8}
                  style={styles.removeIcon}
                >
                  <Ionicons name="close" size={14} color="#7D8D82" />
                </Pressable>
              </View>
            ))}
          </View>
          <Text style={styles.guaranteeText}>
            ✓ We will notify you with exclusive early member discounts when these arrive!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#E3EBE4",
    shadowColor: "#0F2417",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  comingSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F4EA",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  comingSoonBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1F7A3F",
    letterSpacing: 0.6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#66756B",
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F2417",
    lineHeight: 25,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#526357",
    lineHeight: 19,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2D3B31",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F4F7F4",
    borderWidth: 1,
    borderColor: "#D9E3DC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  chipSelected: {
    backgroundColor: "#E8F4EA",
    borderColor: "#1F7A3F",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D3B31",
  },
  chipTextSelected: {
    color: "#1F7A3F",
    fontWeight: "700",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8F5",
    borderWidth: 1.5,
    borderColor: "#D9E3DC",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: "#0F2417",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1F7A3F",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    backgroundColor: "#A0B5A7",
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  myRequestsBox: {
    marginTop: 18,
    backgroundColor: "#F7FAF8",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDE8DF",
    padding: 14,
  },
  myRequestsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  counterBadge: {
    backgroundColor: "#1F7A3F",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  myRequestsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F2417",
  },
  myRequestsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  requestedItemChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C5DBCB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestedItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F7A3F",
    maxWidth: 160,
  },
  removeIcon: {
    marginLeft: 2,
  },
  guaranteeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#526357",
    fontStyle: "italic",
    marginTop: 4,
  },
});
