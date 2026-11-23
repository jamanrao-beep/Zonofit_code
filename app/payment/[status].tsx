import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { useCreditsStore } from "@/store/useCreditsStore";
import { useUserStore } from "@/store/useUserStore";
import { apiFetch } from "@/lib/api";
import { ackReplace } from "@/lib/tapAck";
import { usePatientHint } from "@/lib/usePatientHint";

export default function PaymentResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; order_id?: string }>();
  const isSuccess = params.status === "success";
  const orderId = params.order_id;

  const [verifying, setVerifying] = useState(isSuccess);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const patient = usePatientHint(verifying);

  useEffect(() => {
    let mounted = true;

    async function syncPayment() {
      if (!isSuccess || !orderId) {
        setVerifying(false);
        return;
      }

      try {
        const token = useAuthStore.getState().token;
        if (token) {
          // Verify with server
          await apiFetch("/api/payments/plural/verify", {
            method: "POST",
            token,
            body: JSON.stringify({ orderId }),
          }).catch(() => {});

          // Refresh wallet and profile
          await Promise.all([
            useCreditsStore.getState().fetchWallet(token, { force: true }),
            useUserStore.getState().fetchProfile(token),
          ]);
        }
      } catch (err: any) {
        if (mounted) setErrorMsg(err?.message || "Payment sync failed");
      } finally {
        if (mounted) setVerifying(false);
      }
    }

    syncPayment();

    return () => {
      mounted = false;
    };
  }, [isSuccess, orderId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {verifying ? (
          <>
            <ActivityIndicator size="large" color="#166534" style={{ marginBottom: 20 }} />
            <Text style={styles.title}>Confirming Payment...</Text>
            <Text style={styles.subtitle}>
              {patient ? "Thank you for being patient." : "Securing your fitness credits and membership status."}
            </Text>
          </>
        ) : isSuccess ? (
          <>
            <View style={[styles.iconCircle, styles.successCircle]}>
              <Ionicons name="checkmark" size={36} color="#166534" />
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.subtitle}>
              Your transaction has been processed. Your credits and access are updated.
            </Text>
            <Pressable
              style={[styles.button, styles.successBtn]}
              onPress={() => ackReplace(router, "/(tabs)/credits", "Opening…")}
            >
              <Text style={styles.buttonText}>Go to Wallet</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={[styles.iconCircle, styles.failCircle]}>
              <Ionicons name="close" size={36} color="#991B1B" />
            </View>
            <Text style={styles.title}>Payment Incomplete</Text>
            <Text style={styles.subtitle}>
              {errorMsg || "The transaction was not completed. No money was deducted, or pending refunds will be settled."}
            </Text>
            <Pressable
              style={[styles.button, styles.failBtn]}
              onPress={() => ackReplace(router, "/(tabs)/credits", "Opening…")}
            >
              <Text style={styles.buttonText}>Return to App</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successCircle: {
    backgroundColor: "#ECFDF5",
  },
  failCircle: {
    backgroundColor: "#FEF2F2",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  successBtn: {
    backgroundColor: "#166534",
  },
  failBtn: {
    backgroundColor: "#374151",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
