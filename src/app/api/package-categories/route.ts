import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const cats = await prisma.packageCategory.findMany({
      orderBy: { urutan: 'asc' }
    })
    return NextResponse.json(cats)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, label, perOrang, urutan } = body
    if (!name || !label) return NextResponse.json({ error: 'Name dan label diperlukan' }, { status: 400 })
    const cat = await prisma.packageCategory.create({
      data: { name: name.toUpperCase(), label, perOrang: perOrang || false, urutan: urutan || 0 }
    })
    return NextResponse.json(cat)
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Kategori sudah ada' }, { status: 400 })
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 })
  }
}
