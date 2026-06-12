import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Explora Studio database...')

  // ===== SETTINGS =====
  await prisma.setting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      studioName: 'Explora Studio',
      address: 'Jalan Mulawarman Selatan Raya, Kramas, Tembalang',
      invoiceFooter: 'Terima kasih telah mempercayakan momen Anda kepada kami! | WA: 0851-1782-0730',
    },
  })

  // ===== USERS =====
  const users = [
    { name: 'Super Admin', email: 'exploracreative@gmail.com', password: '@ExploraGank', role: 'SUPERADMIN' },
    { name: 'Anisa', email: 'anisa@explora.id', password: 'anisa123', role: 'ADMIN' },
    { name: 'Kynan', email: 'kynan@explora.id', password: 'kynan123', role: 'CASHIER' },
    { name: 'Miftah', email: 'miftah@explora.id', password: 'miftah123', role: 'CASHIER' },
  ]
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10)
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, password: hashed, role: u.role as any, isActive: true },
    })
  }

  // ===== KATEGORIS =====
  const categories = [
    { name: 'PASFOTO', label: 'Pasfoto', perOrang: false, urutan: 1 },
    { name: 'CETAK', label: 'Cetak', perOrang: false, urutan: 2 },
    { name: 'FAMILY', label: 'Family', perOrang: false, urutan: 3 },
    { name: 'GRADUATION', label: 'Graduation', perOrang: false, urutan: 4 },
    { name: 'COUPLE', label: 'Couple', perOrang: false, urutan: 5 },
    { name: 'MATERNITY', label: 'Maternity', perOrang: false, urutan: 6 },
    { name: 'GROUP', label: 'Group', perOrang: false, urutan: 7 },
    { name: 'SQUAD', label: 'Squad', perOrang: true, urutan: 8 },
    { name: 'PARTY', label: 'Party', perOrang: true, urutan: 9 },
    { name: 'FESTIVAL', label: 'Festival', perOrang: true, urutan: 10 },
    { name: 'PERSONAL', label: 'Personal', perOrang: false, urutan: 11 },
    { name: 'PREWEDDING', label: 'Prewedding', perOrang: false, urutan: 12 },
  ]
  for (const cat of categories) {
    const existing = await prisma.packageCategory.findUnique({ where: { name: cat.name } })
    if (!existing) await prisma.packageCategory.create({ data: cat })
  }

  // ===== TIERS =====
  const tiers = [
    { name: 'BASIC', label: 'Basic', urutan: 1 },
    { name: 'STANDARD', label: 'Standard', urutan: 2 },
    { name: 'PREMIUM', label: 'Premium', urutan: 3 },
    { name: 'EXCLUSIVE', label: 'Exclusive', urutan: 4 },
    { name: 'DIAMOND', label: 'Diamond', urutan: 5 },
  ]
  for (const tier of tiers) {
    const existing = await prisma.packageTier.findUnique({ where: { name: tier.name } })
    if (!existing) await prisma.packageTier.create({ data: tier })
  }

  // ===== PACKAGES =====
  const packages = [
    // PASFOTO
    { name: 'Pasfoto Close Up', category: 'PASFOTO', price: 30000, isActive: true },
    { name: 'Pasfoto Fullbody', category: 'PASFOTO', price: 40000, isActive: true },
    // CETAK PASFOTO
    { name: 'Cetak Pasfoto 4x6 (4pcs)', category: 'CETAK', price: 5000, isActive: true },
    { name: 'Cetak Pasfoto 3x4 (8pcs)', category: 'CETAK', price: 5000, isActive: true },
    { name: 'Cetak Pasfoto 2x3 (16pcs)', category: 'CETAK', price: 5000, isActive: true },
    // FAMILY
    { name: 'Family Basic', category: 'FAMILY', tier: 'BASIC', price: 299000, isActive: true },
    { name: 'Family Standard', category: 'FAMILY', tier: 'STANDARD', price: 400000, isActive: true },
    { name: 'Family Premium', category: 'FAMILY', tier: 'PREMIUM', price: 650000, isActive: true },
    { name: 'Family Exclusive', category: 'FAMILY', tier: 'EXCLUSIVE', price: 999000, isActive: true },
    // GRADUATION
    { name: 'Graduation Basic', category: 'GRADUATION', tier: 'BASIC', price: 299000, isActive: true },
    { name: 'Graduation Standard', category: 'GRADUATION', tier: 'STANDARD', price: 400000, isActive: true },
    { name: 'Graduation Premium', category: 'GRADUATION', tier: 'PREMIUM', price: 650000, isActive: true },
    { name: 'Graduation Exclusive', category: 'GRADUATION', tier: 'EXCLUSIVE', price: 900000, isActive: true },
    // COUPLE
    { name: 'Couple Basic', category: 'COUPLE', tier: 'BASIC', price: 249000, isActive: true },
    { name: 'Couple Standard', category: 'COUPLE', tier: 'STANDARD', price: 350000, isActive: true },
    { name: 'Couple Premium', category: 'COUPLE', tier: 'PREMIUM', price: 550000, isActive: true },
    { name: 'Couple Exclusive', category: 'COUPLE', tier: 'EXCLUSIVE', price: 850000, isActive: true },
    // MATERNITY
    { name: 'Maternity Basic', category: 'MATERNITY', tier: 'BASIC', price: 249000, isActive: true },
    { name: 'Maternity Standard', category: 'MATERNITY', tier: 'STANDARD', price: 350000, isActive: true },
    { name: 'Maternity Premium', category: 'MATERNITY', tier: 'PREMIUM', price: 550000, isActive: true },
    { name: 'Maternity Exclusive', category: 'MATERNITY', tier: 'EXCLUSIVE', price: 850000, isActive: true },
    // GROUP
    { name: 'Group Basic (3-9 org)', category: 'GROUP', tier: 'BASIC', price: 299000, isActive: true },
    { name: 'Group Standard (3-9 org)', category: 'GROUP', tier: 'STANDARD', price: 400000, isActive: true },
    { name: 'Group Premium (3-9 org)', category: 'GROUP', tier: 'PREMIUM', price: 600000, isActive: true },
    { name: 'Group Exclusive (3-9 org)', category: 'GROUP', tier: 'EXCLUSIVE', price: 900000, isActive: true },
    // SQUAD (per orang)
    { name: 'Squad Basic (10-19 org)', category: 'SQUAD', tier: 'BASIC', price: 30000, isActive: true },
    { name: 'Squad Standard (10-19 org)', category: 'SQUAD', tier: 'STANDARD', price: 40000, isActive: true },
    { name: 'Squad Premium (10-19 org)', category: 'SQUAD', tier: 'PREMIUM', price: 50000, isActive: true },
    { name: 'Squad Exclusive (10-19 org)', category: 'SQUAD', tier: 'EXCLUSIVE', price: 60000, isActive: true },
    // PARTY SMALL (per orang)
    { name: 'Party Small Basic (20-40)', category: 'PARTY', tier: 'BASIC', price: 28000, isActive: true },
    { name: 'Party Small Standard (20-40)', category: 'PARTY', tier: 'STANDARD', price: 38000, isActive: true },
    { name: 'Party Small Premium (20-40)', category: 'PARTY', tier: 'PREMIUM', price: 48000, isActive: true },
    { name: 'Party Small Exclusive (20-40)', category: 'PARTY', tier: 'EXCLUSIVE', price: 58000, isActive: true },
    // PARTY MEDIUM (per orang)
    { name: 'Party Medium Basic (41-70)', category: 'PARTY', tier: 'BASIC', price: 25000, isActive: true },
    { name: 'Party Medium Standard (41-70)', category: 'PARTY', tier: 'STANDARD', price: 35000, isActive: true },
    { name: 'Party Medium Premium (41-70)', category: 'PARTY', tier: 'PREMIUM', price: 45000, isActive: true },
    { name: 'Party Medium Exclusive (41-70)', category: 'PARTY', tier: 'EXCLUSIVE', price: 55000, isActive: true },
    // PARTY LARGE (per orang)
    { name: 'Party Large Basic (71-100)', category: 'PARTY', tier: 'BASIC', price: 23000, isActive: true },
    { name: 'Party Large Standard (71-100)', category: 'PARTY', tier: 'STANDARD', price: 33000, isActive: true },
    { name: 'Party Large Premium (71-100)', category: 'PARTY', tier: 'PREMIUM', price: 43000, isActive: true },
    { name: 'Party Large Exclusive (71-100)', category: 'PARTY', tier: 'EXCLUSIVE', price: 53000, isActive: true },
    // FESTIVAL MEGA (per orang)
    { name: 'Mega Festival Basic (101-130)', category: 'FESTIVAL', tier: 'BASIC', price: 21000, isActive: true },
    { name: 'Mega Festival Standard (101-130)', category: 'FESTIVAL', tier: 'STANDARD', price: 30000, isActive: true },
    { name: 'Mega Festival Premium (101-130)', category: 'FESTIVAL', tier: 'PREMIUM', price: 40000, isActive: true },
    { name: 'Mega Festival Exclusive (101-130)', category: 'FESTIVAL', tier: 'EXCLUSIVE', price: 45000, isActive: true },
    // FESTIVAL GIGA (per orang)
    { name: 'Giga Festival Basic (131-150)', category: 'FESTIVAL', tier: 'BASIC', price: 20000, isActive: true },
    { name: 'Giga Festival Standard (131-150)', category: 'FESTIVAL', tier: 'STANDARD', price: 28000, isActive: true },
    { name: 'Giga Festival Premium (131-150)', category: 'FESTIVAL', tier: 'PREMIUM', price: 35000, isActive: true },
    { name: 'Giga Festival Exclusive (131-150)', category: 'FESTIVAL', tier: 'EXCLUSIVE', price: 40000, isActive: true },
    // PERSONAL
    { name: 'Personal Standard', category: 'PERSONAL', tier: 'STANDARD', price: 200000, isActive: true },
    { name: 'Personal Premium', category: 'PERSONAL', tier: 'PREMIUM', price: 300000, isActive: true },
    { name: 'Personal Exclusive', category: 'PERSONAL', tier: 'EXCLUSIVE', price: 600000, isActive: true },
    // PREWEDDING
    { name: 'Prewedding Indoor Premium', category: 'PREWEDDING', tier: 'PREMIUM', price: 1000000, isActive: true },
    { name: 'Prewedding Indoor Exclusive', category: 'PREWEDDING', tier: 'EXCLUSIVE', price: 1500000, isActive: true },
    { name: 'Prewedding Indoor Diamond', category: 'PREWEDDING', tier: 'DIAMOND', price: 2000000, isActive: true },
  ]
  for (const pkg of packages) {
    const existing = await prisma.package.findFirst({ where: { name: pkg.name } })
    if (!existing) await prisma.package.create({ data: pkg })
  }

  // ===== METODE PEMBAYARAN =====
  const metodes = [
    { nama: 'Cash', isActive: true, urutan: 1 },
    { nama: 'QRIS', isActive: true, urutan: 2 },
    { nama: 'Transfer BCA', namaBank: 'BCA', isActive: true, urutan: 3 },
    { nama: 'Transfer BRI', namaBank: 'BRI', isActive: true, urutan: 4 },
    { nama: 'Transfer Mandiri', namaBank: 'Mandiri', isActive: true, urutan: 5 },
    { nama: 'Transfer BSI', namaBank: 'BSI', isActive: true, urutan: 6 },
    { nama: 'Transfer Blu', namaBank: 'Blu BCA Digital', isActive: true, urutan: 7 },
  ]
  for (const m of metodes) {
    const existing = await prisma.metodePembayaran.findFirst({ where: { nama: m.nama } })
    if (!existing) await prisma.metodePembayaran.create({ data: m })
  }

  // ===== FOTOGRAFER =====
  const fotografers = ['Kynan', 'Miftah', 'Lintang', 'Erul']
  for (const f of fotografers) {
    const existing = await prisma.fotografer.findFirst({ where: { name: f } })
    if (!existing) await prisma.fotografer.create({ data: { name: f, isActive: true } })
  }

  // ===== ADD-ONS =====
  const addons = [
    // Cetak saja
    { name: 'Cetak 2r', price: 3000, isActive: true },
    { name: 'Cetak 4r', price: 5000, isActive: true },
    { name: 'Cetak 6r', price: 7000, isActive: true },
    { name: 'Cetak 10R', price: 10000, isActive: true },
    { name: 'Cetak 10RS', price: 10000, isActive: true },
    { name: 'Cetak 12RS', price: 35000, isActive: true },
    { name: 'Cetak 16RS', price: 110000, isActive: true },
    { name: 'Cetak 20RS', price: 160000, isActive: true },
    { name: 'Cetak 24RS', price: 210000, isActive: true },
    { name: 'Cetak 30RS', price: 260000, isActive: true },
    // Frame saja
    { name: 'Frame 4r', price: 15000, isActive: true },
    { name: 'Frame 6r', price: 20000, isActive: true },
    { name: 'Frame 10R', price: 25000, isActive: true },
    { name: 'Frame 10RS', price: 30000, isActive: true },
    { name: 'Frame 12RS', price: 45000, isActive: true },
    { name: 'Frame 16RS', price: 105000, isActive: true },
    { name: 'Frame 20RS', price: 130000, isActive: true },
    { name: 'Frame 24RS', price: 200000, isActive: true },
    { name: 'Frame 30RS', price: 250000, isActive: true },
    // Cetak+Frame
    { name: 'Cetak+Frame 4r', price: 20000, isActive: true },
    { name: 'Cetak+Frame 6r', price: 25000, isActive: true },
    { name: 'Cetak+Frame 10R', price: 30000, isActive: true },
    { name: 'Cetak+Frame 10RS', price: 35000, isActive: true },
    { name: 'Cetak+Frame 12RS', price: 75000, isActive: true },
    { name: 'Cetak+Frame 16RS', price: 200000, isActive: true },
    { name: 'Cetak+Frame 20RS', price: 265000, isActive: true },
    { name: 'Cetak+Frame 24RS', price: 400000, isActive: true },
    { name: 'Cetak+Frame 30RS', price: 450000, isActive: true },
    // Extras Editing
    { name: 'Editing Simple', price: 15000, isActive: true },
    { name: 'Editing Detail', price: 50000, isActive: true },
  ]
  for (const a of addons) {
    const existing = await prisma.addon.findFirst({ where: { name: a.name } })
    if (!existing) await prisma.addon.create({ data: a })
  }

  // ===== OTS STATUS =====
  const otsStatuses = [
    { nama: 'Antrian', warna: '#3b82f6', urutan: 1 },
    { nama: 'Proses Foto', warna: '#f59e0b', urutan: 2 },
    { nama: 'Selesai Editing', warna: '#8b5cf6', urutan: 3 },
    { nama: 'Selesai Cetak', warna: '#06b6d4', urutan: 4 },
    { nama: 'Selesai', warna: '#10b981', urutan: 5 },
    { nama: 'Diambil', warna: '#6b7280', urutan: 6 },
  ]
  for (const s of otsStatuses) {
    const existing = await prisma.otsStatus.findFirst({ where: { nama: s.nama } })
    if (!existing) await prisma.otsStatus.create({ data: s })
  }

  // ===== JENIS OTS =====
  const jenisOts = ['Pasfoto', 'Tambah Cetak']
  for (const j of jenisOts) {
    const existing = await prisma.otsJenisCustom.findFirst({ where: { nama: j } })
    if (!existing) await prisma.otsJenisCustom.create({ data: { nama: j } })
  }

  // ===== PAKET OTS =====
  const paketOts = [
    { nama: 'Pasfoto Soft File', harga: 30000, jenis: 'PASFOTO', isActive: true },
    { nama: 'Cetak Pasfoto 4x6', harga: 5000, jenis: 'CETAK', isActive: true },
    { nama: 'Cetak Pasfoto 3x4', harga: 5000, jenis: 'CETAK', isActive: true },
    { nama: 'Cetak Pasfoto 2x3', harga: 5000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak 2r', harga: 3000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak 4r', harga: 5000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak 6r', harga: 7000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak 10R', harga: 10000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak 10RS', harga: 10000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak 12RS', harga: 35000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak 16RS', harga: 110000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak+Frame 4r', harga: 20000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak+Frame 10RS', harga: 35000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak+Frame 12RS', harga: 75000, jenis: 'CETAK', isActive: true },
    { nama: 'Tambah Cetak+Frame 16RS', harga: 200000, jenis: 'CETAK', isActive: true },
  ]
  for (const p of paketOts) {
    const existing = await prisma.otsPaket.findFirst({ where: { nama: p.nama } })
    if (!existing) await prisma.otsPaket.create({ data: p })
  }

  // ===== BIAYA OPS =====
  // Biaya ops adalah harga modal/supplier, diinput manual per transaksi
  // Data supplier disimpan sebagai referensi di settings atau notes

  // ===== PROMO =====
  const promos = [
    { name: 'Diskon 25%', code: 'DISC25', discountType: 'PERCENTAGE', discountValue: 25, isActive: true },
    { name: 'KGS Diskon 30%', code: 'KGS30', discountType: 'PERCENTAGE', discountValue: 30, isActive: true },
  ]
  for (const p of promos) {
    const existing = await prisma.promoCode.findFirst({ where: { code: p.code } })
    if (!existing) await prisma.promoCode.create({ data: p as any })
  }

  // ===== ROLE ACCESS =====
  const menus = ['dashboard', 'kasir', 'booking', 'ots', 'transaksi', 'customers', 'pengeluaran', 'laporan', 'sheets', 'admin', 'settings']
  for (const menu of menus) {
    await prisma.roleAccess.upsert({
      where: { role_menu: { role: 'ADMIN', menu } },
      update: {},
      create: { role: 'ADMIN', menu, canAccess: !['admin', 'settings'].includes(menu) },
    })
    await prisma.roleAccess.upsert({
      where: { role_menu: { role: 'CASHIER', menu } },
      update: {},
      create: { role: 'CASHIER', menu, canAccess: ['kasir', 'booking', 'ots', 'transaksi', 'customers', 'dashboard'].includes(menu) },
    })
  }

  console.log('Seeding selesai!')
  console.log('Login:')
  console.log('  exploracreative@gmail.com / @ExploraGank')
  console.log('  anisa@explora.id / anisa123')
  console.log('  kynan@explora.id / kynan123')
  console.log('  miftah@explora.id / miftah123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
