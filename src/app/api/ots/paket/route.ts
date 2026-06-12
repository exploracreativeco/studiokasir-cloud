import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nama: z.string().min(1),
  jenis: z.string().min(1),
  harga: z.number().min(0),
  satuan: z.string().default('pcs'),
  isActive: z.boolean().default(true),
  urutan: z.number().default(0),
  backgrounds: z.array(z.string()).default([]),
  branchId: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jenis = searchParams.get('jenis') || ''
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  const pakets = await prisma.otsPaket.findMany({
    where: {
      ...(activeOnly && { isActive: true }),
      ...(jenis && { jenis }),
    },
    include: { backgrounds: true },
    orderBy: [{ jenis: 'asc' }, { urutan: 'asc' }, { nama: 'asc' }],
  })
  return NextResponse.json(pakets)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { backgrounds, branchId, ...data } = parsed.data
    const paket = await prisma.otsPaket.create({
      data: {
        ...data,
        branchId: branchId || null,
        backgrounds: {
          create: backgrounds.filter(b => b.trim()).map(nama => ({ nama })),
        },
      },
      include: { backgrounds: true },
    })
    return NextResponse.json(paket, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal menyimpan' }, { status: 500 })
  }
}
