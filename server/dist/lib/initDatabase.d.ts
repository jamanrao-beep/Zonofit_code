export declare const DDL_STATEMENTS: string[];
export declare function initDatabase(): Promise<{
    success: boolean;
    message: string;
    admin?: string;
    testGym?: string;
    tablesCreated?: number;
}>;
export declare function seedTestGym(): Promise<never>;
//# sourceMappingURL=initDatabase.d.ts.map