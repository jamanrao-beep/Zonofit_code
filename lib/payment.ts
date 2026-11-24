import * as WebBrowser from "expo-web-browser";
import { apiFetch } from "./api";

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  directAccepted?: boolean;
}

/**
 * Opens Pine Labs hosted checkout, then asks the API to confirm the order.
 * A covered referral month arrives as directAccepted and does not open a browser.
 */
export async function handlePaymentCheckout(
  orderData: any,
  options?: {
    description?: string;
    token?: string;
  }
): Promise<CheckoutResult> {
  if (!orderData) {
    throw new Error("No payment order data received from server.");
  }

  // 1. Direct Accepted (0 amount or dev test bypass)
  if (orderData.directAccepted) {
    return { success: true, directAccepted: true };
  }

  // 2. Plural by Pine Labs Hosted Checkout
  if (orderData.redirectUrl) {
    const orderId = orderData.orderId || orderData.razorpayOrderId;
    try {
      // Opens Chrome Custom Tab (Android) or ASWebAuthenticationSession / SFSafari (iOS)
      // When Pine Labs finishes, it redirects to api.zonofit.com/api/payments/plural/callback
      // which auto-triggers the deep link "zonofit://payment/success?order_id=..."
      await WebBrowser.openAuthSessionAsync(
        orderData.redirectUrl,
        "zonofit://payment"
      );
    } catch (browserErr) {
      console.warn("[Payment] Browser session finished or dismissed:", browserErr);
    }

    if (!orderId) {
      throw new Error("Payment could not be confirmed.");
    }

    const verifyRes = await apiFetch("/api/payments/plural/verify", {
      method: "POST",
      token: options?.token,
      body: JSON.stringify({ orderId }),
    });

    if (verifyRes?.success || verifyRes?.status === "FULFILLED") {
      return { success: true, orderId };
    }
    throw new Error(verifyRes?.message || "Payment is pending or was not completed.");
  }

  throw new Error("Payment could not be started.");
}
