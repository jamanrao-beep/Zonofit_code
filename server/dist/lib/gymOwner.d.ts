import { Prisma, PrismaClient } from "@prisma/client";
type OwnerClient = Prisma.TransactionClient | PrismaClient;
export declare function cleanOwnerEmail(value: unknown): string | null;
export declare function cleanOwnerPassword(value: unknown): string | null;
export declare function createGymOwner(db: OwnerClient, input: {
    email: string;
    password: string;
    name: string;
}): Promise<{
    name: string;
    id: string;
    email: string;
}>;
export declare function updateGymOwnerLogin(db: OwnerClient, userId: string, input: {
    email?: string;
    password?: string;
    name?: string;
}): Promise<{
    name: string;
    id: string;
    email: string;
} | null>;
export {};
//# sourceMappingURL=gymOwner.d.ts.map