import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const investorId = searchParams.get('investorId')
  const where: any = {}
  if (investorId) where.investorId = investorId
  const data = await prisma.laporanInvestor.findMany({ where, orderBy: { periode: 'desc' }, include: { investor: true } })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // Upsert berdasarkan investorId + periode
  const existing = await prisma.laporanInvestor.findFirst({
    where: { investorId: body.investorId, periode: body.periode }
  })
  let data
  if (existing) {
    data = await prisma.laporanInvestor.update({ where: { id: existing.id }, data: body })
  } else {
    data = await prisma.laporanInvestor.create({ data: body })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await prisma.laporanInvestor.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
