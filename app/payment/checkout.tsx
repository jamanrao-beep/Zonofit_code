import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";
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

const INJECTED_CHECKOUT_JS = `
(function() {
  if (window.__zonofit_injected) return;
  window.__zonofit_injected = true;

  // 1. Inject CSS for bottom scroll clearance, active dark green button, and red validation highlights
  const style = document.createElement('style');
  style.id = '__zonofit_checkout_style__';
  style.textContent = \`
    html, body {
      padding-bottom: 180px !important;
      min-height: 100% !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }
    
    .content, .checkout-container, main, form, .form-container, #root, #app {
      padding-bottom: 140px !important;
    }

    .zonofit-field-error {
      border: 2px solid #EF4444 !important;
      background-color: #FEF2F2 !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25) !important;
      transition: all 0.2s ease-in-out !important;
    }

    .zonofit-btn-ready {
      background-color: #14582D !important;
      background-image: none !important;
      opacity: 1 !important;
      color: #FFFFFF !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      box-shadow: 0 4px 14px rgba(20, 88, 45, 0.4) !important;
      transition: all 0.25s ease-in-out !important;
    }

    #__zonofit_val_alert__ {
      background-color: #FEF2F2;
      border: 1px solid #F87171;
      color: #991B1B;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      line-height: 18px;
      margin: 12px 0 16px 0;
      display: none;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }
  \`;
  (document.head || document.documentElement).appendChild(style);

  // 2. Helper to find the Continue to Pay / Submit button
  function findContinueBtn() {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], a, .btn'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt.includes('continue to pay') || txt.includes('continue') || txt.includes('proceed to pay') || txt.includes('pay now')) {
        return el;
      }
    }
    return null;
  }

  // 3. Inspect address/input fields in form (NO hardcoded defaults)
  function getFormFields() {
    return Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea'));
  }

  function getFieldLabel(input) {
    if (input.placeholder && input.placeholder.trim()) return input.placeholder.trim();
    if (input.getAttribute('aria-label')) return input.getAttribute('aria-label').trim();
    const id = input.id;
    if (id) {
      const labelEl = document.querySelector('label[for="' + id + '"]');
      if (labelEl && labelEl.textContent) return labelEl.textContent.trim();
    }
    const name = (input.name || id || '').toLowerCase();
    if (name.includes('pin') || name.includes('zip') || name.includes('postal')) return 'PIN Code';
    if (name.includes('city')) return 'City';
    if (name.includes('state')) return 'State';
    if (name.includes('address1') || name.includes('street') || name.includes('line1') || name.includes('address')) return 'Address details';
    if (name.includes('phone') || name.includes('mobile')) return 'Mobile Number';
    if (name.includes('email')) return 'Email';
    if (name.includes('name')) return 'Full Name';
    return 'Required field';
  }

  function getMissingFields() {
    const fields = getFormFields();
    const missing = [];
    fields.forEach(input => {
      if (input.offsetParent === null && input.type !== 'hidden') return;
      const name = (input.name || input.id || input.placeholder || '').toLowerCase();
      const val = (input.value || '').trim();

      if (name.includes('address2') || name.includes('line2') || name.includes('landmark') || name.includes('optional')) {
        return;
      }

      const isExplicitRequired = input.required || input.getAttribute('aria-required') === 'true';
      const isKnownRequired = name.includes('pin') || name.includes('zip') || name.includes('city') || 
                              name.includes('state') || name.includes('address') || name.includes('street') ||
                              name.includes('mobile') || name.includes('phone') || name.includes('email');

      if ((isExplicitRequired || isKnownRequired) && !val) {
        missing.push({ input, label: getFieldLabel(input) });
      } else if ((name.includes('pin') || name.includes('zip')) && val && !/^\\d{6}$/.test(val)) {
        missing.push({ input, label: 'PIN Code (6 digits)' });
      }
    });
    return missing;
  }

  // 4. Update button visual appearance and ready status
  function updateButtonState() {
    const btn = findContinueBtn();
    if (!btn) return;

    // Do NOT alter button if it is currently processing/submitting
    const text = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
    if (text.includes('processing') || text.includes('please wait') || btn.getAttribute('data-processing') === 'true') {
      return;
    }

    let alertBox = document.getElementById('__zonofit_val_alert__');
    if (!alertBox && btn.parentNode) {
      alertBox = document.createElement('div');
      alertBox.id = '__zonofit_val_alert__';
      btn.parentNode.insertBefore(alertBox, btn);
    }

    const missing = getMissingFields();
    if (missing.length === 0) {
      // All fields valid -> Turn rich dark green
      btn.classList.add('zonofit-btn-ready');
      btn.style.setProperty('background-color', '#14582D', 'important');
      btn.style.setProperty('opacity', '1', 'important');
      btn.style.setProperty('cursor', 'pointer', 'important');
      btn.style.setProperty('pointer-events', 'auto', 'important');
      btn.removeAttribute('disabled');
      if (alertBox) alertBox.style.display = 'none';
    } else {
      btn.classList.remove('zonofit-btn-ready');
      btn.style.setProperty('pointer-events', 'auto', 'important');
      btn.style.setProperty('cursor', 'pointer', 'important');
    }
  }

  // 5. Intercept taps on the button to show what is missing if clicked without filling
  function handleButtonClick(e) {
    const btn = findContinueBtn();
    if (!btn) return;

    if (e.target === btn || btn.contains(e.target)) {
      const text = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
      if (text.includes('processing') || text.includes('please wait') || btn.getAttribute('data-processing') === 'true') {
        return;
      }

      const missing = getMissingFields();
      if (missing.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        missing.forEach(item => {
          item.input.classList.add('zonofit-field-error');
          const cleanUp = () => {
            item.input.classList.remove('zonofit-field-error');
            item.input.removeEventListener('input', cleanUp);
            updateButtonState();
          };
          item.input.addEventListener('input', cleanUp);
          item.input.addEventListener('change', cleanUp);
        });

        let alertBox = document.getElementById('__zonofit_val_alert__');
        if (!alertBox && btn.parentNode) {
          alertBox = document.createElement('div');
          alertBox.id = '__zonofit_val_alert__';
          btn.parentNode.insertBefore(alertBox, btn);
        }
        if (alertBox) {
          const names = Array.from(new Set(missing.map(m => m.label))).join(', ');
          alertBox.textContent = 'Please fill required details: ' + names;
          alertBox.style.display = 'block';
        }

        missing[0].input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { missing[0].input.focus(); } catch (_) {}
        return false;
      } else {
        btn.setAttribute('data-processing', 'true');
      }
    }
  }

  document.addEventListener('click', handleButtonClick, true);
  document.addEventListener('input', updateButtonState, true);
  document.addEventListener('change', updateButtonState, true);
  document.addEventListener('focusin', updateButtonState, true);

  setInterval(updateButtonState, 500);
  updateButtonState();
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

  const handleUrl = useCallback((url: string): boolean => {
    if (!url || url === "about:blank") return true;
    if (isReturnUrl(url)) {
      close();
      return false;
    }
    if (/^https?:/i.test(url)) return true;
    if (lastExternal.current !== url) {
      lastExternal.current = url;
      waitingForUpi.current = true;
      Linking.openURL(externalPaymentUrl(url)).catch(() => {});
      void pollPaid();
    }
    return false;
  }, [close, pollPaid]);

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
        <Pressable
          onPress={() => {
            if (redirectUrl) Linking.openURL(redirectUrl).catch(() => {});
          }}
          hitSlop={10}
          accessibilityLabel="Open in Browser"
          style={styles.openBrowser}
        >
          <Ionicons name="globe-outline" size={16} color="#14582D" />
          <Text style={styles.openBrowserText}>Browser</Text>
        </Pressable>
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
              <Text style={styles.upiCopy}>Opens GPay, PhonePe, Paytm, or any UPI app with amount filled in.</Text>
              <View style={styles.upiRow}>
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
      <View style={styles.web}>
        <WebView
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
          javaScriptCanOpenWindowsAutomatically
          mixedContentMode="always"
          allowsInlineMediaPlayback
          injectedJavaScriptBeforeContentLoaded={INJECTED_CHECKOUT_JS}
          injectedJavaScript={INJECTED_CHECKOUT_JS}
          keyboardDisplayRequiresUserAction={false}
          onShouldStartLoadWithRequest={onShouldStart}
          onNavigationStateChange={onNavigation}
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
  openBrowser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    borderColor: "#CDE5D4",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  openBrowserText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#14582D",
  },
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
