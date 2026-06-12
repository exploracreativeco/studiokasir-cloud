// ============================================================
// api/beranda — overview pribadi untuk dashboard team
// Profil · jadwal minggu ini · event bulan ini · statistik absen
// ============================================================
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const now = new Date()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()) // Minggu
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [user, roleRow, shifts, crews, absenGroup, templates] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, warna: true, branch: { select: { nama: true } } },
    }),
    prisma.role.findFirst({ where: { slug: (session.user as any).role }, select: { label: true } }).catch(() => null),
    prisma.shift.findMany({
      where: { userId, tanggal: { gte: weekStart, lt: weekEnd } },
      select: { id: true, tanggal: true, jamMulai: true, jamSelesai: true, tipe: true, branch: { select: { nama: true, slug: true } } },
      orderBy: [{ tanggal: 'asc' }, { jamMulai: 'asc' }],
    }),
    prisma.eventCrew.findMany({
      where: { userId, event: { tanggal: { gte: monthStart, lt: monthEnd }, status: { not: 'BATAL' } } },
      select: { peran: true, honor: true, event: { select: { nama: true, tanggal: true, jamMulai: true, lokasi: true, status: true, jenis: true } } },
      orderBy: { event: { tanggal: 'asc' } },
    }),
    prisma.absenEntry.groupBy({
      by: ['templateId'],
      where: { userId, waktuKejadian: { gte: monthStart, lt: monthEnd }, status: { not: 'DITOLAK' } },
      _count: true,
    }),
    prisma.absenTemplate.findMany({ select: { id: true, nama: true } }),
  ])

  const tName = new Map(templates.map(t => [t.id, t.nama]))
  const absenStats = absenGroup.map(g => ({ nama: tName.get(g.templateId) || '—', jumlah: g._count }))

  return NextResponse.json({
    profile: { ...user, roleLabel: roleRow?.label || user?.role },
    shifts,
    events: crews,
    absenStats,
    weekStart: weekStart.toISOString(),
  })
}
