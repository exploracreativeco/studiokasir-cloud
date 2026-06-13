'use client'

// ============================================================
// View PER JAM (mingguan) — replika modern Excel jadwal:
// kolom = Minggu..Sabtu (dengan tanggal), baris = slot jam.
// Klik sel kosong → assign orang di jam itu.
// Klik chip → edit/tukar/hapus shift tsb.
// ============================================================
import { Shift, HARI, colorOf, inisialUser, dateKey, coversHour } from './shared'

export function WeekHourView({
  weekDates, jamRange, shifts, today, onAddAt, onEditShift,
}: {
  weekDates: Date[] // 7 tanggal Minggu..Sabtu
  jamRange: [number, number] // [9, 21] = slot 09-10 s/d 20-21
  shifts: Shift[]
  today: string // dateKey hari ini
  onAddAt: (tanggal: string, jam: number) => void
  onEditShift: (s: Shift, e: React.MouseEvent) => void
}) {
  const hours: number[] = []
  for (let h = jamRange[0]; h < jamRange[1]; h++) hours.push(h)

  // index shift per tanggal
  const byDate = new Map<string, Shift[]>()
  for (const s of shifts) {
    const k = dateKey(new Date(s.tanggal))
    byDate.set(k, [...(byDate.get(k) || []), s])
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[760px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 bg-gray-50 border-b border-r border-gray-200 px-2 py-2 w-16 text-gray-500 font-bold">JAM</th>
            {weekDates.map((d, i) => {
              const k = dateKey(d)
              const isToday = k === today
              return (
                <th key={k} className={`border-b border-r border-gray-200 px-1 py-1.5 font-bold ${i === 0 ? 'text-red-500' : 'text-gray-700'} ${isToday ? 'bg-blue-50' : ''}`}>
                  <div className={`text-base leading-none ${isToday ? 'text-blue-600' : ''}`}>{d.getDate()}</div>
                  <div className="text-[10px] font-semibold opacity-70">{HARI[i]}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {hours.map(h => (
            <tr key={h}>
              <td className="sticky left-0 bg-gray-50 border-b border-r border-gray-200 px-2 py-1 text-center font-bold text-gray-500 whitespace-nowrap">
                {String(h).padStart(2, '0')}-{String(h + 1).padStart(2, '0')}
              </td>
              {weekDates.map((d, i) => {
                const k = dateKey(d)
                const isToday = k === today
                const cellShifts = (byDate.get(k) || []).filter(s => coversHour(s, h))
                return (
                  <td key={k} onClick={() => onAddAt(k, h)}
                    className={`border-b border-r border-gray-100 p-0.5 align-top cursor-pointer hover:bg-blue-50/60 ${isToday ? 'bg-blue-50/40' : ''} ${i === 0 ? 'bg-red-50/30' : ''}`}>
                    <div className="flex flex-wrap gap-0.5 min-h-[24px]">
                      {cellShifts.map(s => (
                        <button key={s.id} onClick={e => onEditShift(s, e)}
                          title={`${s.user.name} ${s.jamMulai}-${s.jamSelesai}${s.tipe ? ' · ' + s.tipe : ''}`}
                          className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${colorOf(s.userId)} hover:ring-2 hover:ring-gray-400`}>
                          {inisialUser(s.user)}
                        </button>
                      ))}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
