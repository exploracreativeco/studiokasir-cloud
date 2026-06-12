// ============================================================
// api/absensi — entri absen
// submittedAt SELALU waktu server (anti-edit) · waktuKejadian boleh
// manual → beda hari / gap >3 jam = otomatis tertanda MENYUSUL.
// Template perluApproval + menyusul → status MENUNGGU_APPROVAL.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const submitSchema = z.object({
  templateId: z.string().min(1),
  branchId: z.string().nullable().optional(),
  waktuKejadian: z.string(), // ISO datetime-local
  values: z.record(z.string(), z.any()).default({}),
  fotoUrls: z.array(z.string()).default([]),
  catatan: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const me = (session.user as any)
  const isAdminish = ['SUPERADMIN', 'ADMIN'].includes(me.role)
  const scope = searchParams.get('scope') // 'all' (admin) | default: milik sendiri
  const templateId = searchParams.get('templateId') || undefined
  const tahun = parseInt(searchParams.get('tahun') || String(new Date().getFullYear()))
  const bulan = parseInt(searchParams.get('bulan') || String(new Date().getMonth() + 1))

  const entries = await prisma.absenEntry.findMany({
    where: {
      ...(scope === 'all' && isAdminish ? {} : { userId: me.id }),
      ...(templateId ? { templateId } : {}),
      waktuKejadian: { gte: new Date(tahun, bulan - 1, 1), lt: new Date(tahun, bulan, 1) },
    },
    include: {
      template: { select: { nama: true, wajibFoto: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { waktuKejadian: 'desc' },
    take: 200,
  })
  return NextResponse.json(entries.map(e => ({
    ...e,
    values: JSON.parse(e.values || '{}'),
    fotoUrls: JSON.parse(e.fotoUrls || '[]'),
  })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = submitSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const d = parsed.data
  const template = await prisma.absenTemplate.findUnique({ where: { id: d.templateId } })
  if (!template || !template.isActive) return NextResponse.json({ error: 'Template tidak valid' }, { status: 400 })

  if (template.wajibFoto && d.fotoUrls.length === 0) {
    return NextResponse.json({ error: 'Foto bukti wajib untuk absen ini' }, { status: 400 })
  }
  // Validasi field required
  const fields: any[] = JSON.parse(template.fields || '[]')
  for (const f of fields) {
    if (f.required) {
      const v = d.values[f.key]
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        return NextResponse.json({ error: `Isian "${f.label}" wajib diisi` }, { status: 400 })
      }
    }
  }

  const now = new Date() // submittedAt — server, anti-edit
  const kejadian = new Date(d.waktuKejadian)
  const bedaHari = kejadian.toDateString() !== now.toDateString()
  const gapJam = Math.abs(now.getTime() - kejadian.getTime()) / 3600000
  const isMenyusul = bedaHari || gapJam > 3
  const status = isMenyusul && template.perluApproval ? 'MENUNGGU_APPROVAL' : 'DITERIMA'

  const entry = await prisma.absenEntry.create({
    data: {
      templateId: d.templateId,
      userId: (session.user as any).id,
      branchId: d.branchId || template.branchId || null,
      waktuKejadian: kejadian,
      // submittedAt: default(now()) dari server — tidak menerima input
      isMenyusul,
      status,
      values: JSON.stringify(d.values),
      fotoUrls: JSON.stringify(d.fotoUrls),
      catatan: d.catatan || null,
    },
  })
  return NextResponse.json({ ...entry, isMenyusul, status }, { status: 201 })
}
