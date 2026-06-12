import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const currentYear = now.getFullYear()

  const [allTx, allOts, allBookings, allExp, allCustomers] = await Promise.all([
    prisma.transaction.findMany({ select: { grandTotal: true, diterimaSaatIni: true, transactionDate: true } }),
    prisma.otsOrder.findMany({ select: { total: true, orderDate: true } }),
    prisma.booking.findMany({ where: { dpAmount: { gt: 0 } }, select: { dpAmount: true, createdAt: true } }),
    prisma.expense.findMany({ select: { amount: true, date: true } }),
    prisma.customer.count(),
  ])

  const totalOmzet = allTx.reduce((s, t) => s + (t.diterimaSaatIni || t.grandTotal || 0), 0)
    + allOts.reduce((s, o) => s + (o.total || 0), 0)
    + allBookings.reduce((s, b) => s + (b.dpAmount || 0), 0)
  const totalPengeluaran = allExp.reduce((s, e) => s + (e.amount || 0), 0)
  const totalLaba = totalOmzet - totalPengeluaran
  const totalTransaksi = allTx.length + allOts.length + allBookings.length

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']

  const monthlyMap: Record<string, { omzet: number; pengeluaran: number; laba: number; order: number }> = {}
  for (const tx of allTx) {
    const d = new Date(tx.transactionDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { omzet: 0, pengeluaran: 0, laba: 0, order: 0 }
    monthlyMap[key].omzet += tx.diterimaSaatIni || tx.grandTotal || 0
    monthlyMap[key].order += 1
  }
  for (const o of allOts) {
    const d = new Date(o.orderDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { omzet: 0, pengeluaran: 0, laba: 0, order: 0 }
    monthlyMap[key].omzet += o.total || 0
    monthlyMap[key].order += 1
  }
  for (const b of allBookings) {
    const d = new Date(b.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { omzet: 0, pengeluaran: 0, laba: 0, order: 0 }
    monthlyMap[key].omzet += b.dpAmount || 0
    monthlyMap[key].order += 1
  }
  for (const exp of allExp) {
    const d = new Date(exp.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { omzet: 0, pengeluaran: 0, laba: 0, order: 0 }
    monthlyMap[key].pengeluaran += exp.amount || 0
  }
  for (const k of Object.keys(monthlyMap)) {
    monthlyMap[k].laba = monthlyMap[k].omzet - monthlyMap[k].pengeluaran
  }

  const monthlyChart = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const [y, m] = key.split('-')
      return { key, label: `${MONTH_NAMES[parseInt(m)-1]} ${y}`, ...v }
    })

  const omzetValues = monthlyChart.map(m => m.omzet).filter(v => v > 0)
  const expValues = monthlyChart.map(m => m.pengeluaran).filter(v => v > 0)
  const labaValues = monthlyChart.map(m => m.laba)

  const stats = {
    omzet: {
      max: omzetValues.length ? Math.max(...omzetValues) : 0,
      min: omzetValues.length ? Math.min(...omzetValues) : 0,
      avg: omzetValues.length ? Math.round(omzetValues.reduce((a,b)=>a+b,0)/omzetValues.length) : 0,
      maxMonth: monthlyChart.find(m => m.omzet === Math.max(...(omzetValues.length ? omzetValues : [0])))?.label || '-',
      minMonth: monthlyChart.find(m => m.omzet === Math.min(...(omzetValues.length ? omzetValues : [0])) && m.omzet > 0)?.label || '-',
    },
    pengeluaran: {
      max: expValues.length ? Math.max(...expValues) : 0,
      min: expValues.length ? Math.min(...expValues) : 0,
      avg: expValues.length ? Math.round(expValues.reduce((a,b)=>a+b,0)/expValues.length) : 0,
    },
    laba: {
      max: labaValues.length ? Math.max(...labaValues) : 0,
      min: labaValues.length ? Math.min(...labaValues) : 0,
      avg: labaValues.length ? Math.round(labaValues.reduce((a,b)=>a+b,0)/labaValues.length) : 0,
    },
  }

  // YoY
  const years = [...new Set(allTx.map(t => new Date(t.transactionDate).getFullYear()))].sort()
  const yoy = MONTH_NAMES.map((monthName, mi) => {
    const row: Record<string, any> = { month: monthName.toUpperCase() }
    for (const y of years) {
      const key = `${y}-${String(mi+1).padStart(2,'0')}`
      row[String(y)] = monthlyMap[key]?.omzet || 0
    }
    const cur = row[String(currentYear)] || 0
    const prev = row[String(currentYear - 1)] || 0
    row.yoyPct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null
    return row
  })

  // Top paket
  const txItems = await prisma.transactionItem.findMany({ include: { package: true } })
  const paketMap: Record<string, { name: string; count: number; omzet: number }> = {}
  for (const item of txItems) {
    const name = item.package?.name || 'Unknown'
    if (!paketMap[name]) paketMap[name] = { name, count: 0, omzet: 0 }
    paketMap[name].count += 1
    paketMap[name].omzet += item.price || 0
  }
  const topPaket = Object.values(paketMap).sort((a, b) => b.count - a.count).slice(0, 10)

  // Top pelanggan
  const txCust = await prisma.transaction.findMany({
    include: { customer: { select: { name: true } } },
  })
  const custMap: Record<string, { name: string; count: number; total: number }> = {}
  for (const tx of txCust) {
    const name = tx.customer?.name || 'Unknown'
    if (!custMap[name]) custMap[name] = { name, count: 0, total: 0 }
    custMap[name].count += 1
    custMap[name].total += tx.grandTotal || 0
  }
  const topPelanggan = Object.values(custMap).sort((a, b) => b.total - a.total).slice(0, 10)

  // Data per tahun untuk grafik seperti gambar referensi
  const MONTH_NAMES_FULL = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER']
  const yearlyCharts: Record<number, any[]> = {}
  for (const y of years) {
    yearlyCharts[y] = MONTH_NAMES_FULL.map((monthName, mi) => {
      const key = `${y}-${String(mi+1).padStart(2,'0')}`
      const data = monthlyMap[key] || { omzet: 0, pengeluaran: 0, laba: 0 }
      return { month: monthName, pendapatan: data.omzet, pengeluaran: data.pengeluaran, laba: data.laba }
    })
  }

  // Comparison vs tahun lalu
  const prevYear = currentYear - 1
  const curYearOmzet = Object.entries(monthlyMap).filter(([k]) => k.startsWith(String(currentYear))).reduce((s,[,v]) => s + v.omzet, 0)
  const prevYearOmzet = Object.entries(monthlyMap).filter(([k]) => k.startsWith(String(prevYear))).reduce((s,[,v]) => s + v.omzet, 0)
  const curYearExp = Object.entries(monthlyMap).filter(([k]) => k.startsWith(String(currentYear))).reduce((s,[,v]) => s + v.pengeluaran, 0)
  const prevYearExp = Object.entries(monthlyMap).filter(([k]) => k.startsWith(String(prevYear))).reduce((s,[,v]) => s + v.pengeluaran, 0)
  const curYearLaba = curYearOmzet - curYearExp
  const prevYearLaba = prevYearOmzet - prevYearExp

  const comparison = {
    year: currentYear, prevYear,
    omzet: { cur: curYearOmzet, prev: prevYearOmzet, pct: prevYearOmzet > 0 ? Math.round(((curYearOmzet - prevYearOmzet) / prevYearOmzet) * 100) : null },
    pengeluaran: { cur: curYearExp, prev: prevYearExp, pct: prevYearExp > 0 ? Math.round(((curYearExp - prevYearExp) / prevYearExp) * 100) : null },
    laba: { cur: curYearLaba, prev: prevYearLaba, pct: prevYearLaba !== 0 ? Math.round(((curYearLaba - prevYearLaba) / Math.abs(prevYearLaba)) * 100) : null },
  }

  return NextResponse.json({
    totalOmzet, totalPengeluaran, totalLaba, totalTransaksi, totalCustomers: allCustomers,
    monthlyChart, stats, yoy, years, topPaket, topPelanggan, yearlyCharts, comparison,
  })
}
