'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, CalendarDays, RefreshCw, FileText } from 'lucide-react'
import { BookingInvoiceModal } from '@/components/pos/booking-invoice-modal'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import { PageHeader, LoadingSpinner, SyncBadge } from '@/components/shared'
import { useToast } from '@/components/ui/use-toast'

type Booking = {
  id: string
  bookingNumber: string
  namaCustomer: string
  whatsapp?: string
  keperluan: string
  tanggalSesi?: string
  dpAmount: number
  catatan?: string
  status: 'DIBAYAR' | 'CANCEL' | 'REFUND'
  fotograferId?: string
  tanggalFoto?: string
  fotografer?: { id: string; name: string }
  syncStatus: string
  syncSheet?: string
  customer?: { id: string; name: string; whatsapp?: string }
  user: { id: string; name: string }
  createdAt: string
}

export default function BookingPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [custSearch, setCustSearch] = useState('')
  const [showCustDD, setShowCustDD] = useState(false)
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [showKepDD, setShowKepDD] = useState(false)
  const [fotografers, setFotografers] = useState<{id:string;name:string}[]>([])

  const [form, setForm] = useState({
    customerId: '', namaCustomer: '', whatsapp: '', keperluan: '',
    tanggalSesi: '', dpAmount: 0, catatan: '', status: 'DIBAYAR', fotograferId: '', tanggalFoto: '',
  })

  useEffect(() => {
    fetch('/api/fotografer').then(r => r.json()).then(data => {
      setFotografers(Array.isArray(data) ? data.filter((f:any) => f.isActive) : [])
    })
  }, [])

  const isOfflineMode = process.env.NEXT_PUBLIC_FEATURE_SHEETS !== 'true'

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterStatus) params.set('status', filterStatus)
    const [bookRes, custRes, catRes] = await Promise.all([
      fetch(`/api/booking?${params}`),
      fetch('/api/customers'),
      fetch('/api/package-categories'),
    ])
    if (bookRes.ok) setBookings(await bookRes.json())
    if (custRes.ok) setCustomers(await custRes.json())
    if (catRes.ok) { const cats = await catRes.json(); setCategories(cats.map((c: any) => c.name)) }
    setLoading(false)
  }

  useEffect(() => { load() }, [search, filterStatus])

  function resetForm() {
    setShowForm(false); setEditId(null); setCustSearch(''); setShowCustDD(false)
    setForm({ customerId: '', namaCustomer: '', whatsapp: '', keperluan: '', tanggalSesi: '', dpAmount: 0, catatan: '', status: 'DIBAYAR', fotograferId: '', tanggalFoto: '' })
  }

  async function saveBooking() {
    if (!form.namaCustomer) { toast({ title: 'Nama customer wajib diisi', variant: 'destructive' }); return }
    if (!form.keperluan) { toast({ title: 'Keterangan wajib diisi', variant: 'destructive' }); return }
    if (!form.dpAmount || form.dpAmount <= 0) { toast({ title: 'Nominal DP wajib diisi', variant: 'destructive' }); return }
    if (!form.tanggalSesi) { toast({ title: 'Tanggal dibayar wajib diisi', variant: 'destructive' }); return }
    const body = { ...form, dpAmount: Number(form.dpAmount) }
    const url = editId ? `/api/booking/${editId}` : '/api/booking'
    const method = editId ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const data = await res.json()
      if (!editId && data.dpAmount > 0) {
        toast({ title: `DP ${formatRupiah(data.dpAmount)} berhasil disimpan!` })
      } else {
        toast({ title: editId ? 'DP diupdate!' : 'DP ditambahkan!' })
      }
      resetForm(); load()
    } else {
      const err = await res.json()
      toast({ title: err.error || 'Gagal', variant: 'destructive' })
    }
  }

  async function deleteBooking(b: Booking) {
    if (!confirm(`Hapus DP ${b.bookingNumber} — ${b.namaCustomer}?\nNominal: ${formatRupiah(b.dpAmount)}\n\nData akan dihapus permanen.`)) return
    await fetch(`/api/booking/${b.id}`, { method: 'DELETE' })
    toast({ title: 'DP dihapus' }); load()
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/booking/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function retrySync(b: Booking) {
    const res = await fetch(`/api/booking/${b.id}/sync`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) { toast({ title: `Tersync ke ${data.sheet}!` }); load() }
    else toast({ title: 'Sync gagal', variant: 'destructive' })
  }

  const filteredCusts = custSearch
    ? customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.whatsapp?.includes(custSearch)).slice(0, 8)
    : customers.slice(0, 8)

  const totalDP = bookings.filter(b => b.dpAmount > 0 && b.status !== 'BATAL').reduce((s, b) => s + b.dpAmount, 0)
  const menunggu = bookings.filter(b => b.status === 'DIBAYAR').length

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="DP" subtitle="Pencatatan pembayaran DP customer">
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Tambah DP
        </button>
      </PageHeader>

      <div className="px-5 pb-5 space-y-4">
        {/* Stats */}
        <div className="flex gap-3">
          {[
            { label: 'Total DP Diterima', value: formatRupiah(totalDP), color: 'text-blue-600' },
            { label: 'Total Dibayar', value: String(menunggu), color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="text-xs text-gray-400">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, keperluan, no. booking..."
              className="border border-gray-200 rounded-lg px-3 py-2 pl-8 text-sm w-60 outline-none focus:border-blue-500" />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="flex gap-1">
            {[
              { value: '', label: 'Semua' },
              { value: 'DIBAYAR', label: 'Dibayar' },
              { value: 'CANCEL', label: 'Cancel' },
              { value: 'REFUND', label: 'Refund' },
            ].map(f => (
              <button key={f.value} onClick={() => setFilterStatus(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterStatus === f.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 ml-auto">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {(['No. DP', 'Customer', 'WA', 'Keterangan', 'Tgl Bayar', 'Tgl Foto', 'Nominal', 'Status', 'Fotografer', 'Sheets', 'Kasir', 'Aksi']).map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? <tr><td colSpan={10}><LoadingSpinner /></td></tr>
                  : bookings.length === 0 ? <tr><td colSpan={10} className="text-center py-12 text-sm text-gray-400">Belum ada booking</td></tr>
                    : bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-3 text-xs font-bold text-blue-600">{b.bookingNumber}</td>
                        <td className="px-3 py-3 text-sm font-semibold">{b.namaCustomer}</td>
                        <td className="px-3 py-3 text-xs text-gray-500">{b.whatsapp || b.customer?.whatsapp || '-'}</td>
                        <td className="px-3 py-3 text-sm">{b.keperluan}</td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {b.tanggalSesi ? <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDateShort(b.tanggalSesi)}</span> : '-'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {b.tanggalFoto ? formatDateShort(b.tanggalFoto) : <span className="text-gray-300">�</span>}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold">
                          {b.dpAmount > 0 ? <span className="text-blue-600">{formatRupiah(b.dpAmount)}</span> : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-3 py-3">
                          <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}
                            className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer ${
                              b.status === 'DIBAYAR' ? 'bg-emerald-50 text-emerald-700' :
                              b.status === 'CANCEL' ? 'bg-gray-100 text-gray-500' :
                              'bg-red-50 text-red-600'}`}>
                            <option value="DIBAYAR">Dibayar</option>
                            <option value="CANCEL">Cancel</option>
                            <option value="REFUND">Refund</option>
                          </select>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{b.fotografer?.name || <span className="text-gray-300 italic text-xs">Belum</span>}</td>
                        <td className="px-3 py-3">
                          {isOfflineMode ? <span className="text-xs text-gray-400">Tidak Aktif</span> : (b.dpAmount > 0 ? <SyncBadge status={b.syncStatus} sheet={b.syncSheet} /> : <span className="text-xs text-gray-300">-</span>)}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{b.user.name}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setInvoiceBooking(b)}
                              className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-purple-600 transition-colors" title="Invoice">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => {
                              setEditId(b.id); setCustSearch(b.namaCustomer)
                              setForm({ customerId: b.customer?.id || '', namaCustomer: b.namaCustomer, whatsapp: b.whatsapp || b.customer?.whatsapp || '', keperluan: b.keperluan, tanggalSesi: b.tanggalSesi ? b.tanggalSesi.split('T')[0] : '', dpAmount: b.dpAmount, catatan: b.catatan || '', status: b.status, fotograferId: b.fotograferId || '', tanggalFoto: b.tanggalFoto ? b.tanggalFoto.split('T')[0] : '' })
                              setShowForm(true)
                            }} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteBooking(b)}
                              className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {!isOfflineMode && b.dpAmount > 0 && b.syncStatus !== 'SYNCED' && (
                              <button onClick={() => retrySync(b)} className="p-1.5 border border-amber-200 bg-amber-50 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors">
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {invoiceBooking && <BookingInvoiceModal booking={invoiceBooking} onClose={() => setInvoiceBooking(null)} />}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold">{editId ? 'Edit DP' : 'Tambah DP Baru'}</h2>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3 overflow-y-auto">
              {/* Customer Search */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Customer*</label>
                <input value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setForm(f => ({ ...f, namaCustomer: e.target.value, customerId: '' })); setShowCustDD(true) }}
                  onFocus={() => setShowCustDD(true)} placeholder="Ketik nama customer..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                {showCustDD && custSearch && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredCusts.map(c => (
                      <button key={c.id} onMouseDown={() => {
                        setForm(f => ({ ...f, customerId: c.id, namaCustomer: c.name, whatsapp: c.whatsapp || '' }))
                        setCustSearch(c.name); setShowCustDD(false)
                      }} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                        <div className="text-sm font-medium">{c.name}</div>
                        {c.whatsapp && <div className="text-xs text-gray-400">{c.whatsapp}</div>}
                      </button>
                    ))}
                    {custSearch && !filteredCusts.find(c => c.name.toLowerCase() === custSearch.toLowerCase()) && (
                      <button onMouseDown={async () => {
                        const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: custSearch, whatsapp: form.whatsapp }) })
                        if (res.ok) {
                          const cust = await res.json()
                          setCustomers(prev => [cust, ...prev])
                          setForm(f => ({ ...f, customerId: cust.id, namaCustomer: cust.name }))
                          setCustSearch(cust.name); setShowCustDD(false)
                          toast({ title: 'Customer baru ditambahkan!' })
                        }
                      }} className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-t border-gray-100 text-blue-600 font-semibold text-sm flex items-center gap-2">
                        <span className="text-lg font-bold">+</span> Tambah "{custSearch}" sebagai customer baru
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">WhatsApp</label>
                <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="08xxxxxxxxxx"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Keterangan*</label>
                <input
                  value={form.keperluan}
                  onChange={e => { setForm(f => ({ ...f, keperluan: e.target.value })); setShowKepDD(true) }}
                  onFocus={() => setShowKepDD(true)}
                  onBlur={() => setTimeout(() => setShowKepDD(false), 150)}
                  placeholder="Untuk paket apa / keterangan DP..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                {showKepDD && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    {categories
                      .filter(c => !form.keperluan || c.toLowerCase().includes(form.keperluan.toLowerCase()))
                      .map(c => (
                        <button key={c} type="button"
                          onMouseDown={() => { setForm(f => ({ ...f, keperluan: c })); setShowKepDD(false) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 border-b border-gray-50 last:border-0">
                          {c}
                        </button>
                      ))
                    }
                    {form.keperluan && !categories.some(c => c.toLowerCase() === form.keperluan.toLowerCase()) && (
                      <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
                        ✏️ Custom: <span className="font-medium text-gray-600">{form.keperluan}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tanggal Dibayar*</label>
                <input type="date" value={form.tanggalSesi} onChange={e => setForm(f => ({ ...f, tanggalSesi: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nominal DP* (Rp)</label>
                <input type="number" value={form.dpAmount || ''} onChange={e => setForm(f => ({ ...f, dpAmount: Number(e.target.value) }))} placeholder="Masukkan nominal..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                <div className="flex gap-1.5 mt-1.5">
                  {[100000, 200000, 300000, 500000].map(amt => (
                    <button key={amt} type="button" onClick={() => setForm(f => ({ ...f, dpAmount: amt }))}
                      className="flex-1 border border-gray-200 rounded-lg py-1 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors">
                      {amt === 100000 ? '100rb' : amt === 200000 ? '200rb' : amt === 300000 ? '300rb' : '500rb'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tanggal Foto <span className="text-gray-300">(opsional, bisa diisi nanti)</span></label>
                <input type="date" value={form.tanggalFoto} onChange={e => setForm(f => ({ ...f, tanggalFoto: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Fotografer</label>
                <select value={form.fotograferId} onChange={e => setForm(f => ({ ...f, fotograferId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">— Belum Ditentukan —</option>
                  {fotografers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Catatan</label>
                <textarea value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} placeholder="Catatan tambahan..." rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none" />
              </div>
              {editId && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                    <option value="DIBAYAR">Dibayar</option>
                    <option value="CANCEL">Cancel</option>
                    <option value="REFUND">Refund</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={resetForm} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Batal</button>
              <button onClick={saveBooking} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700">
                {editId ? 'Update DP' : 'Simpan DP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




