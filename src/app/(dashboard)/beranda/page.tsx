'use client'

// ============================================================
// /beranda — Dashboard Team (bukan kasir)
// Profil · jadwal minggu ini · jadwal foto hari ini (placeholder
// menunggu endpoint booking) · event bulan ini · statistik absen
// ============================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, CalendarDays, ClipboardCheck, PartyPopper, ArrowRight, Camera, MapPin } from 'lucide-react'

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const inisial = (nama: string) => {
  const p = (nama || '').trim().split(/\s+/)
  return (p.length > 1 ? p[0][0] + p[1][0] : (nama || 'U').slice(0, 2)).toUpperCase()
}

export default function BerandaPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/beranda').then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
  if (!data?.profile) return <div className="p-6 text-sm text-gray-400">Gagal memuat data.</div>

  const { profile, shifts, events, absenStats } = data
  const now = new Date()
  const weekStart = new Date(data.weekStart)
  const weekDates = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i))
  const shiftsByDay = (d: Date) => (shifts || []).filter((s: any) => new Date(s.tanggal).toDateString() === d.toDateString())

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto h-full overflow-y-auto space-y-5 pb-16">
      {/* PROFIL */}
      <div className="bg-gray-900 text-white rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ backgroundColor: profile.warna || '#3b82f6' }}>
          {inisial(profile.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold truncate">{profile.name}</p>
          <p className="text-xs opacity-60">{profile.roleLabel}{profile.branch?.nama ? ` · ${profile.branch.nama}` : ' · Semua Studio'}</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Link href="/absensi" className="flex items-center gap-1.5 bg-white text-gray-900 text-xs font-bold px-3 py-2 rounded-lg">
            <ClipboardCheck className="w-3.5 h-3.5" /> Isi Absen
          </Link>
          <Link href="/jadwal" className="flex items-center gap-1.5 bg-white/15 text-white text-xs font-bold px-3 py-2 rounded-lg">
            <CalendarDays className="w-3.5 h-3.5" /> Jadwal
          </Link>
        </div>
      </div>

      {/* Aksi cepat mobile */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <Link href="/absensi" className="flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl"><ClipboardCheck className="w-3.5 h-3.5" /> Isi Absen</Link>
        <Link href="/jadwal" className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl"><CalendarDays className="w-3.5 h-3.5" /> Jadwal</Link>
      </div>

      {/* JADWAL MINGGU INI */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-blue-600" /> Jadwal Saya Minggu Ini</p>
          <Link href="/jadwal" className="text-xs font-bold text-blue-600 flex items-center gap-1">Buka & tukar shift <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDates.map((d, i) => {
            const list = shiftsByDay(d)
            const isToday = d.toDateString() === now.toDateString()
            return (
              <div key={i} className={`rounded-xl border p-2 text-center min-h-[76px] ${isToday ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100'}`}>
                <p className={`text-[10px] font-bold ${i === 0 ? 'text-red-400' : 'text-gray-400'}`}>{HARI[i]}</p>
                <p className={`text-sm font-bold ${isToday ? 'text-blue-600' : ''}`}>{d.getDate()}</p>
                {list.length === 0
                  ? <p className="text-[9px] text-gray-300 mt-1">libur</p>
                  : list.map((s: any) => (
                    <p key={s.id} className="text-[9px] font-semibold text-gray-600 mt-0.5 leading-tight">
                      {s.jamMulai}-{s.jamSelesai}
                    </p>
                  ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* JADWAL FOTO HARI INI — placeholder integrasi booking */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="font-bold text-sm flex items-center gap-2 mb-3"><Camera className="w-4 h-4 text-blue-600" /> Jadwal Foto Hari Ini</p>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400">Menunggu koneksi sistem booking online</p>
            <p className="text-[10px] text-gray-300 mt-1">(explorastudio.id & yoursselfstudio.id — endpoint dalam penyiapan)</p>
          </div>
        </div>

        {/* STATISTIK ABSEN BULAN INI */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="font-bold text-sm flex items-center gap-2 mb-3"><ClipboardCheck className="w-4 h-4 text-blue-600" /> Absen Bulan Ini</p>
          {(absenStats || []).length === 0
            ? <p className="text-xs text-gray-400">Belum ada absen bulan ini.</p>
            : <div className="grid grid-cols-2 gap-2">
                {absenStats.map((a: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">{a.jumlah}</p>
                    <p className="text-[10px] text-gray-500 font-semibold truncate">{a.nama}</p>
                  </div>
                ))}
              </div>}
        </div>
      </div>

      {/* EVENT BULAN INI */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="font-bold text-sm flex items-center gap-2 mb-3"><PartyPopper className="w-4 h-4 text-blue-600" /> Event Saya Bulan Ini</p>
        {(events || []).length === 0
          ? <p className="text-xs text-gray-400">Tidak ada event yang melibatkanmu bulan ini.</p>
          : <div className="space-y-2">
              {events.map((c: any, i: number) => (
                <div key={i} className="flex flex-wrap items-center gap-3 border border-gray-100 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-bold">{c.event.nama}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      {new Date(c.event.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {c.event.jamMulai && ` · ${c.event.jamMulai}`}
                      {c.event.lokasi && <><MapPin className="w-3 h-3 ml-1" /> {c.event.lokasi}</>}
                    </p>
                  </div>
                  {c.peran && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded">{c.peran}</span>}
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${c.event.status === 'SELESAI' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{c.event.status}</span>
                </div>
              ))}
            </div>}
      </div>
    </div>
  )
}
