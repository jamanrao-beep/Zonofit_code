/** Image links an admin saved for a gym. The app does not invent photos. */

export function httpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

/**
 * Exterior first, then any other saved photos, then interiors.
 * The logo is used only when the gym has no other photo.
 */
export function gymPhotoUrls(gym: {
  exteriorImageUrl?: unknown;
  imageUrls?: unknown;
  interiorImageUrls?: unknown;
  logoUrl?: unknown;
}): string[] {
  const pool: unknown[] = [
    gym.exteriorImageUrl,
    ...(Array.isArray(gym.imageUrls) ? gym.imageUrls : []),
    ...(Array.isArray(gym.interiorImageUrls) ? gym.interiorImageUrls : []),
  ];
  const logo = httpUrl(gym.logoUrl);
  const seen = new Set<string>();
  const photos: string[] = [];
  for (const item of pool) {
    const url = httpUrl(item);
    if (!url || url === logo || seen.has(url)) continue;
    seen.add(url);
    photos.push(url);
  }
  if (photos.length === 0 && logo) photos.push(logo);
  return photos;
}
