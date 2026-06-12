// ============================================================
// api/event — event Explora Booth (photobooth/videospin)
// GET: per bulan (untuk kalender) · POST: buat event + crew
// Crew dikirim sebagai array [{ userId, peran?, honor }] — replace-all.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { monthRange } from '@/lib/dates'
import { z } from 'zod'

const crewSchema = z.object({
  userId: z.string().min(1),
  peran: z.string().optional().nullable(),
  honor: z.number().int().min(0).default(0),
})

const createSchema = z.object({
  nama: z.string().min(2),
  klienNama: z.string().min(2),
  klienWhatsapp: z.string().optional().nullable(),
  jenis: z.string().min(2), // PHOTOBOOTH | VIDEOSPIN | KEDUANYA | custom
  tanggal: z.string(), // YYYY-MM-DD
  jamMulai: z.string().optional().nullable(),
  jamSelesai: z.string().optional().nullable(),
  lokasi: z.string().optional().nullable(),
  nilaiKontrak: z.number().int().min(0).default(0),
  dpAmount: z.number().int().min(0).default(0),
  statusBayar: z.enum(['DP', 'LUNAS']).default('DP'),
  status: z.enum(['BOOKED', 'PERSIAPAN', 'SELESAI', 'BATAL']).default('BOOKED'),
  peralatan: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
  crews: z.array(crewSchema).default([]),
})

const EVENT_INCLUDE = {
  crews: { include: { user: { select: { id: true, name: true, role: true } } } },
} as const

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))

  const range = monthRange(tahun, bulan)
  const events = await prisma.event.findMany({
    where: { tanggal: { gte: range.gte, lt: range.lt } },
    include: EVENT_INCLUDE,
    orderBy: [{ tanggal: 'asc' }, { jamMulai: 'asc' }],
  })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { crews, tanggal, ...rest } = parsed.data
  const [y, m, d] = tanggal.split('-').map(Number)

  // Branch booth (kalau ada) — event default milik booth
  const booth = await prisma.branch.findUnique({ where: { slug: 'booth' } })

  const event = await prisma.event.create({
    data: {
      ...rest,
      branchId: booth?.id || null,
      tanggal: new Date(y, m - 1, d),
      crews: { create: crews.map(c => ({ userId: c.userId, peran: c.peran || null, honor: c.honor })) },
    },
    include: EVENT_INCLUDE,
  })
  return NextResponse.json(event, { status: 201 })
}
