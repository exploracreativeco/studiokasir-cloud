import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ nama: z.string().min(1), warna: z.string().default('#6b7280'), urutan: z.number().default(0) })

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const statuses = await prisma.otsStatus.findMany({ where: { isActive: true }, orderBy: { urutan: 'asc' } })
  return NextResponse.json(statuses)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const status = await prisma.otsStatus.create({ data: parsed.data })
  return NextResponse.json(status, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, ...data } = body
  const status = await prisma.otsStatus.update({ where: { id }, data })
  return NextResponse.json(status)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.otsStatus.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
