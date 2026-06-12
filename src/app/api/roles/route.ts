// ============================================================
// api/roles — kelola role dinamis (SUPERADMIN only)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  slug: z.string().min(2).regex(/^[A-Z0-9_]+$/, 'Slug huruf besar/angka/underscore'),
  label: z.string().min(2),
  defaultLanding: z.string().startsWith('/').default('/jadwal'),
})

async function requireSuperadmin() {
  const session = await auth()
  if (!session) return null
  if ((session.user as any).role !== 'SUPERADMIN') return null
  return session
}

export async function GET() {
  const session = await requireSuperadmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = await prisma.role.findMany({ orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }] })
  // jumlah user per role (untuk info di UI)
  const counts = await prisma.user.groupBy({ by: ['role'], _count: true })
  const countMap = new Map(counts.map(c => [c.role, c._count]))
  return NextResponse.json(roles.map(r => ({ ...r, userCount: countMap.get(r.slug) || 0 })))
}

export async function POST(req: NextRequest) {
  const session = await requireSuperadmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten() }, { status: 400 })
  }
  const exists = await prisma.role.findUnique({ where: { slug: parsed.data.slug } })
  if (exists) return NextResponse.json({ error: 'Slug sudah dipakai' }, { status: 409 })

  const role = await prisma.role.create({ data: parsed.data })
  return NextResponse.json(role, { status: 201 })
}
