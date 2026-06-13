// api/kerjasama/program — kelola program kerjasama (SUPERADMIN). Mirror oprec/lowongan.
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'
import { z } from 'zod'

const fieldSchema = z.object({
  key: z.string(), label: z.string().min(1),
  type: z.enum(['teks', 'paragraf', 'angka', 'link', 'pilihan', 'checklist']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
})
const createSchema = z.object({
  judul: z.string().min(3),
  kategori: z.string().min(2),
  deskripsi: z.string().optional().nullable(),
  fotoUrl: z.string().optional().nullable(),
  fields: z.array(fieldSchema).default([]),
})

async function requireSuper() {
  const s = await auth()
  return s && (s.user as any).role === 'SUPERADMIN' ? s : null
}

export async function GET() {
  if (!(await requireSuper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.kerjasamaProgram.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { pengajuan: true } } },
  })
  return NextResponse.json(rows.map(r => ({ ...r, fields: JSON.parse(r.fields || '[]'), pengajuanCount: r._count.pengajuan })))
}

export async function POST(req: NextRequest) {
  const s = await requireSuper()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 })
  const { fields, ...rest } = parsed.data
  const slug = rest.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) + '-' + Date.now().toString(36).slice(-4)
  const k = await prisma.kerjasamaProgram.create({
    data: { ...rest, slug, fields: JSON.stringify(fields) },
  })
  await logActivity({ userId: (s.user as any).id, userName: (s.user as any).name, action: 'CREATE', entity: 'KerjasamaProgram', entityId: k.id, detail: `Program kerjasama: ${k.judul}` })
  return NextResponse.json({ ...k, fields }, { status: 201 })
}
