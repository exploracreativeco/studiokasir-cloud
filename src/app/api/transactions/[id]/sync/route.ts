// ============================================================
// api/transactions/[id]/sync — sync ulang SATU transaksi ke Sheets
// Dipakai: re-sync setelah edit + tombol retry manual per-transaksi.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncOneTransaction, SYNC_INCLUDE } from '@/lib/sheet-sync'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const tx = await prisma.transaction.findUnique({ where: { id }, include: SYNC_INCLUDE })
  if (!tx) return NextResponse.json({ ok: false, error: 'Transaksi tidak ditemukan' }, { status: 404 })

  const result = await syncOneTransaction(tx)
  return NextResponse.json(result)
}
