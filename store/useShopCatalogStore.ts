import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { mergeLiveItems, type LiveMarketplaceItem, type ShopProduct } from "@/data/shopCatalog";

interface ShopCatalogState {
  products: ShopProduct[];
  loading: boolean;
  loaded: boolean;
  loadError: boolean;
  load: () => Promise<void>;
}

export const useShopCatalogStore = create<ShopCatalogState>((set, get) => ({
  products: [],
  loading: false,
  loaded: false,
  loadError: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await apiFetch("/api/marketplace/items", { silent: true });
      const live = Array.isArray(data) ? (data as LiveMarketplaceItem[]) : [];
      set({ products: mergeLiveItems(live), loading: false, loaded: true, loadError: false });
    } catch {
      set({ loading: false, loadError: true });
    }
  },
}));
