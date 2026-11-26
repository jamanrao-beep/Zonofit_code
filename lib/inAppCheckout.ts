import { router } from "expo-router";

type PendingCheckout = {
  redirectUrl: string;
  orderId: string | null;
  done: () => void;
};

let pending: PendingCheckout | null = null;

/** Opens the Pine Labs page inside the app and resolves when that screen closes. */
export function openInAppCheckout(redirectUrl: string, orderId?: string | null): Promise<void> {
  return new Promise((resolve) => {
    if (pending) pending.done();
    pending = {
      redirectUrl,
      orderId: orderId || null,
      done: () => {
        pending = null;
        resolve();
      },
    };
    try {
      router.push("/payment/checkout");
    } catch (err) {
      pending = null;
      resolve();
      console.warn("[Payment] Could not open in-app checkout", err);
    }
  });
}

export function readCheckoutUrl(): string | null {
  return pending?.redirectUrl ?? null;
}

export function readCheckoutOrderId(): string | null {
  return pending?.orderId ?? null;
}

/** Resolves the waiting pay action. Safe to call more than once. */
export function finishInAppCheckout(): void {
  pending?.done();
}
