import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const jenis = await prisma.otsJenisCustom.findMany({ where: { isActive: true }, orderBy: { nama: 'asc' } })
  return NextResponse.json(jenis)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { nama } = await req.json()
    if (!nama) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
    const j = await prisma.otsJenisCustom.create({ data: { nama } })
    return NextResponse.json(j, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
