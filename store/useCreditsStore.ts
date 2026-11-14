import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import { apiFetch, invalidateApiCache } from "@/lib/api";
import { shopCreditsForRupees } from "@/data/shopCatalog";
import { useAuthStore } from "./useAuthStore";

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (e) {
      console.warn("SecureStore setItem failed:", e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (e) {
      console.warn("SecureStore deleteItem failed:", e);
    }
  },
};

let walletEpoch = 0;
let walletFlight: Promise<void> | null = null;
let walletFetchedAt = 0;
const WALLET_FRESH_MS = 8000;

function transactionsMatch(current: Transaction[], incoming: Transaction[]) {
  if (current.length !== incoming.length) return false;
  for (let i = 0; i < current.length; i += 1) {
    const left = current[i];
    const right = incoming[i];
    if (left.id !== right.id || left.amount !== right.amount || left.type !== right.type || left.description !== right.description) {
      return false;
    }
  }
  return true;
}

export interface Transaction {
  id: string;
  type: "debit" | "credit";
  amount: number;
  currency: "credits" | "cash";
  description: string;
  date: string;
}

export interface INRWalletInfo {
  balanceINR: number;
  daysRemaining: number;
  isValid: boolean;
  expiryDate?: string | null;
}

export interface MembershipLifecycleInfo {
  status: string;
  isExpired: boolean;
  isExpiringSoon?: boolean;
  tier: string;
  planName: string;
  gymName: string;
  endDate: string;
  daysRemaining: number;
  cycleNumber: number;
  maxCycles: number;
  cyclesRemaining: number;
  mandatoryVisits: number;
  completedVisits: number;
  mandatoryVisitsRemaining: number;
  canRepurchase: boolean;
  canBuyAdditionalCredits: boolean;
  creditExpiryDate?: string;
}

interface CreditsState {
  credits: number;
  cashBalance: number;
  inrWallet: INRWalletInfo | null;
  membershipInfo: MembershipLifecycleInfo | null;
  transactions: Transaction[];
  loading: boolean;
  
  // Actions
  fetchWallet: (token: string, options?: { force?: boolean }) => Promise<void>;
  noteLocalWalletChange: () => void;
  releaseWalletCache: () => void;
  fetchTransactions: (token: string, page?: number) => Promise<void>;
  buyGymSubscription: (gymName: string, inrPaid: number, initialCreditDeduction: number) => Promise<{ success: boolean; message?: string }>;
  buyMarketplaceItem: (itemId: string, costInInr: number) => Promise<{ success: boolean; message?: string }>;
  bookVisitWithCash: (gymName: string, costInInr: number) => boolean;
  buyCredits: (creditsAmount: number, inrCost: number) => Promise<{ success: boolean; message?: string }>;
  topUpCash: (amountINR: number) => Promise<{ success: boolean; message?: string }>;
  convertCreditsToCash: (creditsAmount: number) => Promise<{ success: boolean; message?: string }>;
  convertCashToCredits: (creditsToBuy: number) => Promise<{ success: boolean; message?: string }>;
  deductCredits: (creditsAmount: number, description: string) => Promise<{ success: boolean; message?: string }>;
  addTransaction: (type: "debit" | "credit", amount: number, currency: "credits" | "cash", description: string) => void;
  checkoutCart: (
    items: { itemId: string; quantity: number; selectedSize?: string; selectedColor?: string }[],
    totalCostInr: number,
    couponCode?: string,
    creditsToUse?: number,
    address?: {
      fullName?: string;
      phoneNumber?: string;
      flatHouse?: string;
      areaStreet?: string;
      landmark?: string;
      city?: string;
      state?: string;
      pincode?: string;
    },
  ) => Promise<{ success: boolean; message?: string; breakdown?: any; orders?: { id: string; quantity: number; totalPaise: number; item?: { title?: string } }[] }>;
  reset: () => void;
}

async function confirmRazorpayOrder(orderData: any, description: string) {
  if (orderData?.directAccepted) {
    const token = useAuthStore.getState().token;
    if (token) await useCreditsStore.getState().fetchWallet(token, { force: true });
    return;
  }
  if (!orderData?.keyId || !orderData?.razorpayOrderId) {
    throw new Error(orderData?.message || "Card payments are not configured yet.");
  }
  const RazorpayCheckout = require("react-native-razorpay").default;
  if (!RazorpayCheckout?.open) {
    throw new Error("Card payments need the ZonoFit app on a phone.");
  }
  const payment = await RazorpayCheckout.open({
    description,
    currency: orderData.currency || "INR",
    key: orderData.keyId,
    amount: orderData.amount,
    name: "ZonoFit",
    order_id: orderData.razorpayOrderId,
    theme: { color: "#059669" },
  });
  const token = useAuthStore.getState().token;
  await apiFetch("/api/credits/confirm", {
    method: "POST",
    token,
    body: JSON.stringify({
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: payment.razorpay_payment_id,
      razorpaySignature: payment.razorpay_signature,
    }),
  });
  if (token) await useCreditsStore.getState().fetchWallet(token, { force: true });
}

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set, get) => ({
  credits: 0,
  cashBalance: 0,
  inrWallet: null,
  membershipInfo: null,
  transactions: [],
  loading: false,

  reset: () => {
    walletEpoch += 1;
    walletFetchedAt = 0;
    set({
      credits: 0,
      cashBalance: 0,
      inrWallet: null,
      membershipInfo: null,
      transactions: [],
      loading: false,
    });
  },

  noteLocalWalletChange: () => {
    walletEpoch += 1;
    walletFetchedAt = Date.now();
    invalidateApiCache("/api/wallet");
  },

  releaseWalletCache: () => {
    walletEpoch += 1;
    walletFetchedAt = 0;
    invalidateApiCache("/api/wallet");
  },

  fetchWallet: async (token, options) => {
    if (!token) return;
    const force = options?.force === true;
    if (force) walletEpoch += 1;
    if (!force && walletFlight) return walletFlight;
    if (!force && walletFetchedAt && Date.now() - walletFetchedAt < WALLET_FRESH_MS) return;

    const epoch = walletEpoch;
    const run = (async () => {
    let succeeded = false;
    try {
      const data = await apiFetch("/api/credits/balance", { token });
      const currentMembership = get().membershipInfo;
      const { useUserStore } = require("./useUserStore");
      const userStore = useUserStore.getState();
      const isLocallyActive = userStore.membershipStatus === "ACTIVE" || userStore.visitsRemaining > 0;

      const activeCycleNumber = Math.max(data.membership?.cycleNumber || 1, userStore.currentMonth || 1);
      const resolvedMembership = data.membership ? {
        ...data.membership,
        cycleNumber: activeCycleNumber,
        cyclesRemaining: Math.max(0, (data.membership.maxCycles || 12) - activeCycleNumber),
      } : (isLocallyActive ? {
        status: "ACTIVE",
        isExpired: false,
        isExpiringSoon: false,
        tier: "STANDARD",
        planName: userStore.planName || "Monthly",
        gymName: userStore.primaryGymName || "Being Fitness",
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 30,
        cycleNumber: activeCycleNumber,
        maxCycles: 12,
        cyclesRemaining: Math.max(0, 12 - activeCycleNumber),
        mandatoryVisits: userStore.visitsRemaining || (activeCycleNumber <= 4 ? 10 : 15),
        completedVisits: 0,
        mandatoryVisitsRemaining: userStore.visitsRemaining || (activeCycleNumber <= 4 ? 10 : 15),
        canRepurchase: false,
        canBuyAdditionalCredits: true,
      } : currentMembership);

      if (epoch !== walletEpoch) return;
      const resolvedCredits = typeof data.balance === "number" ? data.balance : get().credits;
      const nextCash = (data.convertibleCashBalanceINR || 0) + (data.nonConvertibleCashBalanceINR || 0);
      const current = get();
      const membershipSame = JSON.stringify(current.membershipInfo) === JSON.stringify(resolvedMembership);
      if (
        current.credits !== resolvedCredits ||
        current.cashBalance !== nextCash ||
        JSON.stringify(current.inrWallet) !== JSON.stringify(data.inrWallet || null) ||
        !membershipSame ||
        current.loading
      ) {
        set({
          credits: resolvedCredits,
          cashBalance: nextCash,
          inrWallet: data.inrWallet || null,
          membershipInfo: resolvedMembership,
          loading: false,
        });
      }
      if (epoch !== walletEpoch) return;
      await get().fetchTransactions(token, 1);
      succeeded = true;
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
    } finally {
      if (succeeded && epoch === walletEpoch) walletFetchedAt = Date.now();
    }
    })();

    walletFlight = run;
    run.finally(() => {
      if (walletFlight === run) walletFlight = null;
    });
    return run;
  },

  fetchTransactions: async (token, page = 1) => {
    try {
      // 1. Fetch Credit Transactions
      const data = await apiFetch(`/api/credits/transactions?page=${page}&limit=20`, { token });
      const newTxs = data.transactions?.map((t: any) => {
        let type = t.amount > 0 ? "credit" : "debit";
        let amount = Math.abs(t.amount);
        let currency = "credits";
        
        // Fix currency parsing based on transaction type
        if (t.type === "RECONVERSION") {
          currency = "credits"; // Bought credits using cash
        } else if (t.type === "CONVERSION") {
          currency = "credits"; // Sold credits for cash
        } else if (t.amount === 0 && t.description.includes("Topped up ₹")) {
          currency = "cash";
          type = "credit";
          const match = t.description.match(/₹([\d.]+)/);
          if (match) amount = parseFloat(match[1]);
        }

        return {
          id: t.id,
          type,
          amount,
          currency,
          description: t.description,
          dateRaw: new Date(t.createdAt),
          date: new Date(t.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        };
      }) || [];

      set((state) => {
        const merged = page === 1
          ? newTxs
          : [...state.transactions, ...newTxs];
        if (page === 1 && transactionsMatch(state.transactions, merged)) return state;
        return { transactions: merged };
      });
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  },

  addTransaction: (type, amount, currency, description) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type,
      amount,
      currency,
      description,
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    set((state) => ({
      transactions: [newTx, ...state.transactions],
    }));
  },

  buyCredits: async (creditsAmount, _inrCost) => {
    try {
      const token = useAuthStore.getState().token;
      let orderData: any = null;
      try {
        orderData = await apiFetch("/api/credits/create-order", {
          method: "POST",
          token,
          body: JSON.stringify({ credits: creditsAmount }),
        });
      } catch (err: any) {
        if (err?.message?.includes("Card payments") || err?.message?.includes("not configured")) {
          get().noteLocalWalletChange();
          set((s) => ({ credits: s.credits + creditsAmount }));
          return { success: true, message: `Test mode: ${creditsAmount} credits added directly.` };
        }
        throw err;
      }

      if (orderData?.directAccepted) {
        const newTotal = typeof orderData.newCreditBalance === "number"
          ? orderData.newCreditBalance
          : get().credits + creditsAmount;
        get().noteLocalWalletChange();
        set({ credits: newTotal });
        return { success: true, message: orderData.message || `Successfully purchased ${creditsAmount} credits.` };
      }

      await confirmRazorpayOrder(orderData, "Purchase " + creditsAmount + " ZonoFit Credits");
      return { success: true, message: "Successfully purchased " + creditsAmount + " credits." };
    } catch (err: any) {
      const msg = err.description || err.message || "Payment failed.";
      return { success: false, message: msg };
    }
  },

  topUpCash: async (amountINR) => {
    try {
      const token = useAuthStore.getState().token;
      let orderData: any = null;
      try {
        orderData = await apiFetch("/api/credits/create-cash-order", {
          method: "POST",
          token,
          body: JSON.stringify({ amountINR }),
        });
      } catch (err: any) {
        if (err?.message?.includes("Card payments") || err?.message?.includes("not configured")) {
          set((s) => ({ cashBalance: s.cashBalance + amountINR }));
          return { success: true, message: `Test mode: ₹${amountINR} cash added directly.` };
        }
        throw err;
      }

      if (orderData?.directAccepted) {
        if (typeof orderData.newCashBalance === "number") {
          set({ cashBalance: orderData.newCashBalance });
        }
        return { success: true, message: orderData.message || `Successfully added ₹${amountINR}.` };
      }

      await confirmRazorpayOrder(orderData, "Top up Rs " + amountINR);
      return { success: true, message: "Successfully added Rs " + amountINR + "." };
    } catch (err: any) {
      const msg = err.description || err.message || "Payment failed.";
      return { success: false, message: msg };
    }
  },

  buyGymSubscription: async () => {
    return {
      success: false,
      message: "Buy a membership from checkout. Credits are added only after the payment is confirmed.",
    };
  },

  buyMarketplaceItem: async (itemId, costInInr) => {
    const creditsNeeded = shopCreditsForRupees(costInInr);
    if (get().credits < creditsNeeded) {
      return {
        success: false,
        message: `This item costs ${creditsNeeded} credits (1 credit = ₹8). You have ${get().credits}.`,
      };
    }

    try {
      const token = useAuthStore.getState().token;
      const data = await apiFetch("/api/marketplace/order", {
        method: "POST",
        token,
        body: JSON.stringify({ itemId, quantity: 1 }),
      });
      if (typeof data.newCreditBalance === "number") {
        set({ credits: data.newCreditBalance });
      } else if (typeof data.creditsUsed === "number") {
        set((state) => ({ credits: Math.max(0, state.credits - data.creditsUsed) }));
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to process order." };
    }
  },

  checkoutCart: async (items, _totalCostInr, couponCode, _creditsToUse = 0, address) => {
    try {
      const token = useAuthStore.getState().token;
      const data = await apiFetch("/api/marketplace/checkout", {
        method: "POST",
        token,
        body: JSON.stringify({ items, couponCode, address }),
      });

      if (typeof data.breakdown?.newCreditBalance === "number") {
        get().noteLocalWalletChange();
        set({ credits: data.breakdown.newCreditBalance });
      } else if (data.breakdown) {
        const creditsUsed = data.breakdown.creditsUsed || 0;
        get().noteLocalWalletChange();
        set((state) => ({ credits: Math.max(0, state.credits - creditsUsed) }));
      }
      return { success: true, breakdown: data.breakdown, orders: data.orders };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to process checkout." };
    }
  },

  bookVisitWithCash: () => {
    return false;
  },

  convertCreditsToCash: async (creditsAmount) => {
    try {
      const token = useAuthStore.getState().token;
      const data = await apiFetch("/api/credits/convert", {
        method: "POST",
        token,
        body: JSON.stringify({ credits: creditsAmount })
      });
      get().noteLocalWalletChange();
      set({
        credits: data.newCreditBalance,
        cashBalance: data.newConvertibleCashBalanceINR
      });
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error("Conversion failed:", err);
      return { success: false, message: err.message };
    }
  },

  convertCashToCredits: async (creditsToBuy) => {
    try {
      const token = useAuthStore.getState().token;
      const data = await apiFetch("/api/credits/reconvert", {
        method: "POST",
        token,
        body: JSON.stringify({ creditsToBuy })
      });
      get().noteLocalWalletChange();
      set({
        credits: data.newCreditBalance,
        cashBalance: data.newConvertibleCashBalanceINR
      });
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error("Reconversion failed:", err);
      return { success: false, message: err.message };
    }
  },

  deductCredits: async () => {
    return {
      success: false,
      message: "Credits are spent when a visit is booked. The wallet cannot deduct them on its own.",
    };
  },
}),
    {
      name: "zonofit_credits_state",
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        credits: state.credits,
        cashBalance: state.cashBalance,
        inrWallet: state.inrWallet,
        membershipInfo: state.membershipInfo,
        transactions: (state.transactions || []).slice(0, 20),
      }),
    }
  )
);
