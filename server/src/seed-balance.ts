import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  
  if (!user) {
    console.log("No user found in the database. Please sign in to the app first to create a user.");
    return;
  }

  const wallet = await prisma.creditWallet.upsert({
    where: { userId: user.id },
    update: { balance: 500, convertibleCashBalanceInPaise: 50000, nonConvertibleCashBalanceInPaise: 0 },
    create: { userId: user.id, balance: 500, convertibleCashBalanceInPaise: 50000, nonConvertibleCashBalanceInPaise: 0 }
  });

  console.log(`Successfully updated wallet for user ${user.email}`);
  console.log(`Current Balance: ${wallet.balance} Credits`);
  console.log(`Current Cash: Rs ${(wallet.convertibleCashBalanceInPaise + wallet.nonConvertibleCashBalanceInPaise) / 100}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
