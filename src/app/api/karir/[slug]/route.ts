// api/karir/[slug] — detail lowongan (GET) & submit lamaran (POST) — PUBLIK
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const submitSchema = z.object({
  nama: z.string().min(2).max(100),
  whatsapp: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal('')),
  jawaban: z.record(z.string(), z.any()).default({}),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const l = await prisma.lowongan.findUnique({ where: { slug } })
  if (!l || !l.isActive) return NextResponse.json({ error: 'Lowongan tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ ...l, fields: JSON.parse(l.fields || '[]') }) // fotoUrl ikut otomatis
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!rateLimit(`karir:${clientIp(req)}`, 5, 60_000))
    return NextResponse.json({ error: 'Terlalu banyak lamaran, coba lagi sebentar' }, { status: 429 })
  const { slug } = await params
  const l = await prisma.lowongan.findUnique({ where: { slug } })
  if (!l || !l.isActive) return NextResponse.json({ error: 'Lowongan tidak ditemukan' }, { status: 404 })

  const parsed = submitSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  const d = parsed.data

  // Validasi field wajib dari template
  const fields: any[] = JSON.parse(l.fields || '[]')
  for (const f of fields) {
    if (f.required) {
      const v = d.jawaban[f.key]
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        return NextResponse.json({ error: `Isian "${f.label}" wajib diisi` }, { status: 400 })
      }
    }
  }

  // Anti spam ringan: maks 3 lamaran per WA per lowongan
  const dup = await prisma.pelamar.count({ where: { lowonganId: l.id, whatsapp: d.whatsapp } })
  if (dup >= 3) return NextResponse.json({ error: 'Lamaran dengan nomor ini sudah terkirim' }, { status: 429 })

  // ===== AUTO-FILTER: aturan per lowongan → match = otomatis DITOLAK =====
  // (pelamar tetap tersimpan & lihat pesan sukses normal — keputusan internal)
  let autoStatus = 'BARU'
  let autoCatatan: string | null = null
  try {
    const rules: Array<{ fieldKey: string; operator: string; value: string }> = JSON.parse(l.rules || '[]')
    for (const r of rules) {
      const raw = d.jawaban[r.fieldKey]
      const v = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '')
      const num = parseFloat(v), target = parseFloat(r.value)
      const hit =
        (r.operator === 'sama' && v.toLowerCase().trim() === r.value.toLowerCase().trim()) ||
        (r.operator === 'tidak_sama' && v.toLowerCase().trim() !== r.value.toLowerCase().trim()) ||
        (r.operator === 'mengandung' && v.toLowerCase().includes(r.value.toLowerCase())) ||
        (r.operator === 'kurang_dari' && !isNaN(num) && !isNaN(target) && num < target) ||
        (r.operator === 'lebih_dari' && !isNaN(num) && !isNaN(target) && num > target)
      if (hit) {
        autoStatus = 'DITOLAK'
        autoCatatan = `Auto-filter: "${r.fieldKey}" ${r.operator.replace('_', ' ')} "${r.value}"`
        break
      }
    }
  } catch { /* rules rusak → lewati */ }

  await prisma.pelamar.create({
    data: {
      lowonganId: l.id,
      nama: d.nama,
      whatsapp: d.whatsapp,
      email: d.email || null,
      jawaban: JSON.stringify(d.jawaban),
      status: autoStatus,
      catatan: autoCatatan,
    },
  })
  return NextResponse.json({ ok: true }, { status: 201 })
}
