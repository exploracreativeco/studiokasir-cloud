import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const fotografer = await prisma.fotografer.update({
    where: { id: params.id },
    data: {
      name: body.name,
      phone: body.phone,
      isActive: body.isActive ?? true,
    },
  })
  return NextResponse.json(fotografer)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.fotografer.update({ where: { id: params.id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
