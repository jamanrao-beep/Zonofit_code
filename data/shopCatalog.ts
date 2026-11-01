export const SHOP_CREDIT_INR = 10;
export const GYM_CREDIT_INR = 10;

export type ShopGoal = "mg" | "fl" | "st" | "en" | "rc" | "dw";
export type ShopCategory = "Supplements" | "Gear" | "Apparel" | "Recovery" | "Accessories";
export type ShopShape = "tub" | "bottle" | "tee" | "dumb" | "roller" | "watch" | "bag" | "bands" | "mat";

export interface ShopProduct {
  id: string;
  name: string;
  brand: string;
  category: ShopCategory;
  sub: string;
  goals: ShopGoal[];
  optionLabel: string;
  options: string[];
  defaultOption: number;
  pack: string;
  price: number;
  mrp: number;
  rating: number;
  ratingCount: string;
  color: string;
  shape: ShopShape;
  best: boolean;
  imageUrl?: string;
  images?: string[];
  description: string;
  info?: string;
  specs?: { label: string; value: string }[];
  sizeOptions?: string[];
  colorOptions?: string[];
  variantImages?: Record<string, string>;
  /** Sample catalogue copy. Admin-only products leave this false so empty fields stay hidden. */
  catalogueCopy?: boolean;
  purchasable: boolean;
  inStock: boolean;
}

export interface LiveMarketplaceItem {
  id: string;
  title: string;
  description?: string;
  pricePaise: number;
  imageUrl?: string;
  imageUrls?: unknown;
  inStock?: boolean;
  storeCategory?: string;
  sizes?: unknown;
  colors?: unknown;
  brand?: string | null;
  info?: string | null;
  pack?: string | null;
  optionLabel?: string | null;
  mrpPaise?: number | null;
  variants?: unknown;
  specs?: unknown;
  /** Older saves kept these inside one object. New saves use the fields above. */
  details?: unknown;
}

type ProductDetails = {
  brand?: string;
  info?: string;
  pack?: string;
  optionLabel?: string;
  mrpPaise?: number | null;
  variants?: { name?: string; imageUrl?: string }[];
  specs?: { label?: string; value?: string }[];
};

function readDetails(value: unknown): ProductDetails {
  if (!value || typeof value !== "object") return {};
  return value as ProductDetails;
}

function filledText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function specRows(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const entry = row && typeof row === "object" ? (row as { label?: string; value?: string }) : {};
      return { label: String(entry.label || "").trim(), value: String(entry.value || "").trim() };
    })
    .filter((row) => row.label && row.value);
}

function variantRows(value: unknown): { names: string[]; images: Record<string, string> } {
  const images: Record<string, string> = {};
  if (!Array.isArray(value)) return { names: [], images };
  const names = value
    .map((row) => {
      const entry = row && typeof row === "object" ? (row as { name?: string; imageUrl?: string }) : {};
      const name = String(entry.name || "").trim();
      const imageUrl = String(entry.imageUrl || "").trim();
      if (name && /^https?:\/\//i.test(imageUrl)) images[name] = imageUrl;
      return name;
    })
    .filter(Boolean);
  return { names, images };
}

function httpPhotos(value: unknown, single?: string): string[] {
  const list = asStringList(value).filter((url) => /^https?:\/\//i.test(url));
  if (single && /^https?:\/\//i.test(single) && !list.includes(single)) list.unshift(single);
  return list;
}

export const GOAL_LABEL: Record<ShopGoal, string> = {
  mg: "Muscle Gain",
  fl: "Fat Loss",
  st: "Strength",
  en: "Energy",
  rc: "Recovery",
  dw: "Daily Wellness",
};

export const SHOP_CATEGORIES: { id: string; name: ShopCategory; icon: string }[] = [
  { id: "supplements", name: "Supplements", icon: "nutrition-outline" },
  { id: "gear", name: "Gear", icon: "barbell-outline" },
  { id: "apparel", name: "Apparel", icon: "shirt-outline" },
  { id: "recovery", name: "Recovery", icon: "fitness-outline" },
  { id: "accessories", name: "Accessories", icon: "watch-outline" },
];

export const SHOP_GOALS: { id: ShopGoal; name: string; icon: string }[] = [
  { id: "mg", name: "Muscle Gain", icon: "barbell-outline" },
  { id: "fl", name: "Fat Loss", icon: "flame-outline" },
  { id: "st", name: "Strength", icon: "barbell-outline" },
  { id: "en", name: "Energy", icon: "flash-outline" },
  { id: "rc", name: "Recovery", icon: "moon-outline" },
  { id: "dw", name: "Daily Wellness", icon: "leaf-outline" },
];

const HIGHLIGHTS: Record<ShopCategory, string[]> = {
  Supplements: ["Mixes easily with water or milk", "Fits into a daily routine", "Check the label for batch and expiry"],
  Gear: ["Built for regular home and gym use", "Easy to carry and store", "Suitable for beginners to advanced"],
  Apparel: ["Breathable, quick-dry feel", "Comfortable fit for training", "Easy care wash"],
  Recovery: ["Helps you wind down after training", "Compact and easy to use", "Fits into a daily recovery routine"],
  Accessories: ["Made for everyday gym carry", "Easy to clean and maintain", "Simple design that goes with anything"],
};

export const SHOP_REVIEWS: { name: string; stars: number; text: string }[] = [
  { name: "Rahul S.", stars: 5, text: "Good quality, order was handled smoothly and the price was fair." },
  { name: "Priya M.", stars: 4, text: "Does the job well. Would order again through ZonoFit." },
];

export const RATING_BARS: { stars: number; pct: number }[] = [
  { stars: 5, pct: 70 },
  { stars: 4, pct: 20 },
  { stars: 3, pct: 6 },
  { stars: 2, pct: 2 },
  { stars: 1, pct: 2 },
];

export function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function offPercent(product: ShopProduct): number {
  if (product.mrp <= product.price) return 0;
  return Math.round((1 - product.price / product.mrp) * 100);
}

export function defaultOptionValue(product: ShopProduct): string {
  return product.options[product.defaultOption] || product.options[0] || "";
}

export function highlightsFor(category: ShopCategory): string[] {
  return HIGHLIGHTS[category];
}

export function categoryIdFor(name: string): string {
  return SHOP_CATEGORIES.find((cat) => cat.name.toLowerCase() === name.toLowerCase())?.id || name.toLowerCase();
}

export function categoryNameFor(id: string): ShopCategory | null {
  const known = SHOP_CATEGORIES.find((cat) => cat.id === id || cat.name.toLowerCase() === id.toLowerCase());
  return known ? known.name : null;
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry).trim()).filter(Boolean);
}

function inferCategory(blob: string, storeCategory?: string): ShopCategory {
  if (/whey|protein|creatine|bcaa|preworkout|vitamin|omega|supplement/.test(blob)) return "Supplements";
  if (/tee|tshirt|short|jogger|apparel|compression/.test(blob)) return "Apparel";
  if (/roller|massage|electrolyte|recovery/.test(blob)) return "Recovery";
  if (/dumbbell|band|rope|yoga|glove|mat|weight/.test(blob)) return "Gear";
  if (storeCategory === "APPAREL_GEAR") return "Apparel";
  if (storeCategory === "RECOVERY_WELLNESS") return "Recovery";
  if (storeCategory === "SPORTS_ACTIVITIES" || storeCategory === "PRODUCTS") return storeCategory === "PRODUCTS" ? "Supplements" : "Gear";
  return "Accessories";
}

function inferGoals(blob: string, category: ShopCategory): ShopGoal[] {
  const goals: ShopGoal[] = [];
  if (/protein|whey|muscle|dumbbell/.test(blob)) goals.push("mg");
  if (/fat|slim|short|tee/.test(blob)) goals.push("fl");
  if (/creatine|strength|glove|wrap/.test(blob)) goals.push("st");
  if (/energy|preworkout|electrolyte/.test(blob)) goals.push("en");
  if (/recover|roller|omega|bcaa/.test(blob)) goals.push("rc");
  if (goals.length === 0) {
    if (category === "Recovery") goals.push("rc");
    else if (category === "Apparel") goals.push("fl");
    else if (category === "Supplements") goals.push("dw");
    else goals.push("dw");
  }
  return goals;
}

function inferShape(category: ShopCategory, blob: string): ShopShape {
  if (/bottle|shaker|omega/.test(blob)) return "bottle";
  if (/tee|shirt|short|jogger/.test(blob)) return "tee";
  if (/dumbbell|weight/.test(blob)) return "dumb";
  if (/roller|massage|gun/.test(blob)) return "roller";
  if (/watch|band tracker|fitness band/.test(blob)) return "watch";
  if (/bag|glove|wrap/.test(blob)) return "bag";
  if (/band|rope/.test(blob)) return "bands";
  if (/mat|pack/.test(blob)) return "mat";
  if (category === "Supplements") return "tub";
  if (category === "Apparel") return "tee";
  if (category === "Recovery") return "roller";
  if (category === "Gear") return "dumb";
  return "bag";
}

function inferSub(blob: string, category: ShopCategory): string {
  if (/whey|protein/.test(blob)) return "Protein";
  if (/creatine/.test(blob)) return "Creatine";
  if (/preworkout/.test(blob)) return "Pre-Workout";
  if (/bcaa/.test(blob)) return "Recovery";
  if (/vitamin|omega/.test(blob)) return "Wellness";
  if (/dumbbell|weight/.test(blob)) return "Weights";
  if (/yoga|mat/.test(blob)) return "Mats";
  if (/tee|tshirt/.test(blob)) return "Tops";
  if (/short|jogger/.test(blob)) return "Bottoms";
  if (/roller|massage/.test(blob)) return "Mobility";
  if (/shaker|bottle/.test(blob)) return "Bottles";
  if (/bag/.test(blob)) return "Bags";
  return category;
}

export function mergeLiveItems(live: LiveMarketplaceItem[]): ShopProduct[] {
  const products: ShopProduct[] = [];

  for (const item of live) {
    if (!item?.id || !item.title) continue;
    const price = Math.round((Number(item.pricePaise) || 0) / 100);
    const sizes = asStringList(item.sizes);
    const colors = asStringList(item.colors);
    const inStock = item.inStock !== false;
    const details = readDetails(item.details);
    const photos = httpPhotos(item.imageUrls, item.imageUrl);
    const ownSpecs = specRows(item.specs);
    const specs = ownSpecs.length ? ownSpecs : specRows(details.specs);
    const fromVariants = variantRows(item.variants);
    const fromOldVariants = variantRows(details.variants);
    const variantImages = Object.keys(fromVariants.images).length ? fromVariants.images : fromOldVariants.images;
    const variantNames = fromVariants.names.length ? fromVariants.names : fromOldVariants.names;
    const brand = filledText(item.brand) || filledText(details.brand);
    const info = filledText(item.info) || filledText(details.info);
    const pack = filledText(item.pack) || filledText(details.pack);
    const optionLabel = filledText(item.optionLabel) || filledText(details.optionLabel);
    const mrpPaise = Number(item.mrpPaise) || Number(details.mrpPaise) || 0;
    const mrpFromAdmin = Math.round(mrpPaise / 100);
    const bothChoices = sizes.length > 0 && colors.length > 0;
    const choiceLabel = optionLabel
      || (sizes.length ? "Size" : colors.length ? "Colour" : variantNames.length ? "Option" : "");
    const choiceValues = bothChoices ? [] : sizes.length ? sizes : colors.length ? colors : variantNames;

    const blob = norm(`${item.title} ${item.description || ""}`);
    const category = inferCategory(blob, item.storeCategory);
    products.push({
      id: item.id,
      name: item.title,
      brand,
      category,
      sub: inferSub(blob, category),
      goals: [],
      optionLabel: choiceLabel,
      options: choiceValues,
      defaultOption: 0,
      pack,
      price,
      mrp: mrpFromAdmin > price ? mrpFromAdmin : price,
      rating: 0,
      ratingCount: "",
      color: "#1F7A3F",
      shape: inferShape(category, blob),
      best: false,
      imageUrl: photos[0],
      images: photos,
      description: item.description?.trim() || "",
      info,
      specs,
      sizeOptions: sizes,
      colorOptions: colors,
      variantImages,
      catalogueCopy: false,
      purchasable: inStock && price > 0,
      inStock,
    });
  }

  return products;
}

export interface ShopListQuery {
  category?: ShopCategory | null;
  goal?: string;
  brand?: string;
  q?: string;
  wish?: boolean;
  best?: boolean;
  wishedIds?: string[];
}

export function filterShopProducts(products: ShopProduct[], query: ShopListQuery): ShopProduct[] {
  const q = (query.q || "").trim().toLowerCase();
  return products.filter((product) => {
    if (query.category && product.category !== query.category) return false;
    if (query.goal && !product.goals.includes(query.goal as ShopGoal)) return false;
    if (query.brand && product.brand.toLowerCase() !== query.brand.toLowerCase()) return false;
    if (query.best && !product.best) return false;
    if (query.wish && !query.wishedIds?.includes(product.id)) return false;
    if (!q) return true;
    const hay = `${product.name} ${product.brand} ${product.category} ${product.sub} ${product.pack}`.toLowerCase();
    return hay.includes(q);
  });
}

export type ShopSort = "pop" | "rt" | "lo" | "hi";

export function sortShopProducts(products: ShopProduct[], sort: ShopSort): ShopProduct[] {
  const next = [...products];
  if (sort === "lo") next.sort((a, b) => a.price - b.price);
  if (sort === "hi") next.sort((a, b) => b.price - a.price);
  if (sort === "rt") next.sort((a, b) => b.rating - a.rating);
  return next;
}
