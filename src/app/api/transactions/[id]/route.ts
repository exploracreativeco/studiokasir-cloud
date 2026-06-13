import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

const INCLUDE = {
  customer: true,
  user: { select: { id: true, name: true, email: true } },
  fotografer: true,
  metodePembayaran: true,
  promoCode: true,
  items: { include: { package: true, addons: { include: { addon: true } } } },
  biayaOps: true,
} as const

// ---------- GET satu transaksi ----------
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const tx = await prisma.transaction.findUnique({ where: { id }, include: INCLUDE })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  return NextResponse.json(tx)
}

// ---------- PATCH (edit field sederhana) ----------
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.transaction.findUnique({ where: { id }, select: { id: true, invoiceNumber: true } })
  if (!existing) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  // Hanya izinkan field aman untuk di-patch (hindari kirim sembarang kolom ke prisma)
  const data: any = {}
  if (typeof body.notes === 'string') data.notes = body.notes
  if (typeof body.paymentStatus === 'string') data.paymentStatus = body.paymentStatus
  if (typeof body.fotograferId !== 'undefined') data.fotograferId = body.fotograferId || null
  if (typeof body.metodePembayaranId !== 'undefined') data.metodePembayaranId = body.metodePembayaranId || null
  if (typeof body.tanggalFoto !== 'undefined') data.tanggalFoto = body.tanggalFoto ? new Date(body.tanggalFoto) : null
  if (typeof body.transactionDate !== 'undefined' && body.transactionDate) data.transactionDate = new Date(body.transactionDate)

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang bisa diubah' }, { status: 400 })
  }

  const updated = await prisma.transaction.update({ where: { id }, data, include: INCLUDE })

  await logActivity({
    userId: (session.user as any)?.id || '',
    action: 'UPDATE', entity: 'Transaction', entityId: id,
    detail: `Edit transaksi ${existing.invoiceNumber}`,
  })

  return NextResponse.json(updated)
}

// ---------- DELETE (hapus transaksi + relasi via cascade) ----------
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  // Ambil dulu untuk detail log + cek booking terkait
  const tx = await prisma.transaction.findUnique({
    where: { id },
    select: { id: true, invoiceNumber: true, grandTotal: true, bookingId: true, branchId: true },
  })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })

  // Hapus — items/addons/biayaOps ikut terhapus otomatis (onDelete: Cascade di schema)
  await prisma.transaction.delete({ where: { id } })

  // Jejak hapus uang
  await logActivity({
    userId: (session.user as any)?.id || '',
    action: 'DELETE', entity: 'Transaction', entityId: id,
    branchId: tx.branchId || null,
    detail: `Hapus transaksi ${tx.invoiceNumber} — Rp ${(tx.grandTotal || 0).toLocaleString('id-ID')}`,
  })

  return NextResponse.json({ ok: true, deleted: id })
}
