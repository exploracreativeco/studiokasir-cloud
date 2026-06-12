// ============================================================
// api/event/[id] — update/hapus event. Crew = replace-all.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const crewSchema = z.object({
  userId: z.string().min(1),
  peran: z.string().optional().nullable(),
  honor: z.number().int().min(0).default(0),
})

const updateSchema = z.object({
  nama: z.string().min(2).optional(),
  klienNama: z.string().min(2).optional(),
  klienWhatsapp: z.string().optional().nullable(),
  jenis: z.string().optional(),
  tanggal: z.string().optional(),
  jamMulai: z.string().optional().nullable(),
  jamSelesai: z.string().optional().nullable(),
  lokasi: z.string().optional().nullable(),
  nilaiKontrak: z.number().int().min(0).optional(),
  dpAmount: z.number().int().min(0).optional(),
  statusBayar: z.enum(['DP', 'LUNAS']).optional(),
  status: z.enum(['BOOKED', 'PERSIAPAN', 'SELESAI', 'BATAL']).optional(),
  peralatan: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
  crews: z.array(crewSchema).optional(),
})

const EVENT_INCLUDE = {
  crews: { include: { user: { select: { id: true, name: true, role: true } } } },
} as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 })

  const { crews, tanggal, ...rest } = parsed.data
  const data: any = { ...rest }
  if (tanggal) {
    const [y, m, d] = tanggal.split('-').map(Number)
    data.tanggal = new Date(y, m - 1, d)
  }
  if (crews) {
    data.crews = {
      deleteMany: {},
      create: crews.map(c => ({ userId: c.userId, peran: c.peran || null, honor: c.honor })),
    }
  }

  const event = await prisma.event.update({ where: { id }, data, include: EVENT_INCLUDE })
  return NextResponse.json(event)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.event.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
