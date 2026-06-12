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

  const [user, roleRow, shifts, monthShifts, crews, absenGroup, templates] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, warna: true, branch: { select: { nama: true } } },
    }),
    prisma.role.findFirst({ where: { slug: (session.user as any).role }, select: { label: true } }).catch(() => null),
    prisma.shift.findMany({
      where: { userId, tanggal: { gte: weekStart, lt: weekEnd } },
      select: { id: true, tanggal: true, jamMulai: true, jamSelesai: true },
      orderBy: [{ tanggal: 'asc' }, { jamMulai: 'asc' }],
    }),
    prisma.shift.findMany({
      where: { userId, tanggal: { gte: monthStart, lt: monthEnd } },
      select: { tanggal: true, jamMulai: true, jamSelesai: true },
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

  // Total jam & hari kerja bulan ini (dari jadwal shift)
  const toMin = (x: string) => { const p = x.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]) }
  let totalMenit = 0
  for (const s of monthShifts) {
    let d = toMin(s.jamSelesai) - toMin(s.jamMulai)
    if (d < 0) d += 1440
    totalMenit += d
  }
  const jamBulanIni = {
    jam: Math.round((totalMenit / 60) * 10) / 10,
    hari: new Set(monthShifts.map(s => new Date(s.tanggal).toDateString())).size,
  }

  return NextResponse.json({
    jamBulanIni,
    profile: { ...user, roleLabel: roleRow?.label || user?.role },
    shifts,
    events: crews,
    absenStats,
    weekStart: weekStart.toISOString(),
  })
}
