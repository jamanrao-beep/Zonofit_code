import crypto from "crypto";
import type { IncomingHttpHeaders } from "http";
import { createError } from "../middleware/errorHandler";

/**
 * Plural by Pine Labs hosted checkout.
 * UAT and production use different hosts and different dashboard credentials.
 */
export interface PluralConfig {
  clientId: string;
  clientSecret: string;
  merchantId?: string;
  webhookSecret?: string;
  baseUrl: string;
  isUat: boolean;
}

export interface CreateOrderParams {
  merchantReference: string;
  amountPaise: number;
  userId: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerPincode?: string;
  callbackUrl?: string;
  failureUrl?: string;
}

export interface PluralOrderResult {
  orderId: string;
  redirectUrl: string;
  amountPaise: number;
  currency: string;
  merchantReference: string;
}

export interface PluralOrderSnapshot {
  orderId: string;
  merchantReference: string | null;
  merchantId: string | null;
  status: string;
  amountPaise: number | null;
  currency: string;
  paymentId: string | null;
}

export interface ConfirmedPluralPayment {
  orderId: string;
  merchantReference: string | null;
  paymentId: string;
  amountPaise: number;
}

let cachedToken: { token: string; expiresAt: number; clientId: string } | null = null;

export function getPluralConfig(): PluralConfig | null {
  const clientId = process.env.PLURAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PLURAL_CLIENT_SECRET?.trim();
  const merchantId = process.env.PLURAL_MERCHANT_ID?.trim();
  const webhookSecret = process.env.PLURAL_WEBHOOK_SECRET?.trim();
  const env = (process.env.PLURAL_ENV || "production").toLowerCase().trim();

  if (!clientId || !clientSecret || clientId.length < 5 || clientSecret.length < 5) {
    return null;
  }

  const isUat = env === "uat" || env === "sandbox" || env === "test";
  const baseUrl = isUat
    ? "https://pluraluat.v2.pinepg.in"
    : "https://api.pluralpay.in";

  return {
    clientId,
    clientSecret,
    merchantId,
    webhookSecret,
    baseUrl,
    isUat,
  };
}

export function isPluralConfigured(): boolean {
  return getPluralConfig() !== null;
}

function requestHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "Request-Timestamp": new Date().toISOString(),
    "Request-ID": crypto.randomUUID(),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function safeGatewayError(text: string): string {
  return text
    .replace(/client_secret"\s*:\s*"[^"]*"/gi, 'client_secret":"[redacted]"')
    .slice(0, 300);
}

async function requestToken(config: PluralConfig): Promise<string> {
  const res = await fetch(`${config.baseUrl}/api/auth/v1/token`, {
    method: "POST",
    headers: {
      ...requestHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Plural] Auth token request failed:", res.status, safeGatewayError(errorText));
    throw createError("Pine Labs authentication failed.", 502, "PluralAuthFailed");
  }

  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw createError("Pine Labs did not return an access token.", 502, "PluralAuthFailed");
  }

  const ttlMs = (data.expires_in || 3600) * 1000;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + ttlMs,
    clientId: config.clientId,
  };
  return data.access_token;
}

/**
 * Bearer token for Pine Labs. Cached until shortly before it expires.
 */
export async function getPluralAccessToken(): Promise<string> {
  const config = getPluralConfig();
  if (!config) {
    throw createError("Plural payment gateway is not configured.", 503, "PluralNotConfigured");
  }

  const now = Date.now();
  if (
    cachedToken &&
    cachedToken.clientId === config.clientId &&
    cachedToken.expiresAt > now + 60_000
  ) {
    return cachedToken.token;
  }

  return requestToken(config);
}

function splitName(name?: string): { first: string; last: string } {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Member", last: "ZonoFit" };
  if (parts.length === 1) return { first: parts[0].slice(0, 40), last: "Member" };
  return { first: parts[0].slice(0, 40), last: parts.slice(1).join(" ").slice(0, 40) };
}

function customerPayload(params: CreateOrderParams): Record<string, unknown> {
  const { first, last } = splitName(params.customerName);
  const email = params.customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.customerEmail)
    ? params.customerEmail
    : "member@zonofit.com";
  const digits = (params.customerPhone || "").replace(/\D/g, "");
  const customer: Record<string, unknown> = {
    email_id: email,
    first_name: first,
    last_name: last,
    customer_id: params.userId.slice(0, 50),
  };
  if (digits.length >= 10) {
    customer.mobile_number = digits.slice(-10);
    customer.country_code = "91";
  }

  const address = billingAddress(params);
  if (address) {
    customer.billing_address = address;
    customer.shipping_address = address;
  }
  return customer;
}

function billingAddress(params: CreateOrderParams): Record<string, string> | null {
  const address1 = params.customerAddress?.trim().slice(0, 100) || "";
  const city = params.customerCity?.trim().slice(0, 50) || "";
  const pincode = (params.customerPincode || "").replace(/\D/g, "");
  if (!address1 || !city || pincode.length !== 6) return null;
  const address: Record<string, string> = {
    address1,
    city,
    country: "India",
    pincode,
  };
  const state = params.customerState?.trim().slice(0, 50) || "";
  if (state) address.state = state;
  return address;
}

/**
 * Creates a hosted-checkout order and returns the Pine Labs redirect URL.
 * Credits are not granted here.
 */
export async function createPluralOrder(params: CreateOrderParams): Promise<PluralOrderResult> {
  const config = getPluralConfig();
  if (!config) {
    throw createError("Plural payment gateway is not configured.", 503, "PluralNotConfigured");
  }
  if (!Number.isInteger(params.amountPaise) || params.amountPaise < 100) {
    throw createError("Pine Labs requires a payment of at least ₹1.", 400, "AmountTooSmall");
  }

  const publicApiUrl = (process.env.PUBLIC_API_URL || "https://api.zonofit.com").replace(/\/$/, "");
  const callbackUrl = params.callbackUrl || `${publicApiUrl}/api/payments/plural/callback`;
  const failureUrl = params.failureUrl || callbackUrl;

  const payload: Record<string, unknown> = {
    merchant_order_reference: params.merchantReference,
    order_amount: {
      value: params.amountPaise,
      currency: "INR",
    },
    integration_mode: "REDIRECT",
    pre_auth: false,
    allowed_payment_methods: ["CARD", "UPI", "NETBANKING", "WALLET"],
    notes: "ZonoFit",
    callback_url: callbackUrl,
    failure_callback_url: failureUrl,
    purchase_details: {
      customer: customerPayload(params),
    },
  };

  const send = async (token: string) => fetch(`${config.baseUrl}/api/checkout/v1/orders`, {
    method: "POST",
    headers: {
      ...requestHeaders(token),
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let token = await getPluralAccessToken();
  let res = await send(token);
  if (res.status === 401) {
    cachedToken = null;
    token = await requestToken(config);
    res = await send(token);
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Plural] Create order failed:", res.status, safeGatewayError(errorText));
    throw createError("Pine Labs could not start checkout.", 502, "PluralOrderFailed");
  }

  const data = await res.json() as {
    order_id?: string;
    redirect_url?: string;
    response_code?: number;
    data?: { order_id?: string; redirect_url?: string };
  };
  if (typeof data.response_code === "number" && data.response_code !== 200) {
    throw createError("Pine Labs could not start checkout.", 502, "PluralOrderFailed");
  }

  const orderId = data.order_id || data.data?.order_id;
  const redirectUrl = data.redirect_url || data.data?.redirect_url;
  if (!orderId || !redirectUrl) {
    console.error("[Plural] Checkout response was missing order_id or redirect_url.");
    throw createError("Pine Labs did not provide a checkout link.", 502, "PluralRedirectMissing");
  }

  return {
    orderId,
    redirectUrl,
    amountPaise: params.amountPaise,
    currency: "INR",
    merchantReference: params.merchantReference,
  };
}

function rupeesQueryToPaise(amount: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) return null;
  const [whole, fraction = ""] = amount.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isInteger(paise) && paise > 0 ? paise : null;
}

function challengeQuery(url: string): URLSearchParams | null {
  const match = url.match(/^upi:\/\/pay\?([^#\s]+)$/i);
  if (!match || url.length > 2000) return null;
  return new URLSearchParams(match[1]);
}

/**
 * A Pine Labs UPI INTENT link. The amount in `am` is rupees and must match the order.
 * The query string is kept as Pine Labs sent it.
 */
export function challengeUrlForAmount(url: string, amountPaise: number): string | null {
  if (!Number.isInteger(amountPaise) || amountPaise < 100) return null;
  const query = challengeQuery(url);
  if (!query) return null;
  const payee = query.get("pa");
  const amount = query.get("am");
  if (!payee || !amount) return null;
  if (rupeesQueryToPaise(amount) !== amountPaise) return null;
  return url;
}

function reportedPaise(payload: Record<string, unknown>): number | null {
  const amounts: number[] = [];
  const collect = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const amount = value as { value?: unknown; currency?: unknown };
    if (typeof amount.currency === "string" && amount.currency.toUpperCase() !== "INR") return;
    const paise = readPaise(amount.value);
    if (paise != null) amounts.push(paise);
  };
  collect(payload.order_amount);
  const payments = Array.isArray(payload.payments) ? payload.payments : [];
  for (const payment of payments) {
    if (payment && typeof payment === "object") {
      collect((payment as { payment_amount?: unknown }).payment_amount);
    }
  }
  if (amounts.length === 0) return null;
  if (!amounts.every((value) => value === amounts[0])) return -1;
  return amounts[0];
}

/**
 * Reads `challenge_url` from a Create Payment response and checks the amount.
 */
export function readPluralUpiChallenge(payload: unknown, amountPaise: number): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { data?: unknown; challenge_url?: unknown };
  const data = root.data && typeof root.data === "object" ? root.data as Record<string, unknown> : root as Record<string, unknown>;
  const url = typeof data.challenge_url === "string" ? data.challenge_url : "";
  const matched = challengeUrlForAmount(url, amountPaise);
  if (!matched) return null;
  const reported = reportedPaise(data);
  if (reported === -1 || (reported != null && reported !== amountPaise)) return null;
  return matched;
}

export interface PluralUpiIntentResult {
  url: string | null;
  /** A 200 response that is not payable. Do not call Create Payment again for this order. */
  blockRetry: boolean;
}

/**
 * Asks Pine Labs for a UPI app link for an existing order.
 * A missing link does not grant credits.
 */
export async function createPluralUpiIntent(orderId: string, amountPaise: number): Promise<PluralUpiIntentResult> {
  const config = getPluralConfig();
  if (!config || !/^[A-Za-z0-9_-]{1,80}$/.test(orderId)) return { url: null, blockRetry: false };
  if (!Number.isInteger(amountPaise) || amountPaise < 100) return { url: null, blockRetry: false };

  const payload = {
    payments: [
      {
        merchant_payment_reference: crypto.randomUUID(),
        payment_method: "UPI",
        payment_amount: {
          value: amountPaise,
          currency: "INR",
        },
        payment_option: {
          upi_details: {
            txn_mode: "INTENT",
          },
        },
      },
    ],
  };

  const send = async (token: string) => fetch(
    `${config.baseUrl}/api/pay/v1/orders/${encodeURIComponent(orderId)}/payments`,
    {
      method: "POST",
      headers: {
        ...requestHeaders(token),
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  try {
    let token = await getPluralAccessToken();
    let res = await send(token);
    if (res.status === 401) {
      cachedToken = null;
      token = await requestToken(config);
      res = await send(token);
    }
    const bodyText = await res.text();
    if (!res.ok) {
      console.error("[Plural] UPI intent failed:", res.status, safeGatewayError(bodyText));
      return { url: null, blockRetry: false };
    }
    let body: unknown = null;
    try {
      body = JSON.parse(bodyText);
    } catch {
      console.error("[Plural] UPI intent response was not JSON.");
      return { url: null, blockRetry: true };
    }
    const challengeUrl = readPluralUpiChallenge(body, amountPaise);
    if (!challengeUrl) {
      console.error("[Plural] UPI intent response had no payable link for this amount.");
      return { url: null, blockRetry: true };
    }
    return { url: challengeUrl, blockRetry: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error";
    console.error("[Plural] UPI intent failed:", message);
    return { url: null, blockRetry: false };
  }
}

function headerValue(headers: IncomingHttpHeaders, name: string): string {
  const value = headers[name];
  if (Array.isArray(value)) return value[0] || "";
  return typeof value === "string" ? value : "";
}

function webhookKeyBytes(secret: string): Buffer | null {
  if (secret.startsWith("whsec_")) {
    const decoded = Buffer.from(secret.slice(6), "base64");
    return decoded.length > 0 ? decoded : null;
  }
  // Pine Labs base64-encodes the dashboard secret and then decodes it again.
  // The HMAC key is the secret's raw UTF-8 bytes.
  return Buffer.from(secret, "utf8");
}

/**
 * Standard Webhooks signature: HMAC-SHA256 over webhook-id.timestamp.rawBody.
 * The header is a space-separated list of `v1,<base64>` values.
 */
export function verifyPluralWebhookSignature(
  rawBody: Buffer | string,
  headers: IncomingHttpHeaders
): boolean {
  const secret = process.env.PLURAL_WEBHOOK_SECRET?.trim() || process.env.PLURAL_CLIENT_SECRET?.trim();
  if (!secret || secret.length < 5) return false;

  const id = headerValue(headers, "webhook-id");
  const timestamp = headerValue(headers, "webhook-timestamp");
  const signature = headerValue(headers, "webhook-signature");
  if (!id || !/^[0-9]+$/.test(timestamp) || !signature) return false;

  const key = webhookKeyBytes(secret);
  if (!key) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  const message = Buffer.concat([Buffer.from(`${id}.${timestamp}.`, "utf8"), body]);
  const expected = crypto.createHmac("sha256", key).update(message).digest();
  const candidates = signature.split(/\s+/).filter((part) => part.startsWith("v1,"));

  return candidates.some((part) => {
    const received = Buffer.from(part.slice(3), "base64");
    if (received.length !== expected.length) return false;
    return crypto.timingSafeEqual(received, expected);
  });
}

function hmacHex(key: Buffer, message: string): string {
  return crypto.createHmac("sha256", key).update(message, "utf8").digest("hex");
}

/**
 * Return-URL signature. Pine Labs signs the sorted key=value pairs.
 * Their sample hex-decodes the secret; the written steps use the secret itself.
 * Either match is accepted. The caller still confirms the order with Get Order.
 */
export function verifyPluralReturnSignature(
  fields: Record<string, string>,
  signature: string | undefined
): boolean {
  const secret = process.env.PLURAL_CLIENT_SECRET?.trim() || process.env.PLURAL_WEBHOOK_SECRET?.trim();
  if (!secret || secret.length < 5 || !signature) return false;

  const payload = Object.keys(fields)
    .filter((key) => key !== "signature" && fields[key] !== "")
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("&");
  if (!payload) return false;

  const actual = signature.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(actual)) return false;

  const keys = [Buffer.from(secret, "utf8")];
  if (/^[0-9a-fA-F]+$/.test(secret) && secret.length % 2 === 0) {
    keys.push(Buffer.from(secret, "hex"));
  }

  const actualBuf = Buffer.from(actual, "hex");
  return keys.some((key) => {
    const expected = Buffer.from(hmacHex(key, payload), "hex");
    return expected.length === actualBuf.length && crypto.timingSafeEqual(actualBuf, expected);
  });
}

function readPaise(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

/**
 * Reads an order from a Get Order body (`{ data }`) or a webhook `data` object.
 */
export function readPluralOrder(payload: unknown): PluralOrderSnapshot | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as {
    data?: Record<string, unknown>;
    order_id?: unknown;
    status?: unknown;
  };
  const source = root.data && typeof root.data === "object" ? root.data : root as Record<string, unknown>;
  const orderId = typeof source.order_id === "string" ? source.order_id : "";
  const status = typeof source.status === "string" ? source.status.toUpperCase() : "";
  if (!orderId || !status) return null;

  const amount = source.order_amount && typeof source.order_amount === "object"
    ? source.order_amount as { value?: unknown; currency?: unknown }
    : undefined;
  const payments = Array.isArray(source.payments) ? source.payments : [];
  const paidPayment = payments.find((item) => {
    if (!item || typeof item !== "object") return false;
    return String((item as { status?: unknown }).status || "").toUpperCase() === "PROCESSED";
  }) as { id?: unknown } | undefined;
  const firstPayment = payments[0] as { id?: unknown } | undefined;
  const paymentId = typeof paidPayment?.id === "string"
    ? paidPayment.id
    : typeof firstPayment?.id === "string"
      ? firstPayment.id
      : null;

  return {
    orderId,
    merchantReference: typeof source.merchant_order_reference === "string" ? source.merchant_order_reference : null,
    merchantId: typeof source.merchant_id === "string" ? source.merchant_id : null,
    status,
    amountPaise: readPaise(amount?.value),
    currency: typeof amount?.currency === "string" ? amount.currency.toUpperCase() : "INR",
    paymentId,
  };
}

/**
 * Fetches the Pine Labs order. Status lives under data.status.
 */
export async function getPluralOrderStatus(orderId: string): Promise<unknown> {
  const config = getPluralConfig();
  if (!config) throw createError("Plural payment gateway is not configured.", 503, "PluralNotConfigured");

  const send = async (token: string) => fetch(
    `${config.baseUrl}/api/pay/v1/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: requestHeaders(token),
    }
  );

  let token = await getPluralAccessToken();
  let res = await send(token);
  if (res.status === 401) {
    cachedToken = null;
    token = await requestToken(config);
    res = await send(token);
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Plural] Order lookup failed:", res.status, safeGatewayError(errorText));
    throw createError("Pine Labs could not confirm this order.", res.status === 404 ? 404 : 502, "PluralStatusFailed");
  }

  return res.json();
}

/**
 * A paid hosted checkout with pre_auth false is status PROCESSED.
 * AUTHORIZED is not captured and does not grant credits.
 */
export async function confirmPluralPayment(orderId: string): Promise<ConfirmedPluralPayment | null> {
  const snapshot = readPluralOrder(await getPluralOrderStatus(orderId));
  if (!snapshot || snapshot.status !== "PROCESSED") return null;
  if (snapshot.currency !== "INR" || snapshot.amountPaise == null) return null;

  return {
    orderId: snapshot.orderId,
    merchantReference: snapshot.merchantReference,
    paymentId: snapshot.paymentId || `plural_${snapshot.orderId}`,
    amountPaise: snapshot.amountPaise,
  };
}
