import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 50
  const action = searchParams.get('action') || ''
  const entity = searchParams.get('entity') || ''
  const q = searchParams.get('q') || ''

  const where: any = {}
  if (action) where.action = action
  if (entity) where.entity = entity
  if (q) where.OR = [
    { userName: { contains: q, mode: 'insensitive' } },
    { detail: { contains: q, mode: 'insensitive' } },
  ]

  const [rows, total] = await Promise.all([
    prisma.activityLog.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.activityLog.count({ where }),
  ])
  return NextResponse.json({ rows, total, page, pages: Math.ceil(total / limit) })
}
