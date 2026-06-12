import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const satuanSchema = z.object({ ukuran: z.string().min(1), jenis: z.enum(['CETAK', 'PIGURA']), harga: z.number().min(0) })

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  if (type === 'satuan') {
    const data = await prisma.biayaOpsSatuan.findMany({ where: { isActive: true }, orderBy: [{ jenis: 'asc' }, { ukuran: 'asc' }] })
    return NextResponse.json(data)
  }

  if (type === 'package') {
    const packageId = searchParams.get('packageId')
    if (!packageId) return NextResponse.json({ error: 'packageId required' }, { status: 400 })
    const data = await prisma.packageBiayaOps.findMany({ where: { packageId } })
    return NextResponse.json(data)
  }

  const satuan = await prisma.biayaOpsSatuan.findMany({ where: { isActive: true }, orderBy: [{ jenis: 'asc' }, { ukuran: 'asc' }] })
  return NextResponse.json(satuan)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  if (body.type === 'satuan') {
    const parsed = satuanSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const data = await prisma.biayaOpsSatuan.create({ data: parsed.data })
    return NextResponse.json(data, { status: 201 })
  }

  if (body.type === 'package-ops') {
    const { packageId, items } = body
    await prisma.packageBiayaOps.deleteMany({ where: { packageId } })
    if (items?.length > 0) {
      await prisma.packageBiayaOps.createMany({ data: items.map((i: any) => ({ ...i, packageId })) })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.biayaOpsSatuan.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
