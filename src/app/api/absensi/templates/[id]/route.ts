// api/absensi/templates/[id] — update/nonaktifkan template (SUPERADMIN)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: any = {}
  for (const k of ['nama', 'deskripsi', 'wajibFoto', 'perluApproval', 'jadwal', 'isActive', 'branchId', 'bonusMode', 'bonusNominal']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.fields !== undefined) data.fields = JSON.stringify(body.fields)
  if (body.bonusConfig !== undefined) data.bonusConfig = body.bonusConfig ? JSON.stringify(body.bonusConfig) : null
  const t = await prisma.absenTemplate.update({ where: { id }, data })
  return NextResponse.json({ ...t, fields: JSON.parse(t.fields || '[]') })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const entryCount = await prisma.absenEntry.count({ where: { templateId: id } })
  if (entryCount > 0) {
    // Punya riwayat → nonaktifkan saja, jaga data historis
    await prisma.absenTemplate.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true, deactivated: true })
  }
  await prisma.absenTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
