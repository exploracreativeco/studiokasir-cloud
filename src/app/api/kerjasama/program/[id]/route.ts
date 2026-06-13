import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

async function requireSuper() {
  const s = await auth()
  return s && (s.user as any).role === 'SUPERADMIN' ? s : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSuper()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: any = {}
  for (const k of ['judul', 'kategori', 'deskripsi', 'fotoUrl', 'isActive']) if (body[k] !== undefined) data[k] = body[k]
  if (body.fields !== undefined) data.fields = JSON.stringify(body.fields)
  const k = await prisma.kerjasamaProgram.update({ where: { id }, data })
  return NextResponse.json({ ...k, fields: JSON.parse(k.fields || '[]') })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireSuper()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.kerjasamaProgram.delete({ where: { id } })
  await logActivity({ userId: (s.user as any).id, userName: (s.user as any).name, action: 'DELETE', entity: 'KerjasamaProgram', entityId: id })
  return NextResponse.json({ ok: true })
}
