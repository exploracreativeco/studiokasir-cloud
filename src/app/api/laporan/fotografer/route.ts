import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM

  let dateFilter: any = {}
  let dpDateFilter: any = {}
  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const start = new Date(year, mon - 1, 1)
    const end = new Date(year, mon, 1)
    dateFilter = { transactionDate: { gte: start, lt: end } }
    dpDateFilter = { tanggalFoto: { gte: start, lt: end } }
  }

  // Fetch transaksi kasir per fotografer
  const transactions = await prisma.transaction.findMany({
    where: { fotograferId: { not: null }, ...dateFilter },
    include: { fotografer: true },
  })

  // Fetch DP per fotografer by tanggalFoto
  const bookings = await prisma.booking.findMany({
    where: { fotograferId: { not: null }, dpAmount: { gt: 0 }, ...dpDateFilter },
    include: { fotografer: true },
  })

  const byFotografer = new Map<string, { id: string; name: string; count: number; omzet: number; omzetDP: number }>()

  for (const tx of transactions) {
    if (!tx.fotografer) continue
    const existing = byFotografer.get(tx.fotograferId!) || { id: tx.fotografer.id, name: tx.fotografer.name, count: 0, omzet: 0, omzetDP: 0 }
    byFotografer.set(tx.fotograferId!, { ...existing, count: existing.count + 1, omzet: existing.omzet + tx.grandTotal })
  }

  for (const b of bookings) {
    if (!b.fotografer) continue
    const existing = byFotografer.get(b.fotograferId!) || { id: b.fotografer.id, name: b.fotografer.name, count: 0, omzet: 0, omzetDP: 0 }
    byFotografer.set(b.fotograferId!, { ...existing, omzetDP: existing.omzetDP + b.dpAmount })
  }

  const totalOmzet = Array.from(byFotografer.values()).reduce((s, f) => s + f.omzet + f.omzetDP, 0)

  const result = Array.from(byFotografer.values()).map(f => ({
    ...f,
    omzetTotal: f.omzet + f.omzetDP,
    persentase: totalOmzet > 0 ? Math.round((f.omzet + f.omzetDP) / totalOmzet * 100) : 0,
  })).sort((a, b) => b.omzetTotal - a.omzetTotal)

  return NextResponse.json({ fotografers: result, totalOmzet, totalTransaksi: transactions.length + bookings.length })
}
