import { create } from "zustand";

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
  
  // Actions
  buyCredits: (creditsAmount: number, inrCost: number) => boolean;
  convertCreditsToCash: (creditsAmount: number) => boolean;
  deductCredits: (creditsAmount: number, description: string) => boolean;
  addTransaction: (type: "debit" | "credit", amount: number, currency: "credits" | "cash", description: string) => void;
}

export const useCreditsStore = create<CreditsState>((set, get) => ({
  credits: 420,
  cashBalance: 450,
  transactions: [
    {
      id: "tx-1",
      type: "debit",
      amount: 8,
      currency: "credits",
      description: "Workout Booking - PowerHouse Fitness",
      date: "23 Jun 2026",
    },
    {
      id: "tx-2",
      type: "credit",
      amount: 200,
      currency: "credits",
      description: "Pack Purchase - Summer Pack",
      date: "15 Jun 2026",
    },
    {
      id: "tx-3",
      type: "debit",
      amount: 100,
      currency: "credits",
      description: "Converted to INR Cash Balance",
      date: "10 Jun 2026",
    },
    {
      id: "tx-4",
      type: "credit",
      amount: 800,
      currency: "cash",
      description: "Credits Conversion (100 credits @ ₹8)",
      date: "10 Jun 2026",
    },
  ],

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

  buyCredits: (creditsAmount, inrCost) => {
    const { cashBalance } = get();
    if (cashBalance < inrCost) {
      return false; // Insufficient cash balance
    }
    
    set((state) => ({
      cashBalance: state.cashBalance - inrCost,
      credits: state.credits + creditsAmount,
    }));

    // Log the transactions
    get().addTransaction("debit", inrCost, "cash", `Bought ${creditsAmount} Credits`);
    get().addTransaction("credit", creditsAmount, "credits", "Credits Pack Purchase");
    return true;
  },

  convertCreditsToCash: (creditsAmount) => {
    const { credits } = get();
    if (credits < creditsAmount) {
      return false; // Insufficient credits
    }

    const inrValue = creditsAmount * 8; // Conversion rate: 1 credit = ₹8 outside gym
    set((state) => ({
      credits: state.credits - creditsAmount,
      cashBalance: state.cashBalance + inrValue,
    }));

    get().addTransaction("debit", creditsAmount, "credits", "Converted to Cash Balance");
    get().addTransaction("credit", inrValue, "cash", `Credits Conversion (${creditsAmount} credits @ ₹8)`);
    return true;
  },

  deductCredits: (creditsAmount, description) => {
    const { credits } = get();
    if (credits < creditsAmount) {
      return false;
    }

    set((state) => ({
      credits: state.credits - creditsAmount,
    }));

    get().addTransaction("debit", creditsAmount, "credits", description);
    return true;
  },
}));
