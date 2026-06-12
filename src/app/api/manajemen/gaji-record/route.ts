import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const karyawanId = searchParams.get('karyawanId')
  const tahun = searchParams.get('tahun')
  const where: any = {}
  if (karyawanId) where.karyawanId = karyawanId
  if (tahun) where.tahun = parseInt(tahun)
  const data = await prisma.gajiRecord.findMany({
    where,
    orderBy: [{ tahun: 'desc' }, { bulan: 'desc' }],
    include: { karyawan: { select: { nama: true, posisi: true } } }
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // Upsert berdasarkan karyawanId + bulan + tahun
  const existing = await prisma.gajiRecord.findFirst({
    where: { karyawanId: body.karyawanId, bulan: body.bulan, tahun: body.tahun }
  })
  let data
  if (existing) {
    data = await prisma.gajiRecord.update({ where: { id: existing.id }, data: body })
  } else {
    data = await prisma.gajiRecord.create({ data: body })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...rest } = await req.json()
  const data = await prisma.gajiRecord.update({ where: { id }, data: rest })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await prisma.gajiRecord.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
