'use client'

// ============================================================
// /inv/[token] — invoice publik (tanpa login, mobile-friendly)
// Status live + tombol Download PDF (file langsung terunduh)
// ============================================================
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Loader2, Download } from 'lucide-react'

const fmtRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

export default function InvoicePublikPage() {
  const { token } = useParams<{ token: string }>()
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/inv/${token}`).then(r => r.json()).then(x => x.error ? setErr(x.error) : setD(x)).catch(() => setErr('Gagal memuat'))
  }, [token])

  if (err) return <main className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-6"><p className="text-sm text-gray-400">{err}</p></main>
  if (!d) return <main className="min-h-screen bg-[#f5f4f1] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></main>

  return (
    <main className="min-h-screen bg-[#f5f4f1] py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-5 justify-center">
          <Camera className="w-5 h-5" />
          <span className="font-bold tracking-tight uppercase">{d.studio.nama}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* header hitam */}
          <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-60">{d.jenis}</p>
              <p className="font-bold font-mono">{d.nomor}</p>
            </div>
            <p className="text-xs opacity-70">{new Date(d.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400">Ditagihkan kepada</p>
              <p className="font-bold">{d.customer}</p>
            </div>

            <div className="divide-y divide-gray-100 border-y border-gray-100">
              {d.items.map((it: any, i: number) => (
                <div key={i} className="py-2.5 flex justify-between gap-3 text-sm">
                  <span>{it.deskripsi}{it.qty > 1 ? <span className="text-gray-400"> ×{it.qty}</span> : null}</span>
                  <span className="font-semibold whitespace-nowrap">{fmtRp(it.jumlah)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-sm">
              {d.diskon > 0 && <>
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmtRp(d.subtotal)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Diskon{d.promo ? ` (${d.promo})` : ''}</span><span>- {fmtRp(d.diskon)}</span></div>
              </>}
              <div className="flex justify-between font-bold text-base pt-1"><span>TOTAL</span><span>{fmtRp(d.total)}</span></div>
              {d.sisa > 0 ? <>
                <div className="flex justify-between text-emerald-600"><span>Dibayar{d.metode ? ` (${d.metode})` : ''}</span><span>{fmtRp(d.dibayar)}</span></div>
                <div className="flex justify-between font-bold text-amber-600"><span>SISA PEMBAYARAN</span><span>{fmtRp(d.sisa)}</span></div>
              </> : (
                <p className="text-emerald-600 font-bold text-xs pt-1">✓ {d.isDP ? 'DP diterima' : `Lunas${d.metode ? ' · ' + d.metode : ''}`} — terima kasih!</p>
              )}
            </div>

            {(d.fotografer || d.catatan) && (
              <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                {[d.fotografer ? `Fotografer: ${d.fotografer}` : null, d.catatan].filter(Boolean).join(' · ')}
              </p>
            )}

            <a href={`/api/inv/${token}/pdf`}
              className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl py-3 text-sm">
              <Download className="w-4 h-4" /> Download PDF
            </a>
            {d.studio.whatsapp && (
              <a href={`https://wa.me/62${String(d.studio.whatsapp).replace(/^0/, '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="block text-center text-xs text-gray-400 underline">Ada pertanyaan? Hubungi kami via WhatsApp</a>
            )}
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-300 mt-4">Invoice digital resmi — {d.studio.nama}</p>
      </div>
    </main>
  )
}
