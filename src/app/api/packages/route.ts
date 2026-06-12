import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ctxBranchId, branchOr } from '@/lib/branch-context'

const schema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.coerce.number().min(0).max(100000000),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  branchId: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  const bid = await ctxBranchId(req)
  const packages = await prisma.package.findMany({
    where: {
      ...branchOr(bid),
      ...(activeOnly && { isActive: true }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(packages)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const bidPost = await ctxBranchId(req)
  const pkg = await prisma.package.create({ data: { ...parsed.data, branchId: parsed.data.branchId || bidPost || null } })
  return NextResponse.json(pkg, { status: 201 })
}

