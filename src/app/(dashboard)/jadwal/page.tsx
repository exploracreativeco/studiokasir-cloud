'use client'

// ============================================================
// /jadwal — Jadwal Shift
// Default: PER JAM (mingguan, ala Excel) · alternatif: BULANAN
// Tukar/ubah per jam · history pengubah tercatat
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, History, Trash2, X, Loader2 } from 'lucide-react'
import { Branch, UserOpt, Shift, BULAN, dateKey, chipStyle, inisial } from './_components/shared'
import { WeekHourView } from './_components/WeekHourView'
import { MonthView } from './_components/MonthView'

const emptyForm = { userId: '', jamMulai: '09:00', jamSelesai: '17:00', tipe: '', catatan: '' }

export default function JadwalPage() {
  const now = new Date()
  const [view, setView] = useState<'jam' | 'bulan'>('jam')
  // anchor: untuk view jam = tanggal dalam minggu tampil; untuk bulan = bulan tampil
  const [anchor, setAnchor] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  const [jamRange, setJamRange] = useState<[number, number]>([9, 21]) // 09-10 .. 20-21
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [users, setUsers] = useState<UserOpt[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<{ tanggal: string; shift?: Shift } | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/jadwal/users').then(r => r.json()),
    ]).then(([b, u]) => {
      if (Array.isArray(b)) { setBranches(b); if (b[0]) setBranchId(prev => prev || b[0].id) }
      if (Array.isArray(u)) setUsers(u)
    }).catch(() => setError('Gagal memuat data awal'))
  }, [])

  // Minggu berjalan: Minggu..Sabtu yang memuat anchor
  const weekDates = useMemo(() => {
    const start = new Date(anchor)
    start.setDate(anchor.getDate() - anchor.getDay())
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }, [anchor])

  const tahun = anchor.getFullYear()
  const bulan = anchor.getMonth() + 1

  // Fetch: view bulan → bulan anchor; view jam → bulan-bulan yang disentuh minggu (bisa 2)
  const load = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    const months = new Set<string>()
    if (view === 'bulan') months.add(`${tahun}-${bulan}`)
    else weekDates.forEach(d => months.add(`${d.getFullYear()}-${d.getMonth() + 1}`))
    const results = await Promise.all(
      [...months].map(m => {
        const [t, b] = m.split('-')
        return fetch(`/api/jadwal?tahun=${t}&bulan=${b}&branchId=${branchId}`).then(r => r.json())
      })
    )
    const merged: Shift[] = []
    const seen = new Set<string>()
    for (const arr of results) if (Array.isArray(arr)) for (const s of arr) if (!seen.has(s.id)) { seen.add(s.id); merged.push(s) }
    setShifts(merged)
    setLoading(false)
  }, [branchId, view, tahun, bulan, weekDates])

  useEffect(() => { load() }, [load])

  function nav(delta: number) {
    setAnchor(a => view === 'jam'
      ? new Date(a.getFullYear(), a.getMonth(), a.getDate() + delta * 7)
      : new Date(a.getFullYear(), a.getMonth() + delta, 1))
  }

  function openAddAt(tanggal: string, jam?: number) {
    setModal({ tanggal })
    setForm({
      ...emptyForm,
      jamMulai: jam !== undefined ? `${String(jam).padStart(2, '0')}:00` : '09:00',
      jamSelesai: jam !== undefined ? `${String(jam + 1).padStart(2, '0')}:00` : '17:00',
    })
    setError('')
  }
  function openEdit(shift: Shift, e: React.MouseEvent) {
    e.stopPropagation()
    setModal({ tanggal: dateKey(new Date(shift.tanggal)), shift })
    setForm({ userId: shift.userId, jamMulai: shift.jamMulai, jamSelesai: shift.jamSelesai, tipe: shift.tipe || '', catatan: shift.catatan || '' })
    setError('')
  }

  async function save() {
    if (!form.userId) { setError('Pilih karyawan'); return }
    const isEdit = !!modal?.shift
    const res = await fetch(isEdit ? `/api/jadwal/${modal!.shift!.id}` : '/api/jadwal', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit
        ? { userId: form.userId, jamMulai: form.jamMulai, jamSelesai: form.jamSelesai, tipe: form.tipe || null, catatan: form.catatan || null }
        : { branchId, tanggal: modal!.tanggal, userId: form.userId, jamMulai: form.jamMulai, jamSelesai: form.jamSelesai, tipe: form.tipe || null, catatan: form.catatan || null }),
    })
    if (!res.ok) { setError((await res.json()).error || 'Gagal menyimpan'); return }
    setModal(null); load()
  }

  async function remove() {
    if (!modal?.shift || !confirm('Hapus shift ini?')) return
    await fetch(`/api/jadwal/${modal.shift.id}`, { method: 'DELETE' })
    setModal(null); load()
  }

  async function openHistory() {
    setShowHistory(true)
    const res = await fetch(`/api/jadwal/history?branchId=${branchId}`)
    const data = await res.json()
    if (Array.isArray(data)) setHistory(data)
  }

  const todayKey = dateKey(now)
  const periodLabel = view === 'jam'
    ? `${weekDates[0].getDate()} ${BULAN[weekDates[0].getMonth()].slice(0, 3)} – ${weekDates[6].getDate()} ${BULAN[weekDates[6].getMonth()].slice(0, 3)} ${weekDates[6].getFullYear()}`
    : `${BULAN[bulan - 1]} ${tahun}`

  // Legend orang yang muncul di periode tampil
  const legendUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; warna?: string | null }>()
    for (const s of shifts) map.set(s.userId, { id: s.userId, name: s.user.name, warna: s.user.warna })
    return [...map.values()]
  }, [shifts])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CalendarDays className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold">Jadwal Shift</h1>
        <div className="flex-1" />
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setView('jam')} className={`px-3 py-2 text-xs font-bold ${view === 'jam' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Per Jam</button>
          <button onClick={() => setView('bulan')} className={`px-3 py-2 text-xs font-bold ${view === 'bulan' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Bulanan</button>
        </div>
        <select value={branchId} onChange={e => setBranchId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          {branches.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
        </select>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1 py-1">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-md hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold min-w-[150px] text-center">{periodLabel}</span>
          <button onClick={() => nav(1)} className="p-1.5 rounded-md hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {view === 'jam' && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <select value={jamRange[0]} onChange={e => setJamRange([+e.target.value, jamRange[1]])} className="border border-gray-200 rounded-lg px-2 py-2 bg-white">
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
            –
            <select value={jamRange[1]} onChange={e => setJamRange([jamRange[0], +e.target.value])} className="border border-gray-200 rounded-lg px-2 py-2 bg-white">
              {Array.from({ length: 24 }, (_, h) => <option key={h + 1} value={h + 1}>{String(h + 1).padStart(2, '0')}:00</option>)}
            </select>
          </div>
        )}
        <button onClick={openHistory} className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <History className="w-4 h-4" /> Riwayat
        </button>
      </div>

      {error && !modal && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* Legend */}
      {legendUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {legendUsers.map(u => { const c = chipStyle(u.id, u.warna); return (
            <span key={u.id} className={`text-[10px] font-bold px-2 py-1 rounded ${c.className}`} style={c.style}>{inisial(u.name)} = {u.name.split(' ')[0]}</span>
          )})}
        </div>
      )}

      {/* Views */}
      {view === 'jam' ? (
        loading ? (
          <div className="bg-white border border-gray-200 rounded-xl flex items-center justify-center py-24 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <WeekHourView weekDates={weekDates} jamRange={jamRange} shifts={shifts} today={todayKey} onAddAt={openAddAt} onEditShift={openEdit} />
        )
      ) : (
        <MonthView tahun={tahun} bulan={bulan} shifts={shifts} loading={loading} todayDate={now.getFullYear() === tahun && now.getMonth() + 1 === bulan ? now.getDate() : -1} onAddAt={t => openAddAt(t)} onEditShift={openEdit} />
      )}
      <p className="text-xs text-gray-400 mt-2">Klik sel/tanggal untuk menambah · klik chip untuk mengubah/tukar/hapus · semua perubahan tercatat di Riwayat.</p>

      {/* MODAL tambah/edit */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">{modal.shift ? 'Edit / Tukar Shift' : 'Tambah Shift'} — {modal.tanggal}</p>
              <button onClick={() => setModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}
            <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white">
              <option value="">— Pilih karyawan —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500">Jam mulai</label>
                <input type="time" value={form.jamMulai} onChange={e => setForm(f => ({ ...f, jamMulai: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-gray-500">Jam selesai</label>
                <input type="time" value={form.jamSelesai} onChange={e => setForm(f => ({ ...f, jamSelesai: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.tipe} onChange={e => setForm(f => ({ ...f, tipe: e.target.value }))} placeholder="Tipe (opsional)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} placeholder="Catatan (opsional)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              {modal.shift && (
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

      {/* DRAWER riwayat */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setShowHistory(false)}>
          <div className="bg-white w-full max-w-sm h-full overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">Riwayat Perubahan</p>
              <button onClick={() => setShowHistory(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            {history.length === 0 && <p className="text-xs text-gray-400">Belum ada perubahan.</p>}
            {history.map((h: any) => (
              <div key={h.id} className="border border-gray-100 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${h.aksi === 'TUKAR' ? 'bg-amber-100 text-amber-700' : h.aksi === 'CREATE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{h.aksi}</span>
                  <span className="text-gray-400">{new Date(h.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-gray-600">
                  Shift <b>{h.shift?.user?.name}</b> ({new Date(h.shift?.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, {h.shift?.jamMulai}-{h.shift?.jamSelesai})
                </p>
                {h.aksi === 'TUKAR' && h.detail && (() => { try { const d = JSON.parse(h.detail); return <p className="text-amber-700">{d.dari} → {d.ke}</p> } catch { return null } })()}
                <p className="text-gray-400">oleh <b>{h.changedBy?.name}</b></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
