'use client'

import { useEffect, useState } from 'react'
import { Search, RefreshCw, FileText, Mail, Pencil, Trash2, Download, Upload, X, AlertCircle } from 'lucide-react'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import { PageHeader, PaymentStatusBadge, SyncBadge, LoadingSpinner } from '@/components/shared'
import { InvoiceModal } from '@/components/pos/invoice-modal'
import { OtsInvoiceModal } from '@/components/pos/ots-invoice-modal'
import { BookingInvoiceModal } from '@/components/pos/booking-invoice-modal'
import { TagihanModal } from '@/components/pos/tagihan-modal'
import { useToast } from '@/components/ui/use-toast'

export default function TransaksiPage() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [invoiceTx, setInvoiceTx] = useState<any>(null)
  const [otsInvoice, setOtsInvoice] = useState<any>(null)
  const [bookingInvoice, setBookingInvoice] = useState<any>(null)
  const [tagihanTx, setTagihanTx] = useState<any>(null)
  const [retrying, setRetrying] = useState(false)
  const [editModal, setEditModal] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [fotografers, setFotografers] = useState<any[]>([])
  const [metodes, setMetodes] = useState<any[]>([])
  const [emailModal, setEmailModal] = useState<{ tx: any; email: string } | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<any>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    fetch('/api/fotografer?activeOnly=true').then(r => r.json()).then(setFotografers).catch(() => {})
    fetch('/api/metode-pembayaran?activeOnly=true').then(r => r.json()).then(setMetodes).catch(() => {})
  }, [])

  const isOfflineMode = process.env.NEXT_PUBLIC_FEATURE_SHEETS !== 'true'

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    if (typeFilter) params.set('type', typeFilter)
    if (status) params.set('status', status)
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    if (yearFilter) params.set('year', yearFilter)
    if (monthFilter) params.set('month', monthFilter)
    if (sortOrder) params.set('sort', sortOrder)
    const res = await fetch(`/api/transactions/combined?${params}`)
    if (res.ok) { const data = await res.json(); setTransactions(data.transactions); setTotal(data.total) }
    setLoading(false)
  }

  useEffect(() => { load() }, [page, search, status, typeFilter, fromDate, toDate, yearFilter, monthFilter, sortOrder])

  async function exportData() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (yearFilter && monthFilter) {
        const lastDay = new Date(Number(yearFilter), Number(monthFilter), 0).getDate()
        params.set('from', `${yearFilter}-${monthFilter.padStart(2,'0')}-01`)
        params.set('to', `${yearFilter}-${monthFilter.padStart(2,'0')}-${lastDay}`)
      } else if (yearFilter) {
        params.set('from', `${yearFilter}-01-01`)
        params.set('to', `${yearFilter}-12-31`)
      }
      params.set('sort', sortOrder)
      const res = await fetch(`/api/export-data?${params}`)
      if (!res.ok) { toast({ title: 'Gagal export', variant: 'destructive' }); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `StudioHub_Data.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Export berhasil!' })
    } finally {
      setExporting(false)
    }
  }

  async function handleImportPreview() {
    if (!importFile) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('preview', 'true')
    const res = await fetch('/api/import-data', { method: 'POST', body: fd })
    const data = await res.json()
    setImportPreview(data)
    setImporting(false)
  }

  async function handleImportConfirm() {
    if (!importFile) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('preview', 'false')
    const res = await fetch('/api/import-data', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.ok) {
      toast({ title: `Import selesai! ${data.imported} data masuk, ${data.skipped} dilewati` })
      setImportModal(false)
      setImportFile(null)
      setImportPreview(null)
      load()
    } else {
      toast({ title: 'Import gagal: ' + data.error, variant: 'destructive' })
    }
    setImporting(false)
  }

  async function deleteTransaction(tx: any) {
    const label = tx.type === 'OTS' ? `Order OTS ${tx.invoiceNumber}` : `Transaksi ${tx.invoiceNumber}`
    if (!confirm(`Hapus ${label}?\nCustomer: ${tx.customer?.name || tx.namaCustomer}\nTotal: ${formatRupiah(tx.grandTotal)}${!isOfflineMode ? '\n\nData di Sheets juga akan dihapus.' : ''}`)) return
    setDeleting(tx.id)
    const endpoint = tx.type === 'OTS' ? `/api/ots/${tx.id}` : tx.type === 'DP' ? `/api/booking/${tx.id}` : `/api/transactions/${tx.id}`
    const res = await fetch(endpoint, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Transaksi dihapus!' }); load() }
    else toast({ title: 'Gagal menghapus', variant: 'destructive' })
    setDeleting(null)
  }

  function openEdit(tx: any) {
    setEditModal(tx)
    setEditForm({
      fotograferId: tx.fotografer?.id || '',
      metodePembayaranId: tx.metodePembayaran?.id || '',
      dpAmount: tx.dpAmount || 0,
      notes: tx.notes || '',
      transactionDate: tx.transactionDate ? tx.transactionDate.split('T')[0] : '',
    })
  }

  async function saveEdit() {
    if (!editModal) return
    const res = await fetch(`/api/transactions/${editModal.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      toast({ title: 'Transaksi diupdate!' })
      setEditModal(null); load()
      // Re-sync
      await fetch(`/api/transactions/${editModal.id}/sync`, { method: 'POST' })
    } else toast({ title: 'Gagal update', variant: 'destructive' })
  }

  async function retrySync(tx: any) {
    const isOts = tx.type === 'OTS'
    const endpoint = isOts ? `/api/ots/${tx.id}/sync` : `/api/transactions/${tx.id}/sync`
    const res = await fetch(endpoint, { method: 'POST' })
    const data = await res.json()
    if (data.ok) { toast({ title: `Tersync ke ${data.sheet}!` }); load() }
    else toast({ title: 'Sync gagal', variant: 'destructive' })
  }

  async function retryAllQueue() {
    setRetrying(true)
    await fetch('/api/sync/retry', { method: 'POST' })
    await load()
    setRetrying(false)
  }

  async function sendEmail() {
    if (!emailModal) return
    setSendingEmail(true)
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: emailModal.tx.id, toEmail: emailModal.email }),
    })
    const data = await res.json()
    if (data.ok) { toast({ title: 'Email terkirim!' }); setEmailModal(null) }
    else toast({ title: 'Gagal: ' + data.error, variant: 'destructive' })
    setSendingEmail(false)
  }

  const pages = Math.ceil(total / 20)


  // ?? Kirim invoice via WA: pesan ringkas + link halaman publik (+PDF)
  function kirimInvoiceWA(tx: any) {
    const type = tx.type === 'OTS' ? 'O' : tx.type === 'BOOKING' ? 'B' : 'P'
    fetch(`/api/inv-token?type=${type}&id=${tx.id}`)
      .then(r => r.json())
      .then(({ token }) => {
        if (!token) return
        const link = `${window.location.origin}/inv/${token}`
        const nama = tx.customer?.name || tx.namaCustomer || 'Kak'
        const sisa = tx.type === 'BOOKING' ? 0 : (tx.remainingPayment ?? Math.max(0, tx.grandTotal - (tx.dpAmount || 0)))
        const pesan = [
          `Halo ${nama}! Terima kasih sudah mempercayakan momenmu ke kami \u{1F4F8}`,
          ``,
          `Invoice: *${tx.invoiceNumber}*`,
          `Total: *${formatRupiah(tx.grandTotal)}*`,
          ...(sisa > 0 ? [`Sisa pembayaran: *${formatRupiah(sisa)}*`] : [`Status: LUNAS \u2705`]),
          ``,
          `Lihat & download invoice:`,
          link,
        ].join('\n')
        const wa = (tx.customer?.whatsapp || tx.whatsapp || '').replace(/^0/, '62').replace(/\D/g, '')
        window.open(`https://wa.me/${wa ? wa : ''}?text=${encodeURIComponent(pesan)}`, '_blank')
      })
  }


  return (
    <div className="h-full overflow-y-auto">
      <PageHeader title="Riwayat Transaksi" subtitle="Semua transaksi, OTS & booking">
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500" placeholder="Dari" />
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setYearFilter('') }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500" placeholder="Sampai" />
          <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setMonthFilter(''); setFromDate(''); setToDate(''); setPage(1) }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white">
            <option value="">Semua Tahun</option>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {yearFilter && (
            <select value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setPage(1) }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white">
              <option value="">Semua Bulan</option>
              {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m,i) => (
                <option key={i+1} value={String(i+1)}>{m}</option>
              ))}
            </select>
          )}
          <select value={sortOrder} onChange={e => { setSortOrder(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white">
            <option value="desc">Terbaru</option>
            <option value="asc">Terlama</option>
          </select>
          <button onClick={exportData} disabled={exporting}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Export...' : 'Export'}
          </button>
          <button onClick={() => setImportModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
        </div>
        {!isOfflineMode && <button onClick={retryAllQueue} disabled={retrying} className="flex items-center gap-1.5 text-xs border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} /> Retry Queue
        </button>}
      </PageHeader>

      <div className="px-5 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Cari invoice, customer..."
              className="border border-gray-200 rounded-lg px-3 py-2 pl-8 text-sm w-56 outline-none focus:border-blue-500" />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
            <option value="">Semua Tipe</option>
            <option value="PAKET">Kasir</option>
            <option value="OTS">Order OTS</option>
            <option value="BOOKING">Booking</option>
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
            <option value="">Semua Status</option>
            <option value="DP">DP</option>
            <option value="LUNAS">LUNAS</option>
          </select>
          <div className="ml-auto text-sm text-gray-500">{total} transaksi</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {(['Jenis','Invoice', 'Customer', 'Item', 'Fotografer', 'Total', 'DP', 'Dibayar', 'Metode', 'Sheets', 'Tanggal', 'Aksi']).map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={12}><LoadingSpinner /></td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-12 text-sm text-gray-400">Tidak ada transaksi</td></tr>
                ) : transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        tx.type === 'OTS' ? 'bg-purple-50 text-purple-700' :
                        tx.type === 'BOOKING' ? 'bg-amber-50 text-amber-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {tx.type === 'OTS' ? 'OTS' : tx.type === 'BOOKING' ? 'Booking' : 'Kasir'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-blue-600 whitespace-nowrap">{tx.invoiceNumber}</td>
                    <td className="px-3 py-3 text-sm">{tx.customer?.name || tx.namaCustomer}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 max-w-[160px]">
                      <div className="truncate">{tx.items?.[0]?.package?.name || '-'}</div>
                      {tx.items?.length > 1 && <div className="text-gray-400">+{tx.items.length - 1} lainnya</div>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{tx.fotografer?.name || '-'}</td>
                    <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap">{formatRupiah(tx.grandTotal)}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{tx.dpAmount > 0 ? formatRupiah(tx.dpAmount) : '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className="text-base font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{tx.type === 'BOOKING' ? formatRupiah(tx.dpAmount || 0) : formatRupiah(tx.diterimaSaatIni || (tx.grandTotal - (tx.dpAmount || 0)))}</span></td>
                    <td className="px-3 py-3 text-xs text-gray-500">{tx.metodePembayaran?.nama || '-'}</td>
                    <td className="px-3 py-3">{isOfflineMode ? <span className="text-xs text-gray-400">Tidak Aktif</span> : <SyncBadge status={tx.syncStatus} sheet={tx.syncSheet} />}</td>
                    <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateShort(tx.transactionDate)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => tx.type === 'OTS' ? setOtsInvoice(tx) : tx.type === 'BOOKING' ? setBookingInvoice(tx) : setInvoiceTx(tx)}
                          title="Invoice" className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-blue-600 transition-colors">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => kirimInvoiceWA(tx)} title="Kirim invoice via WA"
                          className="p-1.5 border border-green-200 bg-green-50 rounded-lg text-green-600 hover:bg-green-100 transition-colors text-xs">
                          ??
                        </button>
                        {tx.type !== 'OTS' && tx.type !== 'BOOKING' && (
                          <button onClick={() => openEdit(tx)} title="Edit"
                            className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-blue-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => deleteTransaction(tx)} disabled={deleting === tx.id} title="Hapus"
                          className="p-1.5 border border-red-100 bg-red-50 rounded-lg text-red-400 hover:bg-red-100 transition-colors disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {tx.type !== 'OTS' && tx.type !== 'BOOKING' && (
                          <button onClick={() => setTagihanTx(tx)} title="Tagihan"
                            className="flex items-center gap-1 p-1.5 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors text-xs font-semibold">
                            Tagihan
                          </button>
                        )}
                        {tx.type !== 'OTS' && tx.type !== 'BOOKING' && (
                          <button onClick={() => setEmailModal({ tx, email: tx.customer?.email || '' })}
                            title="Kirim Email" className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-blue-600 transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isOfflineMode && tx.syncStatus !== 'SYNCED' && (
                          <button onClick={() => retrySync(tx)} title="Retry sync"
                            className="p-1.5 border border-amber-200 bg-amber-50 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors">
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
          {pages > 1 && (
            <div className="flex items-center justify-center gap-1.5 py-3 border-t border-gray-100">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"> Prev</button>
              <span className="text-xs text-gray-500">Hal {page} dari {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next </button>
            </div>
          )}
        </div>
      </div>

      {invoiceTx && <InvoiceModal tx={invoiceTx} onClose={() => setInvoiceTx(null)} />}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold">Edit Transaksi</h2>
                <p className="text-xs text-gray-400">{editModal.invoiceNumber}  {editModal.customer?.name}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tanggal Transaksi</label>
                <input type="date" value={editForm.transactionDate} onChange={e => setEditForm((f: any) => ({ ...f, transactionDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Fotografer</label>
                <select value={editForm.fotograferId} onChange={e => setEditForm((f: any) => ({ ...f, fotograferId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">-- Tidak ada --</option>
                  {fotografers.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Metode Pembayaran</label>
                <select value={editForm.metodePembayaranId} onChange={e => setEditForm((f: any) => ({ ...f, metodePembayaranId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">-- Pilih --</option>
                  {metodes.map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">DP Sebelumnya (Rp)</label>
                <input type="number" value={editForm.dpAmount || ''} onChange={e => setEditForm((f: any) => ({ ...f, dpAmount: Number(e.target.value) }))}
                  placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Catatan</label>
                <textarea value={editForm.notes} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditModal(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Batal</button>
              <button onClick={saveEdit} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700">Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}
      {tagihanTx && <TagihanModal tx={tagihanTx} onClose={() => setTagihanTx(null)} />}
      {otsInvoice && <OtsInvoiceModal order={otsInvoice} onClose={() => setOtsInvoice(null)} />}
      {bookingInvoice && <BookingInvoiceModal booking={bookingInvoice} onClose={() => setBookingInvoice(null)} />}

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold">Import Data dari Excel</h3>
              <button onClick={() => { setImportModal(false); setImportFile(null); setImportPreview(null) }}
                className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <strong>Format file:</strong> Gunakan file hasil Export Data dari aplikasi ini. Sheet yang diimport: Transaksi Kasir & Pengeluaran.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Pilih file Excel (.xlsx)</label>
                <input type="file" accept=".xlsx,.xls"
                  onChange={e => { setImportFile(e.target.files?.[0] || null); setImportPreview(null) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              {importFile && !importPreview && (
                <button onClick={handleImportPreview} disabled={importing}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl">
                  {importing ? 'Membaca file...' : '👁 Preview 5 Data Pertama'}
                </button>
              )}
              {importPreview && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Preview ({importPreview.totalRows} baris ditemukan):</div>
                    {importPreview.preview?.map((row: any, i: number) => (
                      <div key={i} className="text-xs text-gray-600 py-1 border-b border-gray-100 last:border-0">
                        {row.invoice} — {row.customer} — {row.tanggal}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setImportPreview(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm">Batal</button>
                    <button onClick={handleImportConfirm} disabled={importing}
                      className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:bg-blue-300">
                      {importing ? 'Mengimport...' : `Import ${importPreview.totalRows} Data`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {emailModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-base font-bold mb-1">Kirim Invoice via Email</h2>
            <p className="text-xs text-gray-500 mb-4">{emailModal.tx.invoiceNumber}</p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email Tujuan</label>
              <input type="email" value={emailModal.email} onChange={e => setEmailModal(m => m ? { ...m, email: e.target.value } : null)}
                placeholder="customer@email.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEmailModal(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Batal</button>
              <button onClick={sendEmail} disabled={sendingEmail || !emailModal.email}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300">
                {sendingEmail ? 'Mengirim...' : 'Kirim Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
