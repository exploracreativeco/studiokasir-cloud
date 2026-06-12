import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OtsJenis } from '@prisma/client'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { backgrounds, ...data } = body

  const paket = await prisma.otsPaket.update({
    where: { id: params.id },
    data: {
      ...data,
      ...(backgrounds !== undefined && {
        backgrounds: {
          deleteMany: {},
          create: backgrounds.map((nama: string) => ({ nama })),
        },
      }),
    },
    include: { backgrounds: true },
  })
  return NextResponse.json(paket)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.otsPaket.update({ where: { id: params.id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
