import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ctxBranchId, branchOr } from '@/lib/branch-context'

const schema = z.object({ nama: z.string().min(1), nomorRekening: z.string().optional(), atasNama: z.string().optional(), namaBank: z.string().optional(), isActive: z.boolean().default(true), urutan: z.number().default(0),
  branchId: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('activeOnly') !== 'false'
  const bid = await ctxBranchId(req)
  const metodes = await prisma.metodePembayaran.findMany({
    where: { ...(activeOnly ? { isActive: true } : {}), ...branchOr(bid) },
    orderBy: { urutan: 'asc' },
  })
  return NextResponse.json(metodes)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const bidPost = await ctxBranchId(req)
  const metode = await prisma.metodePembayaran.create({ data: { ...parsed.data, branchId: parsed.data.branchId || bidPost || null } })
  return NextResponse.json(metode, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, ...data } = body
  const metode = await prisma.metodePembayaran.update({ where: { id }, data })
  return NextResponse.json(metode)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.metodePembayaran.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
