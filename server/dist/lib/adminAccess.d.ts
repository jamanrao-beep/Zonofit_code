export type AdminRole = "FOUNDER" | "OPS_MANAGER" | "SALES_REP" | "SUPPORT_AGENT" | "FINANCE_ADMIN" | "MARKETING_MANAGER";
/** Maps an admin URL to a permission area. Unknown paths stay founder-only. */
export declare function adminArea(path: string, method?: string): string;
export declare function roleCanAccess(role: string, path: string, method?: string): boolean;
//# sourceMappingURL=adminAccess.d.ts.map