import * as WebBrowser from "expo-web-browser";
import { apiFetch } from "./api";

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  directAccepted?: boolean;
}

/**
 * Handles cross-platform payment checkout.
 * 
 * Supports:
 * 1. Plural by Pine Labs: Hosted Checkout via in-app browser with UPI Intent (GPay, PhonePe, Paytm),
 *    Credit/Debit Cards, Net Banking, and Wallets.
 * 2. Direct Accept: Development/testing bypass when no payment gateway is configured.
 * 3. Razorpay fallback: Native bridge if Razorpay keys are provided.
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

  // 3. Fallback to Razorpay if orderData contains keyId and razorpayOrderId
  if (orderData.keyId && orderData.razorpayOrderId) {
    let RazorpayCheckout: any;
    try {
      RazorpayCheckout = require("react-native-razorpay").default;
    } catch {
      throw new Error("Card payments require the ZonoFit native app.");
    }

    if (!RazorpayCheckout?.open) {
      throw new Error("Card payments need the ZonoFit app on a phone.");
    }

    const payment = await RazorpayCheckout.open({
      description: options?.description || "ZonoFit Payment",
      currency: orderData.currency || "INR",
      key: orderData.keyId,
      amount: orderData.amount,
      name: "ZonoFit",
      order_id: orderData.razorpayOrderId,
      theme: { color: "#059669" },
    });

    if (options?.token) {
      await apiFetch("/api/credits/confirm", {
        method: "POST",
        token: options.token,
        body: JSON.stringify({
          razorpayOrderId: orderData.razorpayOrderId,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpaySignature: payment.razorpay_signature,
        }),
      });
    }

    return {
      success: true,
      orderId: orderData.razorpayOrderId,
    };
  }

  throw new Error(orderData.message || "Payment gateway could not be initiated.");
}
