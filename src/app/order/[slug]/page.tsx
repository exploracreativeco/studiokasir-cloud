'use client'

// ============================================================
// /order — booking OTS PUBLIK (tanpa login)
// Pilih studio → pilih layanan (cetak/pasfoto/photobox dll) →
// isi nama + WA → masuk transaksi OTS kasir.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Loader2, Check, Minus, Plus } from 'lucide-react'

interface Branch { id: string; slug: string; nama: string }
interface Paket { id: string; nama: string; jenis: string; harga: number; satuan: string; branchId: string | null }

const fmtRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

export default function OrderPublikPage() {
  const { slug } = useParams<{ slug: string }>()
  const [pakets, setPakets] = useState<Paket[]>([])
  const [branchId, setBranchId] = useState('')
  const [qty, setQty] = useState<Record<string, number>>({})
  const [nama, setNama] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ orderNumber: string; total: number } | null>(null)
  const [error, setError] = useState('')

  const [branch, setBranch] = useState<{ id: string; nama: string; alamat?: string | null } | null>(null)
  useEffect(() => {
    fetch(`/api/order-publik?branch=${slug}`).then(r => r.json()).then(d => {
      if (d.branch) { setBranch(d.branch); setBranchId(d.branch.id) }
      else setError(d.error || 'Studio tidak ditemukan')
      if (Array.isArray(d.pakets)) setPakets(d.pakets)
      setLoading(false)
    }).catch(() => { setError('Gagal memuat'); setLoading(false) })
  }, [slug])

  const visiblePakets = pakets
  const byJenis = useMemo(() => {
    const m = new Map<string, Paket[]>()
    for (const p of visiblePakets) m.set(p.jenis, [...(m.get(p.jenis) || []), p])
    return m
  }, [visiblePakets])

  const total = visiblePakets.reduce((s, p) => s + (qty[p.id] || 0) * p.harga, 0)
  const setQ = (id: string, delta: number) => setQty(q => ({ ...q, [id]: Math.max(0, (q[id] || 0) + delta) }))

  async function submit() {
    setError('')
    if (!nama.trim() || !whatsapp.trim()) { setError('Nama dan WhatsApp wajib diisi'); return }
    const items = Object.entries(qty).filter(([, n]) => n > 0).map(([paketId, jumlah]) => ({ paketId, jumlah }))
    if (items.length === 0) { setError('Pilih minimal satu layanan'); return }
    setSubmitting(true)
    const res = await fetch('/api/order-publik', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, nama: nama.trim(), whatsapp: whatsapp.trim(), catatan: catatan.trim() || null, items }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error || 'Gagal mengirim'); return }
    setDone({ orderNumber: data.orderNumber, total: data.total })
  }

  return (
    <main className="min-h-screen bg-[#f5f4f1] py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <Camera className="w-5 h-5" />
          <span className="font-bold tracking-tight">EXPLORA CREATIVE</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
          {done ? (
            <div className="text-center space-y-3 py-8">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto"><Check className="w-7 h-7 text-green-600" /></div>
              <h2 className="font-bold text-lg">Order Diterima!</h2>
              <p className="text-sm text-gray-600">Nomor order: <b className="font-mono">{done.orderNumber}</b></p>
              <p className="text-sm text-gray-600">Total: <b>{fmtRp(done.total)}</b> (bayar di studio)</p>
              <p className="text-xs text-gray-400">Tunjukkan nomor order ini ke kasir saat datang.</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">Order Online</p>
                <h1 className="text-2xl font-bold">{branch?.nama || 'Pesan Layanan'}</h1>
                {branch?.alamat && <p className="text-xs text-gray-400 mt-0.5">{branch.alamat}</p>}
                <p className="text-sm text-gray-500 mt-2">Cetak foto, pasfoto, photobox, dan lainnya — tanpa antri, bayar di studio.</p>
              </div>
              {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

              <div className="space-y-4">
                {[...byJenis.entries()].map(([jenis, list]) => (
                  <div key={jenis}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{jenis}</p>
                    <div className="space-y-2">
                      {list.map(p => (
                        <div key={p.id} className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 ${qty[p.id] ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{p.nama}</p>
                            <p className="text-xs text-gray-400">{fmtRp(p.harga)} / {p.satuan}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setQ(p.id, -1)} className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="w-6 text-center text-sm font-bold">{qty[p.id] || 0}</span>
                            <button onClick={() => setQ(p.id, 1)} className="w-7 h-7 bg-gray-900 text-white rounded-lg flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {visiblePakets.length === 0 && <p className="text-sm text-gray-400">Belum ada layanan untuk studio ini.</p>}

                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap *" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
                  <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp * (08xxxxxxxxxx)" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
                  <input value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Catatan (opsional)" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
                </div>

                <button onClick={submit} disabled={submitting || total === 0}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-bold rounded-lg py-3 text-sm">
                  {submitting ? 'Mengirim…' : `Pesan Sekarang${total > 0 ? ' — ' + fmtRp(total) : ''}`}
                </button>
                <p className="text-center text-[11px] text-gray-400">Pembayaran dilakukan di studio saat pengambilan.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
