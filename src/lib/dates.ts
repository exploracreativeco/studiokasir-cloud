// ============================================================
// lib/dates.ts — SATU-SATUNYA tempat logika tanggal & timezone
// Aturan: SELALU pakai constructor lokal new Date(y, m, d),
// JANGAN pakai string ISO + 'Z' (UTC midnight ≠ WIB midnight).
// ============================================================

/** Awal hari ini (00:00 waktu server) */
export function todayStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Awal hari besok — dipakai sebagai batas eksklusif (lt) */
export function todayEnd(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
}

/** Awal bulan berjalan */
export function monthStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/** Range satu bulan: { gte, lt } — bulan 1-12 (human-friendly) */
export function monthRange(tahun: number, bulan: number) {
  return {
    gte: new Date(tahun, bulan - 1, 1, 0, 0, 0),
    lt: new Date(tahun, bulan, 1, 0, 0, 0),
  }
}

/** Range satu tahun: { gte, lt } */
export function yearRange(tahun: number) {
  return {
    gte: new Date(tahun, 0, 1, 0, 0, 0),
    lt: new Date(tahun + 1, 0, 1, 0, 0, 0),
  }
}

/** Range satu hari tertentu: { gte, lt } */
export function dayRange(date: Date) {
  return {
    gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
  }
}

/**
 * Bangun Prisma date filter dari query params halaman transaksi.
 * Mendukung: from/to (YYYY-MM-DD), year, year+month.
 * Return undefined kalau tidak ada filter.
 */
export function buildDateFilter(params: {
  from?: string
  to?: string
  year?: string
  month?: string
}): { gte?: Date; lte?: Date } | undefined {
  const f: { gte?: Date; lte?: Date } = {}
  if (params.from) f.gte = new Date(params.from + 'T00:00:00')
  if (params.to) f.lte = new Date(params.to + 'T23:59:59')
  if (params.year && params.month) {
    const y = Number(params.year)
    const m = Number(params.month)
    const lastDay = new Date(y, m, 0).getDate()
    f.gte = new Date(y, m - 1, 1, 0, 0, 0)
    f.lte = new Date(y, m - 1, lastDay, 23, 59, 59)
  } else if (params.year) {
    const y = Number(params.year)
    f.gte = new Date(y, 0, 1, 0, 0, 0)
    f.lte = new Date(y, 11, 31, 23, 59, 59)
  }
  return Object.keys(f).length > 0 ? f : undefined
}

export const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const
export const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'] as const

/** Format tanggal Indonesia: 11 Juni 2026 */
export function formatTanggalID(date: Date | string): string {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
