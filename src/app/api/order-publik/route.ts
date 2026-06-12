// ============================================================
// api/order-publik — booking OTS dari link publik (tanpa login)
// GET: daftar studio + paket OTS aktif
// POST: buat OtsOrder (masuk transaksi OTS kasir seperti biasa)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const submitSchema = z.object({
  branchId: z.string().min(1),
  nama: z.string().min(2).max(100),
  whatsapp: z.string().min(8).max(20),
  catatan: z.string().max(500).optional().nullable(),
  items: z.array(z.object({
    paketId: z.string().min(1),
    jumlah: z.number().int().min(1).max(100),
  })).min(1),
})

export async function GET() {
  const [branches, pakets] = await Promise.all([
    prisma.branch.findMany({ where: { isActive: true }, select: { id: true, slug: true, nama: true }, orderBy: { nama: 'asc' } }),
    prisma.otsPaket.findMany({
      where: { isActive: true },
      select: { id: true, nama: true, jenis: true, harga: true, satuan: true, branchId: true },
      orderBy: [{ jenis: 'asc' }, { urutan: 'asc' }],
    }),
  ])
  return NextResponse.json({ branches, pakets })
}

export async function POST(req: NextRequest) {
  const parsed = submitSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  const d = parsed.data

  // Anti-spam ringan: maks 5 order publik per WA per hari
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dup = await prisma.otsOrder.count({ where: { whatsapp: d.whatsapp, notes: { contains: '[PUBLIK]' }, createdAt: { gte: today } } })
  if (dup >= 5) return NextResponse.json({ error: 'Terlalu banyak order hari ini, hubungi kami via WA' }, { status: 429 })

  const pakets = await prisma.otsPaket.findMany({ where: { id: { in: d.items.map(i => i.paketId) }, isActive: true } })
  if (pakets.length === 0) return NextResponse.json({ error: 'Paket tidak valid' }, { status: 400 })

  const itemRows = d.items.flatMap(i => {
    const p = pakets.find(x => x.id === i.paketId)
    return p ? [{ deskripsi: p.nama, jumlah: i.jumlah, harga: p.harga }] : []
  })
  const total = itemRows.reduce((s, r) => s + r.harga * r.jumlah, 0)

  // userId wajib (relasi) → pakai akun SUPERADMIN pertama sebagai pencatat sistem
  const sysUser = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' }, select: { id: true } })
  if (!sysUser) return NextResponse.json({ error: 'Sistem belum siap' }, { status: 500 })

  // Status awal: urutan pertama yang aktif (mis. BARU)
  const status = await prisma.otsStatus.findFirst({ where: { isActive: true }, orderBy: { urutan: 'asc' } })
  const jenis = pakets[0].jenis || 'PUBLIK'

  const order = await prisma.otsOrder.create({
    data: {
      orderNumber: `OTSP-${Date.now().toString(36).toUpperCase()}`,
      jenis,
      namaCustomer: d.nama,
      whatsapp: d.whatsapp,
      userId: sysUser.id,
      branchId: d.branchId,
      total,
      statusId: status?.id || null,
      notes: `[PUBLIK] Booking online${d.catatan ? ' — ' + d.catatan : ''}`,
      items: { create: itemRows },
    },
    select: { orderNumber: true, total: true },
  })
  return NextResponse.json({ ok: true, orderNumber: order.orderNumber, total: order.total }, { status: 201 })
}
