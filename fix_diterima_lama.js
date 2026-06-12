const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Fix semua transaksi yang diterimaSaatIni = grandTotal padahal ada dpAmount
  const txList = await prisma.transaction.findMany({
    where: { dpAmount: { gt: 0 } },
    select: { id: true, invoiceNumber: true, grandTotal: true, dpAmount: true, diterimaSaatIni: true }
  });

  console.log(`Cek ${txList.length} transaksi ber-DP...`);
  let fixed = 0;

  for (const tx of txList) {
    const seharusnya = tx.grandTotal - tx.dpAmount;
    if (tx.diterimaSaatIni !== seharusnya) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { diterimaSaatIni: seharusnya, remainingPayment: tx.dpAmount }
      });
      console.log(`Fixed: ${tx.invoiceNumber} | diterima: ${tx.diterimaSaatIni} -> ${seharusnya}`);
      fixed++;
    }
  }

  console.log(`\nTotal fixed: ${fixed} transaksi`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
