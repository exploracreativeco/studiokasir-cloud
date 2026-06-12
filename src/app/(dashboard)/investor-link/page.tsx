'use client'

// ============================================================
// /investor-link — kelola link publik investor (SUPERADMIN)
// Generate token per investor · copy link · cabut · lihat akses terakhir
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { Link2, Copy, RefreshCw, Ban, Loader2, Check } from 'lucide-react'

interface Inv { id: string; nama: string; publicToken: string | null; lastAccessAt: string | null }

export default function InvestorLinkPage() {
  const [investors, setInvestors] = useState<Inv[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')

  const [umum, setUmum] = useState<Inv | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/investor-link')
    const data = await res.json()
    if (res.ok && Array.isArray(data)) {
      setUmum(data.find((x: Inv) => x.nama === '__UMUM__') || null)
      setInvestors(data.filter((x: Inv) => x.nama !== '__UMUM__'))
    } else setError(data.error || 'Gagal memuat')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const linkOf = (token: string) => `${window.location.origin}/investor/${token}`

  async function generate(inv: Inv) {
    if (inv.publicToken && !confirm(`Generate ulang akan MEMATIKAN link lama ${inv.nama}. Lanjut?`)) return
    const res = await fetch(`/api/investor-link/${inv.id}`, { method: 'POST' })
    if (res.ok) load()
  }
  async function revoke(inv: Inv) {
    if (!confirm(`Cabut link ${inv.nama}? Link tidak bisa diakses lagi.`)) return
    await fetch(`/api/investor-link/${inv.id}`, { method: 'DELETE' })
    load()
  }
  async function copy(inv: Inv) {
    await navigator.clipboard.writeText(linkOf(inv.publicToken!))
    setCopied(inv.id)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <Link2 className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold">Link Investor</h1>
          <p className="text-sm text-gray-500">Link publik pantau omzet realtime — tanpa login, nama customer disamarkan</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}
      {loading && <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}

      {/* LINK UMUM — satu link untuk semua investor */}
      {!loading && (
        <div className="bg-gray-900 text-white rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[160px]">
            <p className="font-bold text-sm">🌐 Link Umum</p>
            <p className="text-xs opacity-60">Satu link untuk semua investor — tanpa generate satu-satu</p>
            {umum?.publicToken && <p className="text-[11px] font-mono opacity-70 mt-1 break-all">{linkOf(umum.publicToken)}</p>}
          </div>
          <div className="flex gap-2">
            {umum?.publicToken && (
              <>
                <button onClick={async () => { await navigator.clipboard.writeText(linkOf(umum.publicToken!)); setCopied('umum'); setTimeout(() => setCopied(''), 2000) }}
                  className="flex items-center gap-1.5 bg-white text-gray-900 text-xs font-bold px-3 py-2 rounded-lg">
                  {copied === 'umum' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === 'umum' ? 'Tersalin' : 'Copy'}
                </button>
                <button onClick={async () => { if (confirm('Cabut link umum?')) { await fetch('/api/investor-link/umum', { method: 'DELETE' }); load() } }}
                  className="flex items-center gap-1.5 bg-red-500/20 text-red-300 text-xs font-bold px-3 py-2 rounded-lg">
                  <Ban className="w-3.5 h-3.5" /> Cabut
                </button>
              </>
            )}
            <button onClick={async () => {
              if (umum?.publicToken && !confirm('Generate ulang mematikan link umum lama. Lanjut?')) return
              await fetch('/api/investor-link/umum', { method: 'POST' }); load()
            }} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg">
              <RefreshCw className="w-3.5 h-3.5" /> {umum?.publicToken ? 'Generate Ulang' : 'Buat Link Umum'}
            </button>
          </div>
        </div>
      )}

      {!loading && investors.length === 0 && (
        <p className="text-sm text-gray-400">Belum ada investor aktif. Tambahkan dulu di menu Gaji & Investor.</p>
      )}

      <div className="space-y-3">
        {investors.map(inv => (
          <div key={inv.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[160px]">
              <p className="font-bold text-sm">{inv.nama}</p>
              <p className="text-xs text-gray-400">
                {inv.publicToken
                  ? <>Link aktif · terakhir dibuka: {inv.lastAccessAt ? new Date(inv.lastAccessAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'belum pernah'}</>
                  : 'Belum ada link'}
              </p>
              {inv.publicToken && (
                <p className="text-[11px] font-mono text-gray-400 mt-1 break-all">{linkOf(inv.publicToken)}</p>
              )}
            </div>
            <div className="flex gap-2">
              {inv.publicToken && (
                <>
                  <button onClick={() => copy(inv)} className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-lg">
                    {copied === inv.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === inv.id ? 'Tersalin' : 'Copy Link'}
                  </button>
                  <button onClick={() => revoke(inv)} className="flex items-center gap-1.5 border border-red-200 bg-red-50 text-red-500 text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-100">
                    <Ban className="w-3.5 h-3.5" /> Cabut
                  </button>
                </>
              )}
              <button onClick={() => generate(inv)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg">
                <RefreshCw className="w-3.5 h-3.5" /> {inv.publicToken ? 'Generate Ulang' : 'Buat Link'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Keamanan: token acak panjang (praktis mustahil ditebak) · generate ulang/cabut langsung mematikan link lama · halaman tidak terindex Google.
      </p>
    </div>
  )
}
