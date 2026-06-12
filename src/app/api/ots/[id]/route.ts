import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const order = await prisma.otsOrder.findUnique({
    where: { id: params.id },
    include: { status: true, user: { select: { id: true, name: true } }, metodePembayaran: true, items: true },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { items, ...data } = body

  const order = await prisma.otsOrder.update({
    where: { id: params.id },
    data: {
      ...data,
      ...(items && {
        items: {
          deleteMany: {},
          create: items,
        },
      }),
    },
    include: { status: true, user: { select: { id: true, name: true } }, metodePembayaran: true, items: true },
  })
  return NextResponse.json(order)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.otsOrder.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
