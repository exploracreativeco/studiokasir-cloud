'use client'

// ============================================================
// /log — Activity Log (SUPERADMIN): rekam jejak aksi user
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { ScrollText, Loader2, Search } from 'lucide-react'

const ACTION_STYLE: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-700',
  LOGIN: 'bg-gray-100 text-gray-600',
  APPROVE: 'bg-amber-50 text-amber-700',
  EXPORT: 'bg-violet-50 text-violet-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

const fmtWaktu = (s: string) => new Date(s).toLocaleString('id-ID', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
})

export default function LogPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [action, setAction] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (action) params.set('action', action)
    if (q) params.set('q', q)
    const res = await fetch(`/api/activity-log?${params}`)
    const d = await res.json()
    if (res.ok) { setRows(d.rows || []); setPages(d.pages || 1); setTotal(d.total || 0) }
    setLoading(false)
  }, [page, action, q])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold">Activity Log</h1>
          <p className="text-sm text-gray-500">Rekam jejak aktivitas — {total} entri</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Cari nama / detail…"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Semua aksi</option>
          {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'APPROVE', 'EXPORT', 'OTHER'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-16">Belum ada aktivitas tercatat</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 text-xs">
              <tr>
                <th className="px-4 py-2.5 font-medium">Waktu</th>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Aksi</th>
                <th className="px-4 py-2.5 font-medium">Objek</th>
                <th className="px-4 py-2.5 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtWaktu(r.createdAt)}</td>
                  <td className="px-4 py-2.5 font-medium">{r.userName || '—'}</td>
                  <td className="px-4 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${ACTION_STYLE[r.action] || ACTION_STYLE.OTHER}`}>{r.action}</span></td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{r.entity}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{r.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">← Sebelumnya</button>
          <span className="text-xs text-gray-500">Hal {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Berikutnya →</button>
        </div>
      )}
    </div>
  )
}
