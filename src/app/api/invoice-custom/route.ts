import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoices = await prisma.invoiceCustom.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(invoices)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const invoice = await prisma.invoiceCustom.create({
    data: {
      userId: session.user.id,
      studioId: body.studioId || null,
      nomor: body.nomor || '',
      tanggal: body.tanggal || '',
      client: body.client || null,
      items: JSON.stringify(body.items || []),
      diskon: body.diskon || 0,
      dp: body.dp || 0,
      total: body.total || 0,
      catatan: body.catatan || null,
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })

  await prisma.invoiceCustom.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
