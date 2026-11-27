import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { finishInAppCheckout, readCheckoutOrderId, readCheckoutUrl } from "@/lib/inAppCheckout";
import { apiFetch } from "@/lib/api";
import { upiAppUrls, upiPayQuery, type UpiAppId } from "@/lib/upiApps";
import { useAuthStore } from "@/store/useAuthStore";

const MOBILE_BROWSER =
  "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

const KEEP_IN_APP_JS = `
(function() {
  if (window.__zonofitPay) return;
  window.__zonofitPay = true;
  window.open = function(url) {
    if (typeof url === "string" && /^https?:/i.test(url)) {
      window.location.href = url;
    }
    return null;
  };
  document.addEventListener("click", function(event) {
    var node = event.target;
    while (node && node.tagName !== "A") node = node.parentElement;
    if (!node || node.target !== "_blank" || !node.href) return;
    if (!/^https?:/i.test(node.href)) return;
    event.preventDefault();
    window.location.href = node.href;
  }, true);
})();
true;
`;

const UPI_APPS: { id: UpiAppId; label: string }[] = [
  { id: "gpay", label: "GPay" },
  { id: "phonepe", label: "PhonePe" },
  { id: "paytm", label: "Paytm" },
  { id: "other", label: "Any UPI" },
];

function isReturnUrl(url: string): boolean {
  return url.includes("/api/payments/plural/callback") || url.startsWith("zonofit://payment");
}

function externalPaymentUrl(url: string): string {
  if (!url.startsWith("intent://")) return url;
  const withoutIntent = url.replace(/^intent:\/\//, "");
  const [body, intentPart = ""] = withoutIntent.split("#Intent");
  const scheme = intentPart.match(/(?:^|;)scheme=([^;]+)/)?.[1];
  const fallback = intentPart.match(/(?:^|;)S\.browser_fallback_url=([^;]+)/)?.[1];
  if (scheme && body) return `${scheme}://${body}`;
  if (fallback) return decodeURIComponent(fallback);
  return url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PaymentCheckoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const redirectUrl = readCheckoutUrl();
  const orderId = readCheckoutOrderId();
  const closed = useRef(false);
  const lastExternal = useRef("");
  const waitingForUpi = useRef(false);
  const pollGen = useRef(0);
  const [loading, setLoading] = useState(true);
  const [upiBusy, setUpiBusy] = useState(false);
  const [upiNote, setUpiNote] = useState("");
  const [upiError, setUpiError] = useState("");
  const [showUpi, setShowUpi] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUpiUrl, setQrUpiUrl] = useState("");
  const webRef = useRef<WebView>(null);

  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    finishInAppCheckout();
    if (router.canGoBack()) router.back();
  }, [router]);

  const pollPaid = useCallback(async () => {
    if (!orderId) return;
    const gen = ++pollGen.current;
    setUpiNote("Confirming your UPI payment…");
    for (let attempt = 0; attempt < 15; attempt += 1) {
      if (gen !== pollGen.current || closed.current) return;
      const token = useAuthStore.getState().token;
      if (!token) return;
      try {
        const verifyRes = await apiFetch("/api/payments/plural/verify", {
          method: "POST",
          token,
          body: JSON.stringify({ orderId }),
        });
        if (verifyRes?.success || verifyRes?.status === "FULFILLED") {
          close();
          return;
        }
      } catch {
        // A pending payment is an error response. Keep waiting for Pine Labs.
      }
      await sleep(2000);
    }
    if (gen === pollGen.current && !closed.current) {
      setUpiNote("If you approved it, stay here. It can take a few seconds to confirm.");
    }
  }, [close, orderId]);

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      finishInAppCheckout();
    });
  }, [navigation]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && waitingForUpi.current) {
        void pollPaid();
      }
    });
    return () => sub.remove();
  }, [pollPaid]);

  const openUpi = useCallback(async (app: UpiAppId) => {
    if (!orderId || upiBusy) return;
    setUpiBusy(true);
    setUpiError("");
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setUpiError("Sign in again before paying.");
        return;
      }
      const data = await apiFetch("/api/payments/plural/upi-intent", {
        method: "POST",
        token,
        body: JSON.stringify({ orderId }),
      });
      if (data?.status === "FULFILLED") {
        close();
        return;
      }
      const query = upiPayQuery(typeof data?.upiUrl === "string" ? data.upiUrl : "");
      if (!query) {
        setUpiError("UPI app pay is not available for this payment. Use the page below.");
        return;
      }
      const urls = upiAppUrls(app, query);
      let opened = false;
      for (const url of urls) {
        try {
          const can = await Linking.canOpenURL(url);
          if (!can) continue;
          waitingForUpi.current = true;
          await Linking.openURL(url);
          opened = true;
          break;
        } catch {
          continue;
        }
      }
      if (!opened) {
        try {
          waitingForUpi.current = true;
          await Linking.openURL(urls[0]);
          opened = true;
        } catch {
          waitingForUpi.current = false;
        }
      }
      if (!opened) {
        setUpiError("That UPI app is not installed on this phone.");
        return;
      }
      setUpiNote("Approve it in the app. The amount is already filled in.");
      void pollPaid();
    } catch {
      setUpiError("UPI app pay is not available for this payment. Use the page below.");
    } finally {
      setUpiBusy(false);
    }
  }, [close, orderId, pollPaid, upiBusy]);

  const showQrCode = useCallback(async () => {
    if (!orderId || upiBusy) return;
    setUpiBusy(true);
    setUpiError("");
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setUpiError("Sign in again before paying.");
        return;
      }
      const data = await apiFetch("/api/payments/plural/upi-intent", {
        method: "POST",
        token,
        body: JSON.stringify({ orderId }),
      });
      if (data?.status === "FULFILLED") {
        close();
        return;
      }
      const rawUrl = typeof data?.upiUrl === "string" ? data.upiUrl : "";
      if (!rawUrl) {
        setUpiError("QR code is not available for this payment. Use the options on the page below.");
        return;
      }
      setQrUpiUrl(rawUrl);
      setShowQrModal(true);
      waitingForUpi.current = true;
      void pollPaid();
    } catch {
      setUpiError("Could not generate QR code. Use the options on the page below.");
    } finally {
      setUpiBusy(false);
    }
  }, [close, orderId, pollPaid, upiBusy]);

  const loadInPage = useCallback((url: string) => {
    webRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(url)}; true;`);
  }, []);

  const handleUrl = useCallback((url: string): boolean => {
    if (!url || url === "about:blank") return true;
    if (isReturnUrl(url)) {
      close();
      return false;
    }
    if (/^https?:/i.test(url)) return true;

    const next = externalPaymentUrl(url);
    if (/^https?:/i.test(next)) {
      loadInPage(next);
      return false;
    }
    if (/^(googlechrome|chrome|googlechromes):/i.test(next)) return false;
    if (!/^(upi|tez|gpay|phonepe|paytm|paytmmp|credpay):/i.test(next)) return false;
    if (lastExternal.current !== next) {
      lastExternal.current = next;
      waitingForUpi.current = true;
      Linking.openURL(next).catch(() => {});
      void pollPaid();
    }
    return false;
  }, [close, loadInPage, pollPaid]);

  const onShouldStart = useCallback((request: { url: string }) => {
    return handleUrl(request.url);
  }, [handleUrl]);

  const onNavigation = useCallback((nav: WebViewNavigation) => {
    handleUrl(nav.url);
  }, [handleUrl]);

  if (!redirectUrl) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>This payment is no longer open.</Text>
          <Pressable onPress={() => router.back()} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close payment" style={styles.close}>
          <Ionicons name="close" size={22} color="#111827" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pay in ZonoFit</Text>
          <Text style={styles.subtitle}>Card, UPI, or net banking</Text>
        </View>
      </View>
      {orderId ? (
        <View style={styles.upi}>
          <Pressable
            onPress={() => setShowUpi((prev) => !prev)}
            style={styles.upiToggle}
            accessibilityLabel="Toggle UPI Quick Apps"
          >
            <View style={styles.upiToggleLeft}>
              <Ionicons name="flash" size={14} color="#14582D" />
              <Text style={styles.upiTitle}>Pay with UPI Apps</Text>
            </View>
            <Ionicons name={showUpi ? "chevron-up" : "chevron-down"} size={16} color="#14582D" />
          </Pressable>
          {showUpi ? (
            <View style={styles.upiBody}>
              <Text style={styles.upiCopy}>Scan QR code or tap an app to pay with amount pre-filled.</Text>
              <View style={styles.upiRow}>
                <Pressable
                  onPress={() => { void showQrCode(); }}
                  disabled={upiBusy}
                  style={[styles.upiButton, styles.qrButton]}
                  accessibilityLabel="Show Dynamic QR Code"
                >
                  <Ionicons name="qr-code-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={[styles.upiButtonText, styles.qrButtonText]}>Show QR</Text>
                </Pressable>
                {UPI_APPS.map((app) => (
                  <Pressable
                    key={app.id}
                    onPress={() => { void openUpi(app.id); }}
                    disabled={upiBusy}
                    style={styles.upiButton}
                    accessibilityLabel={`Pay with ${app.label}`}
                  >
                    <Text style={styles.upiButtonText}>{app.label}</Text>
                  </Pressable>
                ))}
              </View>
              {upiBusy ? <ActivityIndicator size="small" color="#14582D" style={styles.upiSpinner} /> : null}
              {upiNote ? <Text style={styles.upiNote}>{upiNote}</Text> : null}
              {upiError ? <Text style={styles.upiError}>{upiError}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Dynamic UPI QR Code Modal */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.qrOverlay}>
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <View style={styles.qrHeaderLeft}>
                <Ionicons name="qr-code" size={20} color="#14582D" />
                <Text style={styles.qrTitle}>Scan & Pay with Any UPI</Text>
              </View>
              <Pressable
                onPress={() => setShowQrModal(false)}
                hitSlop={8}
                style={styles.qrClose}
                accessibilityLabel="Close QR"
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </Pressable>
            </View>

            <Text style={styles.qrSubtitle}>
              Scan using Google Pay, PhonePe, Paytm, BHIM, or any banking app.
            </Text>

            <View style={styles.qrImageContainer}>
              {qrUpiUrl ? (
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(qrUpiUrl)}`,
                  }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <ActivityIndicator size="large" color="#14582D" />
              )}
            </View>

            <View style={styles.qrStatusRow}>
              <ActivityIndicator size="small" color="#14582D" />
              <Text style={styles.qrStatusText}>Waiting for payment confirmation…</Text>
            </View>

            <Text style={styles.qrHelperText}>
              Amount is automatically filled. This screen closes as soon as paid.
            </Text>

            <Pressable
              onPress={() => setShowQrModal(false)}
              style={styles.qrDismissBtn}
            >
              <Text style={styles.qrDismissBtnText}>Close QR Code</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <View style={styles.web}>
        <WebView
          ref={webRef}
          source={{ uri: redirectUrl }}
          userAgent={MOBILE_BROWSER}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          nestedScrollEnabled
          overScrollMode="always"
          showsVerticalScrollIndicator
          setSupportMultipleWindows={false}
          mixedContentMode="always"
          allowsInlineMediaPlayback
          injectedJavaScriptBeforeContentLoaded={KEEP_IN_APP_JS}
          onShouldStartLoadWithRequest={onShouldStart}
          onNavigationStateChange={onNavigation}
          onOpenWindow={(event) => {
            const url = event.nativeEvent.targetUrl;
            if (url && /^https?:/i.test(url)) loadInPage(url);
          }}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoading(false)}
          startInLoadingState
        />
        {loading ? (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="large" color="#14582D" />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  upi: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#F7FBF8",
  },
  upiToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  upiToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  upiBody: {
    marginTop: 4,
  },
  upiTitle: { fontSize: 13, fontWeight: "700", color: "#14582D" },
  upiCopy: { fontSize: 11, color: "#4B5563", marginTop: 1, lineHeight: 15 },
  upiRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  upiButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CDE5D4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  upiButtonText: { fontSize: 12, fontWeight: "700", color: "#14582D" },
  qrButton: {
    backgroundColor: "#14582D",
    borderColor: "#14582D",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flex: 1.15,
  },
  qrButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  qrHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qrHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  qrClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  qrSubtitle: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 16,
  },
  qrImageContainer: {
    width: 236,
    height: 236,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  qrStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#166534",
  },
  qrHelperText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 15,
  },
  qrDismissBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  qrDismissBtnText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  upiSpinner: { marginTop: 6 },
  upiNote: { fontSize: 11, color: "#14582D", marginTop: 6, lineHeight: 15 },
  upiError: { fontSize: 11, color: "#B45309", marginTop: 6, lineHeight: 15 },
  web: { flex: 1, backgroundColor: "#FFFFFF" },
  loader: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 16, color: "#111827", textAlign: "center" },
  emptyButton: { marginTop: 16, backgroundColor: "#14582D", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { color: "#FFFFFF", fontWeight: "700" },
});
