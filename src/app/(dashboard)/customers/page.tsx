'use client'

import { useEffect, useState } from 'react'
import { Search, ChevronRight, X, Plus, Pencil, Trash2 } from 'lucide-react'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import { PageHeader, StatCard, PaymentStatusBadge, LoadingSpinner } from '@/components/shared'
import { useToast } from '@/components/ui/use-toast'

type Customer = { id: string; name: string; email?: string; whatsapp?: string; instagram?: string; notes?: string; _count?: { transactions: number }; totalSpending?: number }
type CustomerDetail = { customer: Customer; totalSpending: number; totalTransactions: number; transactions: any[] }

const EMPTY_FORM = { name: '', email: '', whatsapp: '', instagram: '', notes: '' }

export default function CustomersPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CustomerDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/customers${search ? `?search=${search}` : ''}`)
    if (res.ok) setCustomers(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  async function loadDetail(id: string) {
    setLoadingDetail(true)
    const res = await fetch(`/api/customers/${id}`)
    if (res.ok) setSelected(await res.json())
    setLoadingDetail(false)
  }

  function openAdd() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(c: Customer) {
    setEditId(c.id)
    setForm({ name: c.name, email: c.email || '', whatsapp: c.whatsapp || '', instagram: c.instagram || '', notes: c.notes || '' })
    setShowForm(true)
  }

  async function saveCustomer() {
    if (!form.name.trim()) { toast({ title: 'Nama wajib diisi', variant: 'destructive' }); return }
    setSaving(true)
    const method = editId ? 'PUT' : 'POST'
    const url = editId ? `/api/customers/${editId}` : '/api/customers'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      toast({ title: editId ? 'Customer diupdate!' : 'Customer ditambahkan!' })
      setShowForm(false)
      setForm(EMPTY_FORM)
      setEditId(null)
      load()
      if (selected && editId === selected.customer.id) loadDetail(editId)
    } else {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' })
    }
    setSaving(false)
  }

  async function deleteCustomer(id: string, name: string) {
    if (!confirm(`Hapus customer "${name}"? Data transaksi tetap tersimpan.`)) return
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Customer dihapus' })
      if (selected?.customer.id === id) setSelected(null)
      load()
    } else {
      toast({ title: 'Gagal menghapus', variant: 'destructive' })
    }
  }

  return (
    <div className="h-full overflow-hidden flex">
      <div className={`${selected ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-gray-200 bg-white overflow-hidden flex-shrink-0`}>
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold">Customer</h1>
            <button onClick={openAdd} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama customer..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 pl-8 text-sm outline-none focus:border-blue-500" />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? <LoadingSpinner /> : customers.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">Tidak ada customer</div>
          ) : customers.map(c => (
            <div key={c.id} className={`flex items-center px-4 py-3 hover:bg-blue-50/50 transition-colors gap-2 ${selected?.customer.id === c.id ? 'bg-blue-50' : ''}`}>
              <button onClick={() => loadDetail(c.id)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.whatsapp || 'Tidak ada WA'}  {c._count?.transactions || 0} transaksi</div>
                </div>
              </button>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteCustomer(c.id, c.name)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${selected ? 'flex' : 'hidden lg:flex'} flex-1 flex-col overflow-hidden`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Pilih customer</p>
              <p className="text-xs text-gray-400">untuk melihat riwayat transaksi</p>
            </div>
          </div>
        ) : loadingDetail ? <LoadingSpinner /> : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {selected.customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{selected.customer.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    {selected.customer.whatsapp && <span> {selected.customer.whatsapp}</span>}
                    {selected.customer.email && <span> {selected.customer.email}</span>}
                    {selected.customer.instagram && <span> {selected.customer.instagram}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => openEdit(selected.customer)} className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
            <div className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total Transaksi" value={selected.totalTransactions} />
                <StatCard label="Total Spending" value={formatRupiah(selected.totalSpending)} valueColor="text-blue-600" />
                <StatCard label="Rata-rata" value={selected.totalTransactions > 0 ? formatRupiah(Math.round(selected.totalSpending / selected.totalTransactions)) : 'Rp 0'} />
              </div>
              {selected.customer.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                   {selected.customer.notes}
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Riwayat Transaksi</div>
                {selected.transactions.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">Belum ada transaksi</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {selected.transactions.map(tx => (
                      <div key={tx.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-blue-600">{tx.invoiceNumber}</span>
                              <PaymentStatusBadge status={tx.paymentStatus} />
                            </div>
                            <div className="text-sm font-medium">{tx.items[0]?.package?.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {tx.fotografer && ` ${tx.fotografer.name}  `}
                              {tx.metodePembayaran?.nama || '-'}  {formatDateShort(tx.transactionDate)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold">{formatRupiah(tx.grandTotal)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base">{editId ? 'Edit Customer' : 'Tambah Customer'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nama <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Budi Santoso"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp</label>
                <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="Contoh: 08123456789"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Contoh: budi@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Instagram</label>
                <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="Contoh: @budisantoso"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Catatan</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Contoh: Pelanggan tetap, suka foto outdoor"
                  rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 hover:bg-gray-50 text-sm font-medium py-2 rounded-lg transition-colors">
                Batal
              </button>
              <button onClick={saveCustomer} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
