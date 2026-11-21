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
export declare function getPluralConfig(): PluralConfig | null;
export declare function isPluralConfigured(): boolean;
/**
 * Generates an OAuth2 Bearer Access Token from Plural using client credentials.
 * Automatically caches token in memory until expiration.
 */
export declare function getPluralAccessToken(): Promise<string>;
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
export declare function createPluralOrder(params: CreateOrderParams): Promise<PluralOrderResult>;
/**
 * Verifies an incoming webhook HMAC-SHA256 signature from Plural.
 * Matches both hex and base64 digest formats.
 */
export declare function verifyPluralWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean;
/**
 * Queries Plural server-to-server for definitive status of an order.
 */
export declare function getPluralOrderStatus(orderId: string): Promise<any>;
//# sourceMappingURL=plural.d.ts.map