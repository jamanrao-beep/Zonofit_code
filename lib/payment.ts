import { apiFetch } from "./api";
import { openInAppCheckout } from "./inAppCheckout";

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  directAccepted?: boolean;
}

/**
 * Opens Pine Labs checkout inside the app, then asks the API to confirm the order.
 * A covered referral month arrives as directAccepted and does not open checkout.
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
      await openInAppCheckout(orderData.redirectUrl, orderId);
    } catch (checkoutErr) {
      console.warn("[Payment] In-app checkout closed:", checkoutErr);
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
