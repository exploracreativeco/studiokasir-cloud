import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const hashedPassword = await bcrypt.hash('super123', 10)
  await prisma.user.upsert({
    where: { email: 'superadmin@studiokasir.com' },
    update: {},
    create: { name: 'Super Admin', email: 'superadmin@studiokasir.com', password: hashedPassword, role: 'SUPERADMIN', isActive: true },
  })

  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@studiokasir.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@studiokasir.com', password: adminPassword, role: 'ADMIN', isActive: true },
  })

  const kasirPassword = await bcrypt.hash('kasir123', 10)
  await prisma.user.upsert({
    where: { email: 'kasir@studiokasir.com' },
    update: {},
    create: { name: 'Kasir', email: 'kasir@studiokasir.com', password: kasirPassword, role: 'CASHIER', isActive: true },
  })

  await prisma.setting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', studioName: 'Kexplora Studio', address: 'Semarang, Jawa Tengah', invoiceFooter: 'Terima kasih telah mempercayakan momen Anda kepada kami!' },
  })

  const categories = [
    { name: 'PASFOTO', label: 'Pasfoto', perOrang: false, urutan: 1 },
    { name: 'CETAK', label: 'Cetak', perOrang: false, urutan: 2 },
    { name: 'GRADUATION', label: 'Graduation', perOrang: false, urutan: 3 },
    { name: 'FAMILY', label: 'Family', perOrang: false, urutan: 4 },
    { name: 'COUPLE', label: 'Couple', perOrang: false, urutan: 5 },
    { name: 'MATERNITY', label: 'Maternity', perOrang: false, urutan: 6 },
    { name: 'GROUP', label: 'Group', perOrang: false, urutan: 7 },
    { name: 'SQUAD', label: 'Squad', perOrang: true, urutan: 8 },
    { name: 'PARTY', label: 'Party', perOrang: true, urutan: 9 },
    { name: 'PERSONAL', label: 'Personal', perOrang: false, urutan: 10 },
    { name: 'PREWEDDING', label: 'Prewedding', perOrang: false, urutan: 11 },
  ]
  for (const cat of categories) {
    const existing = await prisma.packageCategory.findUnique({ where: { name: cat.name } })
    if (!existing) await prisma.packageCategory.create({ data: cat })
  }

  const tiers = [
    { name: 'BASIC', label: 'Basic', urutan: 1 },
    { name: 'STANDARD', label: 'Standard', urutan: 2 },
    { name: 'PREMIUM', label: 'Premium', urutan: 3 },
  ]
  for (const tier of tiers) {
    const existing = await prisma.packageTier.findUnique({ where: { name: tier.name } })
    if (!existing) await prisma.packageTier.create({ data: tier })
  }

  const packages = [
    { name: 'Pasfoto Close Up', category: 'PASFOTO', price: 30000, isActive: true },
    { name: 'Pasfoto Fullbody', category: 'PASFOTO', price: 40000, isActive: true },
    { name: 'Family Basic', category: 'FAMILY', tier: 'BASIC', price: 299000, isActive: true },
    { name: 'Family Standard', category: 'FAMILY', tier: 'STANDARD', price: 450000, isActive: true },
    { name: 'Family Premium', category: 'FAMILY', tier: 'PREMIUM', price: 650000, isActive: true },
    { name: 'Couple Basic', category: 'COUPLE', tier: 'BASIC', price: 250000, isActive: true },
    { name: 'Couple Premium', category: 'COUPLE', tier: 'PREMIUM', price: 550000, isActive: true },
    { name: 'Graduation Basic', category: 'GRADUATION', tier: 'BASIC', price: 300000, isActive: true },
    { name: 'Graduation Premium', category: 'GRADUATION', tier: 'PREMIUM', price: 500000, isActive: true },
  ]
  for (const pkg of packages) {
    const existing = await prisma.package.findFirst({ where: { name: pkg.name } })
    if (!existing) await prisma.package.create({ data: pkg })
  }

  const metodes = [
    { nama: 'Cash', isActive: true, urutan: 1 },
    { nama: 'Transfer BCA', namaBank: 'BCA', isActive: true, urutan: 2 },
    { nama: 'QRIS', isActive: true, urutan: 3 },
  ]
  for (const m of metodes) {
    const existing = await prisma.metodePembayaran.findFirst({ where: { nama: m.nama } })
    if (!existing) await prisma.metodePembayaran.create({ data: m })
  }

  const statuses = [
    { nama: 'Antrian', warna: '#3b82f6', urutan: 1 },
    { nama: 'Proses', warna: '#f59e0b', urutan: 2 },
    { nama: 'Selesai', warna: '#10b981', urutan: 3 },
  ]
  for (const s of statuses) {
    const existing = await prisma.otsStatus.findFirst({ where: { nama: s.nama } })
    if (!existing) await prisma.otsStatus.create({ data: s })
  }

  const addons = [
    { name: 'Album Foto', price: 150000, isActive: true },
    { name: 'Extra Edit', price: 75000, isActive: true },
    { name: 'Softcopy', price: 50000, isActive: true },
  ]
  for (const a of addons) {
    const existing = await prisma.addon.findFirst({ where: { name: a.name } })
    if (!existing) await prisma.addon.create({ data: a })
  }

  const existingFot = await prisma.fotografer.findFirst({ where: { name: 'Fotografer 1' } })
  if (!existingFot) await prisma.fotografer.create({ data: { name: 'Fotografer 1', isActive: true } })

  const jenisOts = ['PASFOTO', 'CETAK', 'CUSTOM']
  for (const nama of jenisOts) {
    const existing = await prisma.otsJenisCustom.findFirst({ where: { nama } })
    if (!existing) await prisma.otsJenisCustom.create({ data: { nama } })
  }

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
      create: { role: 'CASHIER', menu, canAccess: ['kasir', 'booking', 'ots', 'transaksi', 'customers'].includes(menu) },
    })
  }

  // Data contoh Customer
  const contohCustomers = [
    { name: 'Budi Santoso', whatsapp: '08123456789', instagram: '@budisantoso', notes: 'Pelanggan tetap keluarga' },
    { name: 'Siti Rahayu', whatsapp: '08987654321', instagram: '@sitirahayu', notes: 'Suka foto couple dan graduation' },
  ]
  for (const c of contohCustomers) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } })
    if (!existing) await prisma.customer.create({ data: c })
  }

  // Data contoh Promo
  const existingPromo = await prisma.promoCode.findFirst({ where: { code: 'WELCOME10' } })
  if (!existingPromo) await prisma.promoCode.create({
    data: { name: 'Welcome Discount 10%', code: 'WELCOME10', discountType: 'PERCENTAGE', discountValue: 10, isActive: true }
  })
  const existingPromo2 = await prisma.promoCode.findFirst({ where: { code: 'DISC50K' } })
  if (!existingPromo2) await prisma.promoCode.create({
    data: { name: 'Diskon 50 Ribu', code: 'DISC50K', discountType: 'FIXED', discountValue: 50000, isActive: true }
  })

  // Data contoh Biaya Ops Satuan
  const biayaOps = [
    { ukuran: '2R', jenis: 'CETAK', harga: 3000 },
    { ukuran: '4R', jenis: 'CETAK', harga: 5000 },
    { ukuran: '5R', jenis: 'CETAK', harga: 7000 },
    { ukuran: '10R', jenis: 'CETAK', harga: 15000 },
    { ukuran: '10R', jenis: 'PIGURA', harga: 35000 },
    { ukuran: '12R', jenis: 'PIGURA', harga: 55000 },
  ]
  for (const b of biayaOps) {
    const existing = await prisma.biayaOpsSatuan.findFirst({ where: { ukuran: b.ukuran, jenis: b.jenis } })
    if (!existing) await prisma.biayaOpsSatuan.create({ data: { ...b, isActive: true } })
  }

  // Data contoh OTS Paket
  const otsPakets = [
    { nama: 'Pasfoto 2x3 (1 lbr)', jenis: 'PASFOTO', harga: 15000, satuan: 'pcs', isActive: true, urutan: 1 },
    { nama: 'Pasfoto 3x4 (1 lbr)', jenis: 'PASFOTO', harga: 15000, satuan: 'pcs', isActive: true, urutan: 2 },
    { nama: 'Pasfoto 4x6 (1 lbr)', jenis: 'PASFOTO', harga: 20000, satuan: 'pcs', isActive: true, urutan: 3 },
    { nama: 'Pasfoto 2x3 (4 lbr)', jenis: 'PASFOTO', harga: 25000, satuan: 'set', isActive: true, urutan: 4 },
    { nama: 'Pasfoto 3x4 (4 lbr)', jenis: 'PASFOTO', harga: 25000, satuan: 'set', isActive: true, urutan: 5 },
    { nama: 'Cetak 4R', jenis: 'CETAK', harga: 5000, satuan: 'pcs', isActive: true, urutan: 1 },
    { nama: 'Cetak 5R', jenis: 'CETAK', harga: 7000, satuan: 'pcs', isActive: true, urutan: 2 },
    { nama: 'Cetak 10R', jenis: 'CETAK', harga: 15000, satuan: 'pcs', isActive: true, urutan: 3 },
    { nama: 'Cetak 12R', jenis: 'CETAK', harga: 20000, satuan: 'pcs', isActive: true, urutan: 4 },
    { nama: 'Pigura 10R', jenis: 'CETAK', harga: 50000, satuan: 'pcs', isActive: true, urutan: 5 },
  ]
  for (const p of otsPakets) {
    const existing = await prisma.otsPaket.findFirst({ where: { nama: p.nama } })
    if (!existing) await prisma.otsPaket.create({ data: p })
  }

  console.log('Seeding selesai!')
  console.log('Login: superadmin@studiokasir.com / super123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())