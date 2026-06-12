// api/investor-link/[id] — generate/cabut token link investor (SUPERADMIN)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function genToken() {
  return 'inv_' + randomBytes(18).toString('base64url') // ~24 char URL-safe
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const inv = await prisma.investor.update({
    where: { id },
    data: { publicToken: genToken() }, // generate baru = link lama otomatis mati
    select: { id: true, nama: true, publicToken: true },
  })
  return NextResponse.json(inv)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await prisma.investor.update({ where: { id }, data: { publicToken: null } })
  return NextResponse.json({ ok: true })
}
