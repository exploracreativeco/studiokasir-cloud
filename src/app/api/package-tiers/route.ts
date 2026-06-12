import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tiers = await prisma.packageTier.findMany({
      orderBy: { urutan: 'asc' }
    })
    return NextResponse.json(tiers)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, label, urutan } = body
    if (!name || !label) return NextResponse.json({ error: 'Name dan label diperlukan' }, { status: 400 })
    const tier = await prisma.packageTier.create({
      data: { name: name.toUpperCase(), label, urutan: urutan || 0 }
    })
    return NextResponse.json(tier)
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Tier sudah ada' }, { status: 400 })
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 })
  }
}
