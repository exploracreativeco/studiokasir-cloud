// ============================================================
// scripts/migrate_branch.js
// Jalankan SEKALI setelah `npx prisma db push`:
//   node scripts/migrate_branch.js
//
// 1. Buat branch "explora" & "yours"
// 2. Assign SEMUA data existing → explora
// 3. Idempotent: aman dijalankan ulang (upsert + hanya isi yang null)
// ============================================================
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== MIGRASI MULTI-BRANCH ===\n')

  // 1. Buat branches
  const explora = await prisma.branch.upsert({
    where: { slug: 'explora' },
    update: {},
    create: {
      slug: 'explora',
      nama: 'Explora Creative',
      alamat: 'Jalan Mulawarman Selatan Raya, Kramas, Tembalang, Semarang',
      whatsapp: '085176869677',
      instagram: 'exploracreative.co',
    },
  })
  console.log('Branch explora:', explora.id)

  const yours = await prisma.branch.upsert({
    where: { slug: 'yours' },
    update: {},
    create: {
      slug: 'yours',
      nama: 'Yours Self Studio',
    },
  })
  console.log('Branch yours  :', yours.id)

  // 2. Assign semua data existing (yang branchId-nya masih null) → explora
  const tables = [
    'transaction', 'booking', 'otsOrder', 'expense',
    'package', 'addon', 'promoCode', 'metodePembayaran', 'otsPaket',
    'fotografer',
  ]

  console.log('\nAssign data existing → explora:')
  for (const t of tables) {
    const result = await prisma[t].updateMany({
      where: { branchId: null },
      data: { branchId: explora.id },
    })
    console.log(`  ${t.padEnd(18)}: ${result.count} record`)
  }

  // CATATAN: User TIDAK di-assign — branchId null = akses semua branch.
  // Nanti buat user kasir khusus per branch via halaman Settings → Users.

  console.log('\n=== SELESAI ===')
  console.log('Verifikasi:')
  const [txExplora, txNull] = await Promise.all([
    prisma.transaction.count({ where: { branchId: explora.id } }),
    prisma.transaction.count({ where: { branchId: null } }),
  ])
  console.log(`  Transaksi explora: ${txExplora}, tanpa branch: ${txNull}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
