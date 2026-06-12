import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateBookingNumber, getMonthSheetName } from '@/lib/utils'

const schema = z.object({
  customerId: z.string().optional().nullable(),
  namaCustomer: z.string().min(1),
  whatsapp: z.string().optional().nullable(),
  keperluan: z.string().min(1),
  tanggalSesi: z.string().optional().nullable(),
  dpAmount: z.number().default(0),
  catatan: z.string().optional().nullable(),
  status: z.enum(['DIBAYAR', 'CANCEL', 'REFUND']).default('DIBAYAR'),
  fotograferId: z.string().optional().nullable(),
  tanggalFoto: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const customerId = searchParams.get('customerId') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { namaCustomer: { contains: search, mode: 'insensitive' } },
      { keperluan: { contains: search, mode: 'insensitive' } },
      { bookingNumber: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status
  if (customerId) where.customerId = customerId

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      customer: true,
      user: { select: { id: true, name: true } },
      fotografer: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  return NextResponse.json(bookings)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const count = await prisma.booking.count()
  const bookingNumber = generateBookingNumber(count)

  const booking = await prisma.booking.create({
    data: {
      ...parsed.data,
      bookingNumber,
      userId: session.user.id,
      tanggalSesi: parsed.data.tanggalSesi ? new Date(parsed.data.tanggalSesi) : null,
      tanggalFoto: parsed.data.tanggalFoto ? new Date(parsed.data.tanggalFoto) : null,
      syncStatus: 'PENDING',
    },
    include: {
      customer: true,
      user: { select: { id: true, name: true } },
    },
  })

  // Auto sync to Sheets if dp > 0
  if (booking.dpAmount > 0) {
    try {
      const settings = await prisma.setting.findFirst()
      if (settings?.webhookUrl) {
        const sheetName = getMonthSheetName(booking.createdAt)
        const payload = {
          type: 'transaction',
          date: booking.createdAt.toLocaleDateString('id-ID'),
          invoiceNumber: booking.bookingNumber,
          customer: booking.namaCustomer,
          package: `[DP Booking] ${booking.keperluan}`,
          fotografer: '-',
          jumlahOrang: '-',
          subtotal: booking.dpAmount,
          discount: 0,
          dp: booking.dpAmount,
          sisa: 0,
          total: booking.dpAmount,
          biayaOps: 0,
          profit: booking.dpAmount,
          method: '-',
          status: 'DP BOOKING',
          cashier: booking.user.name,
          notes: booking.catatan || '',
        }
        const res = await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        })
        if (res.ok) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { syncStatus: 'SYNCED', syncSheet: sheetName, syncedAt: new Date() },
          })
        } else {
          await prisma.booking.update({ where: { id: booking.id }, data: { syncStatus: 'QUEUED' } })
        }
      }
    } catch {
      await prisma.booking.update({ where: { id: booking.id }, data: { syncStatus: 'QUEUED' } })
    }
  } else {
    // No DP, mark as synced (nothing to sync)
    await prisma.booking.update({ where: { id: booking.id }, data: { syncStatus: 'SYNCED' } })
  }

  const updated = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { customer: true, user: { select: { id: true, name: true } } },
  })

  return NextResponse.json(updated, { status: 201 })
}


