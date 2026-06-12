import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthSheetName } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.setting.findFirst()
  const webhookUrl = settings?.webhookUrl
  if (!webhookUrl) {
    return NextResponse.json({ ok: false, error: 'Webhook URL not configured' })
  }

  const queued = await prisma.transaction.findMany({
    where: { syncStatus: { in: ['QUEUED', 'FAILED', 'PENDING'] } },
    include: {
      customer: true,
      user: { select: { id: true, name: true, email: true } },
      items: { include: { package: true } },
    },
    take: 20,
  })

  if (queued.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, message: 'Queue kosong' })
  }

  let synced = 0
  let failed = 0

  for (const tx of queued) {
    const sheetName = getMonthSheetName(tx.transactionDate)
    const payload = {
      type: 'transaction',
      date: tx.transactionDate.toLocaleDateString('id-ID'),
      invoiceNumber: tx.invoiceNumber,
      customer: tx.customer.name,
      package: tx.items[0]?.package?.name || '',
      subtotal: tx.subtotal,
      discount: tx.discount,
      dp: tx.dpAmount,
      sisa: tx.remainingPayment,
      total: tx.grandTotal,
      method: tx.paymentMethod,
      cashier: tx.user.name,
    }

    try {
      await prisma.transaction.update({ where: { id: tx.id }, data: { syncStatus: 'SYNCING' } })
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { syncStatus: 'SYNCED', syncSheet: sheetName, syncedAt: new Date() },
      })
      synced++
    } catch {
      await prisma.transaction.update({ where: { id: tx.id }, data: { syncStatus: 'QUEUED' } })
      failed++
    }
  }

  return NextResponse.json({ ok: true, synced, failed, total: queued.length })
}
