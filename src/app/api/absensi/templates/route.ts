// ============================================================
// api/absensi/templates — template absen custom
// GET: semua user (untuk isi absen) · POST: SUPERADMIN (builder)
// fields = JSON array definisi isian:
// [{ key, label, type: 'teks'|'angka'|'link'|'pilihan'|'checklist', required, options? }]
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['teks', 'angka', 'link', 'pilihan', 'checklist', 'jam']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
})

const createSchema = z.object({
  nama: z.string().min(2),
  branchId: z.string().nullable().optional(),
  deskripsi: z.string().optional().nullable(),
  fields: z.array(fieldSchema).default([]),
  wajibFoto: z.boolean().default(true),
  perluApproval: z.boolean().default(false),
  jadwal: z.enum(['HARIAN', 'PER_SHIFT', 'BEBAS']).default('HARIAN'),
  bonusMode: z.enum(['NONE', 'PER_ENTRI', 'PER_JAM']).default('NONE'),
  bonusNominal: z.number().int().min(0).default(0),
  bonusConfig: z.object({ mulaiKey: z.string(), selesaiKey: z.string() }).optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await prisma.absenTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(templates.map(t => ({ ...t, fields: JSON.parse(t.fields || '[]') })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { fields, bonusConfig, ...rest } = parsed.data
  const t = await prisma.absenTemplate.create({
    data: { ...rest, branchId: rest.branchId || null, fields: JSON.stringify(fields), bonusConfig: bonusConfig ? JSON.stringify(bonusConfig) : null },
  })
  return NextResponse.json({ ...t, fields }, { status: 201 })
}
