import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)

  const [transactions, otsOrders, bookings, expenses] = await Promise.all([
    prisma.transaction.findMany({
      where: { transactionDate: { gte: start, lt: end } },
      select: { transactionDate: true, grandTotal: true, diterimaSaatIni: true }
    }),
    prisma.otsOrder.findMany({ where: { orderDate: { gte: start, lt: end } }, select: { orderDate: true, total: true } }),
    prisma.booking.findMany({ where: { tanggalSesi: { gte: start, lt: end }, dpAmount: { gt: 0 } }, select: { tanggalSesi: true, dpAmount: true, createdAt: true } }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, amount: true }
    })
  ])

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: MONTH_NAMES[i],
    monthNum: i + 1,
    omzet: 0,
    pengeluaran: 0,
    laba: 0,
    jumlahOrder: 0,
  }))

  for (const tx of transactions) {
    const m = new Date(tx.transactionDate).getMonth()
    months[m].omzet += tx.diterimaSaatIni || tx.grandTotal || 0
    months[m].jumlahOrder += 1
  }
  for (const o of otsOrders) {
    const m = new Date(o.orderDate).getMonth()
    months[m].omzet += o.total || 0
    months[m].jumlahOrder += 1
  }
  for (const b of bookings) {
    const m = new Date(b.tanggalSesi || b.createdAt).getMonth()
    months[m].omzet += b.dpAmount || 0
    months[m].jumlahOrder += 1
  }

  for (const exp of expenses) {
    const m = new Date(exp.date).getMonth()
    months[m].pengeluaran += exp.amount || 0
  }

  for (const m of months) {
    m.laba = m.omzet - m.pengeluaran
  }

  const totalOmzet = months.reduce((s, m) => s + m.omzet, 0)
  const totalPengeluaran = months.reduce((s, m) => s + m.pengeluaran, 0)
  const totalLaba = totalOmzet - totalPengeluaran
  const totalOrder = months.reduce((s, m) => s + m.jumlahOrder, 0)

  return NextResponse.json({ months, totalOmzet, totalPengeluaran, totalLaba, totalOrder, year })
}

