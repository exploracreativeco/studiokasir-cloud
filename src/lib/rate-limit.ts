// ============================================================
// Rate limiter in-memory ringan untuk endpoint publik.
// Cukup untuk skala studio (1 instance). Reset saat restart.
// Untuk multi-instance nanti → ganti ke Upstash Redis.
// ============================================================
type Bucket = { count: number; reset: number }
const store = new Map<string, Bucket>()

// Bersihkan bucket kedaluwarsa berkala (cegah memory bocor)
let lastSweep = Date.now()
function sweep() {
  const now = Date.now()
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, v] of store) if (v.reset < now) store.delete(k)
}

/** true = boleh lanjut, false = kena limit */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  sweep()
  const now = Date.now()
  const b = store.get(key)
  if (!b || b.reset < now) { store.set(key, { count: 1, reset: now + windowMs }); return true }
  if (b.count >= max) return false
  b.count++
  return true
}

export function clientIp(req: Request): string {
  const h = req.headers
  return (h.get('x-forwarded-for')?.split(',')[0].trim()) || h.get('x-real-ip') || 'unknown'
}
