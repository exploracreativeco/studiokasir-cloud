// Script: seed_from_offline.js
// Jalankan dari folder C:\StudioKasirCloud
// Copy master data dari SQLite offline ke PostgreSQL cloud

const { PrismaClient: PrismaCloud } = require('@prisma/client')
const Database = require('better-sqlite3')
const path = require('path')

const cloud = new PrismaCloud()
const offline = new Database('C:\\StudioKasir\\prisma\\studiokasir.db', { readonly: true })

async function main() {
  console.log('Starting seed from offline DB...\n')

  // 1. Package Categories
  const cats = offline.prepare('SELECT * FROM PackageCategory').all()
  console.log(`PackageCategory: ${cats.length} rows`)
  for (const r of cats) {
    await cloud.packageCategory.upsert({
      where: { name: r.name },
      update: {},
      create: { id: r.id, name: r.name, label: r.label, perOrang: r.perOrang === 1, urutan: r.urutan || 0, isActive: r.isActive === 1, createdAt: new Date(r.createdAt) }
    }).catch(e => console.log('  skip cat:', r.name, e.message))
  }

  // 2. Package Tiers
  const tiers = offline.prepare('SELECT * FROM PackageTier').all()
  console.log(`PackageTier: ${tiers.length} rows`)
  for (const r of tiers) {
    await cloud.packageTier.upsert({
      where: { name: r.name },
      update: {},
      create: { id: r.id, name: r.name, label: r.label, urutan: r.urutan || 0, isActive: r.isActive === 1, createdAt: new Date(r.createdAt) }
    }).catch(e => console.log('  skip tier:', r.name, e.message))
  }

  // 3. Packages
  const pkgs = offline.prepare('SELECT * FROM Package').all()
  console.log(`Package: ${pkgs.length} rows`)
  for (const r of pkgs) {
    await cloud.package.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, name: r.name, category: r.category, tier: r.tier, price: r.price, pricePerPerson: r.pricePerPerson === 1, description: r.description, isActive: r.isActive === 1, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) }
    }).catch(e => console.log('  skip pkg:', r.name, e.message))
  }

  // 4. Fotografer
  const fotos = offline.prepare('SELECT * FROM Fotografer').all()
  console.log(`Fotografer: ${fotos.length} rows`)
  for (const r of fotos) {
    await cloud.fotografer.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, name: r.name, phone: r.phone, isActive: r.isActive === 1, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) }
    }).catch(e => console.log('  skip foto:', r.name, e.message))
  }

  // 5. Metode Pembayaran
  const metodes = offline.prepare('SELECT * FROM MetodePembayaran').all()
  console.log(`MetodePembayaran: ${metodes.length} rows`)
  for (const r of metodes) {
    await cloud.metodePembayaran.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, nama: r.nama, nomorRekening: r.nomorRekening, atasNama: r.atasNama, namaBank: r.namaBank, isActive: r.isActive === 1, urutan: r.urutan || 0, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) }
    }).catch(e => console.log('  skip metode:', r.nama, e.message))
  }

  // 6. Addons
  const addons = offline.prepare('SELECT * FROM Addon').all()
  console.log(`Addon: ${addons.length} rows`)
  for (const r of addons) {
    await cloud.addon.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, name: r.name, price: r.price, isActive: r.isActive === 1, urutan: r.urutan || 0, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) }
    }).catch(e => console.log('  skip addon:', r.name, e.message))
  }

  // 7. Promo Codes
  const promos = offline.prepare('SELECT * FROM PromoCode').all()
  console.log(`PromoCode: ${promos.length} rows`)
  for (const r of promos) {
    await cloud.promoCode.upsert({
      where: { code: r.code },
      update: {},
      create: { id: r.id, name: r.name, code: r.code, discountType: r.discountType, discountValue: r.discountValue, isActive: r.isActive === 1, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) }
    }).catch(e => console.log('  skip promo:', r.code, e.message))
  }

  // 8. BiayaOpsSatuan
  const biaya = offline.prepare('SELECT * FROM BiayaOpsSatuan').all()
  console.log(`BiayaOpsSatuan: ${biaya.length} rows`)
  for (const r of biaya) {
    await cloud.biayaOpsSatuan.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, ukuran: r.ukuran, jenis: r.jenis, harga: r.harga, isActive: r.isActive === 1, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) }
    }).catch(e => console.log('  skip biaya:', r.id, e.message))
  }

  // 9. OTS Status
  const otsStatus = offline.prepare('SELECT * FROM OtsStatus').all()
  console.log(`OtsStatus: ${otsStatus.length} rows`)
  for (const r of otsStatus) {
    await cloud.otsStatus.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, nama: r.nama, warna: r.warna || '#6b7280', urutan: r.urutan || 0, isActive: r.isActive === 1, createdAt: new Date(r.createdAt) }
    }).catch(e => console.log('  skip otsStatus:', r.nama, e.message))
  }

  // 10. Settings
  const setting = offline.prepare('SELECT * FROM Setting LIMIT 1').get()
  if (setting) {
    console.log('Setting: 1 row')
    await cloud.setting.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        studioName: setting.studioName,
        address: setting.address,
        whatsapp: setting.whatsapp,
        instagram: setting.instagram,
        invoiceFooter: setting.invoiceFooter,
        webhookUrl: setting.webhookUrl,
        thermalSize: setting.thermalSize || '80mm',
        syaratKetentuan: setting.syaratKetentuan,
        emailHost: setting.emailHost,
        emailPort: setting.emailPort,
        emailUser: setting.emailUser,
        emailPass: setting.emailPass,
        emailFrom: setting.emailFrom,
        emailSubject: setting.emailSubject,
        backupEmail: setting.backupEmail,
        backupSchedule: setting.backupSchedule || 'OFF',
        backupTime: setting.backupTime || '22:00',
        backupDay: setting.backupDay || '1',
      }
    }).catch(e => console.log('  skip setting:', e.message))
  }

  console.log('\n✅ Seed selesai!')
  await cloud.$disconnect()
  offline.close()
}

main().catch(e => {
  console.error('ERROR:', e)
  process.exit(1)
})
