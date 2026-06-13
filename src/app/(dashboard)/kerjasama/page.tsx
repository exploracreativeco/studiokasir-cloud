'use client'

// ============================================================
// /kerjasama — Manajemen Pengajuan Kerjasama (SUPERADMIN)
// Mirror Oprec: program (form dinamis) + pengajuan (pipeline status)
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { Handshake, Plus, Trash2, Copy, Check, Loader2, X, Search, Pencil } from 'lucide-react'

const STATUSES = ['BARU', 'REVIEW', 'NEGOSIASI', 'DITERIMA', 'DITOLAK']
const STATUS_WARNA: Record<string, string> = {
  BARU: 'bg-blue-100 text-blue-700', REVIEW: 'bg-purple-100 text-purple-700',
  NEGOSIASI: 'bg-amber-100 text-amber-700', DITERIMA: 'bg-green-100 text-green-700', DITOLAK: 'bg-gray-100 text-gray-400',
}
const FIELD_TYPES = [
  { v: 'teks', l: 'Teks singkat' }, { v: 'paragraf', l: 'Paragraf' }, { v: 'angka', l: 'Angka' },
  { v: 'link', l: 'Link/URL' }, { v: 'pilihan', l: 'Pilihan (dropdown)' }, { v: 'checklist', l: 'Checklist' },
]

interface FieldDef { key: string; label: string; type: string; required: boolean; options?: string[] }
interface Program { id: string; slug: string; judul: string; kategori: string; deskripsi: string | null; fotoUrl: string | null; fields: FieldDef[]; isActive: boolean; pengajuanCount: number }
interface Pengajuan { id: string; nama: string; perusahaan: string | null; whatsapp: string; email: string | null; jawaban: Record<string, any>; status: string; catatan: string | null; createdAt: string; program: { judul: string; kategori: string } }

export default function KerjasamaPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [pengajuan, setPengajuan] = useState<Pengajuan[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pengajuan' | 'program'>('pengajuan')
  const [error, setError] = useState('')

  // form program
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [pf, setPf] = useState<{ judul: string; kategori: string; deskripsi: string; fields: FieldDef[] }>({ judul: '', kategori: '', deskripsi: '', fields: [] })
  const [copied, setCopied] = useState('')

  // filter pengajuan
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [detail, setDetail] = useState<Pengajuan | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [p, pg] = await Promise.all([
      fetch('/api/kerjasama/program').then(r => r.json()),
      fetch('/api/kerjasama/pengajuan').then(r => r.json()),
    ])
    if (Array.isArray(p)) setPrograms(p)
    if (Array.isArray(pg)) setPengajuan(pg)
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const stat: Record<string, number> = {}
  for (const st of STATUSES) stat[st] = pengajuan.filter(p => p.status === st).length

  const filtered = pengajuan.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    if (q) {
      const hay = `${p.nama} ${p.perusahaan || ''} ${p.whatsapp} ${JSON.stringify(p.jawaban)}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  function openCreate() { setEditId(null); setPf({ judul: '', kategori: '', deskripsi: '', fields: [] }); setShowForm(true); setError('') }
  function openEdit(p: Program) { setEditId(p.id); setPf({ judul: p.judul, kategori: p.kategori, deskripsi: p.deskripsi || '', fields: p.fields }); setShowForm(true); setError('') }

  async function saveProgram() {
    setError('')
    if (pf.judul.length < 3 || pf.kategori.length < 2) { setError('Judul & kategori wajib'); return }
    const fields = pf.fields.map((f, i) => ({ ...f, key: f.key || `f${i}_${Date.now().toString(36)}` }))
    const res = await fetch(editId ? `/api/kerjasama/program/${editId}` : '/api/kerjasama/program', {
      method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pf, fields }),
    })
    if (!res.ok) { setError((await res.json()).error || 'Gagal menyimpan'); return }
    setShowForm(false); load()
  }

  async function delProgram(id: string) {
    if (!confirm('Hapus program ini? Semua pengajuannya ikut terhapus.')) return
    await fetch(`/api/kerjasama/program/${id}`, { method: 'DELETE' }); load()
  }
  async function toggleActive(p: Program) {
    await fetch(`/api/kerjasama/program/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !p.isActive }) }); load()
  }
  async function setStatus(p: Pengajuan, status: string) {
    await fetch(`/api/kerjasama/pengajuan/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setPengajuan(prev => prev.map(x => x.id === p.id ? { ...x, status } : x))
    if (detail?.id === p.id) setDetail({ ...detail, status })
  }
  async function delPengajuan(id: string) {
    if (!confirm('Hapus pengajuan ini?')) return
    await fetch(`/api/kerjasama/pengajuan/${id}`, { method: 'DELETE' }); setDetail(null); load()
  }
  function copyLink(slug: string) {
    const url = `${window.location.origin}/kerjasama/${slug}`
    navigator.clipboard.writeText(url); setCopied(slug); setTimeout(() => setCopied(''), 1500)
  }

  function addField() { setPf(f => ({ ...f, fields: [...f.fields, { key: '', label: '', type: 'teks', required: false }] })) }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 overflow-y-auto h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Handshake className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">Pengajuan Kerjasama</h1>
            <p className="text-sm text-gray-500">Kelola program & pengajuan dari mitra</p>
          </div>
        </div>
        {tab === 'program' && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
            <Plus className="w-4 h-4" /> Program Baru
          </button>
        )}
      </div>

      <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
        <button onClick={() => setTab('pengajuan')} className={`px-4 py-2 text-sm font-bold ${tab === 'pengajuan' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}>Pengajuan ({pengajuan.length})</button>
        <button onClick={() => setTab('program')} className={`px-4 py-2 text-sm font-bold ${tab === 'program' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}>Program ({programs.length})</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* ===== TAB PENGAJUAN ===== */}
      {tab === 'pengajuan' && (
        <>
          <div className="grid grid-cols-5 gap-2">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                className={`rounded-xl p-3 text-center border ${filterStatus === s ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}>
                <p className="text-xl font-bold">{stat[s]}</p>
                <p className={`text-[10px] font-bold uppercase ${STATUS_WARNA[s].split(' ')[1]}`}>{s}</p>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / perusahaan / jawaban…" className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {filtered.length === 0 ? <p className="text-center text-sm text-gray-400 py-12">Belum ada pengajuan</p> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500 text-xs">
                  <tr><th className="px-4 py-2.5">Nama</th><th className="px-4 py-2.5">Program</th><th className="px-4 py-2.5">WA</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5"></th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5"><button onClick={() => setDetail(p)} className="font-semibold hover:text-blue-600">{p.nama}</button>{p.perusahaan && <span className="block text-[11px] text-gray-400">{p.perusahaan}</span>}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.program?.judul}</td>
                      <td className="px-4 py-2.5 text-xs"><a href={`https://wa.me/62${p.whatsapp.replace(/^0/, '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600">{p.whatsapp}</a></td>
                      <td className="px-4 py-2.5">
                        <select value={p.status} onChange={e => setStatus(p, e.target.value)} className={`text-xs font-bold px-2 py-1.5 rounded-lg border-0 ${STATUS_WARNA[p.status]}`}>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-right"><button onClick={() => setDetail(p)} className="text-xs text-blue-600 font-semibold">Detail</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ===== TAB PROGRAM ===== */}
      {tab === 'program' && (
        <div className="space-y-3">
          {programs.length === 0 ? <p className="text-center text-sm text-gray-400 py-12">Belum ada program. Buat program untuk mendapat link publik.</p> : programs.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{p.judul}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${p.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{p.isActive ? 'AKTIF' : 'NONAKTIF'}</span>
                  </div>
                  <p className="text-xs text-blue-600 font-semibold">{p.kategori}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{p.pengajuanCount} pengajuan · {p.fields.length} pertanyaan kustom</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => copyLink(p.slug)} className="text-xs flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
                    {copied === p.slug ? <><Check className="w-3.5 h-3.5 text-green-600" /> Tersalin</> : <><Copy className="w-3.5 h-3.5" /> Link</>}
                  </button>
                  <button onClick={() => openEdit(p)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleActive(p)} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">{p.isActive ? 'Tutup' : 'Buka'}</button>
                  <button onClick={() => delProgram(p.id)} className="text-xs border border-red-100 bg-red-50 text-red-500 rounded-lg px-2.5 py-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== FORM PROGRAM (modal) ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[88vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold">{editId ? 'Edit Program Kerjasama' : 'Program Kerjasama Baru'}</p>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <input value={pf.judul} onChange={e => setPf(f => ({ ...f, judul: e.target.value }))} placeholder="Judul (mis. Sponsorship Event 2026)" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={pf.kategori} onChange={e => setPf(f => ({ ...f, kategori: e.target.value }))} placeholder="Kategori (mis. Sponsorship / Vendor / Kolaborasi)" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            <textarea value={pf.deskripsi} onChange={e => setPf(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Deskripsi / ketentuan (opsional)" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />

            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-600">Pertanyaan Kustom</p>
              {pf.fields.map((fld, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2.5 space-y-2">
                  <div className="flex gap-2">
                    <input value={fld.label} onChange={e => setPf(f => ({ ...f, fields: f.fields.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))} placeholder="Pertanyaan" className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                    <select value={fld.type} onChange={e => setPf(f => ({ ...f, fields: f.fields.map((x, j) => j === i ? { ...x, type: e.target.value } : x) }))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                      {FIELD_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={fld.required} onChange={e => setPf(f => ({ ...f, fields: f.fields.map((x, j) => j === i ? { ...x, required: e.target.checked } : x) }))} className="w-3.5 h-3.5 accent-blue-600" /> wajib</label>
                    <button onClick={() => setPf(f => ({ ...f, fields: f.fields.filter((_, j) => j !== i) }))} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {(fld.type === 'pilihan' || fld.type === 'checklist') && (
                    <input value={(fld.options || []).join(', ')} onChange={e => setPf(f => ({ ...f, fields: f.fields.map((x, j) => j === i ? { ...x, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : x) }))} placeholder="Opsi pisah koma: A, B, C" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                  )}
                </div>
              ))}
              <button onClick={addField} className="flex items-center gap-1 text-xs font-bold text-blue-600"><Plus className="w-3.5 h-3.5" /> Tambah pertanyaan</button>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm">Batal</button>
              <button onClick={saveProgram} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-semibold">{editId ? 'Update' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL PENGAJUAN (modal) ===== */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-lg max-h-[88vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{detail.nama}</p>
                {detail.perusahaan && <p className="text-sm text-gray-500">{detail.perusahaan}</p>}
              </div>
              <button onClick={() => setDetail(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="flex gap-2 text-xs">
              <a href={`https://wa.me/62${detail.whatsapp.replace(/^0/, '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-50 text-green-600 px-2.5 py-1 rounded font-semibold">💬 {detail.whatsapp}</a>
              {detail.email && <span className="bg-gray-100 px-2.5 py-1 rounded">{detail.email}</span>}
            </div>
            <p className="text-xs text-gray-400">Program: {detail.program?.judul}</p>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              {Object.entries(detail.jawaban).length === 0 ? <p className="text-xs text-gray-400">Tidak ada jawaban tambahan</p> :
                Object.entries(detail.jawaban).map(([k, v]) => (
                  <div key={k} className="text-sm">
                    <p className="text-[11px] text-gray-400">{k}</p>
                    <p>{Array.isArray(v) ? v.join(', ') : String(v)}</p>
                  </div>
                ))}
            </div>
            <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500">Status:</span>
              <select value={detail.status} onChange={e => setStatus(detail, e.target.value)} className={`text-xs font-bold px-2 py-1.5 rounded-lg border-0 ${STATUS_WARNA[detail.status]}`}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => delPengajuan(detail.id)} className="ml-auto text-xs text-red-500 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
