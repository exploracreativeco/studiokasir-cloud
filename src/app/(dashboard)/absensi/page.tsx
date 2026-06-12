'use client'

// ============================================================
// /absensi — Isi absen (form dinamis dari template) · Riwayat ·
// Builder template (SUPERADMIN). Foto bukti → Supabase Storage.
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ClipboardCheck, Camera, Loader2, Check, X, Plus, Trash2 } from 'lucide-react'

interface Field { key: string; label: string; type: 'teks' | 'angka' | 'link' | 'pilihan' | 'checklist' | 'jam'; required: boolean; options?: string[] }
interface Template { id: string; nama: string; deskripsi: string | null; branchId: string | null; fields: Field[]; wajibFoto: boolean; perluApproval: boolean; jadwal: string; isActive: boolean; bonusMode?: string; bonusNominal?: number }
interface Entry { id: string; template: { nama: string }; user: { id: string; name: string }; waktuKejadian: string; submittedAt: string; isMenyusul: boolean; status: string; values: any; fotoUrls: string[]; catatan: string | null }

const nowLocal = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function AbsensiPage() {
  const { data: session } = useSession()
  const isSuper = (session?.user as any)?.role === 'SUPERADMIN'
  const isAdminish = ['SUPERADMIN', 'ADMIN'].includes((session?.user as any)?.role)
  const [tab, setTab] = useState<'isi' | 'riwayat' | 'template'>('isi')
  const [templates, setTemplates] = useState<Template[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [scope, setScope] = useState<'me' | 'all'>('me')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadTemplates = useCallback(async () => {
    const t = await fetch('/api/absensi/templates').then(r => r.json())
    if (Array.isArray(t)) setTemplates(t)
    setLoading(false)
  }, [])
  const loadEntries = useCallback(async () => {
    const e = await fetch(`/api/absensi?scope=${scope === 'all' ? 'all' : 'me'}`).then(r => r.json())
    if (Array.isArray(e)) setEntries(e)
  }, [scope])

  useEffect(() => { loadTemplates() }, [loadTemplates])
  useEffect(() => { if (tab === 'riwayat') loadEntries() }, [tab, loadEntries])

  async function setStatus(id: string, status: 'DITERIMA' | 'DITOLAK') {
    await fetch(`/api/absensi/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    loadEntries()
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-5">
        <ClipboardCheck className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold">Absensi</h1>
        <div className="flex-1" />
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {([['isi', 'Isi Absen'], ['riwayat', 'Riwayat'], ...(isSuper ? [['template', 'Template']] : [])] as [string, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)} className={`px-3 py-2 text-xs font-bold ${tab === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>
      </div>

      {msg && <div className={`mb-4 text-sm rounded-lg px-4 py-3 border ${msg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>{msg.text}</div>}
      {loading && <div className="flex justify-center py-20 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}

      {/* TAB ISI */}
      {!loading && tab === 'isi' && (
        templates.length === 0
          ? <p className="text-sm text-gray-400">Belum ada template absen. {isSuper && 'Buat dulu di tab Template.'}</p>
          : <div className="grid md:grid-cols-2 gap-4">{templates.map(t => <AbsenForm key={t.id} template={t} onDone={m => { setMsg(m); window.scrollTo(0, 0) }} />)}</div>
      )}

      {/* TAB RIWAYAT */}
      {tab === 'riwayat' && (
        <div className="space-y-3">
          {isAdminish && (
            <div className="flex gap-2">
              <button onClick={() => setScope('me')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${scope === 'me' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>Milik Saya</button>
              <button onClick={() => setScope('all')} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${scope === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}>Semua Karyawan</button>
            </div>
          )}
          {entries.length === 0 && <p className="text-sm text-gray-400">Belum ada absen bulan ini.</p>}
          {entries.map(e => (
            <div key={e.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-start">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{e.template.nama}</span>
                  {scope === 'all' && <span className="text-xs text-gray-500">— {e.user.name}</span>}
                  {e.isMenyusul && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">MENYUSUL</span>}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${e.status === 'DITERIMA' ? 'bg-green-100 text-green-700' : e.status === 'DITOLAK' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{e.status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Kejadian: {new Date(e.waktuKejadian).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' · '}Disubmit: {new Date(e.submittedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
                {Object.entries(e.values || {}).length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">{Object.entries(e.values).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')}</p>
                )}
                {e.catatan && <p className="text-xs text-gray-400 mt-0.5">{e.catatan}</p>}
              </div>
              <div className="flex gap-1.5">
                {e.fotoUrls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="bukti" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                  </a>
                ))}
              </div>
              {isAdminish && e.status === 'MENUNGGU_APPROVAL' && (
                <div className="flex gap-1.5">
                  <button onClick={() => setStatus(e.id, 'DITERIMA')} className="p-2 bg-green-600 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setStatus(e.id, 'DITOLAK')} className="p-2 bg-red-500 text-white rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB TEMPLATE (builder ada di komponen terpisah) */}
      {tab === 'template' && isSuper && <TemplateManager templates={templates} reload={loadTemplates} />}
    </div>
  )
}

// ---------- Form isi absen (dinamis dari template) ----------
function AbsenForm({ template, onDone }: { template: Template; onDone: (m: { type: 'ok' | 'err'; text: string }) => void }) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [fotoUrls, setFotoUrls] = useState<string[]>([])
  const [waktu, setWaktu] = useState(nowLocal())
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function upload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/absensi/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { onDone({ type: 'err', text: data.error || 'Upload gagal' }); return }
    setFotoUrls(u => [...u, data.url])
  }

  async function submit() {
    setSubmitting(true)
    const res = await fetch('/api/absensi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: template.id, branchId: template.branchId, waktuKejadian: waktu, values, fotoUrls }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { onDone({ type: 'err', text: data.error || 'Gagal submit' }); return }
    onDone({ type: 'ok', text: `Absen "${template.nama}" tersimpan${data.isMenyusul ? ' (tertanda MENYUSUL)' : ''}${data.status === 'MENUNGGU_APPROVAL' ? ' — menunggu approval' : ''}` })
    setValues({}); setFotoUrls([]); setWaktu(nowLocal())
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <div>
        <p className="font-bold text-sm">{template.nama}</p>
        {template.deskripsi && <p className="text-xs text-gray-500">{template.deskripsi}</p>}
      </div>
      <div>
        <label className="text-xs text-gray-500">Waktu kejadian (ubah jika absen menyusul)</label>
        <input type="datetime-local" value={waktu} onChange={e => setWaktu(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      {template.fields.map(f => (
        <div key={f.key}>
          <label className="text-xs text-gray-500">{f.label}{f.required && ' *'}</label>
          {f.type === 'checklist' ? (
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {(f.options || []).map(o => (
                <label key={o} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={(values[f.key] || []).includes(o)}
                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.checked ? [...(v[f.key] || []), o] : (v[f.key] || []).filter((x: string) => x !== o) }))}
                    className="w-4 h-4 accent-blue-600" />
                  {o}
                </label>
              ))}
            </div>
          ) : f.type === 'pilihan' ? (
            <select value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">— pilih —</option>
              {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === 'jam' ? (
            <input type="time" value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          ) : (
            <input type={f.type === 'angka' ? 'number' : f.type === 'link' ? 'url' : 'text'}
              value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.type === 'link' ? 'https://…' : ''}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          )}
        </div>
      ))}
      <div>
        <label className="text-xs text-gray-500">Foto bukti {template.wajibFoto && '*'}</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {fotoUrls.map((u, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
              <button onClick={() => setFotoUrls(arr => arr.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <label className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 text-gray-400">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        </div>
      </div>
      <button onClick={submit} disabled={submitting || uploading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold rounded-lg py-2.5">
        {submitting ? 'Menyimpan…' : 'Submit Absen'}
      </button>
    </div>
  )
}

// ---------- Builder template (SUPERADMIN) ----------
function TemplateManager({ templates, reload }: { templates: Template[]; reload: () => void }) {
  const [nama, setNama] = useState('')
  const [wajibFoto, setWajibFoto] = useState(true)
  const [perluApproval, setPerluApproval] = useState(false)
  const [fields, setFields] = useState<Field[]>([])
  const [bonusMode, setBonusMode] = useState<'NONE' | 'PER_ENTRI' | 'PER_JAM'>('NONE')
  const [bonusNominal, setBonusNominal] = useState(0)
  const [mulaiKey, setMulaiKey] = useState('')
  const [selesaiKey, setSelesaiKey] = useState('')
  const [err, setErr] = useState('')

  function addField() { setFields(f => [...f, { key: `f${f.length + 1}`, label: '', type: 'teks', required: false, options: [] }]) }
  function setF(i: number, patch: Partial<Field>) { setFields(fs => fs.map((f, j) => (j === i ? { ...f, ...patch } : f))) }

  async function create() {
    setErr('')
    if (!nama.trim()) { setErr('Nama template wajib'); return }
    const clean = fields.filter(f => f.label.trim()).map((f, i) => ({ ...f, key: f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) || `f${i}` }))
    if (bonusMode === 'PER_JAM' && (!mulaiKey || !selesaiKey)) { setErr('Pilih pertanyaan jam berangkat & pulang untuk bonus per jam'); return }
    const res = await fetch('/api/absensi/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: nama.trim(), wajibFoto, perluApproval, fields: clean,
        bonusMode, bonusNominal: +bonusNominal || 0,
        bonusConfig: bonusMode === 'PER_JAM' ? { mulaiKey, selesaiKey } : null,
      }),
    })
    if (!res.ok) { setErr((await res.json()).error || 'Gagal'); return }
    setNama(''); setFields([]); setBonusMode('NONE'); setBonusNominal(0); setMulaiKey(''); setSelesaiKey(''); reload()
  }

  async function remove(t: Template) {
    if (!confirm(`Hapus/nonaktifkan template "${t.nama}"?`)) return
    await fetch(`/api/absensi/templates/${t.id}`, { method: 'DELETE' })
    reload()
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <p className="font-bold text-sm">Template Baru</p>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama (mis. Kebersihan, Story IG, Photobooth)" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        <div className="flex gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={wajibFoto} onChange={e => setWajibFoto(e.target.checked)} className="w-4 h-4 accent-blue-600" /> Wajib foto</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={perluApproval} onChange={e => setPerluApproval(e.target.checked)} className="w-4 h-4 accent-blue-600" /> Absen menyusul perlu approval</label>
        </div>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center bg-gray-50 rounded-lg p-2">
              <input value={f.label} onChange={e => setF(i, { label: e.target.value })} placeholder="Label isian" className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
              <select value={f.type} onChange={e => setF(i, { type: e.target.value as any })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                {['teks', 'angka', 'link', 'pilihan', 'checklist', 'jam'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {(f.type === 'pilihan' || f.type === 'checklist') && (
                <input value={(f.options || []).join(', ')} onChange={e => setF(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="opsi1, opsi2, …" className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
              )}
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.required} onChange={e => setF(i, { required: e.target.checked })} className="w-3.5 h-3.5 accent-blue-600" /> wajib</label>
              <button onClick={() => setFields(fs => fs.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={addField} className="flex items-center gap-1 text-xs font-bold text-blue-600"><Plus className="w-3.5 h-3.5" /> Tambah isian</button>
        </div>
        {/* 💰 Bonus gaji dari absen ini */}
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-bold text-gray-600">💰 Bonus Gaji (opsional — ditarik otomatis ke slip gaji)</p>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={bonusMode} onChange={e => setBonusMode(e.target.value as any)} className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white">
              <option value="NONE">Tanpa bonus</option>
              <option value="PER_ENTRI">Per entri (mis. kebersihan, story)</option>
              <option value="PER_JAM">Per jam (mis. photobooth)</option>
            </select>
            {bonusMode !== 'NONE' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Rp</span>
                <input type="number" value={bonusNominal} onChange={e => setBonusNominal(+e.target.value)} className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                <span className="text-xs text-gray-400">{bonusMode === 'PER_ENTRI' ? '/ entri' : '/ jam'}</span>
              </div>
            )}
          </div>
          {bonusMode === 'PER_JAM' && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400">Hitung dari:</span>
              {[['Jam berangkat', mulaiKey, setMulaiKey], ['Jam pulang', selesaiKey, setSelesaiKey]].map(([lbl, val, setter]: any) => (
                <select key={lbl} value={val} onChange={e => setter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                  <option value="">— {lbl} —</option>
                  {fields.filter(f => f.type === 'jam' && f.label.trim()).map(f => {
                    const key = f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)
                    return <option key={key} value={key}>{f.label}</option>
                  })}
                </select>
              ))}
              <span className="text-[10px] text-gray-400">(buat 2 pertanyaan bertipe &quot;jam&quot; dulu)</span>
            </div>
          )}
        </div>
        <button onClick={create} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg px-5 py-2.5">Simpan Template</button>
      </div>

      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold">{t.nama}</p>
              <p className="text-xs text-gray-500">
                {t.fields.length} isian · {t.wajibFoto ? 'wajib foto' : 'foto opsional'} · {t.perluApproval ? 'approval menyusul' : 'tanpa approval'}{t.bonusMode && t.bonusMode !== 'NONE' ? ` · 💰 ${(t.bonusNominal || 0).toLocaleString('id-ID')}${t.bonusMode === 'PER_JAM' ? '/jam' : '/entri'}` : ''}
              </p>
            </div>
            <button onClick={() => remove(t)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
