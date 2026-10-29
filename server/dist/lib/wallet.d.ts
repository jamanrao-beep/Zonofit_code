import { Prisma } from "@prisma/client";
type Tx = Prisma.TransactionClient;
export declare function decrementCredits(tx: Tx, userId: string, credits: number): Promise<{
    id: string;
    updatedAt: Date;
    userId: string;
    balance: number;
    convertibleCashBalanceInPaise: number;
    nonConvertibleCashBalanceInPaise: number;
    cashExpiryDate: Date | null;
}>;
export declare function decrementConvertibleCash(tx: Tx, userId: string, paise: number): Promise<{
    id: string;
    updatedAt: Date;
    userId: string;
    balance: number;
    convertibleCashBalanceInPaise: number;
    nonConvertibleCashBalanceInPaise: number;
    cashExpiryDate: Date | null;
}>;
export {};
//# sourceMappingURL=wallet.d.ts.map