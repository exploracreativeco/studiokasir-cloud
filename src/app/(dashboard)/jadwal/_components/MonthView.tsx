'use client'

// View BULANAN — overview kalender (pelengkap view per jam)
import { Loader2 } from 'lucide-react'
import { Shift, HARI, colorOf, labelJadwal } from './shared'

export function MonthView({
  tahun, bulan, shifts, loading, todayDate, onAddAt, onEditShift,
}: {
  tahun: number; bulan: number // 1-12
  shifts: Shift[]; loading: boolean
  todayDate: number // tanggal hari ini di bulan tampil, -1 kalau bukan
  onAddAt: (tanggal: string) => void
  onEditShift: (s: Shift, e: React.MouseEvent) => void
}) {
  const firstDay = new Date(tahun, bulan - 1, 1).getDay()
  const daysInMonth = new Date(tahun, bulan, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const byDate = new Map<number, Shift[]>()
  for (const s of shifts) {
    const d = new Date(s.tanggal).getDate()
    byDate.set(d, [...(byDate.get(d) || []), s])
  }
  const dateStr = (d: number) => `${tahun}-${String(bulan).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  if (loading) return <div className="bg-white border border-gray-200 rounded-xl flex items-center justify-center py-24 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {HARI.map(h => <div key={h} className={`px-2 py-2 text-xs font-bold text-center ${h === 'Min' ? 'text-red-500' : 'text-gray-500'}`}>{h}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => (
          <div key={i} onClick={() => d && onAddAt(dateStr(d))}
            className={`min-h-[92px] border-b border-r border-gray-100 p-1.5 ${d ? 'cursor-pointer hover:bg-blue-50/40' : 'bg-gray-50/50'} ${d === todayDate ? 'bg-blue-50/60' : ''}`}>
            {d && (
              <>
                <div className={`text-xs font-bold mb-1 ${i % 7 === 0 ? 'text-red-500' : 'text-gray-500'} ${d === todayDate ? 'text-blue-600' : ''}`}>{d}</div>
                <div className="space-y-1">
                  {(byDate.get(d) || []).map(s => (
                    <button key={s.id} onClick={e => onEditShift(s, e)}
                      className={`block w-full text-left text-[10px] leading-tight font-semibold px-1.5 py-1 rounded ${colorOf(s.userId)} hover:opacity-75`}>
                      {labelJadwal(s.user)} <span className="font-normal opacity-70">{s.jamMulai}-{s.jamSelesai}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
