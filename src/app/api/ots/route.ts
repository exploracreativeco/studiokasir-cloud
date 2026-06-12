import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  jenis: z.string().min(1),
  namaCustomer: z.string().min(1),
  whatsapp: z.string().optional(),
  customerId: z.string().optional(),
  metodePembayaranId: z.string().optional(),
  statusId: z.string().optional(),
  total: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    deskripsi: z.string(),
    ukuran: z.string().optional(),
    jumlah: z.number().default(1),
    harga: z.number(),
    catatan: z.string().optional(),
  })),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jenis = searchParams.get('jenis') || ''
  const statusId = searchParams.get('statusId') || ''
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '30')
  const sortBy = searchParams.get('sortBy') || 'createdAt'

  const where: any = {}
  if (jenis) where.jenis = jenis
  if (statusId) where.statusId = statusId
  if (search) where.namaCustomer = { contains: search, mode: 'insensitive' }

  const [orders, total] = await Promise.all([
    prisma.otsOrder.findMany({
      where,
      include: {
        status: true,
        user: { select: { id: true, name: true } },
        metodePembayaran: true,
        items: true,
      },
      orderBy: sortBy === 'status' ? { status: { urutan: 'asc' } } : { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.otsOrder.count({ where }),
  ])

  const statusCounts = await prisma.otsOrder.groupBy({
    by: ['statusId'],
    _count: true,
  })

  return NextResponse.json({ orders, total, statusCounts })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const count = await prisma.otsOrder.count()
  const now = new Date()
  const orderNumber = `OTS-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`

  const order = await prisma.otsOrder.create({
    data: {
      orderNumber,
      jenis: parsed.data.jenis,
      namaCustomer: parsed.data.namaCustomer,
      whatsapp: parsed.data.whatsapp,
      customerId: parsed.data.customerId || null,
      metodePembayaranId: parsed.data.metodePembayaranId || null,
      statusId: parsed.data.statusId || null,
      userId: session.user.id,
      total: parsed.data.total,
      notes: parsed.data.notes,
      items: { create: parsed.data.items },
    },
    include: {
      status: true,
      user: { select: { id: true, name: true } },
      metodePembayaran: true,
      items: true,
    },
  })

  return NextResponse.json(order, { status: 201 })
}
