import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export interface ProductRequestItem {
  id: string;
  name: string;
  category?: string;
  requestedAt: number;
}

interface ShopRequestsState {
  requests: ProductRequestItem[];
  addRequest: (name: string, category?: string) => boolean;
  removeRequest: (idOrName: string) => void;
  hasRequested: (name: string) => boolean;
}

export const useShopRequestsStore = create<ShopRequestsState>()(
  persist(
    (set, get) => ({
      requests: [
        {
          id: "default-1",
          name: "Whey Protein Isolate",
          category: "Supplements",
          requestedAt: Date.now() - 86400000,
        },
      ],
      addRequest: (name, category) => {
        const trimmed = name.trim();
        if (!trimmed) return false;
        const exists = get().requests.some(
          (r) => r.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) return false;

        const newItem: ProductRequestItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: trimmed,
          category,
          requestedAt: Date.now(),
        };

        set((state) => ({
          requests: [newItem, ...state.requests],
        }));
        return true;
      },
      removeRequest: (idOrName) => {
        set((state) => ({
          requests: state.requests.filter(
            (r) => r.id !== idOrName && r.name.toLowerCase() !== idOrName.toLowerCase()
          ),
        }));
      },
      hasRequested: (name) => {
        const trimmed = name.trim().toLowerCase();
        return get().requests.some((r) => r.name.toLowerCase() === trimmed);
      },
    }),
    {
      name: "zonofit_shop_product_requests",
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
