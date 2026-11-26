export type UpiAppId = "gpay" | "phonepe" | "paytm" | "other";

function rupeesToPaise(amount: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) return null;
  const [whole, fraction = ""] = amount.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isInteger(paise) && paise > 0 ? paise : null;
}

/**
 * Query string from a Pine Labs `upi://pay` link.
 * The amount and payee stay exactly as the server sent them.
 */
export function upiPayQuery(challengeUrl: string): string | null {
  const match = challengeUrl.match(/^upi:\/\/pay\?([^#\s]+)$/i);
  if (!match || challengeUrl.length > 2000) return null;
  const params = new URLSearchParams(match[1]);
  const payee = params.get("pa");
  const amount = params.get("am");
  if (!payee || !amount || rupeesToPaise(amount) == null) return null;
  return match[1];
}

/** App links that keep Pine Labs' query, including the fixed amount. */
export function upiAppUrls(app: UpiAppId, query: string): string[] {
  switch (app) {
    case "gpay":
      return [`tez://upi/pay?${query}`, `gpay://upi/pay?${query}`];
    case "phonepe":
      return [`phonepe://pay?${query}`];
    case "paytm":
      return [`paytmmp://pay?${query}`, `paytm://pay?${query}`];
    case "other":
      return [`upi://pay?${query}`];
  }
}
