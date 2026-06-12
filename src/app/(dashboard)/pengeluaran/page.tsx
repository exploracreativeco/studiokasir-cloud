'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatRupiah, formatDateShort, EXPENSE_CATEGORY_LABELS } from '@/lib/utils'
import { PageHeader, StatCard, Badge, SyncBadge, LoadingSpinner } from '@/components/shared'
import { useToast } from '@/components/ui/use-toast'

const CATS = ['ELECTRICITY','PROPERTY','PRINT','TRANSPORT','MAINTENANCE','MARKETING'] as const

const schema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  category: z.enum(CATS),
  amount: z.coerce.number().min(1, 'Jumlah harus lebih dari 0'),
  date: z.string(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function PengeluaranPage() {
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<any[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [retrying, setRetrying] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0], category: 'ELECTRICITY' },
  })

  async function load() {
    setLoading(true)
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [expRes, dashRes] = await Promise.all([
      fetch(`/api/expenses?month=${month}`),
      fetch('/api/reports/dashboard'),
    ])
    if (expRes.ok) {
      const data = await expRes.json()
      setExpenses(data.expenses)
      setTotalAmount(data.totalAmount)
    }
    if (dashRes.ok) {
      const data = await dashRes.json()
      setMonthRevenue(data.monthRevenue || 0)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function onSubmit(data: FormValues) {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast({ title: 'Pengeluaran ditambahkan!' })
      reset({ date: new Date().toISOString().split('T')[0], category: 'ELECTRICITY' })
      load()
    }
  }

  async function deleteExpense(id: string) {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Pengeluaran dihapus' }); load() }
  }

  async function retrySync(id: string) {
    const exp = expenses.find(e => e.id === id)
    if (!exp) return
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: exp.title, category: exp.category, amount: exp.amount, date: exp.date, notes: exp.notes }),
    })
    if (res.ok) { toast({ title: 'Sync berhasil!' }); load() }
    else toast({ title: 'Sync gagal', variant: 'destructive' })
  }

  async function retryAllQueue() {
    setRetrying(true)
    const queued = expenses.filter(e => ['QUEUED', 'FAILED', 'PENDING'].includes(e.syncStatus))
    let synced = 0
    for (const exp of queued) {
      try {
        const settings = await fetch('/api/settings').then(r => r.json())
        if (!settings?.webhookUrl) break
        const res = await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'expense',
            date: new Date(exp.date).toLocaleDateString('id-ID'),
            title: exp.title,
            category: EXPENSE_CATEGORY_LABELS[exp.category] || exp.category,
            amount: exp.amount,
            notes: exp.notes || '',
          }),
        })
        if (res.ok) synced++
      } catch {}
    }
    toast({ title: `${synced} pengeluaran berhasil disync` })
    await load()
    setRetrying(false)
  }

  const catMap: Record<string, number> = {}
  expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount })
  const netIncome = monthRevenue - totalAmount

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="Pengeluaran" subtitle="Tracking biaya operasional studio">
        <button onClick={retryAllQueue} disabled={retrying} className="flex items-center gap-1.5 text-xs border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} /> Retry Queue
        </button>
      </PageHeader>

      <div className="px-5 pb-5">
        <div className="grid grid-cols-[1fr_280px] gap-4">
          {/* Left */}
          <div className="space-y-4">
            {/* Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Tambah Pengeluaran</h3>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Judul</label>
                    <input {...register('title')} placeholder="Bayar listrik..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                    <select {...register('category')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                      {CATS.map(c => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Jumlah (Rp)</label>
                    <input {...register('amount')} type="number" placeholder="150000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal</label>
                    <input {...register('date')} type="date"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Catatan</label>
                  <input {...register('notes')} placeholder="Opsional..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Tambah Pengeluaran
                </button>
              </form>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Daftar Pengeluaran Bulan Ini</div>
              {loading ? <LoadingSpinner /> : (
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    {['Judul','Kategori','Jumlah','Tanggal','Catatan','Sync','Aksi'].map(h =>
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    )}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.length === 0
                      ? <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-400">Belum ada pengeluaran bulan ini</td></tr>
                      : expenses.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-sm font-medium">{e.title}</td>
                          <td className="px-4 py-3"><Badge variant="default">{EXPENSE_CATEGORY_LABELS[e.category]}</Badge></td>
                          <td className="px-4 py-3 text-sm font-semibold">{formatRupiah(e.amount)}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatDateShort(e.date)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{e.notes || '-'}</td>
                          <td className="px-4 py-3">
                            <SyncBadge status={e.syncStatus || 'PENDING'} sheet={e.syncSheet} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {e.syncStatus !== 'SYNCED' && (
                                <button onClick={() => retrySync(e.id)} title="Retry sync"
                                  className="p-1.5 border border-amber-200 bg-amber-50 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors">
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => deleteExpense(e.id)}
                                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-3">
            <StatCard label="Total Pengeluaran Bulan Ini" value={formatRupiah(totalAmount)} valueColor="text-red-500" />
            <StatCard label="Pendapatan Bulan Ini" value={formatRupiah(monthRevenue)} valueColor="text-emerald-600" />
            <StatCard label="Net Income" value={formatRupiah(netIncome)} valueColor={netIncome >= 0 ? 'text-blue-600' : 'text-red-500'} />

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-sm font-semibold mb-3">Per Kategori</div>
              {Object.entries(catMap).length === 0
                ? <div className="text-xs text-gray-400 text-center py-4">Belum ada data</div>
                : Object.entries(catMap).map(([cat, val]) => (
                  <div key={cat} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{EXPENSE_CATEGORY_LABELS[cat]}</span>
                      <span className="font-semibold">{formatRupiah(val)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-300 rounded-full" style={{ width: `${totalAmount > 0 ? Math.round(val / totalAmount * 100) : 0}%` }} />
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
