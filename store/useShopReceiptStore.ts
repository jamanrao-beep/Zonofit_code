import { create } from "zustand";

export interface ShopReceipt {
  ids: string[];
  lines: string[];
  itemTotal: number;
  cashUsed: number;
  creditsUsed: number;
  creditsLeft: number;
}

interface ShopReceiptState {
  receipt: ShopReceipt | null;
  setReceipt: (receipt: ShopReceipt) => void;
  clear: () => void;
}

export const useShopReceiptStore = create<ShopReceiptState>((set) => ({
  receipt: null,
  setReceipt: (receipt) => set({ receipt }),
  clear: () => set({ receipt: null }),
}));
