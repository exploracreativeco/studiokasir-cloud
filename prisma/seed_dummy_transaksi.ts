import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const day = randomInt(1, daysInMonth)
  const hour = randomInt(9, 17)
  const min = randomInt(0, 59)
  return new Date(year, month - 1, day, hour, min)
}

async function main() {
  console.log('Seeding dummy transaksi...')

  // Ambil data yang sudah ada
  const packages = await prisma.package.findMany({ where: { isActive: true } })
  const customers = await prisma.customer.findMany()
  const metodePembayaran = await prisma.metodePembayaran.findMany()
  const fotografers = await prisma.fotografer.findMany()

  if (!packages.length) { console.log('Tidak ada paket! Jalankan seed_explora.ts dulu.'); return }
  if (!metodePembayaran.length) { console.log('Tidak ada metode pembayaran!'); return }

  // Buat beberapa customer dummy kalau belum ada
  const customerNames = [
    'Budi Santoso', 'Siti Rahayu', 'Ahmad Fauzi', 'Dewi Lestari', 'Rizky Pratama',
    'Nadia Permata', 'Hendra Wijaya', 'Anita Kusuma', 'Fajar Nugroho', 'Maya Sari',
    'Dian Purnama', 'Eko Prasetyo', 'Fitri Handayani', 'Galih Wibowo', 'Hani Safitri',
    'Ivan Kurniawan', 'Juliana Putri', 'Kevin Adhitya', 'Laras Wulandari', 'Muhamad Iqbal',
  ]

  const customerList: any[] = []
  for (const name of customerNames) {
    let cust = await prisma.customer.findFirst({ where: { name } })
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          name,
          whatsapp: `0812${randomInt(10000000, 99999999)}`,
          email: `${name.toLowerCase().replace(/\s/g, '.')}@gmail.com`,
        }
      })
    }
    customerList.push(cust)
  }

  // Generate invoice number
  let invoiceCounter = 1000

  // Loop 6 bulan: Jan - Jun 2026
  const months = [
    { year: 2026, month: 1, txCount: randomInt(18, 25) },
    { year: 2026, month: 2, txCount: randomInt(15, 22) },
    { year: 2026, month: 3, txCount: randomInt(20, 30) },
    { year: 2026, month: 4, txCount: randomInt(22, 32) },
    { year: 2026, month: 5, txCount: randomInt(25, 35) },
    { year: 2026, month: 6, txCount: randomInt(10, 15) },
  ]

  for (const { year, month, txCount } of months) {
    console.log(`Membuat ${txCount} transaksi untuk ${month}/${year}...`)

    for (let i = 0; i < txCount; i++) {
      const txDate = randomDate(year, month)
      const customer = randomItem(customerList)
      const metode = randomItem(metodePembayaran)
      const fotografer = fotografers.length ? randomItem(fotografers) : null

      // Pilih 1-2 paket
      const numPackages = randomInt(1, 2)
      const selectedPkgs: any[] = []
      const usedIds = new Set()
      for (let p = 0; p < numPackages; p++) {
        let pkg = randomItem(packages)
        if (usedIds.has(pkg.id)) pkg = randomItem(packages)
        usedIds.add(pkg.id)
        selectedPkgs.push(pkg)
      }

      const subtotal = selectedPkgs.reduce((s, p) => s + p.price, 0)
      const grandTotal = subtotal

      const monthStr = String(month).padStart(2, '0')
      const dayStr = String(txDate.getDate()).padStart(2, '0')
      invoiceCounter++
      const invoiceNumber = `INV-${year}${monthStr}${dayStr}-${String(invoiceCounter).padStart(4, '0')}`

      await prisma.transaction.create({
        data: {
          invoiceNumber,
          transactionDate: txDate,
          customerId: customer.id,
          userId: 'cmpwhb7y00000bbq2r6a1oa1x',
          metodePembayaranId: metode.id,
          fotograferId: fotografer?.id || null,
          subtotal,
          discount: 0,
          grandTotal,
          dpAmount: 0,
          diterimaSaatIni: grandTotal,
          paymentStatus: 'PAID',

          items: {
            create: selectedPkgs.map(pkg => ({
              packageId: pkg.id,
              price: pkg.price,
              jumlahOrang: pkg.pricePerPerson ? randomInt(2, 5) : 0,
              hargaPerOrang: pkg.pricePerPerson ? pkg.price : null,
            }))
          }
        }
      })
    }

    // Buat pengeluaran per bulan
    const expCount = randomInt(3, 6)
    const expCategories = ['GAJI', 'LISTRIK', 'INTERNET', 'PERALATAN', 'LAINNYA']
    const expTitles: Record<string, string[]> = {
      GAJI: ['Gaji Karyawan', 'Tunjangan'],
      LISTRIK: ['Tagihan Listrik'],
      INTERNET: ['Tagihan Internet'],
      PERALATAN: ['Beli Kertas Foto', 'Tinta Printer', 'Peralatan Studio'],
      LAINNYA: ['Operasional', 'Keperluan Studio', 'Konsumsi'],
    }
    for (let e = 0; e < expCount; e++) {
      const cat = randomItem(expCategories)
      const title = randomItem(expTitles[cat])
      const amount = randomInt(50000, 500000) * 100
      const expDate = randomDate(year, month)
      await prisma.expense.create({
        data: { title, amount, category: cat as any, date: expDate }
      })
    }
  }

  const total = await prisma.transaction.count()
  console.log(`\nSelesai! Total transaksi: ${total}`)
}

main()
  .catch(console.error)
  .finally(() => (prisma as any)['$disconnect']())
