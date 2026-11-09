declare const router: import("express-serve-static-core").Router;
declare const SEX: readonly ["Male", "Female", "Other"];
export type Application = {
    name: string;
    phone: string;
    age: number;
    sex: (typeof SEX)[number];
    gym: string;
    customGym: string;
    instagram: string;
};
export declare function parseApplication(body: unknown): {
    ok: true;
    application: Application;
} | {
    ok: false;
    message: string;
};
export default router;
//# sourceMappingURL=launchOffer.d.ts.map