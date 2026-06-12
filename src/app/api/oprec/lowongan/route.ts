// api/oprec/lowongan — kelola lowongan (SUPERADMIN)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const fieldSchema = z.object({
  key: z.string(), label: z.string().min(1),
  type: z.enum(['teks', 'paragraf', 'angka', 'link', 'pilihan', 'checklist']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
})
const ruleSchema = z.object({
  fieldKey: z.string(),
  operator: z.enum(['sama', 'tidak_sama', 'mengandung', 'kurang_dari', 'lebih_dari']),
  value: z.string(),
})
const createSchema = z.object({
  judul: z.string().min(3),
  posisi: z.string().min(2),
  branchId: z.string().nullable().optional(),
  deskripsi: z.string().optional().nullable(),
  fotoUrl: z.string().optional().nullable(),
  fields: z.array(fieldSchema).default([]),
  rules: z.array(ruleSchema).default([]),
})

async function requireSuper() {
  const s = await auth()
  return s && (s.user as any).role === 'SUPERADMIN' ? s : null
}

export async function GET() {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.lowongan.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { pelamar: true } } },
  })
  return NextResponse.json(rows.map(r => ({ ...r, fields: JSON.parse(r.fields || '[]'), rules: JSON.parse(r.rules || '[]'), pelamarCount: r._count.pelamar })))
}

export async function POST(req: NextRequest) {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 })
  const { fields, rules, ...rest } = parsed.data
  const slug = rest.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) + '-' + Date.now().toString(36).slice(-4)
  const l = await prisma.lowongan.create({
    data: { ...rest, branchId: rest.branchId || null, slug, fields: JSON.stringify(fields), rules: JSON.stringify(rules) },
  })
  return NextResponse.json({ ...l, fields, rules }, { status: 201 })
}
