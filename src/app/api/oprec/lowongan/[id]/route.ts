// api/oprec/lowongan/[id] — update/tutup lowongan (SUPERADMIN)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireSuper() {
  const s = await auth()
  return s && (s.user as any).role === 'SUPERADMIN' ? s : null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: any = {}
  for (const k of ['judul', 'posisi', 'deskripsi', 'isActive', 'branchId', 'fotoUrl']) if (body[k] !== undefined) data[k] = body[k]
  if (body.fields !== undefined) data.fields = JSON.stringify(body.fields)
  if (body.rules !== undefined) data.rules = JSON.stringify(body.rules)
  const l = await prisma.lowongan.update({ where: { id }, data })
  return NextResponse.json({ ...l, fields: JSON.parse(l.fields || '[]'), rules: JSON.parse(l.rules || '[]') })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const count = await prisma.pelamar.count({ where: { lowonganId: id } })
  if (count > 0) {
    await prisma.lowongan.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true, deactivated: true })
  }
  await prisma.lowongan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
