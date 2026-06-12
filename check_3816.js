const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tx = await prisma.transaction.findFirst({
    where: { invoiceNumber: 'INV-260605-3816' },
    select: { grandTotal: true, subtotal: true, discount: true, items: { select: { price: true, discount: true, jumlahOrang: true, package: { select: { name: true, price: true } } } } }
  });
  console.log(JSON.stringify(tx, null, 2));
  await prisma.$disconnect();
}
main();
