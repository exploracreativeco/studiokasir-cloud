import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`
  const [year, m] = month.split('-').map(Number)

  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m, 1)
  const prevStart = new Date(year, m - 2, 1)
  const prevEnd = new Date(year, m - 1, 1)
  const lastYearStart = new Date(year - 1, m - 1, 1)
  const lastYearEnd = new Date(year - 1, m, 1)
  const daysInMonth = new Date(year, m, 0).getDate()

  const [txCur, txPrev, txLastYear, otsCur, otsPrev, otsLastYear, bookCur, bookPrev, bookLastYear, expenses, txItems, fotTx] = await Promise.all([
    prisma.transaction.findMany({ where: { transactionDate: { gte: start, lt: end } }, select: { grandTotal: true, diterimaSaatIni: true } }),
    prisma.transaction.findMany({ where: { transactionDate: { gte: prevStart, lt: prevEnd } }, select: { grandTotal: true, diterimaSaatIni: true } }),
    prisma.transaction.findMany({ where: { transactionDate: { gte: lastYearStart, lt: lastYearEnd } }, select: { grandTotal: true, diterimaSaatIni: true } }),
    prisma.otsOrder.findMany({ where: { orderDate: { gte: start, lt: end } }, select: { total: true } }),
    prisma.otsOrder.findMany({ where: { orderDate: { gte: prevStart, lt: prevEnd } }, select: { total: true } }),
    prisma.otsOrder.findMany({ where: { orderDate: { gte: lastYearStart, lt: lastYearEnd } }, select: { total: true } }),
    prisma.booking.findMany({ where: { tanggalSesi: { gte: start, lt: end }, dpAmount: { gt: 0 } }, select: { tanggalSesi: true, dpAmount: true } }),
    prisma.booking.findMany({ where: { tanggalSesi: { gte: prevStart, lt: prevEnd }, dpAmount: { gt: 0 } }, select: { tanggalSesi: true, dpAmount: true } }),
    prisma.booking.findMany({ where: { tanggalSesi: { gte: lastYearStart, lt: lastYearEnd }, dpAmount: { gt: 0 } }, select: { tanggalSesi: true, dpAmount: true } }),
    prisma.expense.findMany({ where: { date: { gte: start, lt: end } }, select: { amount: true, title: true, category: true } }),
    prisma.transactionItem.findMany({
      where: { transaction: { transactionDate: { gte: start, lt: end } } },
      include: { package: true },
    }),
    prisma.transaction.findMany({
      where: { transactionDate: { gte: start, lt: end } },
      include: { fotografer: { select: { name: true } } },
    }),
  ])

  const omzetCur = txCur.reduce((s, t) => s + (t.diterimaSaatIni || t.grandTotal || 0), 0) + otsCur.reduce((s, o) => s + (o.total || 0), 0) + bookCur.reduce((s, b) => s + (b.dpAmount || 0), 0)
  const omzetPrev = txPrev.reduce((s, t) => s + (t.diterimaSaatIni || t.grandTotal || 0), 0) + otsPrev.reduce((s, o) => s + (o.total || 0), 0) + bookPrev.reduce((s, b) => s + (b.dpAmount || 0), 0)
  const omzetLastYear = txLastYear.reduce((s, t) => s + (t.diterimaSaatIni || t.grandTotal || 0), 0) + otsLastYear.reduce((s, o) => s + (o.total || 0), 0) + bookLastYear.reduce((s, b) => s + (b.dpAmount || 0), 0)
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const laba = omzetCur - totalExp
  const momPct = omzetPrev > 0 ? Math.round(((omzetCur - omzetPrev) / omzetPrev) * 100) : null
  const yoyPct = omzetLastYear > 0 ? Math.round(((omzetCur - omzetLastYear) / omzetLastYear) * 100) : null
  const avgPerHari = Math.round(omzetCur / daysInMonth)
  const avgPerTransaksi = txCur.length > 0 ? Math.round(omzetCur / txCur.length) : 0
  const margin = omzetCur > 0 ? Math.round((laba / omzetCur) * 100) : 0

  const katMap: Record<string, { name: string; count: number; omzet: number }> = {}
  for (const item of txItems) {
    const name = String(item.package?.category || 'Lainnya')
    if (!katMap[name]) katMap[name] = { name, count: 0, omzet: 0 }
    katMap[name].count += 1
    katMap[name].omzet += item.price || 0
  }
  const kategori = Object.values(katMap).sort((a, b) => b.omzet - a.omzet)

  const fotMap: Record<string, { name: string; count: number; omzet: number }> = {}
  for (const tx of fotTx) {
    if (!tx.fotografer) continue
    const name = tx.fotografer.name
    if (!fotMap[name]) fotMap[name] = { name, count: 0, omzet: 0 }
    fotMap[name].count += 1
    fotMap[name].omzet += tx.grandTotal || 0
  }
  const fotografers = Object.values(fotMap).sort((a, b) => b.omzet - a.omzet)
    .map(f => ({ ...f, persentase: omzetCur > 0 ? Math.round((f.omzet / omzetCur) * 100) : 0 }))

  return NextResponse.json({
    omzet: omzetCur, omzetPrev, omzetLastYear,
    pengeluaran: totalExp, laba, margin,
    totalTransaksi: txCur.length + otsCur.length + bookCur.length,
    momPct, yoyPct, avgPerHari, avgPerTransaksi,
    kategori, fotografers, expenses,
  })
}


