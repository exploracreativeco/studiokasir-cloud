import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1), phone: z.string().optional(), isActive: z.boolean().default(true),
  branchId: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('activeOnly') !== 'false'
  const fotografers = await prisma.fotografer.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { name: 'asc' },
    include: { _count: { select: { transactions: true } } },
  })
  return NextResponse.json(fotografers)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const fotografer = await prisma.fotografer.create({ data: parsed.data })
  return NextResponse.json(fotografer, { status: 201 })
}
