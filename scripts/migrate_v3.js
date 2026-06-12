// ============================================================
// scripts/migrate_v3.js — Fondasi Super App
// Jalankan SEKALI setelah `npx prisma db push`:
//   node scripts/migrate_v3.js
//
// 1. Seed role default (semua editable kecuali SUPERADMIN)
// 2. Seed section landing page (placeholder, konten diisi dari UI)
// 3. Link Fotografer existing → User (kalau email/nama cocok, sisanya manual)
// Idempotent: aman dijalankan ulang.
// ============================================================
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const ROLES = [
  { slug: 'SUPERADMIN', label: 'Owner / Superadmin', defaultLanding: '/dashboard', isSystem: true },
  { slug: 'ADMIN',      label: 'Admin / PJ Studio',  defaultLanding: '/kasir' },
  { slug: 'CASHIER',    label: 'Kasir',              defaultLanding: '/kasir' },
  { slug: 'FOTOGRAFER', label: 'Fotografer',         defaultLanding: '/jadwal' },
  { slug: 'EDITOR',     label: 'Editor',             defaultLanding: '/jadwal' },
  { slug: 'TEAM',       label: 'Team',               defaultLanding: '/jadwal' },
  { slug: 'CREW',       label: 'Crew',               defaultLanding: '/jadwal' },
]

const LANDING_SECTIONS = [
  { key: 'hero',          judul: 'Explora Creative', urutan: 1 },
  { key: 'tentang',       judul: 'Tentang Kami', urutan: 2 },
  { key: 'brand_explora', judul: 'Explora Studio', urutan: 3 },
  { key: 'brand_yours',   judul: 'Yours Self Studio', urutan: 4 },
  { key: 'brand_booth',   judul: 'Explora Booth', urutan: 5 },
  { key: 'kontak',        judul: 'Kontak', urutan: 6 },
]

async function main() {
  console.log('=== MIGRASI V3: FONDASI SUPER APP ===\n')

  // 1. Roles
  console.log('Seed roles:')
  for (const r of ROLES) {
    await prisma.role.upsert({ where: { slug: r.slug }, update: {}, create: r })
    console.log(`  ${r.slug.padEnd(12)} → landing ${r.defaultLanding}${r.isSystem ? ' [SYSTEM]' : ''}`)
  }

  // 2. Landing sections (placeholder)
  console.log('\nSeed landing sections:')
  for (const s of LANDING_SECTIONS) {
    await prisma.landingSection.upsert({
      where: { key: s.key },
      update: {},
      create: { ...s, konten: JSON.stringify({ placeholder: true }) },
    })
    console.log(`  ${s.urutan}. ${s.key}`)
  }

  // 3. Auto-link Fotografer → User berdasarkan kecocokan nama (best effort)
  console.log('\nAuto-link Fotografer ↔ User (by nama, best effort):')
  const fotografers = await prisma.fotografer.findMany({ include: { userLink: true } })
  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  let linked = 0
  for (const f of fotografers) {
    if (f.userLink) continue // sudah ter-link
    const match = users.find(u => u.name.toLowerCase().trim() === f.name.toLowerCase().trim())
    if (match) {
      try {
        await prisma.fotograferLink.create({ data: { fotograferId: f.id, userId: match.id } })
        console.log(`  ✓ ${f.name} → user ${match.id}`)
        linked++
      } catch { /* userId sudah dipakai link lain — skip */ }
    } else {
      console.log(`  - ${f.name}: belum ada User dengan nama sama (link manual nanti dari UI)`)
    }
  }
  console.log(`  Total auto-linked: ${linked}/${fotografers.length}`)

  console.log('\n=== SELESAI ===')
  const [roleCount, sectionCount] = await Promise.all([
    prisma.role.count(),
    prisma.landingSection.count(),
  ])
  console.log(`Verifikasi: ${roleCount} roles, ${sectionCount} landing sections`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
