// ============================================================
// api/event/[id] — update/hapus event. Crew = replace-all.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logActivity } from '@/lib/activity-log'

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
  const role = (session.user as any).role
  const myId = (session.user as any).id
  const isAdmin = role === 'SUPERADMIN' || role === 'ADMIN'

  const data: any = { ...rest }
  if (tanggal) {
    const [y, m, d] = tanggal.split('-').map(Number)
    data.tanggal = new Date(y, m - 1, d)
  }

  if (crews) {
    if (isAdmin) {
      // Admin: replace-all bebas
      data.crews = {
        deleteMany: {},
        create: crews.map(c => ({ userId: c.userId, peran: c.peran || null, honor: c.honor })),
      }
    } else {
      // Crew biasa: TIDAK boleh replace-all. Hanya boleh tambah/hapus DIRINYA.
      // Abaikan perubahan crew lain — pertahankan crew existing, sinkronkan baris milik sendiri.
      const existing = await prisma.eventCrew.findMany({ where: { eventId: id } })
      const wantSelf = crews.some(c => c.userId === myId)
      const haveSelf = existing.some(c => c.userId === myId)
      if (wantSelf && !haveSelf) {
        // tambah diri sendiri (honor 0 — crew biasa tak set honor)
        const mine = crews.find(c => c.userId === myId)
        data.crews = { create: [{ userId: myId, peran: mine?.peran || null, honor: 0 }] }
      } else if (!wantSelf && haveSelf) {
        // hapus diri sendiri
        data.crews = { deleteMany: { userId: myId } }
      }
      // selain itu: tidak ada perubahan crew (abaikan upaya ubah crew lain)
    }
  }

  const event = await prisma.event.update({ where: { id }, data, include: EVENT_INCLUDE })
  await logActivity({ userId: myId, userName: (session.user as any).name, action: 'UPDATE', entity: 'Event', entityId: id, detail: `Edit event: ${event.nama}` })
  return NextResponse.json(event)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Hanya admin yang bisa menghapus event' }, { status: 403 })
  }
  const { id } = await params
  const ev = await prisma.event.findUnique({ where: { id }, select: { nama: true } })
  await prisma.event.delete({ where: { id } })
  await logActivity({ userId: (session.user as any).id, userName: (session.user as any).name, action: 'DELETE', entity: 'Event', entityId: id, detail: `Hapus event: ${ev?.nama || id}` })
  return NextResponse.json({ ok: true })
}
