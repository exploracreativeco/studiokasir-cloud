const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tx = await prisma.transaction.findFirst({
    where: { invoiceNumber: 'INV-260605-3813' },
    select: { grandTotal: true, subtotal: true, discount: true, items: { select: { price: true, discount: true } } }
  });
  console.log(JSON.stringify(tx, null, 2));
  await prisma.$disconnect();
}
main();
