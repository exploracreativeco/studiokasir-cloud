'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LabelList } from 'recharts'
import { TrendingUp, ShoppingCart, Users, RefreshCw, ArrowUpRight, ArrowDownRight, Receipt, Wallet, Camera, Clock, Package, Star } from 'lucide-react'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared'
import Link from 'next/link'

const COLORS = {
  navy: '#0f2d5c',
  emerald: '#059669',
  rose: '#e11d48',
  purple: '#7c3aed',
  cyan: '#0891b2',
  amber: '#d97706',
}

const SOFT_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316','#ec4899','#6366f1']

function useCountUp(target: number, duration = 800) {
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

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const up = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  )
}

function KpiCard({ label, value, sub, color, icon: Icon, delta }: any) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '15' }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        {delta !== undefined && <GrowthBadge pct={delta} />}
      </div>
      <div className="text-xl font-black tracking-tight" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5 font-medium">{label}</div>
      {sub && <div className="text-xs text-gray-300 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [kategoriData, setKategoriData] = useState<any>(null)
  const [fotograferData, setFotograferData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const now = new Date()
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [quickStats, setQuickStats] = useState<any>(null)

  async function load() {
    setLoading(true)
    try {
      const [dashRes, katRes, fotRes, pkgRes, custRes] = await Promise.all([
        fetch('/api/reports/dashboard'),
        fetch(`/api/laporan/kategori?month=${curMonth}`),
        fetch(`/api/laporan/bulanan?month=${curMonth}`),
        fetch('/api/packages?limit=1000'),
        fetch('/api/customers?limit=1'),
      ])
      if (dashRes.ok) setStats(await dashRes.json())
      if (katRes.ok) setKategoriData(await katRes.json())
      if (fotRes.ok) setFotograferData(await fotRes.json())
      const pkgData = pkgRes.ok ? await pkgRes.json() : []
      const totalPaketAktif = Array.isArray(pkgData) ? pkgData.filter((p: any) => p.isActive).length : 0
      setQuickStats({ totalPaketAktif })
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const fmtJt = (v: number) => v > 0 ? `${(v / 1000000).toFixed(1)}jt` : '0'

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center animate-pulse">
          <Camera className="w-6 h-6 text-white" />
        </div>
        <div className="text-sm text-gray-400">Memuat dashboard...</div>
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {lastUpdated ? `Update terakhir ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Overview performa studio'}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded-xl px-3 py-2 bg-white transition-colors shadow-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="px-5 pb-6 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Omzet Hari Ini" value={formatRupiah(stats?.todayRevenue || 0)} color={COLORS.navy} icon={Wallet} />
          <KpiCard label="Omzet Bulan Ini" value={formatRupiah(stats?.monthRevenue || 0)} color={COLORS.emerald} icon={TrendingUp} />
          <KpiCard label="Total Transaksi" value={`${stats?.totalTransactions || 0} tx`} color={COLORS.purple} icon={Receipt} sub="Bulan ini" />
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="space-y-2.5">
              {([
                { label: 'Pelanggan', value: stats?.repeatCustomers || 0, color: COLORS.cyan, Icon: Users },
                { label: 'Paket Aktif', value: quickStats?.totalPaketAktif || 0, color: COLORS.purple, Icon: Package },
                { label: 'DP Aktif', value: stats?.dpTransactions || 0, color: COLORS.amber, Icon: Clock },
              ] as any[]).map((item: any) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: item.color + '15' }}>
                    <item.Icon className="w-3 h-3" style={{ color: item.color }} />
                  </div>
                  <span className="text-xs text-gray-400 flex-1">{item.label}</span>
                  <span className="text-sm font-black" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-2 gap-4">
          {/* Bar chart 7 hari */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Pendapatan 7 Hari Terakhir</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats?.weeklyRevenue || []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={fmtJt} />
                <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 11 }} />
                <Bar dataKey="amount" radius={[6,6,0,0]}>
                  {(stats?.weeklyRevenue || []).map((_: any, i: number) => (
                    <Cell key={i} fill={i === (stats?.weeklyRevenue?.length - 1) ? COLORS.navy : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut kategori */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Omzet per Kategori</h3>
            {kategoriData?.categories?.length > 0 ? (
              <div className="flex items-center gap-2">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={kategoriData.categories} dataKey="omzet" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                      {kategoriData.categories.map((_: any, idx: number) => (
                        <Cell key={idx} fill={SOFT_COLORS[idx % SOFT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {kategoriData.categories.slice(0, 5).map((c: any, idx: number) => (
                    <div key={c.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: SOFT_COLORS[idx % SOFT_COLORS.length] }} />
                      <span className="text-xs text-gray-600 truncate flex-1">{c.name}</span>
                      <span className="text-xs font-bold text-gray-700 flex-shrink-0">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-gray-300">Belum ada data</div>
            )}
          </div>
        </div>

        {/* Fotografer */}
        {stats?.fotograferOmzet?.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Omzet Fotografer Bulan Ini</h3>
            <ResponsiveContainer width="100%" height={Math.max(100, stats.fotograferOmzet.length * 44)}>
              <BarChart data={stats.fotograferOmzet} layout="vertical" barSize={24} margin={{ left: 0, right: 80 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={false} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }} width={80} />
                <Tooltip formatter={(v: number) => formatRupiah(v)} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 11 }} />
                <Bar dataKey="omzet" radius={[0,8,8,0]}>
                  {stats.fotograferOmzet.map((_: any, idx: number) => (
                    <Cell key={idx} fill={SOFT_COLORS[idx % SOFT_COLORS.length]} />
                  ))}
                  <LabelList dataKey="omzet" position="right" formatter={(v: number) => formatRupiah(v)} style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bottom row: transaksi terbaru + top paket */}
        <div className="grid grid-cols-3 gap-4">
          {/* Transaksi terbaru */}
          <div className="col-span-2 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Transaksi Terbaru</h3>
              <Link href="/transaksi" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Lihat semua →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {stats?.recentTransactions?.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: tx.type === 'OTS' ? COLORS.purple : COLORS.navy }}>
                    {tx.type === 'OTS' ? 'OTS' : 'TX'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800 truncate">{tx.customer?.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{tx.items?.[0]?.package?.name || '-'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold" style={{ color: COLORS.navy }}>{formatRupiah(tx.grandTotal)}</div>
                    <div className="text-[10px] text-gray-400">{formatDateShort(tx.transactionDate)}</div>
                  </div>
                </div>
              ))}
              {!stats?.recentTransactions?.length && (
                <div className="text-center py-8 text-sm text-gray-300">Belum ada transaksi</div>
              )}
            </div>
          </div>

          {/* Top paket + ringkasan keuangan */}
          <div className="space-y-4">



          </div>
        </div>
      </div>
    </div>
  )
}

