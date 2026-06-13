// ============================================================
// api/jadwal — jadwal shift per bulan per branch
// Semua user login bisa LIHAT & UBAH (sesuai fiksasi: tukar shift
// diperbolehkan), tapi SEMUA perubahan tercatat di ShiftChangeLog.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { monthRange } from '@/lib/dates'
import { z } from 'zod'

const createSchema = z.object({
  branchId: z.string().min(1),
  userId: z.string().min(1),
  tanggal: z.string(), // YYYY-MM-DD
  jamMulai: z.string().regex(/^\d{2}:\d{2}$/),
  jamSelesai: z.string().regex(/^\d{2}:\d{2}$/),
  tipe: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))
  const branchId = searchParams.get('branchId') || undefined

  const range = monthRange(tahun, bulan)
  const shifts = await prisma.shift.findMany({
    where: {
      tanggal: { gte: range.gte, lt: range.lt },
      ...(branchId ? { branchId } : {}),
    },
    include: { user: { select: { id: true, name: true, nickname: true, role: true, warna: true } } },
    orderBy: [{ tanggal: 'asc' }, { jamMulai: 'asc' }],
  })
  return NextResponse.json(shifts)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const d = parsed.data
  const [y, m, day] = d.tanggal.split('-').map(Number)

  const shift = await prisma.shift.create({
    data: {
      branchId: d.branchId,
      userId: d.userId,
      tanggal: new Date(y, m - 1, day), // timezone server (WIB) — konsisten konvensi
      jamMulai: d.jamMulai,
      jamSelesai: d.jamSelesai,
      tipe: d.tipe || null,
      catatan: d.catatan || null,
      changes: {
        create: {
          changedById: (session.user as any).id,
          aksi: 'CREATE',
          detail: JSON.stringify({ userId: d.userId, jam: `${d.jamMulai}-${d.jamSelesai}` }),
        },
      },
    },
    include: { user: { select: { id: true, name: true, nickname: true, role: true, warna: true } } },
  })
  return NextResponse.json(shift, { status: 201 })
}
