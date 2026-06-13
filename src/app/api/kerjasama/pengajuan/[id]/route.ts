import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await auth()
  if (!s || (s.user as any).role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: any = {}
  if (body.status) data.status = body.status
  if (body.catatan !== undefined) data.catatan = body.catatan
  const p = await prisma.kerjasamaPengajuan.update({ where: { id }, data })
  await logActivity({ userId: (s.user as any).id, userName: (s.user as any).name, action: 'UPDATE', entity: 'KerjasamaPengajuan', entityId: id, detail: `Status → ${body.status || p.status}` })
  return NextResponse.json(p)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await auth()
  if (!s || (s.user as any).role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.kerjasamaPengajuan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
