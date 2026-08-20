import { create } from "zustand";

export interface ShopItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  weight?: string;
  flavor?: string;
}

export interface CartItem {
  item: ShopItem;
  quantity: number;
}

export interface AppliedCoupon {
  code: string;
  discountType: string;
  discountValue: number;
}

interface CartState {
  cartItems: CartItem[];
  appliedCoupon: AppliedCoupon | null;
  
  addToCart: (item: ShopItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getDiscountedPrice: () => number;
  getTotalItems: () => number;
  applyCoupon: (coupon: AppliedCoupon) => void;
  clearCoupon: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cartItems: [],
  appliedCoupon: null,

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

  clearCart: () => set({ cartItems: [], appliedCoupon: null }),

  getTotalPrice: () => {
    return get().cartItems.reduce(
      (total, ci) => {
        const itemPriceInr = ci.item.price !== undefined ? ci.item.price : ((ci.item as any).pricePaise / 100);
        return total + itemPriceInr * ci.quantity;
      },
      0
    );
  },

  getDiscountedPrice: () => {
    const total = get().getTotalPrice();
    const coupon = get().appliedCoupon;
    if (!coupon) return total;

    if (coupon.discountType === "PERCENTAGE") {
      return Math.max(0, Math.floor(total - (total * (coupon.discountValue / 100))));
    } else if (coupon.discountType === "RUPEES") {
      return Math.max(0, total - coupon.discountValue);
    }
    return total;
  },

  getTotalItems: () => {
    return get().cartItems.reduce((total, ci) => total + ci.quantity, 0);
  },

  applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
  clearCoupon: () => set({ appliedCoupon: null }),
}));
