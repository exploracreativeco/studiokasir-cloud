'use client'

// ============================================================
// /oprec v2 — edit lowongan + gambar + ringkasan + auto-filter
// Pipeline: BARU → REVIEW → INTERVIEW → DITERIMA/DITOLAK
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Megaphone, Plus, Trash2, Copy, Check, Loader2, X, UserPlus, Upload, Search, Pencil , ChevronUp, ChevronDown } from 'lucide-react'

interface Field { key: string; label: string; type: string; required: boolean; options?: string[]; optionsText?: string }
interface Rule { fieldKey: string; operator: string; value: string }
interface Lowongan { id: string; slug: string; judul: string; posisi: string; deskripsi: string | null; fotoUrl?: string | null; fields: Field[]; rules: Rule[]; isActive: boolean; pelamarCount: number }
interface Pelamar { id: string; nama: string; whatsapp: string; email: string | null; jawaban: Record<string, any>; status: string; catatan: string | null; createdAt: string; lowonganId: string; lowongan: { judul: string; posisi: string } }

const STATUSES = ['BARU', 'REVIEW', 'INTERVIEW', 'DITERIMA', 'DITOLAK']
const STATUS_WARNA: Record<string, string> = {
  BARU: 'bg-blue-100 text-blue-700', REVIEW: 'bg-purple-100 text-purple-700',
  INTERVIEW: 'bg-amber-100 text-amber-700', DITERIMA: 'bg-green-100 text-green-700', DITOLAK: 'bg-gray-100 text-gray-400',
}
const OPERATORS = [
  { v: 'sama', l: 'sama dengan' }, { v: 'tidak_sama', l: 'tidak sama dengan' },
  { v: 'mengandung', l: 'mengandung' }, { v: 'kurang_dari', l: 'kurang dari (angka)' }, { v: 'lebih_dari', l: 'lebih dari (angka)' },
]

export default function OprecPage() {
  const [tab, setTab] = useState<'pelamar' | 'lowongan'>('pelamar')
  const [lowongan, setLowongan] = useState<Lowongan[]>([])
  const [pelamar, setPelamar] = useState<Pelamar[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLowongan, setFilterLowongan] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')
  const [detail, setDetail] = useState<Pelamar | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [l, p] = await Promise.all([
      fetch('/api/oprec/lowongan').then(r => r.json()),
      fetch('/api/oprec/pelamar').then(r => r.json()),
    ])
    if (Array.isArray(l)) setLowongan(l)
    if (Array.isArray(p)) setPelamar(p)
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // Ringkasan + filter client-side (status, lowongan, cari di nama/WA/jawaban)
  const summary = useMemo(() => {
    const s: Record<string, number> = { TOTAL: pelamar.length }
    for (const st of STATUSES) s[st] = pelamar.filter(p => p.status === st).length
    return s
  }, [pelamar])

  const visible = useMemo(() => pelamar.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    if (filterLowongan && p.lowonganId !== filterLowongan) return false
    if (search) {
      const q = search.toLowerCase()
      const inJawaban = Object.values(p.jawaban || {}).some(v => String(Array.isArray(v) ? v.join(' ') : v).toLowerCase().includes(q))
      if (!p.nama.toLowerCase().includes(q) && !p.whatsapp.includes(q) && !inJawaban) return false
    }
    return true
  }), [pelamar, filterStatus, filterLowongan, search])

  async function setStatus(p: Pelamar, status: string) {
    await fetch(`/api/oprec/pelamar/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    load()
    if (detail?.id === p.id) setDetail({ ...detail, status })
  }

  async function jadikanKaryawan(p: Pelamar) {
    const email = p.email || prompt('Email untuk akun karyawan:')
    if (!email) return
    const password = prompt('Password awal (min 6 karakter):', 'explora123')
    if (!password || password.length < 6) return
    const res = await fetch('/api/karyawan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p.nama, email, password, role: 'TEAM', branchId: null }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Gagal membuat akun'); return }
    alert(`Akun karyawan dibuat: ${email}\nAtur role & studio di menu Karyawan.`)
    setStatus(p, 'DITERIMA')
  }

  const linkOf = (slug: string) => `${window.location.origin}/karir/${slug}`

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto h-full overflow-y-auto space-y-5">
      <div className="flex items-center gap-3">
        <Megaphone className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold">Open Recruitment</h1>
        <div className="flex-1" />
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setTab('pelamar')} className={`px-3 py-2 text-xs font-bold ${tab === 'pelamar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}>Pelamar</button>
          <button onClick={() => setTab('lowongan')} className={`px-3 py-2 text-xs font-bold ${tab === 'lowongan' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}>Lowongan</button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}

      {/* TAB PELAMAR */}
      {!loading && tab === 'pelamar' && (
        <>
          {/* Ringkasan */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div className="bg-gray-900 text-white rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{summary.TOTAL}</p><p className="text-[10px] opacity-60 uppercase">Total</p>
            </div>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                className={`rounded-xl p-3 text-center border transition-all ${filterStatus === s ? 'ring-2 ring-gray-900 border-transparent' : 'border-gray-200'} bg-white`}>
                <p className="text-xl font-bold">{summary[s]}</p>
                <p className={`text-[10px] font-bold uppercase ${STATUS_WARNA[s].split(' ')[1]}`}>{s}</p>
              </button>
            ))}
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, WA, atau isi jawaban…" className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
            </div>
            <select value={filterLowongan} onChange={e => setFilterLowongan(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Semua lowongan</option>
              {lowongan.map(l => <option key={l.id} value={l.id}>{l.judul}</option>)}
            </select>
          </div>

          {visible.length === 0 && <p className="text-sm text-gray-400">Tidak ada pelamar yang cocok.</p>}
          <div className="space-y-2">
            {visible.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                <button onClick={() => setDetail(p)} className="flex-1 min-w-[180px] text-left">
                  <p className="text-sm font-bold">{p.nama}</p>
                  <p className="text-xs text-gray-400">{p.lowongan.posisi} · {p.whatsapp} · {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  {p.catatan?.startsWith('Auto-filter') && <p className="text-[10px] text-red-400 mt-0.5">⚡ {p.catatan}</p>}
                </button>
                <select value={p.status} onChange={e => setStatus(p, e.target.value)} className={`text-xs font-bold px-2 py-1.5 rounded-lg border-0 ${STATUS_WARNA[p.status]}`}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {p.status === 'DITERIMA' && (
                  <button onClick={() => jadikanKaryawan(p)} className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg">
                    <UserPlus className="w-3.5 h-3.5" /> Karyawan
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* TAB LOWONGAN */}
      {!loading && tab === 'lowongan' && (
        <LowonganManager lowongan={lowongan} reload={load} copied={copied} setCopied={setCopied} linkOf={linkOf} />
      )}

      {/* DETAIL PELAMAR */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold">{detail.nama}</p>
              <button onClick={() => setDetail(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-500">{detail.lowongan.judul} — {detail.lowongan.posisi}</p>
            {detail.catatan && <p className="text-xs text-red-400">⚡ {detail.catatan}</p>}
            <div className="text-sm space-y-2">
              <p><b>WA:</b> <a href={`https://wa.me/62${detail.whatsapp.replace(/^0/, '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{detail.whatsapp}</a></p>
              {detail.email && <p><b>Email:</b> {detail.email}</p>}
              {Object.entries(detail.jawaban).map(([k, v]) => (
                <p key={k}><b>{k.replace(/_/g, ' ')}:</b> {Array.isArray(v) ? v.join(', ') : String(v).startsWith('http') ? <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{String(v)}</a> : String(v)}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ================== MANAJEMEN LOWONGAN (buat + edit + rules) ==================
const emptyLowongan = { judul: '', posisi: '', deskripsi: '', fotoUrl: '', fields: [] as Field[], rules: [] as Rule[] }

function LowonganManager({ lowongan, reload, copied, setCopied, linkOf }: { lowongan: Lowongan[]; reload: () => void; copied: string; setCopied: (s: string) => void; linkOf: (s: string) => string }) {
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyLowongan })
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  function openCreate() { setEditId(null); setForm({ ...emptyLowongan }); setShowForm(true); setErr('') }
  function openEdit(l: Lowongan) {
    setEditId(l.id)
    setForm({ judul: l.judul, posisi: l.posisi, deskripsi: l.deskripsi || '', fotoUrl: l.fotoUrl || '', fields: l.fields, rules: l.rules || [] })
    setShowForm(true); setErr('')
  }
  function setF(i: number, patch: Partial<Field>) { setForm(f => ({ ...f, fields: f.fields.map((x, j) => (j === i ? { ...x, ...patch } : x)) })) }
  function moveField(i: number, dir: -1 | 1) {
    setForm(f => {
      const arr = [...f.fields]; const j = i + dir
      if (j < 0 || j >= arr.length) return f
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...f, fields: arr }
    })
  }
  function setR(i: number, patch: Partial<Rule>) { setForm(f => ({ ...f, rules: f.rules.map((x, j) => (j === i ? { ...x, ...patch } : x)) })) }

  async function upload(file: File) {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/oprec/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setErr(data.error || 'Upload gagal'); return }
    setForm(f => ({ ...f, fotoUrl: data.url }))
  }

  async function save() {
    setErr('')
    if (!form.judul.trim() || !form.posisi.trim()) { setErr('Judul & posisi wajib'); return }
    const clean = form.fields.filter(f => f.label.trim()).map((f, i) => {
      const { optionsText, ...rest } = f as any
      const opts = optionsText !== undefined ? optionsText.split(',').map((s:string) => s.trim()).filter(Boolean) : (rest.options || [])
      return { ...rest, key: f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) || `f${i}`, options: opts }
    })
    const body = { judul: form.judul.trim(), posisi: form.posisi.trim(), deskripsi: form.deskripsi.trim() || null, fotoUrl: form.fotoUrl || null, fields: clean, rules: form.rules.filter(r => r.fieldKey && r.value) }
    const res = await fetch(editId ? `/api/oprec/lowongan/${editId}` : '/api/oprec/lowongan', {
      method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { setErr((await res.json()).error || 'Gagal'); return }
    setShowForm(false); reload()
  }

  async function toggle(l: Lowongan) {
    await fetch(`/api/oprec/lowongan/${l.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !l.isActive }) })
    reload()
  }
  async function copy(l: Lowongan) {
    await navigator.clipboard.writeText(linkOf(l.slug))
    setCopied(l.id); setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="space-y-5">
      {!showForm && (
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg">
          <Plus className="w-4 h-4" /> Lowongan Baru
        </button>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">{editId ? 'Edit Lowongan' : 'Lowongan Baru'}</p>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} placeholder="Judul (mis. Oprec Crew Yours Batch 3)" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={form.posisi} onChange={e => setForm(f => ({ ...f, posisi: e.target.value }))} placeholder="Posisi (mis. Crew Studio)" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <textarea value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} rows={3} placeholder="Deskripsi & persyaratan…" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />

          {/* Gambar pemanis */}
          <div className="flex items-center gap-3">
            {form.fotoUrl && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.fotoUrl} alt="" className="w-28 h-16 object-cover rounded-lg border border-gray-200" />
                <button onClick={() => setForm(f => ({ ...f, fotoUrl: '' }))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[8px] flex items-center justify-center">✕</button>
              </div>
            )}
            <label className="flex items-center gap-1.5 border-2 border-dashed border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400 cursor-pointer hover:border-blue-400">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Gambar lowongan (banner)
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </div>

          {/* Pertanyaan */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-600">Pertanyaan Custom</p>
            {form.fields.map((f, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center bg-gray-50 rounded-lg p-2">
                <input value={f.label} onChange={e => setF(i, { label: e.target.value })} placeholder="Pertanyaan" className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                <select value={f.type} onChange={e => setF(i, { type: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                  {['teks', 'paragraf', 'angka', 'link', 'pilihan', 'checklist'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {(f.type === 'pilihan' || f.type === 'checklist') && (
                  <input value={f.optionsText ?? (f.options || []).join(', ')} onChange={e => setF(i, { optionsText: e.target.value })} placeholder="opsi1, opsi2, opsi dengan spasi" className="flex-1 min-w-[120px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                )}
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.required} onChange={e => setF(i, { required: e.target.checked })} className="w-3.5 h-3.5 accent-blue-600" /> wajib</label>
                <button onClick={() => moveField(i, -1)} disabled={i === 0} className="text-gray-400 disabled:opacity-20 hover:text-gray-700 px-0.5"><ChevronUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveField(i, 1)} disabled={i === form.fields.length - 1} className="text-gray-400 disabled:opacity-20 hover:text-gray-700 px-0.5"><ChevronDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => setForm(fm => ({ ...fm, fields: fm.fields.filter((_, j) => j !== i) }))} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, fields: [...f.fields, { key: '', label: '', type: 'teks', required: false, options: [] }] }))} className="flex items-center gap-1 text-xs font-bold text-blue-600">
              <Plus className="w-3.5 h-3.5" /> Tambah pertanyaan
            </button>
          </div>

          {/* Auto-filter rules */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-600">⚡ Auto-Filter — jawaban yang cocok otomatis DITOLAK</p>
            <p className="text-[11px] text-gray-400">Contoh: pertanyaan &quot;Usia&quot; kurang dari &quot;17&quot; → tolak. Pelamar tetap masuk daftar dengan status DITOLAK + catatan, jadi tetap bisa direview manual.</p>
            {form.rules.map((r, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center bg-red-50/50 rounded-lg p-2">
                <select value={r.fieldKey} onChange={e => setR(i, { fieldKey: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                  <option value="">— pertanyaan —</option>
                  {form.fields.filter(f => f.label.trim()).map(f => {
                    const key = f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)
                    return <option key={key} value={key}>{f.label}</option>
                  })}
                </select>
                <select value={r.operator} onChange={e => setR(i, { operator: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                  {OPERATORS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <input value={r.value} onChange={e => setR(i, { value: e.target.value })} placeholder="nilai" className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                <button onClick={() => setForm(fm => ({ ...fm, rules: fm.rules.filter((_, j) => j !== i) }))} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, rules: [...f.rules, { fieldKey: '', operator: 'sama', value: '' }] }))} className="flex items-center gap-1 text-xs font-bold text-red-500">
              <Plus className="w-3.5 h-3.5" /> Tambah aturan
            </button>
          </div>

          <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg px-5 py-2.5">
            {editId ? 'Update Lowongan' : 'Buka Lowongan'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {lowongan.map(l => (
          <div key={l.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
            {l.fotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.fotoUrl} alt="" className="w-14 h-10 object-cover rounded-lg border border-gray-100" />
            )}
            <div className="flex-1 min-w-[180px]">
              <p className="text-sm font-bold">{l.judul} {!l.isActive && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">TUTUP</span>}</p>
              <p className="text-xs text-gray-400">{l.posisi} · {l.pelamarCount} pelamar · {l.fields.length} pertanyaan{(l.rules || []).length > 0 ? ` · ⚡${l.rules.length} filter` : ''}</p>
            </div>
            <button onClick={() => openEdit(l)} className="flex items-center gap-1 border border-gray-200 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-lg hover:text-blue-600">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => copy(l)} className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              {copied === l.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Link
            </button>
            <button onClick={() => toggle(l)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${l.isActive ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-green-200 bg-green-50 text-green-600'}`}>
              {l.isActive ? 'Tutup' : 'Buka Lagi'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
