export interface TokenPayload {
    dbUserId: string;
    phone?: string;
    systemRole?: string;
    createdAt: number;
}
/**
 * signToken — Generates a stateless session token.
 * Format: base64url(payload).base64url(signature)
 */
export declare function signToken(payload: TokenPayload): string;
/**
 * verifyToken — Verifies a stateless session token and returns the parsed payload.
 * Returns null if invalid or expired.
 */
export declare function verifyToken(token: string): TokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map