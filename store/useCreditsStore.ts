import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "./useAuthStore";

export interface Transaction {
  id: string;
  type: "debit" | "credit";
  amount: number;
  currency: "credits" | "cash";
  description: string;
  date: string;
}

interface CreditsState {
  credits: number;
  cashBalance: number;
  transactions: Transaction[];
  loading: boolean;
  
  // Actions
  fetchWallet: (token: string) => Promise<void>;
  buyGymSubscription: (gymName: string, inrPaid: number, initialCreditDeduction: number) => Promise<{ success: boolean; message?: string }>;
  buyMarketplaceItem: (itemId: string, costInInr: number) => Promise<{ success: boolean; message?: string }>;
  bookVisitWithCash: (gymName: string, costInInr: number) => boolean;
  buyCredits: (creditsAmount: number, inrCost: number) => Promise<{ success: boolean; message?: string }>;
  convertCreditsToCash: (creditsAmount: number) => Promise<{ success: boolean; message?: string }>;
  deductCredits: (creditsAmount: number, description: string) => Promise<{ success: boolean; message?: string }>;
  addTransaction: (type: "debit" | "credit", amount: number, currency: "credits" | "cash", description: string) => void;
}

export const useCreditsStore = create<CreditsState>((set, get) => ({
  credits: 0,
  cashBalance: 0,
  transactions: [],
  loading: false,

  fetchWallet: async (token) => {
    set({ loading: true });
    try {
      const data = await apiFetch("/api/credits/balance", { token });
      set({
        credits: data.balance || 0,
        cashBalance: (data.cashBalanceInPaise || 0) / 100,
        transactions: data.transactions?.map((t: any) => ({
          id: t.id,
          type: t.amount > 0 ? "credit" : "debit",
          amount: Math.abs(t.amount),
          currency: t.type === "CONVERSION" ? "cash" : "credits",
          description: t.description,
          date: new Date(t.createdAt).toLocaleDateString(),
        })) || [],
        loading: false,
      });
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
      set({ loading: false });
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

  buyCredits: async (creditsAmount, inrCost) => {
    try {
      const token = useAuthStore.getState().token;
      
      // Step 1: Create Order
      const orderData = await apiFetch("/api/credits/create-order", {
        method: "POST",
        token,
        body: JSON.stringify({ credits: creditsAmount }),
      });

      // Step 2: Open Razorpay
      const RazorpayCheckout = require('react-native-razorpay').default;
      const options = {
        description: `Purchase ${creditsAmount} ZonoFit Credits`,
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: orderData.currency,
        key: 'rzp_test_placeholder', // This should be replaced with actual env var in production
        amount: orderData.amount,
        name: 'ZonoFit',
        order_id: orderData.razorpayOrderId,
        theme: { color: '#059669' }
      };

      await RazorpayCheckout.open(options);

      // Step 3: Refresh Wallet since webhook handled the deposit
      await get().fetchWallet(token!);
      return { success: true, message: `Successfully purchased ${creditsAmount} credits!` };
    } catch (err: any) {
      console.error("Failed to buy credits via Razorpay:", err);
      // Razorpay cancel throws an error object like { code: 0, description: "Payment cancelled" }
      const msg = err.description || err.message || "Payment Failed";
      return { success: false, message: msg };
    }
  },

  buyGymSubscription: async (gymName, inrPaid, initialCreditDeduction) => {
    const creditsGained = inrPaid / 10;
    try {
      const token = useAuthStore.getState().token;
      
      // Step 1: Create Order
      const orderData = await apiFetch("/api/credits/create-order", {
        method: "POST",
        token,
        body: JSON.stringify({ credits: creditsGained }),
      });

      // Step 2: Open Razorpay
      const RazorpayCheckout = require('react-native-razorpay').default;
      const options = {
        description: `${gymName} Subscription (${creditsGained} Credits)`,
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: orderData.currency,
        key: 'rzp_test_placeholder',
        amount: orderData.amount,
        name: 'ZonoFit',
        order_id: orderData.razorpayOrderId,
        theme: { color: '#059669' }
      };

      await RazorpayCheckout.open(options);

      // Step 3: Deduct initial commitment if payment was successful
      await apiFetch("/api/credits/deduct", {
        method: "POST",
        token,
        body: JSON.stringify({
          credits: initialCreditDeduction,
          description: `10-Day Upfront Commitment - ${gymName}`
        })
      });

      // Step 4: Refresh Wallet
      await get().fetchWallet(token!);
      return { success: true, message: "Subscription purchased successfully." };
    } catch (err: any) {
      console.error("Failed to buy gym subscription via Razorpay:", err);
      const msg = err.description || err.message || "Payment Failed";
      return { success: false, message: msg };
    }
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

  bookVisitWithCash: (gymName, costInInr) => {
    const { cashBalance } = get();
    if (cashBalance < costInInr) {
      return false;
    }
    set((state) => ({ cashBalance: state.cashBalance - costInInr }));
    get().addTransaction("debit", costInInr, "cash", `Workout Booking (Distant Venue) - ${gymName}`);
    return true;
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
        cashBalance: data.newCashBalanceINR
      });
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error("Conversion failed:", err);
      return { success: false, message: err.message };
    }
  },

  deductCredits: async (creditsAmount, description) => {
    try {
      const token = useAuthStore.getState().token;
      const data = await apiFetch("/api/credits/deduct", {
        method: "POST",
        token,
        body: JSON.stringify({
          credits: creditsAmount,
          description
        })
      });

      set({ credits: data.newBalance });
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error("Deduct failed:", err);
      return { success: false, message: err.message };
    }
  },
}));
