// ============================================================
// /investor/[token] — halaman PUBLIK untuk investor (tanpa login)
// Keamanan: token acak per investor (revocable), data minimal
// (nama customer disamarkan), read-only, noindex.
// ============================================================
import { prisma } from '@/lib/prisma'
import { monthRange } from '@/lib/dates'
import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic' // realtime tiap dibuka

const fmtRp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const mask = (nama: string) => {
  const parts = (nama || '').trim().split(/\s+/)
  return parts.map(p => (p.length <= 2 ? p[0] + '*' : p.slice(0, 2) + '*'.repeat(Math.min(p.length - 2, 4)))).join(' ')
}
const pct = (now: number, prev: number) => prev <= 0 ? null : ((now - prev) / prev) * 100

async function omzet(range: { gte: Date; lt: Date }) {
  const [tx, ots, bk] = await Promise.all([
    prisma.transaction.aggregate({ where: { transactionDate: range }, _sum: { diterimaSaatIni: true } }),
    prisma.otsOrder.aggregate({ where: { orderDate: range }, _sum: { total: true } }),
    prisma.booking.aggregate({ where: { tanggalSesi: range, dpAmount: { gt: 0 } }, _sum: { dpAmount: true } }),
  ])
  return (tx._sum.diterimaSaatIni || 0) + (ots._sum.total || 0) + (bk._sum.dpAmount || 0)
}

export default async function InvestorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const investor = await prisma.investor.findFirst({
    where: { publicToken: token, aktif: true },
    select: { id: true, nama: true },
  }).catch(() => null)

  if (!investor) {
    return (
      <main className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-6">
        <p className="text-gray-400 text-sm">Link tidak valid atau sudah dicabut.</p>
      </main>
    )
  }
  // catat akses terakhir (fire & forget)
  prisma.investor.update({ where: { id: investor.id }, data: { lastAccessAt: new Date() } }).catch(() => {})

  const now = new Date()
  const bulanIni = monthRange(now.getFullYear(), now.getMonth() + 1)
  const bulanLalu = monthRange(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), now.getMonth() === 0 ? 12 : now.getMonth())
  const bulanTahunLalu = monthRange(now.getFullYear() - 1, now.getMonth() + 1)
  const hariIni = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()), lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }

  const [omzetBulan, omzetHari, omzetBulanLalu, omzetTahunLalu, txs, otss, bks] = await Promise.all([
    omzet(bulanIni), omzet(hariIni), omzet(bulanLalu), omzet(bulanTahunLalu),
    prisma.transaction.findMany({
      where: { transactionDate: bulanIni },
      select: { id: true, invoiceNumber: true, transactionDate: true, diterimaSaatIni: true, customer: { select: { name: true } } },
      orderBy: { transactionDate: 'desc' },
    }),
    prisma.otsOrder.findMany({
      where: { orderDate: bulanIni },
      select: { id: true, orderNumber: true, orderDate: true, total: true, namaCustomer: true },
      orderBy: { orderDate: 'desc' },
    }),
    prisma.booking.findMany({
      where: { tanggalSesi: bulanIni, dpAmount: { gt: 0 } },
      select: { id: true, bookingNumber: true, tanggalSesi: true, dpAmount: true, namaCustomer: true, status: true },
      orderBy: { tanggalSesi: 'desc' },
    }),
  ])

  const rows = [
    ...txs.map(t => ({ id: t.id, no: t.invoiceNumber, jenis: 'PAKET', tanggal: t.transactionDate, nama: t.customer?.name || '-', nominal: t.diterimaSaatIni || 0 })),
    ...otss.map(o => ({ id: o.id, no: o.orderNumber, jenis: 'OTS', tanggal: o.orderDate, nama: o.namaCustomer, nominal: o.total || 0 })),
    ...bks.map(b => ({ id: b.id, no: b.bookingNumber || 'DP', jenis: 'DP', tanggal: b.tanggalSesi!, nama: b.namaCustomer, nominal: b.status === 'REFUND' ? -b.dpAmount : b.dpAmount })),
  ].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())

  const vsBulan = pct(omzetBulan, omzetBulanLalu)
  const vsTahun = pct(omzetBulan, omzetTahunLalu)
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

  const Delta = ({ v, label }: { v: number | null; label: string }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      {v === null
        ? <p className="text-lg font-bold text-gray-300 mt-1">—</p>
        : <p className={`text-lg font-bold mt-1 ${v >= 0 ? 'text-green-600' : 'text-red-500'}`}>{v >= 0 ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%</p>}
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f5f4f1] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-widest">Explora Creative · Laporan Investor</p>
            <h1 className="text-xl font-bold">{BULAN[now.getMonth()]} {now.getFullYear()}</h1>
          </div>
          <p className="text-xs text-gray-400">Untuk: <b>{investor.nama === '__UMUM__' ? 'Investor' : investor.nama}</b></p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 text-white rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-[11px] opacity-60 uppercase tracking-wide">Omzet Bulan Ini</p>
            <p className="text-2xl font-bold mt-1">{fmtRp(omzetBulan)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Omzet Hari Ini</p>
            <p className="text-2xl font-bold mt-1">{fmtRp(omzetHari)}</p>
          </div>
          <Delta v={vsBulan} label="vs Bulan Lalu" />
          <Delta v={vsTahun} label={`vs ${BULAN[now.getMonth()]} ${now.getFullYear() - 1}`} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold">Transaksi Bulan Ini</p>
            <p className="text-xs text-gray-400">{rows.length} transaksi</p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-400 sticky top-0">
                <tr>
                  {['Tanggal', 'No', 'Jenis', 'Customer', 'Nominal'].map(h => (
                    <th key={h} className={`px-3 py-2 font-medium ${h === 'Nominal' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={`${r.jenis}-${r.id}`}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-3 py-2 font-mono text-gray-400">{r.no}</td>
                    <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.jenis === 'PAKET' ? 'bg-blue-50 text-blue-600' : r.jenis === 'OTS' ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'}`}>{r.jenis}</span></td>
                    <td className="px-3 py-2 text-gray-600">{mask(r.nama)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${r.nominal < 0 ? 'text-red-500' : ''}`}>{fmtRp(r.nominal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400">
          Data realtime · nama pelanggan disamarkan untuk privasi · diperbarui setiap halaman dibuka
        </p>
      </div>
    </main>
  )
}
