'use client'

// ============================================================
// /event — Event Explora Booth
// Kalender bulanan event · klik tanggal = tambah · klik event = detail/edit
// Crew bertugas + honor per crew · status event & pembayaran
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { PartyPopper, ChevronLeft, ChevronRight, Loader2, Trash2, X, Plus, MapPin } from 'lucide-react'

interface UserOpt { id: string; name: string; role: string }
interface Crew { userId: string; peran: string; honor: number; user?: { name: string } }
interface EventRow {
  id: string; nama: string; klienNama: string; klienWhatsapp: string | null
  jenis: string; tanggal: string; jamMulai: string | null; jamSelesai: string | null
  lokasi: string | null; nilaiKontrak: number; dpAmount: number
  statusBayar: string; status: string; peralatan: string | null; catatan: string | null
  crews: Array<{ id: string; userId: string; peran: string | null; honor: number; user: { id: string; name: string } }>
}

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
const STATUS_WARNA: Record<string, string> = {
  BOOKED: 'bg-blue-100 text-blue-700 border-blue-200',
  PERSIAPAN: 'bg-amber-100 text-amber-700 border-amber-200',
  SELESAI: 'bg-green-100 text-green-700 border-green-200',
  BATAL: 'bg-gray-100 text-gray-400 border-gray-200 line-through',
}
const fmtRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

const emptyForm = {
  nama: '', klienNama: '', klienWhatsapp: '', jenis: 'PHOTOBOOTH',
  jamMulai: '', jamSelesai: '', lokasi: '', nilaiKontrak: 0, dpAmount: 0,
  statusBayar: 'DP', status: 'BOOKED', peralatan: '', catatan: '',
  crews: [] as Crew[],
}

export default function EventPage() {
  const { data: session } = useSession()
  const myId = (session?.user as any)?.id as string | undefined
  const myRole = (session?.user as any)?.role as string | undefined
  const isAdmin = myRole === 'SUPERADMIN' || myRole === 'ADMIN'
  const now = new Date()
  const [tahun, setTahun] = useState(now.getFullYear())
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [events, setEvents] = useState<EventRow[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<{ tanggal: string; event?: EventRow } | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    fetch('/api/jadwal/users').then(r => r.json()).then(u => Array.isArray(u) && setUsers(u)).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/event?tahun=${tahun}&bulan=${bulan}`)
    const data = await res.json()
    if (Array.isArray(data)) setEvents(data)
    setLoading(false)
  }, [tahun, bulan])
  useEffect(() => { load() }, [load])

  function nav(delta: number) {
    let b = bulan + delta, t = tahun
    if (b < 1) { b = 12; t-- } else if (b > 12) { b = 1; t++ }
    setBulan(b); setTahun(t)
  }

  function openAdd(tanggal: string) { setModal({ tanggal }); setForm({ ...emptyForm }); setError('') }
  function openEdit(ev: EventRow, e: React.MouseEvent) {
    e.stopPropagation()
    setModal({ tanggal: ev.tanggal.slice(0, 10), event: ev })
    setForm({
      nama: ev.nama, klienNama: ev.klienNama, klienWhatsapp: ev.klienWhatsapp || '',
      jenis: ev.jenis, jamMulai: ev.jamMulai || '', jamSelesai: ev.jamSelesai || '',
      lokasi: ev.lokasi || '', nilaiKontrak: ev.nilaiKontrak, dpAmount: ev.dpAmount,
      statusBayar: ev.statusBayar, status: ev.status, peralatan: ev.peralatan || '', catatan: ev.catatan || '',
      crews: ev.crews.map(c => ({ userId: c.userId, peran: c.peran || '', honor: c.honor, user: c.user })),
    })
    setError('')
  }

  async function save() {
    if (!form.nama.trim() || !form.klienNama.trim()) { setError('Nama event & klien wajib diisi'); return }
    const isEdit = !!modal?.event
    const body = {
      ...form,
      tanggal: modal!.tanggal,
      nilaiKontrak: +form.nilaiKontrak || 0,
      dpAmount: +form.dpAmount || 0,
      jamMulai: form.jamMulai || null, jamSelesai: form.jamSelesai || null,
      klienWhatsapp: form.klienWhatsapp || null, lokasi: form.lokasi || null,
      peralatan: form.peralatan || null, catatan: form.catatan || null,
      crews: form.crews.filter(c => c.userId).map(c => ({ userId: c.userId, peran: c.peran || null, honor: +c.honor || 0 })),
    }
    const res = await fetch(isEdit ? `/api/event/${modal!.event!.id}` : '/api/event', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { setError((await res.json()).error || 'Gagal menyimpan'); return }
    setModal(null); load()
  }

  async function remove() {
    if (!modal?.event || !confirm('Hapus event ini?')) return
    await fetch(`/api/event/${modal.event.id}`, { method: 'DELETE' })
    setModal(null); load()
  }

  // Grid kalender
  const firstDay = new Date(tahun, bulan - 1, 1).getDay()
  const daysInMonth = new Date(tahun, bulan, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const byDate = new Map<number, EventRow[]>()
  for (const ev of events) {
    const d = new Date(ev.tanggal).getDate()
    byDate.set(d, [...(byDate.get(d) || []), ev])
  }
  const today = now.getFullYear() === tahun && now.getMonth() + 1 === bulan ? now.getDate() : -1
  const dateStr = (d: number) => `${tahun}-${String(bulan).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const totalKontrakBulan = events.filter(e => e.status !== 'BATAL').reduce((s, e) => s + e.nilaiKontrak, 0)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-full overflow-y-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <PartyPopper className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold">Event Booth</h1>
          <p className="text-xs text-gray-500">{events.filter(e => e.status !== 'BATAL').length} event · kontrak {fmtRp(totalKontrakBulan)}</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1 py-1">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-md hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold w-36 text-center">{BULAN[bulan - 1]} {tahun}</span>
          <button onClick={() => nav(1)} className="p-1.5 rounded-md hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {error && !modal && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* Kalender */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {HARI.map(h => <div key={h} className={`px-2 py-2 text-xs font-bold text-center ${h === 'Min' ? 'text-red-500' : 'text-gray-500'}`}>{h}</div>)}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((d, i) => (
              <div key={i} onClick={() => d && openAdd(dateStr(d))}
                className={`min-h-[96px] border-b border-r border-gray-100 p-1.5 ${d ? 'cursor-pointer hover:bg-blue-50/40' : 'bg-gray-50/50'} ${d === today ? 'bg-blue-50/60' : ''}`}>
                {d && (
                  <>
                    <div className={`text-xs font-bold mb-1 ${i % 7 === 0 ? 'text-red-500' : 'text-gray-500'} ${d === today ? 'text-blue-600' : ''}`}>{d}</div>
                    <div className="space-y-1">
                      {(byDate.get(d) || []).map(ev => (
                        <button key={ev.id} onClick={e => openEdit(ev, e)}
                          className={`block w-full text-left text-[10px] leading-tight font-semibold px-1.5 py-1 rounded border ${STATUS_WARNA[ev.status] || STATUS_WARNA.BOOKED} hover:opacity-75`}>
                          {ev.nama}
                          <span className="block font-normal opacity-70">{ev.jenis}{ev.jamMulai ? ` · ${ev.jamMulai}` : ''}</span>
                          {ev.crews.length > 0 && (
                            <span className="block font-normal opacity-80 mt-0.5">👥 {ev.crews.map(c => c.user.name.split(' ')[0]).join(', ')}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">Klik tanggal untuk menambah event · klik event untuk detail/edit. Kalender ini juga tampil di jadwal tim.</p>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">{modal.event ? 'Detail / Edit Event' : 'Event Baru'} — {modal.tanggal}</p>
              <button onClick={() => setModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}

            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama event (mis. Wedding Andi & Sinta)" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm sm:col-span-2" />
              <input value={form.klienNama} onChange={e => setForm(f => ({ ...f, klienNama: e.target.value }))} placeholder="Nama klien" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
              <input value={form.klienWhatsapp} onChange={e => setForm(f => ({ ...f, klienWhatsapp: e.target.value }))} placeholder="WhatsApp klien" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
              <select value={form.jenis} onChange={e => setForm(f => ({ ...f, jenis: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white">
                {['PHOTOBOOTH', 'VIDEOSPIN', 'KEDUANYA'].map(j => <option key={j} value={j}>{j}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="time" value={form.jamMulai} onChange={e => setForm(f => ({ ...f, jamMulai: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-2 py-2.5 text-sm" />
                <input type="time" value={form.jamSelesai} onChange={e => setForm(f => ({ ...f, jamSelesai: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-2 py-2.5 text-sm" />
              </div>
              <div className="relative sm:col-span-2">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input value={form.lokasi} onChange={e => setForm(f => ({ ...f, lokasi: e.target.value }))} placeholder="Lokasi / venue" className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Nilai kontrak</label>
                <input type="number" value={form.nilaiKontrak} onChange={e => setForm(f => ({ ...f, nilaiKontrak: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">DP diterima</label>
                <input type="number" value={form.dpAmount} onChange={e => setForm(f => ({ ...f, dpAmount: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <select value={form.statusBayar} onChange={e => setForm(f => ({ ...f, statusBayar: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white">
                <option value="DP">Bayar: DP</option><option value="LUNAS">Bayar: LUNAS</option>
              </select>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white">
                {['BOOKED', 'PERSIAPAN', 'SELESAI', 'BATAL'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={form.peralatan} onChange={e => setForm(f => ({ ...f, peralatan: e.target.value }))} placeholder="Peralatan (mis. booth A, ringlight ×2)" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm sm:col-span-2" />
              <textarea value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} placeholder="Catatan / format booking (boleh panjang)" rows={4} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm sm:col-span-2 resize-y leading-relaxed whitespace-pre-wrap" />
            </div>

            {/* CREW — admin bebas; crew biasa hanya bisa kelola dirinya sendiri */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-600">Crew Bertugas</p>
              {form.crews.map((c, i) => {
                const isMine = c.userId === myId
                const canEditRow = isAdmin || isMine
                return (
                  <div key={i} className="flex flex-wrap gap-2 items-center bg-gray-50 rounded-lg p-2">
                    {isAdmin ? (
                      <select value={c.userId} onChange={e => setForm(f => ({ ...f, crews: f.crews.map((x, j) => j === i ? { ...x, userId: e.target.value } : x) }))} className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                        <option value="">— pilih crew —</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    ) : (
                      <span className="flex-1 min-w-[140px] px-2 py-1.5 text-xs font-semibold">{c.user?.name || users.find(u => u.id === c.userId)?.name || (isMine ? 'Saya' : '—')}</span>
                    )}
                    <input value={c.peran} onChange={e => setForm(f => ({ ...f, crews: f.crews.map((x, j) => j === i ? { ...x, peran: e.target.value } : x) }))} placeholder="Peran" disabled={!canEditRow} className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs disabled:bg-gray-100 disabled:text-gray-400" />
                    {/* Honor hanya admin yang boleh lihat/ubah */}
                    {isAdmin
                      ? <input type="number" value={c.honor} onChange={e => setForm(f => ({ ...f, crews: f.crews.map((x, j) => j === i ? { ...x, honor: +e.target.value } : x) }))} placeholder="Honor" className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                      : <span className="w-28 px-2 py-1.5 text-xs text-gray-300">—</span>}
                    {canEditRow
                      ? <button onClick={() => setForm(f => ({ ...f, crews: f.crews.filter((_, j) => j !== i) }))} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                      : <span className="w-4" />}
                  </div>
                )
              })}
              {isAdmin ? (
                <button onClick={() => setForm(f => ({ ...f, crews: [...f.crews, { userId: '', peran: '', honor: 0 }] }))} className="flex items-center gap-1 text-xs font-bold text-blue-600">
                  <Plus className="w-3.5 h-3.5" /> Tambah crew
                </button>
              ) : (
                !form.crews.some(c => c.userId === myId) && myId && (
                  <button onClick={() => setForm(f => ({ ...f, crews: [...f.crews, { userId: myId, peran: '', honor: 0, user: { name: 'Saya' } }] }))} className="flex items-center gap-1 text-xs font-bold text-blue-600">
                    <Plus className="w-3.5 h-3.5" /> Tambahkan saya
                  </button>
                )
              )}
            </div>

            <div className="flex gap-2 pt-1">
              {modal.event && (
                <button onClick={remove} className="flex items-center gap-1 border border-red-200 bg-red-50 text-red-500 rounded-lg px-3 py-2 text-sm hover:bg-red-100">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => setModal(null)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm">Batal</button>
              <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-semibold">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
