import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

interface WishlistState {
  ids: string[];
  toggle: (id: string) => void;
}

/** Saved on this phone only. There is no wishlist table on the server. */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id) ? state.ids.filter((entry) => entry !== id) : [...state.ids, id],
        })),
    }),
    {
      name: "zonofit_shop_wishlist",
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
