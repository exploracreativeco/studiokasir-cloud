import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  const [year, m] = month.split('-').map(Number)
  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m, 1)

  const [transactions, otsOrders, bookings] = await Promise.all([prisma.transaction.findMany({
    where: { transactionDate: { gte: start, lt: end } },
    select: { transactionDate: true, grandTotal: true, diterimaSaatIni: true },
    orderBy: { transactionDate: 'asc' }
  }),
  prisma.otsOrder.findMany({ where: { orderDate: { gte: start, lt: end } }, select: { orderDate: true, total: true }, orderBy: { orderDate: 'asc' } }),
  prisma.booking.findMany({ where: { tanggalSesi: { gte: start, lt: end }, dpAmount: { gt: 0 } }, select: { tanggalSesi: true, dpAmount: true } }),
  ])

  // Group by day
  const dayMap: Record<string, { tanggal: string; omzet: number; jumlahOrder: number }> = {}

  for (const tx of transactions) {
    const d = new Date(tx.transactionDate)
    const key = `${year}-${String(m).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const label = `${String(d.getDate()).padStart(2,'0')}/${String(m).padStart(2,'0')}`
    if (!dayMap[key]) dayMap[key] = { tanggal: label, omzet: 0, jumlahOrder: 0 }
    dayMap[key].omzet += tx.diterimaSaatIni || tx.grandTotal || 0
    dayMap[key].jumlahOrder += 1
  }
  for (const o of otsOrders) {
    const d = new Date(o.orderDate)
    const key = `${year}-${String(m).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const label = `${String(d.getDate()).padStart(2,'0')}/${String(m).padStart(2,'0')}`
    if (!dayMap[key]) dayMap[key] = { tanggal: label, omzet: 0, jumlahOrder: 0 }
    dayMap[key].omzet += o.total || 0
    dayMap[key].jumlahOrder += 1
  }
  for (const b of bookings) {
    const d = new Date(b.tanggalSesi || b.createdAt)
    const key = `${year}-${String(m).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const label = `${String(d.getDate()).padStart(2,'0')}/${String(m).padStart(2,'0')}`
    if (!dayMap[key]) dayMap[key] = { tanggal: label, omzet: 0, jumlahOrder: 0 }
    dayMap[key].omzet += b.dpAmount || 0
    dayMap[key].jumlahOrder += 1
  }

  const days = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, v]) => v)

  const totalOmzet = days.reduce((s, d) => s + d.omzet, 0)
  const totalOrder = days.reduce((s, d) => s + d.jumlahOrder, 0)

  return NextResponse.json({ days, totalOmzet, totalOrder })
}


