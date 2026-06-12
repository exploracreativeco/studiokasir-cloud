import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  isActive: z.boolean().default(true),
  urutan: z.number().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  const addons = await prisma.addon.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: [{ urutan: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(addons)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Auto assign urutan terakhir
  const lastAddon = await prisma.addon.findFirst({ orderBy: { urutan: 'desc' } })
  const urutan = parsed.data.urutan ?? ((lastAddon?.urutan || 0) + 1)

  const addon = await prisma.addon.create({ data: { ...parsed.data, urutan } })
  return NextResponse.json(addon, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Bulk update urutan
  const body = await req.json()
  const { orders } = body // [{ id, urutan }]

  if (orders && Array.isArray(orders)) {
    await Promise.all(orders.map((o: { id: string; urutan: number }) =>
      prisma.addon.update({ where: { id: o.id }, data: { urutan: o.urutan } })
    ))
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
}
