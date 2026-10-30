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
  description: string;
  purchasable: boolean;
  inStock: boolean;
}

export interface LiveMarketplaceItem {
  id: string;
  title: string;
  description?: string;
  pricePaise: number;
  imageUrl?: string;
  inStock?: boolean;
  storeCategory?: string;
  sizes?: unknown;
  colors?: unknown;
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

const ABOUT: Record<ShopCategory, string> = {
  Supplements: "A popular pick among ZonoFit members. Use as directed on the pack and pair it with regular training.",
  Gear: "Practical training gear for your home workouts or gym sessions.",
  Apparel: "Training wear designed for movement.",
  Recovery: "Recovery essentials for the days between sessions.",
  Accessories: "Everyday accessories that make your gym routine easier.",
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

/**
 * Designed catalogue. The weight options in the source page were 25kg / 210kg / 215kg.
 * Those are stored here as 5 kg, 10 kg and 15 kg so the size control is usable.
 * Sample rows are browse-only until a live marketplace item matches the name.
 */
const RAW = `1|Gold Standard Whey|Optimum Nutrition|Supplements|Protein|mg,rc|Flavour|Chocolate;Vanilla;Cookies & Cream|0|1kg|2499|3199|4.8|1.2K|#7a4b2a|tub|1
2|MuscleBlaze Creatine|MuscleBlaze|Supplements|Creatine|mg,st|Type|Monohydrate;Micronized|0|250g|899|1199|4.7|856|#1F7A3F|tub|1
3|MuscleBlaze Performance Whey|MuscleBlaze|Supplements|Protein|mg,rc|Flavour|Chocolate;Vanilla|0|1kg|2899|3499|4.6|732|#2b4a7a|tub|1
4|Whey Protein|Avvatar|Supplements|Protein|mg,rc|Flavour|Chocolate;Mango|0|1kg|2199|2799|4.5|418|#c2552d|tub|0
5|Pre-Workout|MuscleBlaze|Supplements|Pre-Workout|en,st|Flavour|Fruit Punch;Blue Raspberry|0|300g|1299|1599|4.4|390|#6b3fa0|tub|0
6|BCAA Recovery|MyProtein|Supplements|Recovery|rc,mg|Flavour|Lemon;Watermelon|0|250g|999|1299|4.5|287|#c9961a|tub|0
7|Daily Multivitamin|Nakpro|Supplements|Wellness|dw,en|||0|60 tablets|599|799|4.3|512|#2f9e44|tub|0
8|Omega-3 Fish Oil|Nakpro|Supplements|Wellness|dw,rc|||0|90 softgels|499|699|4.4|633|#e8a317|bottle|0
9|Adjustable Dumbbell Set|FitCore|Gear|Weights|st,mg|Weight|5 kg;10 kg;15 kg|1|Pair|3999|5499|4.5|204|#37474f|dumb|0
10|Resistance Bands Set|FitCore|Gear|Bands|st,fl|Level|Light;Medium;Heavy|1|5 bands|699|999|4.6|341|#c0392b|bands|0
11|Skipping Rope|FitCore|Gear|Cardio|fl,en|||0|Adjustable|299|499|4.3|276|#1F7A3F|bands|0
12|Yoga Mat|FitCore|Gear|Mats|dw,rc|Thickness|6mm;8mm|0|183 x 61 cm|799|1199|4.5|389|#5c6bc0|mat|0
13|Gym Gloves|FitCore|Gear|Support|st|Size|S;M;L|1|Pair|399|599|4.2|158|#455a64|bag|0
14|Dry-Fit Training Tee|Kinetic|Apparel|Tops|fl,mg|Size|S;M;L;XL|1|Regular fit|699|999|4.4|312|#1F7A3F|tee|1
15|Compression Tee|Kinetic|Apparel|Tops|st|Size|S;M;L;XL|1|Slim fit|999|1499|4.5|176|#263238|tee|0
16|Training Shorts|Kinetic|Apparel|Bottoms|fl,en|Size|S;M;L;XL|1|Regular fit|799|1099|4.3|220|#2b4a7a|tee|0
17|Jogger Pants|Kinetic|Apparel|Bottoms|dw|Size|S;M;L;XL|1|Relaxed fit|1199|1799|4.4|143|#546e7a|tee|0
18|Foam Roller|RecoverX|Recovery|Mobility|rc|||0|33 cm|899|1299|4.6|267|#2e7d32|roller|0
19|Massage Gun|RecoverX|Recovery|Devices|rc|Colour|Black;Grey|0|Rechargeable|3499|4999|4.4|189|#212121|roller|0
20|Electrolyte Mix|RecoverX|Recovery|Hydration|rc,en|Flavour|Orange;Lemon|0|30 sachets|399|599|4.5|301|#f57c00|tub|0
21|Hot & Cold Pack|RecoverX|Recovery|Mobility|rc|||0|Reusable|349|549|4.2|98|#0288d1|mat|0
22|Shaker Bottle|FitCore|Accessories|Bottles|mg,dw|Colour|Green;Black|0|700 ml|349|549|4.5|455|#1F7A3F|bottle|1
23|Gym Duffel Bag|FitCore|Accessories|Bags|dw|Colour|Black;Grey|0|35 L|1299|1999|4.4|132|#37474f|bag|0
24|Fitness Band|FitCore|Accessories|Wearables|en,fl|Colour|Black;Green|0|Activity tracker|2499|3499|4.1|167|#212121|watch|0
25|Wrist Wraps|FitCore|Accessories|Support|st|||0|Pair|449|649|4.3|119|#455a64|bag|0`;

function asGoals(value: string): ShopGoal[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean) as ShopGoal[];
}

export const SAMPLE_PRODUCTS: ShopProduct[] = RAW.split("\n").map((line) => {
  const f = line.split("|");
  const category = f[3] as ShopCategory;
  return {
    id: `sample-${f[0]}`,
    name: f[1],
    brand: f[2],
    category,
    sub: f[4],
    goals: asGoals(f[5]),
    optionLabel: f[6],
    options: f[7] ? f[7].split(";") : [],
    defaultOption: Number(f[8]) || 0,
    pack: f[9],
    price: Number(f[10]),
    mrp: Number(f[11]),
    rating: Number(f[12]),
    ratingCount: f[13],
    color: f[14],
    shape: f[15] as ShopShape,
    best: f[16] === "1",
    description: ABOUT[category],
    purchasable: false,
    inStock: true,
  };
});

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
  const products = SAMPLE_PRODUCTS.map((product) => ({ ...product, options: [...product.options], goals: [...product.goals] }));
  const used = new Set<string>();

  for (const item of live) {
    if (!item?.id || !item.title) continue;
    const key = norm(item.title);
    const match = products.find((product) => !used.has(product.id) && norm(product.name) === key);
    const price = Math.round((Number(item.pricePaise) || 0) / 100);
    const sizes = asStringList(item.sizes);
    const colors = asStringList(item.colors);
    const inStock = item.inStock !== false;

    if (match) {
      used.add(match.id);
      used.add(item.id);
      const cataloguePrice = match.price;
      const catalogueMrp = match.mrp;
      match.id = item.id;
      match.price = price;
      match.mrp = price === cataloguePrice && catalogueMrp > price ? catalogueMrp : price;
      if (item.imageUrl) match.imageUrl = item.imageUrl;
      if (item.description && item.description.trim().length > 0) match.description = item.description.trim();
      if (sizes.length) {
        match.optionLabel = match.optionLabel || "Size";
        match.options = sizes;
        match.defaultOption = 0;
      } else if (colors.length) {
        match.optionLabel = match.optionLabel || "Colour";
        match.options = colors;
        match.defaultOption = 0;
      }
      match.purchasable = inStock;
      match.inStock = inStock;
      continue;
    }

    const blob = norm(`${item.title} ${item.description || ""}`);
    const category = inferCategory(blob, item.storeCategory);
    const optionLabel = sizes.length ? "Size" : colors.length ? "Colour" : "";
    products.push({
      id: item.id,
      name: item.title,
      brand: "ZonoFit",
      category,
      sub: inferSub(blob, category),
      goals: inferGoals(blob, category),
      optionLabel,
      options: sizes.length ? sizes : colors,
      defaultOption: 0,
      pack: "",
      price,
      mrp: price,
      rating: 0,
      ratingCount: "",
      color: "#1F7A3F",
      shape: inferShape(category, blob),
      best: false,
      imageUrl: item.imageUrl || undefined,
      description: item.description?.trim() || ABOUT[category],
      purchasable: inStock,
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
