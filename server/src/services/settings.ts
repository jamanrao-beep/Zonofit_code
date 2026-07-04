import prisma from "../lib/prisma";

export const getSystemSettings = async () => {
  let settings = await prisma.systemSettings.findUnique({
    where: { id: "default" }
  });

  if (!settings) {
    settings = await prisma.systemSettings.create({
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
