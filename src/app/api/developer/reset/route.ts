import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section')
  const bulan = searchParams.get('bulan')
  const tahun = searchParams.get('tahun')

  try {
    // ── RESET TRANSAKSI PER BULAN ──
    if (section === 'transactions-bulan') {
      if (!bulan || !tahun) {
        return NextResponse.json({ error: 'Bulan dan tahun wajib diisi' }, { status: 400 })
      }
      // Pakai local timezone (ikut timezone server/Windows) � tidak hardcode UTC
      const fromParts = [Number(tahun), Number(bulan) - 1, 1]
      const from = new Date(fromParts[0], fromParts[1], fromParts[2], 0, 0, 0)
      const to = new Date(fromParts[0], fromParts[1] + 1, fromParts[2], 0, 0, 0)

      // Hapus items dulu (cascade)
      const txIds = await prisma.transaction.findMany({
        where: { transactionDate: { gte: from, lt: to } },
        select: { id: true },
      })
      const ids = txIds.map(t => t.id)

      if (ids.length > 0) {
        // Hapus addon lewat transactionItem dulu
        const itemIds = (await prisma.transactionItem.findMany({
          where: { transactionId: { in: ids } },
          select: { id: true }
        })).map(i => i.id)
        if (itemIds.length > 0) {
          await prisma.transactionItemAddon.deleteMany({ where: { transactionItemId: { in: itemIds } } })
        }
        await prisma.transactionItem.deleteMany({ where: { transactionId: { in: ids } } })
        await prisma.transactionBiayaOps.deleteMany({ where: { transactionId: { in: ids } } })
        await prisma.transaction.deleteMany({ where: { id: { in: ids } } })
      }

      // Hapus Booking per bulan (createdAt atau tanggalSesi)
      const bkIds = (await prisma.booking.findMany({
        where: {
          OR: [
            { createdAt: { gte: from, lt: to } },
            { tanggalSesi: { gte: from, lt: to } },
          ]
        },
        select: { id: true }
      })).map(b => b.id)
      if (bkIds.length > 0) {
        await prisma.booking.deleteMany({ where: { id: { in: bkIds } } })
      }

      // Hapus OTS per bulan
      const otsIds = (await prisma.otsOrder.findMany({
        where: { orderDate: { gte: from, lt: to } },
        select: { id: true }
      })).map(o => o.id)
      if (otsIds.length > 0) {
        await prisma.otsOrderItem.deleteMany({ where: { orderId: { in: otsIds } } })
        await prisma.otsOrder.deleteMany({ where: { id: { in: otsIds } } })
      }

      // Hapus Pengeluaran per bulan
      await prisma.expense.deleteMany({ where: { date: { gte: from, lt: to } } })

      return NextResponse.json({ ok: true, deleted: ids.length, booking: bkIds.length, ots: otsIds.length })
    }

    // ── RESET SECTION LAIN ──
    switch (section) {
      case 'transactions':
        await prisma.transactionItemAddon.deleteMany()
        await prisma.transactionItem.deleteMany()
        await prisma.transactionBiayaOps.deleteMany()
        await prisma.transaction.deleteMany()
        break
      case 'booking':
        await prisma.booking.deleteMany()
        break
      case 'ots':
        await prisma.otsOrderItem.deleteMany()
        await prisma.otsOrder.deleteMany()
        break
      case 'expenses':
        await prisma.expense.deleteMany()
        break
      case 'customers':
        await prisma.transactionItemAddon.deleteMany()
        await prisma.transactionItem.deleteMany()
        // note: transactionItemAddon already deleted via deleteMany all
        await prisma.transactionBiayaOps.deleteMany()
        await prisma.transaction.deleteMany()
        await prisma.booking.deleteMany()
        await prisma.customer.deleteMany()
        break
      case 'packages':
        await prisma.transactionItem.deleteMany()
        await prisma.package.deleteMany()
        break
      case 'addons':
        await prisma.transactionItemAddon.deleteMany()
        await prisma.addon.deleteMany()
        break
      case 'promos':
        await prisma.promoCode.deleteMany()
        break
      default:
        return NextResponse.json({ error: 'Section tidak valid' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
