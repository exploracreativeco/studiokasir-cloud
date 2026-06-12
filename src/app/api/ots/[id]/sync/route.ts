import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMonthSheetName } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.otsOrder.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true } },
      metodePembayaran: true,
      status: true,
      items: true,
      customer: true,
    },
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const settings = await prisma.setting.findFirst()
  if (!settings?.webhookUrl) {
    await prisma.otsOrder.update({ where: { id: params.id }, data: { syncStatus: 'QUEUED' } })
    return NextResponse.json({ ok: false, queued: true })
  }

  await prisma.otsOrder.update({ where: { id: params.id }, data: { syncStatus: 'SYNCING' } })

  const sheetName = getMonthSheetName(order.orderDate)
  const itemsDesc = order.items.map(i => `${i.deskripsi}${i.ukuran ? ` (${i.ukuran})` : ''} ×${i.jumlah}`).join(', ')

  const payload = {
    type: 'transaction',
    date: order.orderDate.toLocaleDateString('id-ID'),
    invoiceNumber: order.orderNumber,
    customer: order.namaCustomer,
    package: `[OTS ${order.jenis}] ${itemsDesc}`,
    fotografer: '-',
    jumlahOrang: '-',
    subtotal: order.total,
    discount: 0,
    dp: order.total,
    sisa: 0,
    total: order.total,
    biayaOps: 0,
    profit: order.total,
    method: order.metodePembayaran?.nama || '-',
    status: 'LUNAS',
    cashier: order.user.name,
    notes: order.notes || '',
  }

  try {
    const res = await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await prisma.otsOrder.update({
      where: { id: params.id },
      data: { syncStatus: 'SYNCED', syncSheet: sheetName, syncedAt: new Date() },
    })
    return NextResponse.json({ ok: true, sheet: sheetName })
  } catch (err: any) {
    await prisma.otsOrder.update({ where: { id: params.id }, data: { syncStatus: 'QUEUED' } })
    return NextResponse.json({ ok: false, error: err.message, queued: true })
  }
}
