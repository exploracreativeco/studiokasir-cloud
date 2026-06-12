// ============================================================
// services/report.service.ts — SATU-SATUNYA tempat hitung omzet
// Dipakai oleh: dashboard, laporan bulanan/tahunan, laporan investor.
// Kalau angka omzet salah → fix DI SINI, semua fitur ikut benar.
// ============================================================
import { prisma } from '@/lib/prisma'
import { hitungProfit } from '@/lib/money'
import {
  todayStart, todayEnd, monthStart, dayRange,
  HARI_PENDEK, BULAN_PENDEK,
} from '@/lib/dates'

// ------------------------------------------------------------
// DEFINISI OMZET (cash basis):
// omzet = SUM(transaction.diterimaSaatIni)  [by transactionDate]
//       + SUM(otsOrder.total)               [by orderDate]
//       + SUM(booking.dpAmount, dp > 0)     [by tanggalSesi utk harian,
//                                            by tanggalSesi utk bulanan dashboard]
// ------------------------------------------------------------

type BranchFilter = { branchId?: string }

/** Omzet gabungan TX+OTS untuk satu rentang waktu (tanpa booking) */
async function omzetTxOts(range: { gte: Date; lt?: Date; lte?: Date }, bw: BranchFilter = {}) {
  const [tx, ots] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...bw, transactionDate: range },
      _sum: { diterimaSaatIni: true },
    }),
    prisma.otsOrder.aggregate({
      where: { ...bw, orderDate: range },
      _sum: { total: true },
    }),
  ])
  return (tx._sum.diterimaSaatIni || 0) + (ots._sum.total || 0)
}

/**
 * Revenue 7 hari terakhir — versi EFISIEN.
 * Dulu: 14 query (loop per hari). Sekarang: 2 query + groupBy di memory.
 */
async function weeklyRevenue(now = new Date(), bw: BranchFilter = {}) {
  const start = dayRange(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)).gte
  const [txs, otss] = await Promise.all([
    prisma.transaction.findMany({
      where: { ...bw, transactionDate: { gte: start } },
      select: { transactionDate: true, diterimaSaatIni: true },
    }),
    prisma.otsOrder.findMany({
      where: { ...bw, orderDate: { gte: start } },
      select: { orderDate: true, total: true },
    }),
  ])
  const byDay = new Map<string, number>()
  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  for (const t of txs) byDay.set(keyOf(t.transactionDate), (byDay.get(keyOf(t.transactionDate)) || 0) + (t.diterimaSaatIni || 0))
  for (const o of otss) byDay.set(keyOf(o.orderDate), (byDay.get(keyOf(o.orderDate)) || 0) + (o.total || 0))

  const result = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    result.push({ day: HARI_PENDEK[day.getDay()], amount: byDay.get(keyOf(day)) || 0 })
  }
  return result
}

/**
 * Revenue per bulan tahun berjalan — versi EFISIEN.
 * Dulu: 24 query (loop per bulan). Sekarang: 2 query + groupBy di memory.
 */
async function monthlyRevenue(now = new Date(), bw: BranchFilter = {}) {
  const start = new Date(now.getFullYear(), 0, 1)
  const [txs, otss] = await Promise.all([
    prisma.transaction.findMany({
      where: { ...bw, transactionDate: { gte: start } },
      select: { transactionDate: true, diterimaSaatIni: true },
    }),
    prisma.otsOrder.findMany({
      where: { ...bw, orderDate: { gte: start } },
      select: { orderDate: true, total: true },
    }),
  ])
  const byMonth = new Array(12).fill(0)
  for (const t of txs) byMonth[t.transactionDate.getMonth()] += t.diterimaSaatIni || 0
  for (const o of otss) byMonth[o.orderDate.getMonth()] += o.total || 0

  return BULAN_PENDEK.map((month, m) => ({
    month,
    amount: new Date(now.getFullYear(), m, 1) > now ? 0 : byMonth[m],
  }))
}

/** Omzet per fotografer bulan ini (kasir by transactionDate + DP booking by tanggalFoto) */
async function fotograferOmzetBulanIni(mStart: Date, bw: BranchFilter = {}) {
  const fotograferList = await prisma.fotografer.findMany({ where: { isActive: true } })
  const [txGroup, bookings] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['fotograferId'],
      where: { ...bw, transactionDate: { gte: mStart }, fotograferId: { not: null } },
      _sum: { diterimaSaatIni: true },
    }),
    prisma.booking.findMany({
      where: { ...bw, tanggalFoto: { gte: mStart }, dpAmount: { gt: 0 }, fotograferId: { not: null } },
      select: { fotograferId: true, dpAmount: true },
    }),
  ])
  const kasirMap = new Map(txGroup.map(g => [g.fotograferId, g._sum.diterimaSaatIni || 0]))
  const dpMap = new Map<string, number>()
  for (const b of bookings) dpMap.set(b.fotograferId!, (dpMap.get(b.fotograferId!) || 0) + b.dpAmount)

  return fotograferList
    .map(f => ({ id: f.id, name: f.name, omzet: (kasirMap.get(f.id) || 0) + (dpMap.get(f.id) || 0) }))
    .filter(f => f.omzet > 0)
}

/** Data lengkap untuk halaman Dashboard. branchId null = semua branch (manajemen). */
export async function getDashboardData(branchId: string | null = null) {
  const bw: BranchFilter = branchId ? { branchId } : {}
  const now = new Date()
  const tStart = todayStart(now)
  const tEnd = todayEnd(now)
  const mStart = monthStart(now)

  const [
    todayTx, monthTx, todayOts, monthOts, todayBooking, monthBooking,
    totalTx, totalOts, totalBooking, dpTx, biayaOpsAgg, expenseAgg,
    recentTx, recentOts, repeatCustomers,
    weekly, monthly, fotograferOmzet,
  ] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...bw, transactionDate: { gte: tStart } }, _sum: { diterimaSaatIni: true } }),
    prisma.transaction.aggregate({ where: { ...bw, transactionDate: { gte: mStart } }, _sum: { diterimaSaatIni: true } }),
    prisma.otsOrder.aggregate({ where: { ...bw, orderDate: { gte: tStart } }, _sum: { total: true } }),
    prisma.otsOrder.aggregate({ where: { ...bw, orderDate: { gte: mStart } }, _sum: { total: true } }),
    prisma.booking.aggregate({ where: { ...bw, tanggalSesi: { gte: tStart, lt: tEnd }, dpAmount: { gt: 0 } }, _sum: { dpAmount: true } }),
    prisma.booking.aggregate({ where: { ...bw, tanggalSesi: { gte: mStart }, dpAmount: { gt: 0 } }, _sum: { dpAmount: true } }),
    prisma.transaction.count({ where: { ...bw, transactionDate: { gte: mStart } } }),
    prisma.otsOrder.count({ where: { ...bw, orderDate: { gte: mStart } } }),
    prisma.booking.count({ where: { ...bw, tanggalSesi: { gte: mStart }, dpAmount: { gt: 0 } } }),
    prisma.transaction.count({ where: { ...bw, paymentStatus: 'DP', transactionDate: { gte: mStart } } }),
    prisma.transaction.aggregate({ where: { ...bw, transactionDate: { gte: mStart } }, _sum: { biayaOpsTotal: true } }),
    prisma.expense.aggregate({ where: { ...bw, date: { gte: mStart } }, _sum: { amount: true } }),
    prisma.transaction.findMany({
      take: 5, where: bw, orderBy: { createdAt: 'desc' },
      include: { customer: true, user: { select: { id: true, name: true, email: true } }, items: { include: { package: true, addons: { include: { addon: true } } } } },
    }),
    prisma.otsOrder.findMany({
      take: 5, where: bw, orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } }, metodePembayaran: true, items: true },
    }),
    prisma.customer.count({ where: { transactions: { some: {} } } }),
    weeklyRevenue(now, bw),
    monthlyRevenue(now, bw),
    fotograferOmzetBulanIni(mStart, bw),
  ])

  const todayRevenue = (todayTx._sum.diterimaSaatIni || 0) + (todayOts._sum.total || 0) + (todayBooking._sum.dpAmount || 0)
  const monthRevenue = (monthTx._sum.diterimaSaatIni || 0) + (monthOts._sum.total || 0) + (monthBooking._sum.dpAmount || 0)

  // Recent transactions gabungan
  const normalizedOts = recentOts.map(o => ({
    id: o.id, invoiceNumber: o.orderNumber, type: 'OTS',
    customer: { name: o.namaCustomer },
    user: o.user, grandTotal: o.total, paymentStatus: 'LUNAS',
    transactionDate: o.orderDate, createdAt: o.createdAt,
    items: o.items.map(i => ({ package: { name: i.deskripsi }, price: i.harga })),
  }))
  const recentTransactions = [
    ...recentTx.map(t => ({ ...t, type: 'PAKET' })),
    ...normalizedOts,
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)

  const monthBiayaOps = biayaOpsAgg._sum.biayaOpsTotal || 0
  const monthExpenses = expenseAgg._sum.amount || 0

  return {
    todayRevenue,
    monthRevenue,
    totalTransactions: totalTx + totalOts + totalBooking,
    monthBiayaOps,
    monthExpenses,
    monthProfit: hitungProfit(monthRevenue, monthBiayaOps, monthExpenses),
    dpTransactions: dpTx,
    repeatCustomers,
    weeklyRevenue: weekly,
    monthlyRevenue: monthly,
    recentTransactions,
    fotograferOmzet,
  }
}
