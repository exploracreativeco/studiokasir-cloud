// ============================================================
// api/roles/access — matrix akses role × menu (SUPERADMIN only)
// Menu yang tidak dicentang = HIDDEN (sidebar + diblok middleware)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Daftar menu lengkap — termasuk fitur yang akan datang (future-proof)
export const ALL_MENUS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'kasir', label: 'Kasir' },
  { key: 'booking', label: 'Booking / DP' },
  { key: 'ots', label: 'Order OTS' },
  { key: 'transaksi', label: 'Transaksi' },
  { key: 'customers', label: 'Customer' },
  { key: 'pengeluaran', label: 'Pengeluaran' },
  { key: 'laporan', label: 'Laporan' },
  { key: 'generate', label: 'Generate' },
  { key: 'manajemen', label: 'Manajemen' },
  { key: 'admin', label: 'Master Data' },
  { key: 'sheets', label: 'Google Sheets' },
  { key: 'settings', label: 'Pengaturan' },
  { key: 'roles', label: 'Role & Akses' },
  { key: 'karyawan', label: 'Karyawan' },
  { key: 'investorlink', label: 'Link Investor' },
  { key: 'landingsettings', label: 'Pengaturan Landing' },
  { key: 'about', label: 'Tentang' },
  // Fitur menyusul:
  { key: 'jadwal', label: 'Jadwal Shift' },
  { key: 'absensi', label: 'Absensi' },
  { key: 'event', label: 'Event Booth' },
  { key: 'oprec', label: 'Open Recruitment' },
] as const

const saveSchema = z.object({
  matrix: z.record(z.string(), z.record(z.string(), z.boolean())), // { ROLE: { menu: bool } }
})

async function requireSuperadmin() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') return null
  return session
}

export async function GET() {
  const session = await requireSuperadmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [roles, accessRows] = await Promise.all([
    prisma.role.findMany({ where: { isActive: true }, orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }] }),
    prisma.roleAccess.findMany(),
  ])

  const matrix: Record<string, Record<string, boolean>> = {}
  for (const r of roles) {
    matrix[r.slug] = {}
    for (const m of ALL_MENUS) matrix[r.slug][m.key] = false
  }
  for (const a of accessRows) {
    if (matrix[a.role]) matrix[a.role][a.menu] = a.canAccess
  }
  // SUPERADMIN selalu full (visual saja — middleware sudah meloloskan)
  if (matrix['SUPERADMIN']) for (const m of ALL_MENUS) matrix['SUPERADMIN'][m.key] = true

  return NextResponse.json({ menus: ALL_MENUS, roles, matrix })
}

export async function PUT(req: NextRequest) {
  const session = await requireSuperadmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = saveSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 })

  const ops = []
  for (const [role, menus] of Object.entries(parsed.data.matrix)) {
    if (role === 'SUPERADMIN') continue // tidak disimpan — selalu full akses
    for (const [menu, canAccess] of Object.entries(menus)) {
      ops.push(
        prisma.roleAccess.upsert({
          where: { role_menu: { role, menu } },
          update: { canAccess },
          create: { role, menu, canAccess },
        })
      )
    }
  }
  await prisma.$transaction(ops)
  return NextResponse.json({ ok: true, saved: ops.length })
}
