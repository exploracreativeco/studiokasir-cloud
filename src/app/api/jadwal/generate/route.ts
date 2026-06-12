// ============================================================
// api/jadwal/generate — generator jadwal sebulan dari template
// POST { branchId, bulan, tahun, terapkan }
//  terapkan=false → preview (statistik per orang)
//  terapkan=true  → hapus shift studio+bulan itu, tulis hasil generate
//
// POLA (Explora): admin shift default; fotografer rotasi pagi/siang
//   HARIAN pada hari kerjanya; libur hari tetap per orang.
// ROTASI (Yours): FT rotasi MINGGUAN pagi/sore, libur hari tetap;
//   saat FT libur → 1 PT naik slot 8 jam (digilir adil);
//   PT lain isi slot 4 jam pagi/sore dengan penyeimbang:
//   total jam ≈ rata, porsi pagi/sore ≈ rata, giliran 8 jam ≈ rata.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Draft = { userId: string; tanggal: Date; jamMulai: string; jamSelesai: string; catatan: string }
const jamDur = (m: string, s: string) => {
  const [a, b] = [m, s].map(x => { const p = x.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]) })
  let d = b - a; if (d < 0) d += 1440; return d / 60
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const { branchId, bulan, tahun, terapkan } = body || {}
  if (!branchId || !bulan || !tahun) return NextResponse.json({ error: 'branchId, bulan, tahun wajib' }, { status: 400 })

  const t = await prisma.jadwalTemplate.findUnique({ where: { branchId } })
  if (!t) return NextResponse.json({ error: 'Template belum disetup untuk studio ini' }, { status: 404 })
  const cfg = JSON.parse(t.config || '{}')

  const daysInMonth = new Date(tahun, bulan, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(tahun, bulan - 1, i + 1))
  const drafts: Draft[] = []

  if (t.tipe === 'POLA') {
    // cfg: { shifts: { pagi:{m,s}, siang:{m,s} }, anggota: [{userId, peran, defaultShift, libur}] }
    const counters: Record<string, number> = {}
    const fotografers = (cfg.anggota || []).filter((a: any) => a.peran === 'fotografer')
    fotografers.forEach((f: any, i: number) => { counters[f.userId] = i }) // offset biar saling silang
    for (const d of days) {
      const dow = d.getDay()
      for (const a of cfg.anggota || []) {
        if (a.libur === dow) continue
        let slot: 'pagi' | 'siang'
        if (a.peran === 'fotografer') {
          slot = counters[a.userId] % 2 === 0 ? 'pagi' : 'siang'
          counters[a.userId]++
        } else {
          slot = a.defaultShift === 'siang' ? 'siang' : 'pagi'
        }
        const j = cfg.shifts?.[slot] || { m: '09:00', s: '17:00' }
        drafts.push({ userId: a.userId, tanggal: d, jamMulai: j.m, jamSelesai: j.s, catatan: `[GEN] ${slot}` })
      }
    }
  } else if (t.tipe === 'ROTASI') {
    // cfg: { jamFull: { pagi:{m,s}, sore:{m,s} }, jamPart: { pagi:{m,s}, sore:{m,s} },
    //        fulltime: [{userId, libur}], parttime: [userId,...] }
    const ft = cfg.fulltime || []
    const pt: string[] = cfg.parttime || []
    if (ft.length < 1 || pt.length < 1) return NextResponse.json({ error: 'Template butuh minimal 1 fulltime & 1 parttime' }, { status: 400 })
    const stat: Record<string, { jam: number; pagi: number; sore: number; ganti8: number }> = {}
    const ensure = (u: string) => (stat[u] ||= { jam: 0, pagi: 0, sore: 0, ganti8: 0 })
    ;[...ft.map((f: any) => f.userId), ...pt].forEach(ensure)

    // minggu dimulai Minggu — paritas minggu kalender untuk rotasi FT
    const firstDow = new Date(tahun, bulan - 1, 1).getDay()
    const weekIndex = (d: Date) => Math.floor((d.getDate() - 1 + firstDow) / 7)

    const pickPT = (busy: Set<string>, prefer: 'pagi' | 'sore' | 'ganti8') => {
      const cands = pt.filter(u => !busy.has(u))
      if (cands.length === 0) return null
      return cands.sort((a, b) => {
        const A = stat[a], B = stat[b]
        if (prefer === 'ganti8' && A.ganti8 !== B.ganti8) return A.ganti8 - B.ganti8
        if (A.jam !== B.jam) return A.jam - B.jam
        if (prefer === 'pagi' && A.pagi !== B.pagi) return A.pagi - B.pagi
        if (prefer === 'sore' && A.sore !== B.sore) return A.sore - B.sore
        return 0
      })[0]
    }

    for (const d of days) {
      const dow = d.getDay()
      const parity = weekIndex(d) % 2
      const busy = new Set<string>()

      // Slot FT minggu ini: parity 0 → ft[0] pagi, ft[1] sore; parity 1 → tukar
      const slotOf = (idx: number): 'pagi' | 'sore' => ((idx + parity) % 2 === 0 ? 'pagi' : 'sore')

      ft.forEach((f: any, idx: number) => {
        const slot = slotOf(idx)
        const j = cfg.jamFull?.[slot] || (slot === 'pagi' ? { m: '09:00', s: '17:00' } : { m: '13:00', s: '21:00' })
        if (f.libur === dow) {
          // PT menggantikan slot 8 jam — giliran adil
          const g = pickPT(busy, 'ganti8')
          if (g) {
            drafts.push({ userId: g, tanggal: d, jamMulai: j.m, jamSelesai: j.s, catatan: `[GEN] ganti FT ${slot}` })
            busy.add(g); stat[g].jam += jamDur(j.m, j.s); stat[g].ganti8++
          }
        } else {
          drafts.push({ userId: f.userId, tanggal: d, jamMulai: j.m, jamSelesai: j.s, catatan: `[GEN] FT ${slot}` })
          busy.add(f.userId); ensure(f.userId).jam += jamDur(j.m, j.s)
        }
      })

      // Slot PT 4 jam: pagi & sore — penyeimbang jam + porsi pagi/sore
      for (const slot of ['pagi', 'sore'] as const) {
        const j = cfg.jamPart?.[slot] || (slot === 'pagi' ? { m: '09:00', s: '13:00' } : { m: '17:00', s: '21:00' })
        const p = pickPT(busy, slot)
        if (p) {
          drafts.push({ userId: p, tanggal: d, jamMulai: j.m, jamSelesai: j.s, catatan: `[GEN] PT ${slot}` })
          busy.add(p); stat[p].jam += jamDur(j.m, j.s); stat[p][slot]++
        }
      }
    }
  } else {
    return NextResponse.json({ error: 'Tipe template tidak dikenal' }, { status: 400 })
  }

  // Statistik per orang untuk preview
  const userIds = [...new Set(drafts.map(x => x.userId))]
  const usersDb = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
  const nameOf = new Map(usersDb.map(u => [u.id, u.name]))
  const ringkasan = userIds.map(u => {
    const mine = drafts.filter(x => x.userId === u)
    return {
      userId: u,
      nama: nameOf.get(u) || '—',
      shift: mine.length,
      jam: Math.round(mine.reduce((s, x) => s + jamDur(x.jamMulai, x.jamSelesai), 0) * 10) / 10,
      pagi4: mine.filter(x => x.catatan === '[GEN] PT pagi').length,
      sore4: mine.filter(x => x.catatan === '[GEN] PT sore').length,
      ganti8: mine.filter(x => x.catatan.startsWith('[GEN] ganti')).length,
    }
  }).sort((a, b) => b.jam - a.jam)

  if (!terapkan) return NextResponse.json({ preview: true, total: drafts.length, ringkasan })

  // TERAPKAN: ganti seluruh shift studio+bulan dengan hasil generate
  const monthStart = new Date(tahun, bulan - 1, 1)
  const monthEnd = new Date(tahun, bulan, 1)
  await prisma.$transaction([
    prisma.shift.deleteMany({ where: { branchId, tanggal: { gte: monthStart, lt: monthEnd } } }),
    prisma.shift.createMany({ data: drafts.map(x => ({ ...x, branchId })) }),
  ])
  return NextResponse.json({ ok: true, total: drafts.length, ringkasan })
}
