import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { SAMPLE_PRODUCTS, mergeLiveItems, type LiveMarketplaceItem, type ShopProduct } from "@/data/shopCatalog";

interface ShopCatalogState {
  products: ShopProduct[];
  loading: boolean;
  load: () => Promise<void>;
}

export const useShopCatalogStore = create<ShopCatalogState>((set, get) => ({
  products: SAMPLE_PRODUCTS,
  loading: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await apiFetch("/api/marketplace/items", { silent: true });
      const live = Array.isArray(data) ? (data as LiveMarketplaceItem[]) : [];
      set({ products: mergeLiveItems(live), loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
