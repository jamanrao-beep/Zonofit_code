import { create } from "zustand";
import { MarketplaceItem } from "@/app/marketplace"; // Make sure to export it if not already exported

export interface CartItem {
  item: MarketplaceItem;
  quantity: number;
}

interface CartState {
  cartItems: CartItem[];
  
  addToCart: (item: MarketplaceItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  cartItems: [],

  addToCart: (item) => {
    set((state) => {
      const existingItem = state.cartItems.find((ci) => ci.item.id === item.id);
      if (existingItem) {
        return {
          cartItems: state.cartItems.map((ci) =>
            ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
          ),
        };
      }
      return { cartItems: [...state.cartItems, { item, quantity: 1 }] };
    });
  },

  removeFromCart: (itemId) => {
    set((state) => ({
      cartItems: state.cartItems.filter((ci) => ci.item.id !== itemId),
    }));
  },

  updateQuantity: (itemId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { cartItems: state.cartItems.filter((ci) => ci.item.id !== itemId) };
      }
      return {
        cartItems: state.cartItems.map((ci) =>
          ci.item.id === itemId ? { ...ci, quantity } : ci
        ),
      };
    });
  },

  clearCart: () => set({ cartItems: [] }),

  getTotalPrice: () => {
    return get().cartItems.reduce(
      (total, ci) => total + ci.item.pricePaise * ci.quantity,
      0
    );
  },

  getTotalItems: () => {
    return get().cartItems.reduce((total, ci) => total + ci.quantity, 0);
  },
}));
