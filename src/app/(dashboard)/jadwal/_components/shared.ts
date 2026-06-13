// Tipe & helper bersama untuk view jadwal
export interface Branch { id: string; slug: string; nama: string }
export interface UserOpt { id: string; name: string; nickname?: string | null; role: string; branchId: string | null }
export interface Shift {
  id: string; branchId: string; userId: string; tanggal: string
  jamMulai: string; jamSelesai: string; tipe: string | null; catatan: string | null
  user: { id: string; name: string; nickname?: string | null; role: string; warna?: string | null }
}

export const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
export const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
export const HARI_FULL = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

// Palet solid ala Excel-mu (kuning/hijau/magenta/cyan/merah dst)
export const PALETTE = [
  'bg-yellow-300 text-yellow-900',
  'bg-green-400 text-green-950',
  'bg-fuchsia-400 text-fuchsia-950',
  'bg-cyan-300 text-cyan-950',
  'bg-red-400 text-red-950',
  'bg-lime-300 text-lime-950',
  'bg-orange-300 text-orange-950',
  'bg-violet-300 text-violet-950',
]
export const colorOf = (id: string) =>
  PALETTE[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]

/** Style chip: warna custom user (hex) kalau ada, fallback palet otomatis */
export const chipStyle = (userId: string, warna?: string | null): { className: string; style?: React.CSSProperties } => {
  if (warna && /^#[0-9a-fA-F]{6}$/.test(warna)) {
    const r = parseInt(warna.slice(1, 3), 16), g = parseInt(warna.slice(3, 5), 16), b = parseInt(warna.slice(5, 7), 16)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return { className: '', style: { backgroundColor: warna, color: lum > 0.55 ? '#1a1a1a' : '#ffffff' } }
  }
  return { className: colorOf(userId) }
}

export const inisial = (nama: string) => {
  const p = nama.trim().split(/\s+/)
  return (p.length > 1 ? p[0][0] + p[1][0] : nama.slice(0, 2)).toUpperCase()
}

// Label ringkas grid jadwal: pakai nama panggilan kalau ada, else nama depan
export const labelJadwal = (u: { name: string; nickname?: string | null }) =>
  (u.nickname && u.nickname.trim()) ? u.nickname.trim() : u.name.split(/\s+/)[0]

// Inisial dari user (prioritas nickname)
export const inisialUser = (u: { name: string; nickname?: string | null }) =>
  inisial((u.nickname && u.nickname.trim()) ? u.nickname : u.name)

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Apakah shift mencakup slot jam tertentu (jam dalam angka, mis. 9 utk 09:00-10:00) */
export const coversHour = (s: Shift, hour: number) => {
  const start = parseInt(s.jamMulai.split(':')[0])
  let end = parseInt(s.jamSelesai.split(':')[0])
  if (parseInt(s.jamSelesai.split(':')[1]) > 0) end += 1 // 17:30 → mencakup slot 17
  return hour >= start && hour < end
}
