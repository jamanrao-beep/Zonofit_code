export interface TokenPayload {
    dbUserId: string;
    phone?: string;
    systemRole?: string;
    iat: number;
    exp: number;
}
export declare function signToken(payload: Omit<TokenPayload, "iat" | "exp">): string;
export declare function verifyToken(token: string): TokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map