'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, RefreshCw, MessageCircle, Pencil, Trash2, FileText } from 'lucide-react'
import { OtsInvoiceModal } from '@/components/pos/ots-invoice-modal'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import { PageHeader, LoadingSpinner } from '@/components/shared'
import { useToast } from '@/components/ui/use-toast'

type OtsStatus = { id: string; nama: string; warna: string; urutan: number }
type OtsPaket = { id: string; nama: string; jenis: string; harga: number; satuan: string; backgrounds: { id: string; nama: string }[] }
type OtsOrder = {
  id: string; orderNumber: string; jenis: string; namaCustomer: string; whatsapp?: string
  total: number; notes?: string; orderDate: string; createdAt: string
  status?: OtsStatus; user: { name: string }; metodePembayaran?: { nama: string }
  items: { id: string; deskripsi: string; ukuran?: string; jumlah: number; harga: number; catatan?: string }[]
}

const JENIS_LABELS: Record<string, string> = { PASFOTO: 'Pasfoto', CETAK: 'Cetak', CUSTOM: 'Custom' }
const JENIS_COLORS: Record<string, string> = { PASFOTO: '#3b82f6', CETAK: '#8b5cf6', CUSTOM: '#f59e0b' }

export default function OtsPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<OtsOrder[]>([])
  const [statuses, setStatuses] = useState<OtsStatus[]>([])
  const [metodes, setMetodes] = useState<any[]>([])
  const [pakets, setPakets] = useState<OtsPaket[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [showForm, setShowForm] = useState(false)
  const [editOrder, setEditOrder] = useState<OtsOrder | null>(null)
  const [statusCounts, setStatusCounts] = useState<any[]>([])

  // Form state
  const [form, setForm] = useState({
    jenis: 'PASFOTO', namaCustomer: '', whatsapp: '',
    metodePembayaranId: '', statusId: '', notes: '',
  })

  // Selected paket items with qty and background
  const [selectedItems, setSelectedItems] = useState<{
    paketId: string; nama: string; harga: number; satuan: string
    qty: number; background: string; backgrounds: string[]
  }[]>([])

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ search, sortBy })
    if (filterJenis) params.set('jenis', filterJenis)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)
    if (filterStatus) params.set('statusId', filterStatus)

    const [ordersRes, statusRes, metodesRes, paketRes] = await Promise.all([
      fetch(`/api/ots?${params}`),
      fetch('/api/ots/status'),
      fetch('/api/metode-pembayaran'),
      fetch('/api/ots/paket?activeOnly=false'),
    ])
    if (ordersRes.ok) { const d = await ordersRes.json(); setOrders(d.orders); setTotal(d.total); setStatusCounts(d.statusCounts || []) }
    if (statusRes.ok) setStatuses(await statusRes.json())
    if (metodesRes.ok) setMetodes(await metodesRes.json())
    if (paketRes.ok) setPakets(await paketRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [search, filterJenis, filterStatus, sortBy])

  // Get pakets filtered by jenis
  const filteredPakets = pakets

  function togglePaketItem(paket: OtsPaket) {
    const exists = selectedItems.find(i => i.paketId === paket.id)
    if (exists) {
      setSelectedItems(prev => prev.filter(i => i.paketId !== paket.id))
    } else {
      setSelectedItems(prev => [...prev, {
        paketId: paket.id, nama: paket.nama, harga: paket.harga, satuan: paket.satuan,
        qty: 1, background: paket.backgrounds[0]?.nama || '',
        backgrounds: paket.backgrounds.map(b => b.nama),
      }])
    }
  }

  function updateItem(paketId: string, field: string, value: any) {
    setSelectedItems(prev => prev.map(i => i.paketId === paketId ? { ...i, [field]: value } : i))
  }

  const grandTotal = selectedItems.reduce((s, i) => s + i.harga * i.qty, 0)

  async function saveOrder() {
    if (!form.namaCustomer) { toast({ title: 'Nama customer wajib diisi', variant: 'destructive' }); return }
    if (selectedItems.length === 0) {
      toast({ title: 'Pilih minimal 1 item', variant: 'destructive' }); return
    }

    const items = selectedItems.map(i => ({
      deskripsi: i.nama,
      ukuran: i.background ? `Background: ${i.background}` : '',
      jumlah: i.qty,
      harga: i.harga,
      catatan: i.satuan,
    }))

    const body = {
      ...form,
      total: grandTotal,
      items,
    }

    const url = editOrder ? `/api/ots/${editOrder.id}` : '/api/ots'
    const method = editOrder ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      toast({ title: editOrder ? 'Order diupdate!' : 'Order OTS disimpan!' })
      resetForm(); load()
    }
  }

  function resetForm() {
    setShowForm(false); setEditOrder(null)
    setForm({ jenis: 'PASFOTO', namaCustomer: '', whatsapp: '', metodePembayaranId: '', statusId: '', notes: '' })
    setSelectedItems([])
  }

  async function updateStatus(orderId: string, statusId: string) {
    await fetch(`/api/ots/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statusId }) })
    load()
  }

  async function deleteOrder(id: string) {
    if (!confirm('Hapus order ini?')) return
    await fetch(`/api/ots/${id}`, { method: 'DELETE' })
    toast({ title: 'Order dihapus' }); load()
  }

  function openEdit(order: OtsOrder) {
    setEditOrder(order)
    setForm({
      jenis: order.jenis, namaCustomer: order.namaCustomer, whatsapp: order.whatsapp || '',
      metodePembayaranId: (order.metodePembayaran as any)?.id || '', statusId: order.status?.id || '', notes: order.notes || '',
    })
    setSelectedItems([])
    setShowForm(true)
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="Order OTS" subtitle="Pasfoto formal & cetak on the spot">
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Order Baru
        </button>
      </PageHeader>

      <div className="px-5 pb-5 space-y-4">
        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStatus('')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${!filterStatus ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Semua ({total})
          </button>
          {statuses.map(s => {
            const count = statusCounts.find((c: any) => c.statusId === s.id)?._count || 0
            return (
              <button key={s.id} onClick={() => setFilterStatus(filterStatus === s.id ? '' : s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterStatus === s.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                style={filterStatus === s.id ? { background: s.warna, borderColor: s.warna } : {}}>
                <span className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ background: s.warna }} />
                {s.nama} ({count})
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-400" />
            <span className="text-xs text-gray-400">—</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-400" />
            {(filterFrom || filterTo) && (
              <button onClick={() => { setFilterFrom(''); setFilterTo('') }}
                className="text-xs text-gray-400 hover:text-red-500">✕</button>
            )}
          </div>
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama customer..."
              className="border border-gray-200 rounded-lg px-3 py-2 pl-8 text-sm w-52 outline-none focus:border-blue-500" />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
          <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500">
            <option value="">Semua Jenis</option>
            <option value="PASFOTO">Pasfoto</option>
            <option value="CETAK">Cetak</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500">
            <option value="createdAt">Terbaru</option>
            <option value="status">Berdasarkan Status</option>
          </select>
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                {['No Order', 'Jenis', 'Customer', 'WA', 'Item', 'Total', 'Metode', 'Status', 'Tanggal', 'Kasir', 'Aksi'].map(h =>
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                )}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? <tr><td colSpan={11}><LoadingSpinner /></td></tr>
                  : orders.length === 0 ? <tr><td colSpan={11} className="text-center py-12 text-sm text-gray-400">Belum ada order OTS</td></tr>
                    : orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-blue-600 whitespace-nowrap">{order.orderNumber}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ background: JENIS_COLORS[order.jenis] || '#6b7280' }}>
                            {JENIS_LABELS[order.jenis] || order.jenis}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{order.namaCustomer}</td>
                        <td className="px-4 py-3">
                          {order.whatsapp ? (
                            <a href={`https://wa.me/62${order.whatsapp.replace(/^0/, '')}`} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                              <MessageCircle className="w-3.5 h-3.5" /> {order.whatsapp}
                            </a>
                          ) : <span className="text-xs text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-600">
                            {order.items.slice(0, 2).map((item, i) => (
                              <div key={i}>{item.deskripsi} {item.ukuran ? `(${item.ukuran})` : ''} {item.jumlah}</div>
                            ))}
                            {order.items.length > 2 && <div className="text-gray-400">+{order.items.length - 2} lainnya</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">{formatRupiah(order.total)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{order.metodePembayaran?.nama || '-'}</td>
                        <td className="px-4 py-3">
                          <select value={order.status?.id || ''} onChange={e => updateStatus(order.id, e.target.value)}
                            className="text-xs font-semibold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer text-white"
                            style={{ background: order.status?.warna || '#e5e7eb', color: order.status ? 'white' : '#374151' }}>
                            <option value="">-- Status --</option>
                            {statuses.map(s => <option key={s.id} value={s.id} style={{ background: 'white', color: '#374151' }}>{s.nama}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateShort(order.orderDate)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{order.user.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setInvoiceOrder(order)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-purple-600 transition-colors" title="Invoice">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(order)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteOrder(order.id)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-base font-bold">{editOrder ? 'Edit Order OTS' : 'Order OTS Baru'}</h2>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 text-lg"></button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-4">
              {/* Info Customer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Jenis Order</label>
                  <select value={form.jenis} onChange={e => { setForm(f => ({ ...f, jenis: e.target.value })); setSelectedItems([]) }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                    <option value="PASFOTO">Pasfoto Formal</option>
                    <option value="CETAK">Order Cetak</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={form.statusId} onChange={e => setForm(f => ({ ...f, statusId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                    <option value="">-- Pilih Status --</option>
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nama Customer*</label>
                  <input value={form.namaCustomer} onChange={e => setForm(f => ({ ...f, namaCustomer: e.target.value }))} placeholder="Nama lengkap"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp</label>
                  <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="08xxxxxxxxxx"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Metode Pembayaran</label>
                  <select value={form.metodePembayaranId} onChange={e => setForm(f => ({ ...f, metodePembayaranId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                    <option value="">-- Pilih --</option>
                    {metodes.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Catatan</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opsional"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>

              {/* Pilih dari Paket OTS */}
              {filteredPakets.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Pilih Item</div>
                  <div className="space-y-2">
                    {filteredPakets.map(paket => {
                      const sel = selectedItems.find(i => i.paketId === paket.id)
                      return (
                        <div key={paket.id} className={`border rounded-xl p-3 transition-all ${sel ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={!!sel} onChange={() => togglePaketItem(paket)}
                              className="w-4 h-4 accent-blue-600 cursor-pointer" />
                            <div className="flex-1">
                              <span className="text-sm font-medium">{paket.nama}</span>
                              <span className="text-xs text-gray-400 ml-2">{formatRupiah(paket.harga)}/{paket.satuan}</span>
                            </div>
                          </div>
                          {sel && (
                            <div className="flex items-center gap-3 mt-2 ml-7">
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs text-gray-500">Qty:</label>
                                <input type="number" min="1" value={sel.qty}
                                  onChange={e => updateItem(paket.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500 text-center" />
                              </div>
                              {paket.backgrounds.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <label className="text-xs text-gray-500">Background:</label>
                                  <select value={sel.background} onChange={e => updateItem(paket.id, 'background', e.target.value)}
                                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500 bg-white">
                                    {paket.backgrounds.map(b => <option key={b.id} value={b.nama}>{b.nama}</option>)}
                                  </select>
                                </div>
                              )}
                              <span className="text-xs font-bold text-blue-600 ml-auto">{formatRupiah(paket.harga * sel.qty)}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}



              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm font-bold">Total: <span className="text-blue-600">{formatRupiah(grandTotal)}</span></span>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={resetForm} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Batal</button>
              <button onClick={saveOrder} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700">
                {editOrder ? 'Update Order' : 'Simpan Order'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* OTS Invoice Modal */}
      {invoiceOrder && <OtsInvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
    </div>
  )
}
