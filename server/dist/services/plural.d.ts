import type { IncomingHttpHeaders } from "http";
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
export declare function getPluralConfig(): PluralConfig | null;
export declare function isPluralConfigured(): boolean;
/**
 * Bearer token for Pine Labs. Cached until shortly before it expires.
 */
export declare function getPluralAccessToken(): Promise<string>;
/**
 * Creates a hosted-checkout order and returns the Pine Labs redirect URL.
 * Credits are not granted here.
 */
export declare function createPluralOrder(params: CreateOrderParams): Promise<PluralOrderResult>;
/**
 * A Pine Labs UPI INTENT link. The amount in `am` is rupees and must match the order.
 * The query string is kept as Pine Labs sent it.
 */
export declare function challengeUrlForAmount(url: string, amountPaise: number): string | null;
/**
 * Reads `challenge_url` from a Create Payment response and checks the amount.
 */
export declare function readPluralUpiChallenge(payload: unknown, amountPaise: number): string | null;
export interface PluralUpiIntentResult {
    url: string | null;
    /** A 200 response that is not payable. Do not call Create Payment again for this order. */
    blockRetry: boolean;
}
/**
 * Asks Pine Labs for a UPI app link for an existing order.
 * A missing link does not grant credits.
 */
export declare function createPluralUpiIntent(orderId: string, amountPaise: number): Promise<PluralUpiIntentResult>;
/**
 * Standard Webhooks signature: HMAC-SHA256 over webhook-id.timestamp.rawBody.
 * The header is a space-separated list of `v1,<base64>` values.
 */
export declare function verifyPluralWebhookSignature(rawBody: Buffer | string, headers: IncomingHttpHeaders): boolean;
/**
 * Return-URL signature. Pine Labs signs the sorted key=value pairs.
 * Their sample hex-decodes the secret; the written steps use the secret itself.
 * Either match is accepted. The caller still confirms the order with Get Order.
 */
export declare function verifyPluralReturnSignature(fields: Record<string, string>, signature: string | undefined): boolean;
/**
 * Reads an order from a Get Order body (`{ data }`) or a webhook `data` object.
 */
export declare function readPluralOrder(payload: unknown): PluralOrderSnapshot | null;
/**
 * Fetches the Pine Labs order. Status lives under data.status.
 */
export declare function getPluralOrderStatus(orderId: string): Promise<unknown>;
/**
 * A paid hosted checkout with pre_auth false is status PROCESSED.
 * AUTHORIZED is not captured and does not grant credits.
 */
export declare function confirmPluralPayment(orderId: string): Promise<ConfirmedPluralPayment | null>;
//# sourceMappingURL=plural.d.ts.map