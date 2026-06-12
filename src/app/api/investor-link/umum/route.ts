// api/investor-link/umum — link investor UMUM (satu link untuk semua)
// Disimpan sebagai Investor khusus nama "__UMUM__" (tidak tampil di daftar lain)
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

async function requireSuper() {
  const s = await auth()
  return s && (s.user as any).role === 'SUPERADMIN' ? s : null
}

export async function POST() {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = 'inv_' + randomBytes(18).toString('base64url')
  let umum = await prisma.investor.findFirst({ where: { nama: '__UMUM__' } })
  if (umum) {
    umum = await prisma.investor.update({ where: { id: umum.id }, data: { publicToken: token, aktif: true } })
  } else {
    umum = await prisma.investor.create({ data: { nama: '__UMUM__', aktif: true, publicToken: token } })
  }
  return NextResponse.json({ id: umum.id, publicToken: umum.publicToken })
}

export async function DELETE() {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const umum = await prisma.investor.findFirst({ where: { nama: '__UMUM__' } })
  if (umum) await prisma.investor.update({ where: { id: umum.id }, data: { publicToken: null } })
  return NextResponse.json({ ok: true })
}
