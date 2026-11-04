declare const CATEGORIES: readonly ["PRODUCTS", "SPORTS_ACTIVITIES", "APPAREL_GEAR", "RECOVERY_WELLNESS", "ZONOFIT_COMMON"];
export type MarketplaceVariant = {
    name: string;
    imageUrl: string;
};
export type MarketplaceSpec = {
    label: string;
    value: string;
};
export type MarketplaceWrite = {
    title: string;
    description: string;
    pricePaise: number;
    imageUrl: string;
    imageUrls: string[];
    inStock: boolean;
    storeCategory: (typeof CATEGORIES)[number];
    sizes: string[];
    colors: string[];
    brand: string | null;
    info: string | null;
    pack: string | null;
    optionLabel: string | null;
    mrpPaise: number | null;
    variants: MarketplaceVariant[];
    specs: MarketplaceSpec[];
};
export declare function readMarketplaceWrite(body: Record<string, unknown>): MarketplaceWrite | {
    error: string;
};
export declare function presentPhotoList(imageUrls: unknown, imageUrl?: string | null): string[];
export declare function presentMarketplaceItem<T extends {
    imageUrl?: string | null;
    imageUrls?: unknown;
    variants?: unknown;
}>(item: T): T & {
    imageUrl: string;
    imageUrls: string[];
    variants: unknown;
};
export {};
//# sourceMappingURL=marketplaceItem.d.ts.map