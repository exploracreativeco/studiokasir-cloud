// ============================================================
// api/event/ban — kelola larangan crew ikut Event Booth (SUPERADMIN)
// GET: daftar ban · POST: buat ban · DELETE ?id=: cabut ban
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logActivity } from '@/lib/activity-log'

function isSuper(session: any) {
  return (session?.user as any)?.role === 'SUPERADMIN'
}

// GET: semua ban (dengan info user), terbaru dulu
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuper(session)) return NextResponse.json({ error: 'Hanya superadmin' }, { status: 403 })

  const bans = await prisma.eventBoothBan.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { bannedUntil: 'desc' },
  })
  return NextResponse.json(bans)
}

const createSchema = z.object({
  userId: z.string().min(1),
  bannedFrom: z.string().min(1),  // YYYY-MM-DD
  bannedUntil: z.string().min(1), // YYYY-MM-DD
  reason: z.string().optional().nullable(),
})

// POST: buat larangan baru
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuper(session)) return NextResponse.json({ error: 'Hanya superadmin' }, { status: 403 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 })

  const { userId, bannedFrom, bannedUntil, reason } = parsed.data
  const [fy, fm, fd] = bannedFrom.split('-').map(Number)
  const [uy, um, ud] = bannedUntil.split('-').map(Number)
  const from = new Date(fy, fm - 1, fd, 0, 0, 0)
  const until = new Date(uy, um - 1, ud, 23, 59, 59)

  if (until < from) {
    return NextResponse.json({ error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }, { status: 400 })
  }

  const ban = await prisma.eventBoothBan.create({
    data: { userId, bannedFrom: from, bannedUntil: until, reason: reason || null, createdBy: (session.user as any).id },
    include: { user: { select: { id: true, name: true } } },
  })
  await logActivity({
    userId: (session.user as any).id, userName: (session.user as any).name,
    action: 'OTHER', entity: 'EventBoothBan', entityId: ban.id,
    detail: `Larang ${ban.user?.name} ikut event booth s/d ${until.toLocaleDateString('id-ID')}`,
  })
  return NextResponse.json(ban, { status: 201 })
}

// DELETE ?id= : cabut larangan
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuper(session)) return NextResponse.json({ error: 'Hanya superadmin' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const ban = await prisma.eventBoothBan.findUnique({ where: { id }, include: { user: { select: { name: true } } } })
  if (!ban) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.eventBoothBan.delete({ where: { id } })
  await logActivity({
    userId: (session.user as any).id, userName: (session.user as any).name,
    action: 'OTHER', entity: 'EventBoothBan', entityId: id,
    detail: `Cabut larangan event booth: ${ban.user?.name}`,
  })
  return NextResponse.json({ ok: true })
}
