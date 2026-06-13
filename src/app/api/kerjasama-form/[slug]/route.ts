// api/kerjasama-form/[slug] — publik: lihat form + submit pengajuan
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { notifySuperadmin } from '@/lib/notify'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const k = await prisma.kerjasamaProgram.findUnique({ where: { slug } })
  if (!k || !k.isActive) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  return NextResponse.json({ judul: k.judul, kategori: k.kategori, deskripsi: k.deskripsi, fotoUrl: k.fotoUrl, fields: JSON.parse(k.fields || '[]') })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!rateLimit(`kerjasama:${clientIp(req)}`, 5, 60_000))
    return NextResponse.json({ error: 'Terlalu banyak permintaan, coba lagi sebentar' }, { status: 429 })
  const { slug } = await params
  const k = await prisma.kerjasamaProgram.findUnique({ where: { slug } })
  if (!k || !k.isActive) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body?.nama?.trim() || !body?.whatsapp?.trim()) return NextResponse.json({ error: 'Nama & WhatsApp wajib' }, { status: 400 })

  const p = await prisma.kerjasamaPengajuan.create({
    data: {
      programId: k.id,
      nama: body.nama.trim(),
      whatsapp: body.whatsapp.trim(),
      email: body.email?.trim() || null,
      perusahaan: body.perusahaan?.trim() || null,
      jawaban: JSON.stringify(body.jawaban || {}),
      status: 'BARU',
    },
  })

  // #6 notif email superadmin
  notifySuperadmin({
    subjek: `🤝 Pengajuan Kerjasama Baru — ${k.judul}`,
    isi: `Ada pengajuan kerjasama baru:\n\nProgram: ${k.judul} (${k.kategori})\nNama: ${body.nama}\nPerusahaan: ${body.perusahaan || '-'}\nWhatsApp: ${body.whatsapp}\nEmail: ${body.email || '-'}\n\nCek di dashboard StudioHub → Kerjasama.`,
  }).catch(() => {})

  return NextResponse.json({ ok: true, id: p.id }, { status: 201 })
}
