const CATEGORIES = ["PRODUCTS", "SPORTS_ACTIVITIES", "APPAREL_GEAR", "RECOVERY_WELLNESS", "ZONOFIT_COMMON"] as const;

export type MarketplaceVariant = { name: string; imageUrl: string };
export type MarketplaceSpec = { label: string; value: string };

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

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(value: unknown, max: number): string | null {
  const cleaned = text(value, max);
  return cleaned || null;
}

function list(value: unknown, maxItems: number, maxLen: number): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const out: string[] = [];
  for (const entry of raw) {
    const item = String(entry ?? "").trim().slice(0, maxLen);
    if (!item || out.includes(item)) continue;
    out.push(item);
    if (out.length >= maxItems) break;
  }
  return out;
}

function httpUrl(value: unknown): string {
  const url = text(value, 2000);
  if (!/^https?:\/\//i.test(url)) return "";
  return url;
}

function extraBag(body: Record<string, unknown>): Record<string, unknown> {
  return body.details && typeof body.details === "object" ? (body.details as Record<string, unknown>) : {};
}

function pick(body: Record<string, unknown>, extra: Record<string, unknown>, key: string): unknown {
  if (body[key] !== undefined && body[key] !== null) return body[key];
  return extra[key];
}

function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => entry as Record<string, unknown>);
}

export function readMarketplaceWrite(body: Record<string, unknown>): MarketplaceWrite | { error: string } {
  const title = text(body.title, 191);
  if (!title) return { error: "Add a product name." };

  let pricePaise = 0;
  if (body.priceRupees !== undefined && body.priceRupees !== "" && body.priceRupees !== null) {
    const rupees = Number(body.priceRupees);
    if (!Number.isFinite(rupees) || rupees < 0 || rupees > 1000000) {
      return { error: "Price must be a rupee amount." };
    }
    pricePaise = Math.round(rupees * 100);
  } else if (body.pricePaise !== undefined && body.pricePaise !== "" && body.pricePaise !== null) {
    const paise = Number(body.pricePaise);
    if (!Number.isFinite(paise) || paise < 0) return { error: "Price must be a rupee amount." };
    pricePaise = Math.round(paise);
  }

  const imageUrls = list(body.imageUrls, 12, 2000).map(httpUrl).filter(Boolean);
  const single = httpUrl(body.imageUrl);
  if (single && !imageUrls.includes(single)) imageUrls.unshift(single);

  const extra = extraBag(body);
  const mrpSource = pick(body, extra, "mrpRupees");
  const mrpRupees = mrpSource !== undefined && mrpSource !== "" && mrpSource !== null ? Number(mrpSource) : null;
  let mrpPaise: number | null = null;
  if (mrpRupees !== null) {
    if (!Number.isFinite(mrpRupees) || mrpRupees < 0 || mrpRupees > 1000000) {
      return { error: "Compare-at price must be a rupee amount." };
    }
    mrpPaise = mrpRupees > 0 ? Math.round(mrpRupees * 100) : null;
  } else if (extra.mrpPaise !== undefined && extra.mrpPaise !== null && extra.mrpPaise !== "") {
    const paise = Number(extra.mrpPaise);
    mrpPaise = Number.isFinite(paise) && paise > 0 ? Math.round(paise) : null;
  }

  const category = text(body.storeCategory, 40);
  const storeCategory = CATEGORIES.includes(category as (typeof CATEGORIES)[number])
    ? (category as (typeof CATEGORIES)[number])
    : "ZONOFIT_COMMON";

  const variants = rows(pick(body, extra, "variants"))
    .slice(0, 30)
    .map((row) => ({ name: text(row.name, 60), imageUrl: httpUrl(row.imageUrl) }))
    .filter((row) => row.name);

  const specs = rows(pick(body, extra, "specs"))
    .slice(0, 30)
    .map((row) => ({ label: text(row.label, 60), value: text(row.value, 200) }))
    .filter((row) => row.label && row.value);

  return {
    title,
    description: text(body.description, 4000),
    pricePaise,
    imageUrl: imageUrls[0] || "",
    imageUrls,
    inStock: body.inStock !== false && body.inStock !== "false",
    storeCategory,
    sizes: list(pick(body, extra, "sizes"), 30, 40),
    colors: list(pick(body, extra, "colors"), 30, 40),
    brand: optionalText(pick(body, extra, "brand"), 80),
    info: optionalText(pick(body, extra, "info"), 2000),
    pack: optionalText(pick(body, extra, "pack"), 80),
    optionLabel: optionalText(pick(body, extra, "optionLabel"), 40),
    mrpPaise,
    variants,
    specs,
  };
}
