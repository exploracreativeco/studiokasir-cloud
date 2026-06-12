import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  const customers = await prisma.customer.findMany({
    where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
    include: {
      _count: { select: { transactions: true } },
    },
    orderBy: { name: 'asc' },
    take: 50,
  })

  const withStats = await Promise.all(
    customers.map(async (c) => {
      const agg = await prisma.transaction.aggregate({
        where: { customerId: c.id },
        _sum: { grandTotal: true },
      })
      return { ...c, totalSpending: agg._sum.grandTotal || 0 }
    })
  )

  return NextResponse.json(withStats)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const customer = await prisma.customer.create({ data: parsed.data })
  return NextResponse.json(customer, { status: 201 })
}
