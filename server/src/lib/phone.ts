/** Indian mobile numbers are stored as the last 10 digits. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits.slice(-10);
}
