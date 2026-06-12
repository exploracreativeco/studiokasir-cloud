'use client'

import { useEffect, useState, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, AreaChart, Area, ComposedChart, Legend } from 'recharts'
import { formatRupiah } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared'
import { TrendingUp, TrendingDown, Minus, Users, ShoppingBag, Receipt, Wallet, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react'

// Animated counter hook
function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(0); return }
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return val
}

const COLORS = {
  navy: '#0f2d5c',
  emerald: '#059669',
  rose: '#e11d48',
  purple: '#7c3aed',
  cyan: '#0891b2',
  amber: '#d97706',
  slate: '#475569',
}

const SOFT_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316','#ec4899','#6366f1']

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">—</span>
  const up = pct >= 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  )
}

function KpiCard({ label, value, sub, color, icon: Icon, animTarget }: any) {
  const animated = useCountUp(animTarget || 0)
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: color + '15' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {sub && <div>{sub}</div>}
      </div>
      <div className="text-2xl font-black tracking-tight" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 mt-1 font-medium">{label}</div>
    </div>
  )
}

function StatRow({ label, max, min, avg, maxMonth, minMonth }: any) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="text-sm font-semibold text-gray-700 flex items-center">{label}</div>
      <div className="bg-emerald-50 rounded-xl p-3 text-center">
        <div className="text-xs text-emerald-600 font-medium mb-1">Tertinggi</div>
        <div className="text-sm font-bold text-emerald-700">{formatRupiah(max)}</div>
        {maxMonth && <div className="text-[10px] text-emerald-500 mt-0.5">{maxMonth}</div>}
      </div>
      <div className="bg-red-50 rounded-xl p-3 text-center">
        <div className="text-xs text-red-500 font-medium mb-1">Terendah</div>
        <div className="text-sm font-bold text-red-600">{formatRupiah(min)}</div>
        {minMonth && <div className="text-[10px] text-red-400 mt-0.5">{minMonth}</div>}
      </div>
      <div className="bg-blue-50 rounded-xl p-3 text-center">
        <div className="text-xs text-blue-500 font-medium mb-1">Rata-rata</div>
        <div className="text-sm font-bold text-blue-700">{formatRupiah(avg)}</div>
      </div>
    </div>
  )
}

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState('summary')
  const [loading, setLoading] = useState(true)

  const [summaryData, setSummaryData] = useState<any>(null)
  const [tahunanData, setTahunanData] = useState<any>(null)
  const [bulananData, setBulananData] = useState<any>(null)
  const [harianData, setHarianData] = useState<any>(null)

  const [year, setYear] = useState(() => String(new Date().getFullYear()))
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [exporting, setExporting] = useState(false)

  const [harianMonth, setHarianMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  async function exportLaporan() {
    setExporting(true)
    try {
      const res = await fetch(`/api/export-laporan?year=${year}`)
      if (!res.ok) { toast({ title: 'Gagal export', variant: 'destructive' }); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan_${year}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: `Laporan ${year} berhasil didownload!` })
    } finally {
      setExporting(false)
    }
  }

  async function loadSummary() {
    setLoading(true)
    const res = await fetch('/api/laporan/summary')
    if (res.ok) {
      const data = await res.json()
      setSummaryData(data)
    }
    setLoading(false)
  }

  async function loadTahunan() {
    setLoading(true)
    const res = await fetch(`/api/laporan/tahunan?year=${year}`)
    if (res.ok) setTahunanData(await res.json())
    setLoading(false)
  }

  async function loadBulanan() {
    setLoading(true)
    const res = await fetch(`/api/laporan/bulanan?month=${month}`)
    if (res.ok) setBulananData(await res.json())
    setLoading(false)
  }

  async function loadHarian() {
    setLoading(true)
    const res = await fetch(`/api/laporan/harian?month=${harianMonth}`)
    if (res.ok) setHarianData(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'summary') loadSummary()
    else if (activeTab === 'tahunan') loadTahunan()
    else if (activeTab === 'bulanan') loadBulanan()
    else if (activeTab === 'harian') loadHarian()
  }, [activeTab, year, month, harianMonth])

  const TABS = [
    { id: 'summary', label: '📊 Summary', color: COLORS.navy },
    { id: 'tahunan', label: '📆 Tahunan', color: COLORS.purple },
    { id: 'bulanan', label: '📅 Bulanan', color: COLORS.emerald },
    { id: 'harian', label: '📋 Harian', color: COLORS.cyan },
  ]

  const fmtJt = (v: number) => v > 0 ? `${(v/1000000).toFixed(1)}jt` : '0'

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="px-5 pt-5 pb-1">
        <h1 className="text-xl font-black text-gray-900">Laporan</h1>
        <p className="text-sm text-gray-400 mt-0.5">Analisis performa studio</p>
      </div>

      <div className="px-5 pb-5">
        {/* Tabs */}
        <div className="flex gap-2 my-4 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}
              style={activeTab === t.id ? { background: t.color } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="flex justify-center py-16"><LoadingSpinner /></div>}

        {/* ══════════════ SUMMARY ══════════════ */}
        {!loading && activeTab === 'summary' && summaryData && (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Total Omzet" value={formatRupiah(summaryData.totalOmzet)} color={COLORS.navy} icon={Wallet} />
              <KpiCard label="Total Laba" value={formatRupiah(summaryData.totalLaba)} color={COLORS.emerald} icon={TrendingUp} />
              <KpiCard label="Total Pengeluaran" value={formatRupiah(summaryData.totalPengeluaran)} color={COLORS.rose} icon={TrendingDown} />
              <KpiCard label="Total Transaksi" value={`${summaryData.totalTransaksi} tx`} color={COLORS.purple} icon={Receipt} />
              <KpiCard label="Total Pelanggan" value={`${summaryData.totalCustomers} org`} color={COLORS.cyan} icon={Users} />
              <KpiCard label="Margin Keseluruhan" value={`${summaryData.totalOmzet > 0 ? Math.round((summaryData.totalLaba/summaryData.totalOmzet)*100) : 0}%`} color={COLORS.amber} icon={ShoppingBag} />
            </div>

            {/* Stat tertinggi/terendah/rata */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Statistik Per Bulan</h3>
              <StatRow label="💰 Omzet" max={summaryData.stats.omzet.max} min={summaryData.stats.omzet.min} avg={summaryData.stats.omzet.avg} maxMonth={summaryData.stats.omzet.maxMonth} minMonth={summaryData.stats.omzet.minMonth} />
              <StatRow label="💸 Pengeluaran" max={summaryData.stats.pengeluaran.max} min={summaryData.stats.pengeluaran.min} avg={summaryData.stats.pengeluaran.avg} />
              <StatRow label="📈 Laba" max={summaryData.stats.laba.max} min={summaryData.stats.laba.min} avg={summaryData.stats.laba.avg} />
            </div>

            {/* Grafik Omzet & Pengeluaran per bulan */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Tren Omzet & Pengeluaran</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={summaryData.monthlyChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOmzet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPengeluaran" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.rose} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={COLORS.rose} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLaba" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={fmtJt} />
                  <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="omzet" stroke={COLORS.navy} strokeWidth={2} fill="url(#gradOmzet)" name="Omzet" dot={false} />
                  <Area type="monotone" dataKey="pengeluaran" stroke={COLORS.rose} strokeWidth={2} fill="url(#gradPengeluaran)" name="Pengeluaran" dot={false} />
                  <Area type="monotone" dataKey="laba" stroke={COLORS.emerald} strokeWidth={2} fill="url(#gradLaba)" name="Laba" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* YoY Table */}
            {summaryData.years?.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800">Perbandingan Omzet Year-over-Year</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Bulan</th>
                        {summaryData.years.map((y: number) => (
                          <th key={y} className="px-4 py-3 text-right text-xs font-bold uppercase" style={{ color: SOFT_COLORS[summaryData.years.indexOf(y) % SOFT_COLORS.length] }}>{y}</th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">YoY %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {summaryData.yoy.map((row: any) => (
                        <tr key={row.month} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-xs font-semibold text-gray-600">{row.month}</td>
                          {summaryData.years.map((y: number) => (
                            <td key={y} className="px-4 py-2.5 text-xs text-right font-medium text-gray-700">
                              {row[String(y)] > 0 ? formatRupiah(row[String(y)]) : <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-right">
                            <GrowthBadge pct={row.yoyPct} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Grafik per Tahun - Area Chart */}
            {summaryData.yearlyCharts && summaryData.years?.map((y: number) => (
              <div key={y} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-4 text-center tracking-wide">SUMMARY {y}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={summaryData.yearlyCharts[y]} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                    <defs>
                      <linearGradient id={`gP${y}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`gE${y}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.rose} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS.rose} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`gL${y}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#9ca3af' }} angle={-45} textAnchor="end" height={50} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={fmtJt} />
                    <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="pendapatan" stroke="#3b82f6" strokeWidth={2} fill={`url(#gP${y})`} name="Pendapatan" dot={false} />
                    <Area type="monotone" dataKey="pengeluaran" stroke={COLORS.rose} strokeWidth={2} fill={`url(#gE${y})`} name="Pengeluaran" dot={false} />
                    <Area type="monotone" dataKey="laba" stroke={COLORS.emerald} strokeWidth={2} fill={`url(#gL${y})`} name="Laba" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ))}

            {/* Top Paket & Top Pelanggan */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-bold text-gray-800">Top Paket Terlaris</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {summaryData.topPaket?.map((p: any, idx: number) => (
                    <div key={p.name} className="px-5 py-2.5 flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: SOFT_COLORS[idx % SOFT_COLORS.length] }}>{idx+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 truncate">{p.name}</div>
                        <div className="text-[10px] text-gray-400">{p.count}x order</div>
                      </div>
                      <div className="text-xs font-bold text-emerald-600">{formatRupiah(p.omzet)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-500" />
                  <h3 className="text-sm font-bold text-gray-800">Top Pelanggan</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {summaryData.topPelanggan?.map((p: any, idx: number) => (
                    <div key={p.name} className="px-5 py-2.5 flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: SOFT_COLORS[idx % SOFT_COLORS.length] }}>{idx+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 truncate">{p.name}</div>
                        <div className="text-[10px] text-gray-400">{p.count}x transaksi</div>
                      </div>
                      <div className="text-xs font-bold text-navy-600" style={{ color: COLORS.navy }}>{formatRupiah(p.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAHUNAN ══════════════ */}
        {!loading && activeTab === 'tahunan' && tahunanData && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 justify-end">
              <select value={year} onChange={e => setYear(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 bg-white">
                {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={exportLaporan} disabled={exporting}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <Download className="w-3.5 h-3.5" />
                {exporting ? 'Mengexport...' : `Export Excel ${year}`}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Order', value: `${tahunanData.totalOrder} order`, color: COLORS.purple },
                { label: 'Total Omzet', value: formatRupiah(tahunanData.totalOmzet), color: COLORS.navy },
                { label: 'Total Pengeluaran', value: formatRupiah(tahunanData.totalPengeluaran), color: COLORS.rose },
                { label: 'Total Laba', value: formatRupiah(tahunanData.totalLaba), color: tahunanData.totalLaba >= 0 ? COLORS.emerald : COLORS.rose },
              ].map(c => (
                <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="text-lg font-black" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Omzet vs Pengeluaran {year}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={tahunanData.months}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={fmtJt} />
                  <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="omzet" fill={COLORS.navy} radius={[4,4,0,0]} name="Omzet" barSize={16} />
                  <Bar dataKey="pengeluaran" fill="#fca5a5" radius={[4,4,0,0]} name="Pengeluaran" barSize={16} />
                  <Line type="monotone" dataKey="laba" stroke={COLORS.emerald} strokeWidth={2.5} dot={{ r: 3 }} name="Laba" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Bulan','Order','Omzet','Pengeluaran','Laba'].map(h =>
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {tahunanData.months.map((m: any) => (
                    <tr key={m.month} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">{m.month}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.jumlahOrder}</td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: COLORS.navy }}>{formatRupiah(m.omzet)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-400">{formatRupiah(m.pengeluaran)}</td>
                      <td className={`px-4 py-3 text-sm font-bold ${m.laba >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRupiah(m.laba)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                    <td className="px-4 py-3 text-sm">Total</td>
                    <td className="px-4 py-3 text-sm">{tahunanData.totalOrder}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: COLORS.navy }}>{formatRupiah(tahunanData.totalOmzet)}</td>
                    <td className="px-4 py-3 text-sm text-red-400">{formatRupiah(tahunanData.totalPengeluaran)}</td>
                    <td className={`px-4 py-3 text-sm ${tahunanData.totalLaba >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRupiah(tahunanData.totalLaba)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════ BULANAN ══════════════ */}
        {!loading && activeTab === 'bulanan' && bulananData && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-400 bg-white" />
            </div>

            {/* Growth cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-gray-400 mb-2">Omzet Bulan Ini</div>
                <div className="text-xl font-black" style={{ color: COLORS.navy }}>{formatRupiah(bulananData.omzet)}</div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-gray-400 mb-2">vs Bulan Lalu (MoM)</div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-black text-gray-700">{formatRupiah(bulananData.omzetPrev)}</div>
                  <GrowthBadge pct={bulananData.momPct} />
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-gray-400 mb-2">vs Tahun Lalu (YoY)</div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-black text-gray-700">{formatRupiah(bulananData.omzetLastYear)}</div>
                  <GrowthBadge pct={bulananData.yoyPct} />
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">Total Transaksi</div>
                <div className="text-xl font-black" style={{ color: COLORS.purple }}>{bulananData.totalTransaksi}</div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">Avg / Hari</div>
                <div className="text-lg font-black" style={{ color: COLORS.cyan }}>{formatRupiah(bulananData.avgPerHari)}</div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">Avg / Transaksi</div>
                <div className="text-lg font-black" style={{ color: COLORS.amber }}>{formatRupiah(bulananData.avgPerTransaksi)}</div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">Pengeluaran</div>
                <div className="text-lg font-black text-red-500">{formatRupiah(bulananData.pengeluaran)}</div>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">Laba · Margin {bulananData.margin}%</div>
                <div className={`text-lg font-black ${bulananData.laba >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRupiah(bulananData.laba)}</div>
              </div>
            </div>

            {/* Kategori */}
            {bulananData.kategori?.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 font-bold text-sm text-gray-800">Order per Kategori</div>
                <div className="grid grid-cols-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={bulananData.kategori} layout="vertical" barSize={14}>
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} tickFormatter={fmtJt} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} width={80} />
                      <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb' }} />
                      <Bar dataKey="omzet" radius={[0,4,4,0]}>
                        {bulananData.kategori.map((_: any, idx: number) => (
                          <rect key={idx} fill={SOFT_COLORS[idx % SOFT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <table className="w-full self-start">
                    <thead><tr className="bg-gray-50">
                      {['Kategori','Order','Omzet'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-400">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {bulananData.kategori.map((c: any, idx: number) => (
                        <tr key={c.name}>
                          <td className="px-3 py-2 text-xs font-semibold" style={{ color: SOFT_COLORS[idx % SOFT_COLORS.length] }}>{c.name}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">{c.count}</td>
                          <td className="px-3 py-2 text-xs font-bold text-gray-700">{formatRupiah(c.omzet)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Fotografer */}
            {bulananData.fotografers?.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 font-bold text-sm text-gray-800">Performa Fotografer</div>
                <table className="w-full">
                  <thead><tr className="bg-gray-50">
                    {['Fotografer','Sesi','Omzet','%','Porsi'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-400">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {bulananData.fotografers.map((f: any, idx: number) => (
                      <tr key={f.name} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-sm font-semibold">{f.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{f.count}</td>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: COLORS.navy }}>{formatRupiah(f.omzet)}</td>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: SOFT_COLORS[idx % SOFT_COLORS.length] }}>{f.persentase}%</td>
                        <td className="px-4 py-3 w-32">
                          <div className="h-2 bg-gray-100 rounded-full"><div className="h-full rounded-full" style={{ width: `${f.persentase}%`, background: SOFT_COLORS[idx % SOFT_COLORS.length] }} /></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Keuangan */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Ringkasan Keuangan</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Revenue (Omzet)', value: bulananData.omzet, color: COLORS.navy, prefix: '' },
                  { label: 'Pengeluaran', value: -bulananData.pengeluaran, color: '#ef4444', prefix: '- ' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">{row.label}</span>
                    <span className="text-sm font-bold" style={{ color: row.color }}>{row.prefix}{formatRupiah(Math.abs(row.value))}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 px-4 rounded-xl mt-2" style={{ background: COLORS.navy + '10' }}>
                  <span className="text-sm font-bold text-gray-800">Profit Bersih · {bulananData.margin}%</span>
                  <span className={`text-xl font-black ${bulananData.laba >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatRupiah(bulananData.laba)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ HARIAN ══════════════ */}
        {!loading && activeTab === 'harian' && harianData && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <input type="month" value={harianMonth} onChange={e => setHarianMonth(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-400 bg-white" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Hari Aktif', value: `${harianData.days?.length || 0} hari`, color: COLORS.cyan },
                { label: 'Total Order', value: `${harianData.totalOrder} order`, color: COLORS.purple },
                { label: 'Total Omzet', value: formatRupiah(harianData.totalOmzet), color: COLORS.emerald },
              ].map(c => (
                <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="text-lg font-black" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{c.label}</div>
                </div>
              ))}
            </div>
            {harianData.days?.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-4">Grafik Omzet Harian</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={harianData.days}>
                    <defs>
                      <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="tanggal" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={fmtJt} />
                    <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                    <Area type="monotone" dataKey="omzet" stroke={COLORS.cyan} strokeWidth={2} fill="url(#colorOmzet)" name="Omzet" dot={{ r: 3, fill: COLORS.cyan }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 font-bold text-sm text-gray-800">Rincian Harian</div>
              {!harianData.days?.length ? (
                <div className="text-center py-8 text-sm text-gray-400">Belum ada transaksi</div>
              ) : (
                <table className="w-full">
                  <thead><tr className="bg-gray-50">
                    {['No','Tanggal','Order','Omzet'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {harianData.days.map((d: any, idx: number) => (
                      <tr key={d.tanggal} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-sm text-gray-300">{idx+1}</td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-gray-700">{d.tanggal}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-500">{d.jumlahOrder}</td>
                        <td className="px-4 py-2.5 text-sm font-bold" style={{ color: COLORS.emerald }}>{formatRupiah(d.omzet)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                      <td className="px-4 py-3 text-sm" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-sm">{harianData.totalOrder}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: COLORS.emerald }}>{formatRupiah(harianData.totalOmzet)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
