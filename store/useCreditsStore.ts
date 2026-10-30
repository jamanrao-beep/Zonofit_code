import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import { apiFetch } from "@/lib/api";
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
  fetchWallet: (token: string) => Promise<void>;
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
  ) => Promise<{ success: boolean; message?: string; breakdown?: any; orders?: { id: string; quantity: number; totalPaise: number; item?: { title?: string } }[] }>;
  reset: () => void;
}

async function confirmRazorpayOrder(orderData: any, description: string) {
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
  if (token) await useCreditsStore.getState().fetchWallet(token);
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

  reset: () => set({
    credits: 0,
    cashBalance: 0,
    inrWallet: null,
    membershipInfo: null,
    transactions: [],
    loading: false,
  }),

  fetchWallet: async (token) => {
    set({ loading: true });
    try {
      const data = await apiFetch("/api/credits/balance", { token });
      set({
        credits: data.balance ?? 0,
        cashBalance: (data.convertibleCashBalanceINR || 0) + (data.nonConvertibleCashBalanceINR || 0),
        inrWallet: data.inrWallet || null,
        membershipInfo: data.membership || null,
        loading: false,
      });
      // Optionally fetch the first page of transactions automatically
      get().fetchTransactions(token, 1);
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
      set({ loading: false });
    }
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

      // 2. Fetch Marketplace Orders (only on first page to avoid duplication for now)
      let marketplaceTxs: any[] = [];
      if (page === 1) {
        try {
          const orders = await apiFetch("/api/marketplace/orders", { token });
          marketplaceTxs = orders.map((o: any) => ({
            id: `mp-${o.id}`,
            type: "debit",
            amount: Math.abs(o.totalPaise / 100),
            currency: "cash",
            description: `Marketplace: ${o.quantity}x ${o.item.title}`,
            dateRaw: new Date(o.createdAt),
            date: new Date(o.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          }));
        } catch(e) {
          console.error("Failed to fetch marketplace orders", e);
        }
      }

      set((state) => {
        const merged = page === 1 
          ? [...newTxs, ...marketplaceTxs].sort((a, b) => b.dateRaw.getTime() - a.dateRaw.getTime())
          : [...state.transactions, ...newTxs];
        
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
      const orderData = await apiFetch("/api/credits/create-order", {
        method: "POST",
        token,
        body: JSON.stringify({ credits: creditsAmount }),
      });
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
      const orderData = await apiFetch("/api/credits/create-cash-order", {
        method: "POST",
        token,
        body: JSON.stringify({ amountINR }),
      });
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
    const { cashBalance } = get();

    if (cashBalance < costInInr) {
      return { success: false, message: "Insufficient Converted Cash Balance." };
    }
    
    try {
      const token = useAuthStore.getState().token;
      await apiFetch("/api/marketplace/order", {
        method: "POST",
        token,
        body: JSON.stringify({ itemId, quantity: 1 }),
      });
      
      // Update local state and fetch from server
      set((state) => ({ cashBalance: state.cashBalance - costInInr }));
      
      // We assume there's a token stored in useAuthStore, but here we can just rely on the existing token or refetch when next needed.
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to process order." };
    }
  },

  checkoutCart: async (items, totalCostInr, couponCode, creditsToUse = 0) => {
    try {
      const token = useAuthStore.getState().token;
      const data = await apiFetch("/api/marketplace/checkout", {
        method: "POST",
        token,
        body: JSON.stringify({ items, couponCode, creditsToUse }),
      });
      
      if (data.breakdown) {
        const inrUsed = (data.breakdown.inrPaiseUsed || 0) / 100;
        const creditsUsed = data.breakdown.creditsUsed || 0;
        set((state) => ({ 
          cashBalance: Math.max(0, state.cashBalance - inrUsed),
          credits: Math.max(0, state.credits - creditsUsed),
        }));
      } else {
        set((state) => ({ cashBalance: Math.max(0, state.cashBalance - totalCostInr) }));
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
