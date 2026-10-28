"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemSettings = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const getSystemSettings = async () => {
    let settings = await prisma_1.default.systemSettings.findUnique({
        where: { id: "default" }
    });
    if (!settings) {
        settings = await prisma_1.default.systemSettings.create({
            data: {
                id: "default",
                creditPurchasePrice: 10,
                creditConversionValue: 8,
                cashExpiryDays: 15,
                initialVisitCut: 10
            }
        });
    }
    return settings;
};
exports.getSystemSettings = getSystemSettings;
//# sourceMappingURL=settings.js.map