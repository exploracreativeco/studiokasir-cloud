// ============================================================
// api/sync/retry — retry massal transaksi yang belum tersync
// Dipakai: tombol "retry semua" + auto-retry saat buka halaman /sheets.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncOneTransaction, SYNC_INCLUDE } from '@/lib/sheet-sync'

export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const setting = await prisma.setting.findFirst({ select: { webhookUrl: true } })
  if (!setting?.webhookUrl?.trim()) {
    return NextResponse.json({ ok: false, error: 'Webhook URL belum diatur' })
  }

  // Ambil yang belum tersync (batasi 20 per panggilan agar tak timeout)
  const queued = await prisma.transaction.findMany({
    where: { syncStatus: { in: ['QUEUED', 'FAILED', 'PENDING'] } },
    include: SYNC_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (queued.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, failed: 0, total: 0, message: 'Tidak ada yang perlu disync' })
  }

  let synced = 0
  let failed = 0
  for (const tx of queued) {
    // retry internal 2x per transaksi (lebih cepat untuk batch)
    const r = await syncOneTransaction(tx, 2)
    if (r.ok) synced++; else failed++
  }

  return NextResponse.json({ ok: true, synced, failed, total: queued.length })
}
