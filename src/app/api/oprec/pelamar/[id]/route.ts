// api/oprec/pelamar/[id] — ubah status/catatan pelamar (SUPERADMIN)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const STATUSES = ['BARU', 'REVIEW', 'INTERVIEW', 'DITERIMA', 'DITOLAK']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await auth()
  if (!s || (s.user as any).role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: any = {}
  if (body.status && STATUSES.includes(body.status)) data.status = body.status
  if (body.catatan !== undefined) data.catatan = body.catatan
  const p = await prisma.pelamar.update({ where: { id }, data })
  return NextResponse.json(p)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await auth()
  if (!s || (s.user as any).role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.pelamar.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
