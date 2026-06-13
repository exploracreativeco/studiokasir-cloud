// ============================================================
// api/inv/[token] — data invoice publik (tanpa login)
// Header studio: baca dari Branch milik transaksi (per-cabang).
// Fallback ke Setting global kalau transaksi tanpa branchId.
// Logika pembayaran 1:1 dengan tabel Transaksi (combined).
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseInvToken } from '@/lib/inv-token'

// Info studio untuk kop invoice: utamakan Branch, fallback Setting global
async function studioInfo(branchId: string | null | undefined) {
  const setting = await prisma.setting.findFirst().catch(() => null)
  const fallback = {
    nama: setting?.studioName || 'Explora Creative',
    alamat: setting?.address || '',
    whatsapp: setting?.whatsapp || '',
  }
  if (!branchId) return fallback
  const b = await prisma.branch.findUnique({ where: { id: branchId } }).catch(() => null)
  if (!b) return fallback
  return {
    nama: b.nama || fallback.nama,
    alamat: (b as any).alamat || fallback.alamat,
    whatsapp: (b as any).whatsapp || fallback.whatsapp,
  }
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const parsed = parseInvToken(params.token)
  if (!parsed) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 })
  const { type, id } = parsed

  if (type === 'P') {
    const t = await prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true, fotografer: true, metodePembayaran: true, promoCode: true,
        items: { include: { package: true, addons: { include: { addon: true } } } },
      },
    })
    if (!t) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 })
    const studio = await studioInfo((t as any).branchId)
    const items = t.items.flatMap((it: any) => [
      { deskripsi: it.package?.name || 'Paket', qty: it.jumlahOrang || 1, jumlah: it.price },
      ...it.addons.map((a: any) => ({ deskripsi: `Add-on: ${a.addon?.name || ''}`, qty: a.qty || 1, jumlah: a.price ?? a.addon?.price ?? 0 })),
    ])
    return NextResponse.json({
      studio, jenis: 'Kasir',
      nomor: t.invoiceNumber, tanggal: t.transactionDate,
      customer: t.customer?.name || '-', whatsapp: t.customer?.whatsapp || '',
      items,
      subtotal: t.subtotal, diskon: t.discount, promo: t.promoCode?.code || null,
      total: t.grandTotal,
      dibayar: t.grandTotal - (t.remainingPayment ?? 0),
      sisa: t.remainingPayment ?? 0,
      metode: t.metodePembayaran?.nama || null,
      fotografer: t.fotografer?.name || null,
      catatan: t.notes || null,
    })
  }

  if (type === 'O') {
    const o = await prisma.otsOrder.findUnique({
      where: { id },
      include: { items: true, metodePembayaran: true },
    })
    if (!o) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 })
    const studio = await studioInfo((o as any).branchId)
    return NextResponse.json({
      studio, jenis: 'OTS',
      nomor: o.orderNumber, tanggal: o.orderDate,
      customer: o.namaCustomer, whatsapp: o.whatsapp || '',
      items: o.items.map((i: any) => ({ deskripsi: i.deskripsi, qty: i.jumlah, jumlah: i.harga * i.jumlah })),
      subtotal: o.total, diskon: 0, promo: null,
      total: o.total, dibayar: o.total, sisa: 0,
      metode: o.metodePembayaran?.nama || null, fotografer: null,
      catatan: o.notes || null,
    })
  }

  // BOOKING
  const b = await prisma.booking.findUnique({ where: { id }, include: { customer: true } })
  if (!b) return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 })
  const studio = await studioInfo((b as any).branchId)
  return NextResponse.json({
    studio, jenis: 'Booking (DP)',
    nomor: b.bookingNumber, tanggal: b.createdAt,
    customer: b.customer?.name || b.namaCustomer, whatsapp: b.whatsapp || '',
    items: [{ deskripsi: b.keperluan || 'DP Booking', qty: 1, jumlah: b.dpAmount }],
    subtotal: b.dpAmount, diskon: 0, promo: null,
    total: b.dpAmount, dibayar: b.dpAmount, sisa: 0,
    metode: null, fotografer: null,
    catatan: [b.tanggalSesi ? `Sesi: ${new Date(b.tanggalSesi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : null, b.catatan].filter(Boolean).join(' — ') || null,
    isDP: true,
  })
}
