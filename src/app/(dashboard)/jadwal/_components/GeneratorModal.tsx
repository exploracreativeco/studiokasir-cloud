'use client'

// ============================================================
// GeneratorModal — 🪄 setup template + generate jadwal sebulan
// POLA  (Explora): anggota + peran + libur tetap; fotografer rotasi harian
// ROTASI (Yours) : fulltime (libur tetap, rotasi mingguan) + parttime fair
// ============================================================
import { useEffect, useState } from 'react'
import { X, Loader2, Wand2 } from 'lucide-react'
import { UserOpt, BULAN } from './shared'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export default function GeneratorModal({ branchId, branchNama, users, bulan, tahun, onClose, onApplied }: {
  branchId: string; branchNama: string; users: UserOpt[]; bulan: number; tahun: number
  onClose: () => void; onApplied: () => void
}) {
  const [tipe, setTipe] = useState<'POLA' | 'ROTASI'>('POLA')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState<any>(null)

  // POLA state
  const [shifts, setShifts] = useState({ pagi: { m: '09:00', s: '17:00' }, siang: { m: '12:00', s: '20:00' } })
  const [anggota, setAnggota] = useState<Array<{ userId: string; peran: 'admin' | 'fotografer'; defaultShift: 'pagi' | 'siang'; libur: number }>>([])

  // ROTASI state
  const [jamFull, setJamFull] = useState({ pagi: { m: '09:00', s: '17:00' }, sore: { m: '13:00', s: '21:00' } })
  const [jamPart, setJamPart] = useState({ pagi: { m: '09:00', s: '13:00' }, sore: { m: '17:00', s: '21:00' } })
  const [fulltime, setFulltime] = useState<Array<{ userId: string; libur: number }>>([])
  const [parttime, setParttime] = useState<string[]>([])

  useEffect(() => {
    fetch(`/api/jadwal/template?branchId=${branchId}`).then(r => r.json()).then(t => {
      if (t?.tipe) {
        setTipe(t.tipe)
        const c = t.config || {}
        if (t.tipe === 'POLA') {
          if (c.shifts) setShifts(c.shifts)
          if (c.anggota) setAnggota(c.anggota)
        } else {
          if (c.jamFull) setJamFull(c.jamFull)
          if (c.jamPart) setJamPart(c.jamPart)
          if (c.fulltime) setFulltime(c.fulltime)
          if (c.parttime) setParttime(c.parttime)
        }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [branchId])

  const config = tipe === 'POLA' ? { shifts, anggota } : { jamFull, jamPart, fulltime, parttime }

  async function simpanTemplate(): Promise<boolean> {
    setErr('')
    const res = await fetch('/api/jadwal/template', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, tipe, config }),
    })
    if (!res.ok) { setErr((await res.json()).error || 'Gagal simpan template'); return false }
    return true
  }

  async function generate(terapkan: boolean) {
    setBusy(true); setErr('')
    if (!(await simpanTemplate())) { setBusy(false); return }
    const res = await fetch('/api/jadwal/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, bulan, tahun, terapkan }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { setErr(data.error || 'Gagal generate'); return }
    if (terapkan) { onApplied(); onClose() }
    else setPreview(data)
  }

  const JamInput = ({ v, set }: { v: { m: string; s: string }; set: (x: any) => void }) => (
    <span className="inline-flex items-center gap-1">
      <input type="time" value={v.m} onChange={e => set({ ...v, m: e.target.value })} className="border border-gray-200 rounded-lg px-1.5 py-1 text-xs" />
      –
      <input type="time" value={v.s} onChange={e => set({ ...v, s: e.target.value })} className="border border-gray-200 rounded-lg px-1.5 py-1 text-xs" />
    </span>
  )
  const UserSelect = ({ v, set, exclude }: { v: string; set: (x: string) => void; exclude?: string[] }) => (
    <select value={v} onChange={e => set(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
      <option value="">— pilih —</option>
      {users.filter(u => !exclude?.includes(u.id) || u.id === v).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  )
  const HariSelect = ({ v, set }: { v: number; set: (x: number) => void }) => (
    <select value={v} onChange={e => set(+e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
      {HARI.map((h, i) => <option key={i} value={i}>libur {h}</option>)}
    </select>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[88vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-bold flex items-center gap-2"><Wand2 className="w-4 h-4 text-purple-600" /> Generate Jadwal — {branchNama} · {BULAN[bulan - 1]} {tahun}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        {loading ? <div className="flex justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div> : <>

        {/* Pilih tipe */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
          <button onClick={() => { setTipe('POLA'); setPreview(null) }} className={`px-3 py-2 text-xs font-bold ${tipe === 'POLA' ? 'bg-purple-600 text-white' : 'bg-white text-gray-500'}`}>Pola Tetap (Explora)</button>
          <button onClick={() => { setTipe('ROTASI'); setPreview(null) }} className={`px-3 py-2 text-xs font-bold ${tipe === 'ROTASI' ? 'bg-purple-600 text-white' : 'bg-white text-gray-500'}`}>Fulltime + Parttime (Yours)</button>
        </div>

        {tipe === 'POLA' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs items-center">
              <span className="font-bold text-gray-600">Shift Pagi:</span> <JamInput v={shifts.pagi} set={(x) => setShifts(s => ({ ...s, pagi: x }))} />
              <span className="font-bold text-gray-600">Shift Siang:</span> <JamInput v={shifts.siang} set={(x) => setShifts(s => ({ ...s, siang: x }))} />
            </div>
            <p className="text-[11px] text-gray-400">Admin: pakai shift default-nya tiap hari kerja. Fotografer: <b>rotasi harian otomatis</b> pagi↔siang. Libur = hari tetap per orang.</p>
            {anggota.map((a, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center bg-gray-50 rounded-lg p-2">
                <UserSelect v={a.userId} set={v => setAnggota(arr => arr.map((x, j) => j === i ? { ...x, userId: v } : x))} exclude={anggota.map(x => x.userId)} />
                <select value={a.peran} onChange={e => setAnggota(arr => arr.map((x, j) => j === i ? { ...x, peran: e.target.value as any } : x))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                  <option value="admin">admin</option><option value="fotografer">fotografer</option>
                </select>
                {a.peran === 'admin' && (
                  <select value={a.defaultShift} onChange={e => setAnggota(arr => arr.map((x, j) => j === i ? { ...x, defaultShift: e.target.value as any } : x))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                    <option value="pagi">default pagi</option><option value="siang">default siang</option>
                  </select>
                )}
                <HariSelect v={a.libur} set={v => setAnggota(arr => arr.map((x, j) => j === i ? { ...x, libur: v } : x))} />
                <button onClick={() => setAnggota(arr => arr.filter((_, j) => j !== i))} className="text-red-400 text-xs font-bold ml-auto">hapus</button>
              </div>
            ))}
            <button onClick={() => setAnggota(a => [...a, { userId: '', peran: 'fotografer', defaultShift: 'pagi', libur: 4 }])} className="text-xs font-bold text-purple-600">+ Tambah anggota</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs items-center">
              <span className="font-bold text-gray-600">8 jam — Pagi:</span> <JamInput v={jamFull.pagi} set={(x) => setJamFull(s => ({ ...s, pagi: x }))} />
              <span className="font-bold text-gray-600">Sore:</span> <JamInput v={jamFull.sore} set={(x) => setJamFull(s => ({ ...s, sore: x }))} />
            </div>
            <div className="flex flex-wrap gap-4 text-xs items-center">
              <span className="font-bold text-gray-600">4 jam — Pagi:</span> <JamInput v={jamPart.pagi} set={(x) => setJamPart(s => ({ ...s, pagi: x }))} />
              <span className="font-bold text-gray-600">Sore:</span> <JamInput v={jamPart.sore} set={(x) => setJamPart(s => ({ ...s, sore: x }))} />
            </div>
            <p className="text-[11px] text-gray-400">Fulltime <b>rotasi mingguan</b> pagi↔sore, libur hari tetap. Saat FT libur, 1 parttime naik 8 jam (digilir). Parttime diseimbangkan: total jam, porsi pagi/sore, giliran 8 jam.</p>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-1.5">Crew Fulltime</p>
              {fulltime.map((f, i) => (
                <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-lg p-2 mb-1.5">
                  <UserSelect v={f.userId} set={v => setFulltime(arr => arr.map((x, j) => j === i ? { ...x, userId: v } : x))} exclude={[...fulltime.map(x => x.userId), ...parttime]} />
                  <HariSelect v={f.libur} set={v => setFulltime(arr => arr.map((x, j) => j === i ? { ...x, libur: v } : x))} />
                  <button onClick={() => setFulltime(arr => arr.filter((_, j) => j !== i))} className="text-red-400 text-xs font-bold ml-auto">hapus</button>
                </div>
              ))}
              <button onClick={() => setFulltime(a => [...a, { userId: '', libur: 1 }])} className="text-xs font-bold text-purple-600">+ Fulltime</button>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-1.5">Crew Parttime</p>
              {parttime.map((p, i) => (
                <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-lg p-2 mb-1.5">
                  <UserSelect v={p} set={v => setParttime(arr => arr.map((x, j) => j === i ? v : x))} exclude={[...parttime, ...fulltime.map(x => x.userId)]} />
                  <button onClick={() => setParttime(arr => arr.filter((_, j) => j !== i))} className="text-red-400 text-xs font-bold ml-auto">hapus</button>
                </div>
              ))}
              <button onClick={() => setParttime(a => [...a, ''])} className="text-xs font-bold text-purple-600">+ Parttime</button>
            </div>
          </div>
        )}

        {/* PREVIEW */}
        {preview && (
          <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-purple-700">Preview: {preview.total} shift akan dibuat</p>
            <table className="w-full text-xs">
              <thead><tr className="text-gray-400 text-left">
                <th className="py-1">Nama</th><th>Shift</th><th>Jam</th><th>Pagi 4j</th><th>Sore 4j</th><th>Ganti 8j</th>
              </tr></thead>
              <tbody>
                {preview.ringkasan.map((r: any) => (
                  <tr key={r.userId} className="border-t border-purple-100">
                    <td className="py-1 font-semibold">{r.nama}</td><td>{r.shift}</td><td className="font-bold">{r.jam}</td>
                    <td>{r.pagi4 || '—'}</td><td>{r.sore4 || '—'}</td><td>{r.ganti8 || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-amber-600">⚠️ Terapkan akan MENGGANTI seluruh jadwal {branchNama} bulan {BULAN[bulan - 1]} (termasuk yang manual). Sesudahnya tetap bisa diedit per hari.</p>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={() => generate(false)} disabled={busy}
            className="border border-purple-300 text-purple-700 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {busy ? 'Memproses…' : '👁 Preview'}
          </button>
          <button onClick={() => generate(true)} disabled={busy || !preview}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-5 py-2 text-sm font-bold disabled:opacity-40">
            ✓ Terapkan ke {BULAN[bulan - 1]}
          </button>
        </div>
        </>}
      </div>
    </div>
  )
}
