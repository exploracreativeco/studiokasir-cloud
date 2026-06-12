import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await prisma.studioProfil.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // Kalau isDefault, reset semua yang lain
  if (body.isDefault) await prisma.studioProfil.updateMany({ data: { isDefault: false } })
  const data = await prisma.studioProfil.create({ data: body })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, ...rest } = body
  if (rest.isDefault) await prisma.studioProfil.updateMany({ data: { isDefault: false } })
  const data = await prisma.studioProfil.update({ where: { id }, data: rest })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await prisma.studioProfil.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
