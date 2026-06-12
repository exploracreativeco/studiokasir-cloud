// ============================================================
// api/landing-admin — kelola konten LandingSection (SUPERADMIN)
// GET semua · PUT upsert per key · DELETE (untuk brand_*)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const putSchema = z.object({
  key: z.string().min(2).regex(/^[a-z0-9_]+$/),
  judul: z.string().optional().nullable(),
  konten: z.any(), // object JSON bebas per section
  urutan: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

async function requireSuper() {
  const s = await auth()
  return s && (s.user as any).role === 'SUPERADMIN' ? s : null
}

export async function GET() {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sections = await prisma.landingSection.findMany({ orderBy: { urutan: 'asc' } })
  return NextResponse.json(sections.map(s => {
    let konten: any = {}
    try { konten = JSON.parse(s.konten || '{}') } catch {}
    if (konten.placeholder) konten = {}
    return { ...s, konten }
  }))
}

export async function PUT(req: NextRequest) {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = putSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 })
  const { key, konten, ...rest } = parsed.data

  const maxUrutan = await prisma.landingSection.aggregate({ _max: { urutan: true } })
  const s = await prisma.landingSection.upsert({
    where: { key },
    update: { ...rest, konten: JSON.stringify(konten) },
    create: {
      key,
      judul: rest.judul || key,
      urutan: rest.urutan ?? (maxUrutan._max.urutan || 0) + 1,
      isActive: rest.isActive ?? true,
      konten: JSON.stringify(konten),
    },
  })
  return NextResponse.json({ ok: true, key: s.key })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  if (!key || !key.startsWith('brand_')) {
    return NextResponse.json({ error: 'Hanya section brand yang bisa dihapus' }, { status: 400 })
  }
  await prisma.landingSection.delete({ where: { key } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
