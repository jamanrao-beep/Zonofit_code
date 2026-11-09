/**
 * Launch applications go to the existing Google Sheet.
 * Nothing in this file writes a database row.
 */
export type SheetApplication = {
    name: string;
    phone: string;
    age: number;
    sex: string;
    gym: string;
    customGym: string;
    instagram: string;
};
export declare function launchSheetPageUrl(): string;
export declare function normalizeIndianMobile(value: unknown): string | null;
export declare function parseCsv(text: string): string[][];
export declare function phonesInSheetCsv(csv: string): string[];
export declare function sheetRowHasResult(csv: string, phone: string): boolean;
export declare function sheetHasMobile(phone: string): Promise<boolean>;
export declare function sheetHasSavedResult(phone: string): Promise<boolean>;
export declare function rememberPhone(phone: string): void;
/** Appends one row through the existing Apps Script. Key order matches the live sheet. */
export declare function appendLaunchRow(application: SheetApplication, options: {
    source: string;
    extra?: Record<string, string | number>;
}): Promise<boolean>;
//# sourceMappingURL=launchSheet.d.ts.map