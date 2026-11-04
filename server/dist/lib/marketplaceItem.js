"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMarketplaceWrite = readMarketplaceWrite;
exports.presentPhotoList = presentPhotoList;
exports.presentMarketplaceItem = presentMarketplaceItem;
const uploads_1 = require("./uploads");
const CATEGORIES = ["PRODUCTS", "SPORTS_ACTIVITIES", "APPAREL_GEAR", "RECOVERY_WELLNESS", "ZONOFIT_COMMON"];
function text(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function optionalText(value, max) {
    const cleaned = text(value, max);
    return cleaned || null;
}
function list(value, maxItems, maxLen) {
    const raw = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(",")
            : [];
    const out = [];
    for (const entry of raw) {
        const item = String(entry ?? "").trim().slice(0, maxLen);
        if (!item || out.includes(item))
            continue;
        out.push(item);
        if (out.length >= maxItems)
            break;
    }
    return out;
}
function httpUrl(value) {
    const url = text(value, 2000);
    if (!url)
        return "";
    if (url.startsWith("/uploads/") || /^https?:\/\//i.test(url))
        return (0, uploads_1.publicUploadUrl)(url);
    return "";
}
function extraBag(body) {
    return body.details && typeof body.details === "object" ? body.details : {};
}
function pick(body, extra, key) {
    if (body[key] !== undefined && body[key] !== null)
        return body[key];
    return extra[key];
}
function rows(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => entry);
}
function readMarketplaceWrite(body) {
    const title = text(body.title, 191);
    if (!title)
        return { error: "Add a product name." };
    let pricePaise = 0;
    if (body.priceRupees !== undefined && body.priceRupees !== "" && body.priceRupees !== null) {
        const rupees = Number(body.priceRupees);
        if (!Number.isFinite(rupees) || rupees < 0 || rupees > 1000000) {
            return { error: "Price must be a rupee amount." };
        }
        pricePaise = Math.round(rupees * 100);
    }
    else if (body.pricePaise !== undefined && body.pricePaise !== "" && body.pricePaise !== null) {
        const paise = Number(body.pricePaise);
        if (!Number.isFinite(paise) || paise < 0)
            return { error: "Price must be a rupee amount." };
        pricePaise = Math.round(paise);
    }
    const imageUrls = list(body.imageUrls, 12, 2000).map(httpUrl).filter(Boolean);
    const single = httpUrl(body.imageUrl);
    if (single && !imageUrls.includes(single))
        imageUrls.unshift(single);
    const extra = extraBag(body);
    const mrpSource = pick(body, extra, "mrpRupees");
    const mrpRupees = mrpSource !== undefined && mrpSource !== "" && mrpSource !== null ? Number(mrpSource) : null;
    let mrpPaise = null;
    if (mrpRupees !== null) {
        if (!Number.isFinite(mrpRupees) || mrpRupees < 0 || mrpRupees > 1000000) {
            return { error: "Compare-at price must be a rupee amount." };
        }
        mrpPaise = mrpRupees > 0 ? Math.round(mrpRupees * 100) : null;
    }
    else if (extra.mrpPaise !== undefined && extra.mrpPaise !== null && extra.mrpPaise !== "") {
        const paise = Number(extra.mrpPaise);
        mrpPaise = Number.isFinite(paise) && paise > 0 ? Math.round(paise) : null;
    }
    const category = text(body.storeCategory, 40);
    const storeCategory = CATEGORIES.includes(category)
        ? category
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
function presentPhotoList(imageUrls, imageUrl) {
    let raw = imageUrls;
    if (typeof raw === "string" && raw.trim().startsWith("[")) {
        try {
            raw = JSON.parse(raw);
        }
        catch {
            raw = [];
        }
    }
    const list = (Array.isArray(raw) ? raw : []).map((entry) => httpUrl(entry)).filter(Boolean);
    const single = httpUrl(imageUrl);
    if (single && !list.includes(single))
        list.unshift(single);
    return list;
}
function presentMarketplaceItem(item) {
    const imageUrls = presentPhotoList(item.imageUrls, item.imageUrl);
    const variants = Array.isArray(item.variants)
        ? item.variants.map((row) => {
            const entry = row && typeof row === "object" ? row : {};
            return { ...entry, imageUrl: httpUrl(entry.imageUrl) };
        })
        : item.variants;
    return { ...item, imageUrl: imageUrls[0] || "", imageUrls, variants };
}
//# sourceMappingURL=marketplaceItem.js.map