import { create } from "zustand";

export interface ShopItem {
  id: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  image: string;
  weight?: string;
  flavor?: string;
  selectedSize?: string;
  selectedColor?: string;
  variant?: string;
  /** False for catalogue previews that are not live marketplace rows. */
  purchasable?: boolean;
  color?: string;
  shape?: string;
}

/** Same product with a different flavour, size, or colour is its own cart line. */
export function cartLineKey(item: Pick<ShopItem, "id" | "variant" | "selectedSize" | "selectedColor">): string {
  const option = item.variant || [item.selectedColor, item.selectedSize].filter(Boolean).join(" • ");
  return option ? `${item.id}::${option}` : item.id;
}

export function isMarketplaceId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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
  setLineQuantity: (item: ShopItem, quantity: number) => void;
  removeLines: (keys: string[]) => void;
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
    const key = cartLineKey(item);
    set((state) => {
      const existingItem = state.cartItems.find((ci) => cartLineKey(ci.item) === key);
      if (existingItem) {
        return {
          cartItems: state.cartItems.map((ci) =>
            cartLineKey(ci.item) === key ? { ...ci, quantity: Math.min(20, ci.quantity + 1) } : ci
          ),
        };
      }
      return { cartItems: [...state.cartItems, { item, quantity: 1 }] };
    });
  },

  removeFromCart: (itemId) => {
    set((state) => {
      const byLine = state.cartItems.some((ci) => cartLineKey(ci.item) === itemId);
      const cartItems = state.cartItems.filter((ci) =>
        byLine ? cartLineKey(ci.item) !== itemId : ci.item.id !== itemId
      );
      return { cartItems, appliedCoupon: cartItems.length ? state.appliedCoupon : null };
    });
  },

  updateQuantity: (itemId, quantity) => {
    set((state) => {
      const byLine = state.cartItems.some((ci) => cartLineKey(ci.item) === itemId);
      const matches = (ci: CartItem) => (byLine ? cartLineKey(ci.item) === itemId : ci.item.id === itemId);
      if (quantity <= 0) {
        const cartItems = state.cartItems.filter((ci) => !matches(ci));
        return { cartItems, appliedCoupon: cartItems.length ? state.appliedCoupon : null };
      }
      const next = Math.min(20, quantity);
      return {
        cartItems: state.cartItems.map((ci) => (matches(ci) ? { ...ci, quantity: next } : ci)),
      };
    });
  },

  setLineQuantity: (item, quantity) => {
    const key = cartLineKey(item);
    set((state) => {
      if (quantity <= 0) {
        const cartItems = state.cartItems.filter((ci) => cartLineKey(ci.item) !== key);
        return { cartItems, appliedCoupon: cartItems.length ? state.appliedCoupon : null };
      }
      const next = Math.min(20, quantity);
      const exists = state.cartItems.some((ci) => cartLineKey(ci.item) === key);
      if (!exists) return { cartItems: [...state.cartItems, { item, quantity: next }] };
      return {
        cartItems: state.cartItems.map((ci) =>
          cartLineKey(ci.item) === key ? { ...ci, item, quantity: next } : ci
        ),
      };
    });
  },

  removeLines: (keys) => {
    set((state) => {
      const cartItems = state.cartItems.filter(
        (ci) => !keys.includes(cartLineKey(ci.item)) && !keys.includes(ci.item.id)
      );
      return { cartItems, appliedCoupon: cartItems.length ? state.appliedCoupon : null };
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
