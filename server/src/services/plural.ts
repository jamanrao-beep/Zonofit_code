import crypto from "crypto";
import prisma from "../lib/prisma";
import { createError } from "../middleware/errorHandler";
import { fulfillPaymentOrder, PaymentMeta } from "./payments";

/**
 * Plural by Pine Labs API Configuration
 * Supports both UAT / Sandbox and Production environments.
 */
export interface PluralConfig {
  clientId: string;
  clientSecret: string;
  merchantId?: string;
  webhookSecret?: string;
  baseUrl: string;
  isUat: boolean;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

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

/**
 * Generates an OAuth2 Bearer Access Token from Plural using client credentials.
 * Automatically caches token in memory until expiration.
 */
export async function getPluralAccessToken(): Promise<string> {
  const config = getPluralConfig();
  if (!config) {
    throw createError("Plural payment gateway is not configured.", 503, "PluralNotConfigured");
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const res = await fetch(`${config.baseUrl}/api/auth/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Request-Timestamp": new Date().toISOString(),
      "Request-ID": `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Plural] Auth token request failed:", res.status, errorText);
    throw createError(`Plural authentication failed: ${res.statusText}`, 502, "PluralAuthFailed");
  }

  const data = await res.json() as { access_token: string; expires_in?: number };
  if (!data.access_token) {
    throw createError("Plural did not return an access token.", 502, "PluralAuthFailed");
  }

  const ttlMs = (data.expires_in || 3600) * 1000;
  cachedToken = {
    token: data.access_token,
    expiresAt: now + ttlMs,
  };

  return data.access_token;
}

export interface CreateOrderParams {
  merchantReference: string;
  amountPaise: number;
  userId: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
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

/**
 * Creates an order on Plural by Pine Labs and returns the Hosted Checkout redirect URL.
 */
export async function createPluralOrder(params: CreateOrderParams): Promise<PluralOrderResult> {
  const config = getPluralConfig();
  if (!config) {
    throw createError("Plural payment gateway is not configured.", 503, "PluralNotConfigured");
  }

  const token = await getPluralAccessToken();
  const publicApiUrl = (process.env.PUBLIC_API_URL || "https://api.zonofit.com").replace(/\/$/, "");
  const callbackUrl = params.callbackUrl || `${publicApiUrl}/api/payments/plural/callback`;
  const failureUrl = params.failureUrl || `${publicApiUrl}/api/payments/plural/callback?status=failed`;

  const payload: any = {
    merchant_order_reference: params.merchantReference,
    order_amount: {
      value: params.amountPaise,
      currency: "INR",
    },
    callback_url: callbackUrl,
    failure_callback_url: failureUrl,
  };

  if (params.customerPhone || params.customerEmail) {
    payload.customer = {
      customer_id: params.userId,
      mobile_number: params.customerPhone ? params.customerPhone.replace(/\D/g, "").slice(-10) : undefined,
      email: params.customerEmail || undefined,
      name: params.customerName || undefined,
    };
  }

  if (config.merchantId) {
    payload.merchant_id = config.merchantId;
  }

  const res = await fetch(`${config.baseUrl}/api/checkout/v1/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Request-Timestamp": new Date().toISOString(),
      "Request-ID": `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Plural] Create order failed:", res.status, errorText);
    throw createError(`Failed to create Plural order: ${res.statusText}`, 502, "PluralOrderFailed");
  }

  const data = await res.json() as any;
  const orderId = data.order_id || data.id || params.merchantReference;
  const redirectUrl = data.redirect_url || data.payment_link || data.checkout_url || data.url;

  if (!redirectUrl) {
    console.error("[Plural] Missing redirect URL in response:", data);
    throw createError("Plural did not provide a checkout redirect URL.", 502, "PluralRedirectMissing");
  }

  return {
    orderId,
    redirectUrl,
    amountPaise: params.amountPaise,
    currency: "INR",
    merchantReference: params.merchantReference,
  };
}

/**
 * Verifies an incoming webhook HMAC-SHA256 signature from Plural.
 */
export function verifyPluralWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean {
  const config = getPluralConfig();
  const secret = config?.webhookSecret || process.env.PLURAL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  const expected = crypto.createHmac("sha256", secret).update(bodyBuffer).digest("hex");

  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

/**
 * Queries Plural server-to-server for definitive status of an order.
 */
export async function getPluralOrderStatus(orderId: string): Promise<any> {
  const config = getPluralConfig();
  if (!config) throw createError("Plural not configured.", 503);

  const token = await getPluralAccessToken();
  const res = await fetch(`${config.baseUrl}/api/checkout/v1/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw createError(`Failed to fetch Plural order status: ${res.statusText}`, res.status);
  }

  return res.json();
}

