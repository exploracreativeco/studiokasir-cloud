const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randDate(year, month) {
  const days = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, randInt(1, days), randInt(9, 17), randInt(0, 59))
}

async function main() {
  const packages = await prisma.package.findMany({ where: { isActive: true } })
  const customers = await prisma.customer.findMany()
  const metodes = await prisma.metodePembayaran.findMany()
  const fotografers = await prisma.fotografer.findMany()
  const user = await prisma.user.findFirst()

  if (!packages.length || !metodes.length || !user) {
    console.log('Data master kurang! Jalankan seed_explora.ts dulu.')
    process.exit(1)
  }

  const years = [2023, 2024, 2025]
  const months = [1,2,3,4,5,6,7,8,9,10,11,12]
  let counter = 2000

  for (const year of years) {
    for (const month of months) {
      console.log('Membuat transaksi ' + month + '/' + year)
      for (let i = 0; i < 10; i++) {
        const pkg = randItem(packages)
        const metode = randItem(metodes)
        const cust = randItem(customers)
        const foto = fotografers.length ? randItem(fotografers) : null
        counter++
        const mm = String(month).padStart(2,'0')
        const dd = String(randInt(1,28)).padStart(2,'0')
        const inv = 'INV-' + year + mm + dd + '-' + String(counter).padStart(4,'0')
        await prisma.transaction.create({
          data: {
            invoiceNumber: inv,
            transactionDate: randDate(year, month),
            customerId: cust.id,
            userId: user.id,
            metodePembayaranId: metode.id,
            fotograferId: foto ? foto.id : null,
            subtotal: pkg.price,
            discount: 0,
            grandTotal: pkg.price,
            dpAmount: 0,
            diterimaSaatIni: pkg.price,
            paymentStatus: 'PAID',
            items: { create: [{ packageId: pkg.id, price: pkg.price, jumlahOrang: 0, hargaPerOrang: null }] }
          }
        })
      }
      // Pengeluaran per bulan
      await prisma.expense.create({
        data: { title: 'Operasional ' + month + '/' + year, amount: randInt(200,800) * 1000, category: 'LAINNYA', date: randDate(year, month) }
      })
    }
  }

  const total = await prisma.transaction.count()
  console.log('Selesai! Total transaksi: ' + total)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
