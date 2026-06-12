'use client'

// ============================================================
// /pengaturan-landing — edit konten landing tanpa coding (SUPERADMIN)
// Hero · Brand (dinamis, bisa tambah) · Kenapa Kami · Galeri ·
// Testimoni (manual + Place ID Google) · Kontak
// Foto → Supabase Storage bucket "landing"
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { Globe, Loader2, Check, Plus, Trash2, Upload, ExternalLink } from 'lucide-react'

interface Section { id: string; key: string; judul: string | null; konten: any; urutan: number; isActive: boolean }

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm'
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1'

export default function PengaturanLandingPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [savedKey, setSavedKey] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/landing-admin')
    const data = await res.json()
    if (res.ok && Array.isArray(data)) setSections(data)
    else setError(data.error || 'Gagal memuat')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const get = (key: string) => sections.find(s => s.key === key)
  const setKonten = (key: string, patch: any) =>
    setSections(ss => ss.map(s => (s.key === key ? { ...s, konten: { ...s.konten, ...patch } } : s)))

  async function save(key: string, extra: Partial<Section> = {}) {
    setError('')
    const s = get(key)
    const res = await fetch('/api/landing-admin', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, konten: s?.konten || {}, judul: extra.judul ?? s?.judul, urutan: extra.urutan ?? s?.urutan, isActive: extra.isActive ?? s?.isActive }),
    })
    if (!res.ok) { setError((await res.json()).error || 'Gagal menyimpan'); return }
    setSavedKey(key); setTimeout(() => setSavedKey(''), 2000)
  }

  async function uploadFoto(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/landing-admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Upload gagal'); return null }
    return data.url
  }

  async function tambahBrand() {
    const nama = prompt('Nama brand baru:')
    if (!nama) return
    const key = 'brand_' + nama.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)
    const res = await fetch('/api/landing-admin', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, judul: nama, konten: { nama, kategori: '', deskripsi: '', ctaLabel: 'Selengkapnya', ctaUrl: '' } }),
    })
    if (res.ok) load()
  }

  async function hapusBrand(key: string) {
    if (!confirm('Hapus brand ini dari landing?')) return
    await fetch(`/api/landing-admin?key=${key}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>

  const hero = get('hero'), kenapa = get('kenapa'), galeri = get('galeri'), testimoni = get('testimoni'), kontak = get('kontak')
  const brands = sections.filter(s => s.key.startsWith('brand_'))

  const SaveBtn = ({ k }: { k: string }) => (
    <button onClick={() => save(k)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg">
      {savedKey === k ? <Check className="w-3.5 h-3.5" /> : null} {savedKey === k ? 'Tersimpan' : 'Simpan'}
    </button>
  )

  const FotoUpload = ({ url, onUrl }: { url?: string; onUrl: (u: string | null) => void }) => (
    <div className="flex items-center gap-2">
      {url ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-20 h-14 object-cover rounded-lg border border-gray-200" />
          <button onClick={() => onUrl(null)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 text-[8px] w-4 h-4 flex items-center justify-center">✕</button>
        </div>
      ) : null}
      <label className="flex items-center gap-1.5 border-2 border-dashed border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 cursor-pointer hover:border-blue-400">
        <Upload className="w-3.5 h-3.5" /> {url ? 'Ganti' : 'Upload'}
        <input type="file" accept="image/*" className="hidden" onChange={async e => {
          const f = e.target.files?.[0]
          if (f) { const u = await uploadFoto(f); if (u) onUrl(u) }
        }} />
      </label>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto h-full overflow-y-auto space-y-5 pb-16">
      <div className="flex items-center gap-3">
        <Globe className="w-6 h-6 text-blue-600" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">Pengaturan Landing</h1>
          <p className="text-sm text-gray-500">Ubah konten exploracreative.co tanpa coding</p>
        </div>
        <a href="/landing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 border border-gray-200 bg-white text-gray-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-50">
          <ExternalLink className="w-3.5 h-3.5" /> Lihat Landing
        </a>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* ===== HERO ===== */}
      {hero && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between"><p className="font-bold text-sm">Hero (Bagian Atas)</p><SaveBtn k="hero" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Eyebrow (teks kecil)</label><input className={inputCls} value={hero.konten.eyebrow || ''} onChange={e => setKonten('hero', { eyebrow: e.target.value })} placeholder="Semarang, Indonesia" /></div>
            <div><label className={labelCls}>Judul besar</label><input className={inputCls} value={hero.konten.judul || ''} onChange={e => setKonten('hero', { judul: e.target.value })} placeholder="Explora Creative" /></div>
            <div><label className={labelCls}>Tagline</label><input className={inputCls} value={hero.konten.tagline || ''} onChange={e => setKonten('hero', { tagline: e.target.value })} placeholder="Photography & Videography Services" /></div>
            <div><label className={labelCls}>Deskripsi singkat</label><input className={inputCls} value={hero.konten.deskripsi || ''} onChange={e => setKonten('hero', { deskripsi: e.target.value })} /></div>
          </div>
        </div>
      )}

      {/* ===== BRANDS ===== */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm">Brand ({brands.length})</p>
          <button onClick={tambahBrand} className="flex items-center gap-1 text-xs font-bold text-blue-600"><Plus className="w-3.5 h-3.5" /> Tambah Brand</button>
        </div>
        {brands.map(b => (
          <div key={b.key} className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-gray-400">{b.key} · urutan {b.urutan}</p>
              <div className="flex gap-2">
                <button onClick={() => hapusBrand(b.key)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                <SaveBtn k={b.key} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Nama brand</label><input className={inputCls} value={b.konten.nama || ''} onChange={e => setKonten(b.key, { nama: e.target.value })} /></div>
              <div><label className={labelCls}>Kategori</label><input className={inputCls} value={b.konten.kategori || ''} onChange={e => setKonten(b.key, { kategori: e.target.value })} placeholder="Self Photo Studio" /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Deskripsi</label><textarea rows={2} className={inputCls} value={b.konten.deskripsi || ''} onChange={e => setKonten(b.key, { deskripsi: e.target.value })} /></div>
              <div><label className={labelCls}>Label tombol</label><input className={inputCls} value={b.konten.ctaLabel || ''} onChange={e => setKonten(b.key, { ctaLabel: e.target.value })} placeholder="Booking Sekarang" /></div>
              <div><label className={labelCls}>Link tombol</label><input className={inputCls} value={b.konten.ctaUrl || ''} onChange={e => setKonten(b.key, { ctaUrl: e.target.value })} placeholder="https://…" /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Foto brand</label>
                <FotoUpload url={b.konten.fotoUrl} onUrl={u => setKonten(b.key, { fotoUrl: u || undefined })} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== KENAPA KAMI ===== */}
      {kenapa !== undefined && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between"><p className="font-bold text-sm">Kenapa Kami</p><SaveBtn k="kenapa" /></div>
          <input className={inputCls} value={kenapa?.konten.judul || ''} onChange={e => setKonten('kenapa', { judul: e.target.value })} placeholder="Kenapa harus ke kami?" />
          {(kenapa?.konten.poin || []).map((p: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <input className={inputCls + ' max-w-[180px]'} value={p.judul} placeholder="Judul poin" onChange={e => {
                const poin = [...kenapa!.konten.poin]; poin[i] = { ...poin[i], judul: e.target.value }; setKonten('kenapa', { poin })
              }} />
              <input className={inputCls} value={p.isi} placeholder="Isi poin" onChange={e => {
                const poin = [...kenapa!.konten.poin]; poin[i] = { ...poin[i], isi: e.target.value }; setKonten('kenapa', { poin })
              }} />
              <button onClick={() => setKonten('kenapa', { poin: kenapa!.konten.poin.filter((_: any, j: number) => j !== i) })} className="text-red-400 mt-2"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={() => setKonten('kenapa', { poin: [...(kenapa?.konten.poin || []), { judul: '', isi: '' }] })} className="flex items-center gap-1 text-xs font-bold text-blue-600"><Plus className="w-3.5 h-3.5" /> Tambah poin</button>
        </div>
      )}

      {/* ===== GALERI ===== */}
      {galeri !== undefined && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between"><p className="font-bold text-sm">Galeri (maks 8 foto)</p><SaveBtn k="galeri" /></div>
          <div className="flex flex-wrap gap-2">
            {(galeri?.konten.fotoUrls || []).map((u: string, i: number) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                <button onClick={() => setKonten('galeri', { fotoUrls: galeri!.konten.fotoUrls.filter((_: string, j: number) => j !== i) })}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[8px] flex items-center justify-center">✕</button>
              </div>
            ))}
            {(galeri?.konten.fotoUrls || []).length < 8 && (
              <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 text-gray-400">
                <Upload className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                  const f = e.target.files?.[0]
                  if (f) { const u = await uploadFoto(f); if (u) setKonten('galeri', { fotoUrls: [...(galeri?.konten.fotoUrls || []), u] }) }
                }} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* ===== TESTIMONI ===== */}
      {testimoni !== undefined && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between"><p className="font-bold text-sm">Testimoni</p><SaveBtn k="testimoni" /></div>
          <p className="text-xs text-gray-400">Testimoni manual (tampil kalau Google Reviews belum aktif):</p>
          {(testimoni?.konten.manual || []).map((t: any, i: number) => (
            <div key={i} className="flex flex-wrap gap-2 items-start">
              <input className={inputCls + ' max-w-[140px]'} value={t.nama} placeholder="Nama" onChange={e => {
                const manual = [...testimoni!.konten.manual]; manual[i] = { ...manual[i], nama: e.target.value }; setKonten('testimoni', { manual })
              }} />
              <select className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white" value={t.rating} onChange={e => {
                const manual = [...testimoni!.konten.manual]; manual[i] = { ...manual[i], rating: +e.target.value }; setKonten('testimoni', { manual })
              }}>
                {[5, 4, 3].map(r => <option key={r} value={r}>{'★'.repeat(r)}</option>)}
              </select>
              <input className={inputCls + ' flex-1 min-w-[180px]'} value={t.isi} placeholder="Isi testimoni" onChange={e => {
                const manual = [...testimoni!.konten.manual]; manual[i] = { ...manual[i], isi: e.target.value }; setKonten('testimoni', { manual })
              }} />
              <button onClick={() => setKonten('testimoni', { manual: testimoni!.konten.manual.filter((_: any, j: number) => j !== i) })} className="text-red-400 mt-2"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={() => setKonten('testimoni', { manual: [...(testimoni?.konten.manual || []), { nama: '', rating: 5, isi: '' }] })} className="flex items-center gap-1 text-xs font-bold text-blue-600"><Plus className="w-3.5 h-3.5" /> Tambah testimoni</button>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Google Reviews (opsional) — isi Place ID per studio. Cari Place ID di <span className="font-mono">developers.google.com/maps/documentation/places/web-service/place-id</span>. Butuh env GOOGLE_MAPS_API_KEY.</p>
            {Object.entries(testimoni?.konten.placeIds || {}).map(([label, pid]: any, i: number) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className={inputCls + ' max-w-[160px]'} value={label} placeholder="Label studio" onChange={e => {
                  const entries = Object.entries(testimoni!.konten.placeIds || {}); entries[i] = [e.target.value, pid]
                  setKonten('testimoni', { placeIds: Object.fromEntries(entries) })
                }} />
                <input className={inputCls} value={pid as string} placeholder="ChIJ…" onChange={e => {
                  const entries = Object.entries(testimoni!.konten.placeIds || {}); entries[i] = [label, e.target.value]
                  setKonten('testimoni', { placeIds: Object.fromEntries(entries) })
                }} />
                <button onClick={() => {
                  const p = { ...(testimoni!.konten.placeIds || {}) }; delete p[label]; setKonten('testimoni', { placeIds: p })
                }} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setKonten('testimoni', { placeIds: { ...(testimoni?.konten.placeIds || {}), ['Studio ' + (Object.keys(testimoni?.konten.placeIds || {}).length + 1)]: '' } })} className="flex items-center gap-1 text-xs font-bold text-blue-600"><Plus className="w-3.5 h-3.5" /> Tambah Place ID</button>
          </div>
        </div>
      )}

      {/* ===== KONTAK ===== */}
      {kontak !== undefined && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between"><p className="font-bold text-sm">Kontak & Footer</p><SaveBtn k="kontak" /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className={labelCls}>Alamat</label><input className={inputCls} value={kontak?.konten.alamat || ''} onChange={e => setKonten('kontak', { alamat: e.target.value })} /></div>
            <div><label className={labelCls}>WhatsApp</label><input className={inputCls} value={kontak?.konten.whatsapp || ''} onChange={e => setKonten('kontak', { whatsapp: e.target.value })} placeholder="08xxxxxxxxxx" /></div>
            <div><label className={labelCls}>Instagram (tanpa @)</label><input className={inputCls} value={kontak?.konten.instagram || ''} onChange={e => setKonten('kontak', { instagram: e.target.value })} placeholder="exploracreative.co" /></div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">Perubahan tampil di landing maksimal 5 menit setelah disimpan (cache). Kolom kosong otomatis memakai teks default.</p>
    </div>
  )
}
