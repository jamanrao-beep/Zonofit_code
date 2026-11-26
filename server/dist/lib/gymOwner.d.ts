import { Prisma, PrismaClient } from "@prisma/client";
type OwnerClient = Prisma.TransactionClient | PrismaClient;
export declare function cleanOwnerEmail(value: unknown): string | null;
export declare function cleanOwnerPassword(value: unknown): string | null;
/** Admin-assigned gym portal username. Symbols are allowed. Spaces are not. */
export declare function cleanPortalUsername(value: unknown): string | null;
/** Admin-assigned gym portal passkey or 4-6 digit quick desk PIN. Stored only as a hash. */
export declare function cleanOwnerPasskey(value: unknown): string | null;
export type OwnerCredentialInput = {
    username: string | null;
    password: string | null;
    passkey: string | null;
    authMode: "BOTH" | "PASSWORD" | "PIN";
    usernameProvided: boolean;
    passwordProvided: boolean;
    passkeyProvided: boolean;
};
export declare function readOwnerCredentials(body: {
    ownerUsername?: unknown;
    ownerPassword?: unknown;
    ownerPasskey?: unknown;
    ownerPin?: unknown;
    authMode?: unknown;
}): {
    ok: true;
    value: OwnerCredentialInput;
} | {
    ok: false;
    message: string;
};
export declare function accountConflictMessage(err: unknown): string | null;
export declare function createGymOwner(db: OwnerClient, input: {
    username: string;
    password?: string | null;
    passkey?: string | null;
    name: string;
}): Promise<{
    name: string;
    id: string;
    portalUsername: string | null;
}>;
export declare function updateGymOwnerLogin(db: OwnerClient, userId: string, input: {
    username?: string;
    password?: string;
    passkey?: string;
    name?: string;
}): Promise<{
    name: string;
    id: string;
    portalUsername: string | null;
} | null>;
export declare function portalUsernameTaken(db: OwnerClient, username: string, exceptUserId?: string): Promise<boolean>;
export {};
//# sourceMappingURL=gymOwner.d.ts.map