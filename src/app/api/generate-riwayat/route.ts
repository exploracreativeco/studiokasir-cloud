import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'slip'

  const items = await prisma.generateRiwayat.findMany({
    where: { type },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const item = await prisma.generateRiwayat.create({
    data: {
      userId: session.user.id,
      type: body.type || 'slip',
      label: body.label || '',
      data: JSON.stringify(body.data || {}),
    },
  })

  return NextResponse.json(item, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })

  await prisma.generateRiwayat.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
