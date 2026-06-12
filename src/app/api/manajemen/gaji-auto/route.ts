// ============================================================
// api/manajemen/gaji-auto — hitung otomatis komponen gaji bulan:
// 1. Honor event (EventCrew, event non-BATAL)
// 2. Bonus absen per template:
//    - PER_ENTRI: jumlah entri DITERIMA × nominal (kebersihan, story)
//    - PER_JAM: (jam pulang - berangkat) × tarif (photobooth)
// Link karyawan gaji ↔ akun: KECOCOKAN NAMA (case-insensitive).
// Hasil = daftar job tambahan ber-flag auto → di-merge ke GajiRecord.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')

function jamKeMenit(v: any): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim())
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const now = new Date()
  const bulan = parseInt(searchParams.get('bulan') || String(now.getMonth() + 1))
  const tahun = parseInt(searchParams.get('tahun') || String(now.getFullYear()))
  const range = { gte: new Date(tahun, bulan - 1, 1), lt: new Date(tahun, bulan, 1) }

  const [karyawans, users, crews, templates] = await Promise.all([
    prisma.karyawanGaji.findMany({ where: { aktif: true }, select: { id: true, nama: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.eventCrew.findMany({
      where: { event: { tanggal: range, status: { not: 'BATAL' } } },
      include: { event: { select: { nama: true, tanggal: true, status: true } } },
    }),
    prisma.absenTemplate.findMany({ where: { bonusMode: { not: 'NONE' } } }),
  ])

  // Entri absen DITERIMA bulan ini untuk template ber-bonus
  const templateIds = templates.map(t => t.id)
  const entries = templateIds.length
    ? await prisma.absenEntry.findMany({
        where: { templateId: { in: templateIds }, status: 'DITERIMA', waktuKejadian: range },
        select: { templateId: true, userId: true, values: true },
      })
    : []

  const userByName = new Map(users.map(u => [norm(u.name), u]))
  const results: Record<string, { userName: string | null; items: Array<{ namaJob: string; nominal: number; auto: boolean }>; total: number }> = {}
  const unlinked: string[] = []

  for (const k of karyawans) {
    const user = userByName.get(norm(k.nama))
    if (!user) { unlinked.push(k.nama); results[k.id] = { userName: null, items: [], total: 0 }; continue }

    const items: Array<{ namaJob: string; nominal: number; auto: boolean }> = []

    // 1. Honor event
    for (const c of crews.filter(c => c.userId === user.id)) {
      if (c.honor > 0) {
        const tgl = new Date(c.event.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        items.push({ namaJob: `Event: ${c.event.nama} (${tgl})`, nominal: c.honor, auto: true })
      }
    }

    // 2. Bonus absen per template
    for (const t of templates) {
      const myEntries = entries.filter(e => e.templateId === t.id && e.userId === user.id)
      if (myEntries.length === 0) continue

      if (t.bonusMode === 'PER_ENTRI') {
        items.push({ namaJob: `${t.nama} ×${myEntries.length}`, nominal: myEntries.length * t.bonusNominal, auto: true })
      } else if (t.bonusMode === 'PER_JAM') {
        let cfg: any = {}
        try { cfg = JSON.parse(t.bonusConfig || '{}') } catch {}
        const { mulaiKey, selesaiKey } = cfg
        if (!mulaiKey || !selesaiKey) continue
        let totalMenit = 0
        for (const e of myEntries) {
          let v: any = {}
          try { v = JSON.parse(e.values || '{}') } catch {}
          const m1 = jamKeMenit(v[mulaiKey]), m2 = jamKeMenit(v[selesaiKey])
          if (m1 === null || m2 === null) continue
          let diff = m2 - m1
          if (diff < 0) diff += 24 * 60 // lewat tengah malam
          totalMenit += diff
        }
        if (totalMenit > 0) {
          const jam = totalMenit / 60
          items.push({
            namaJob: `${t.nama} ${jam % 1 === 0 ? jam : jam.toFixed(1)} jam`,
            nominal: Math.round(jam * t.bonusNominal),
            auto: true,
          })
        }
      }
    }

    results[k.id] = { userName: user.name, items, total: items.reduce((s, i) => s + i.nominal, 0) }
  }

  return NextResponse.json({ bulan, tahun, results, unlinked })
}
