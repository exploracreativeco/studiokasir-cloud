import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().min(0),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(promos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.promoCode.findUnique({ where: { code: parsed.data.code } })
  if (existing) return NextResponse.json({ error: 'Kode promo sudah ada' }, { status: 409 })

  const promo = await prisma.promoCode.create({ data: parsed.data })
  return NextResponse.json(promo, { status: 201 })
}

// Validate promo code (GET /api/promos/validate?code=GRAD10)
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.toUpperCase()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const promo = await prisma.promoCode.findUnique({ where: { code } })
  if (!promo || !promo.isActive) return NextResponse.json({ valid: false })

  return NextResponse.json({ valid: true, promo })
}
