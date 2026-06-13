import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const fromDate = searchParams.get('from') || ''
  const toDate = searchParams.get('to') || ''
  const yearFilter = searchParams.get('year') || ''
  const monthFilter = searchParams.get('month') || ''
  const sortOrder = searchParams.get('sort') || 'desc'

  // Build date filter (pakai local timezone)
  const dateFilter: any = {}
  if (fromDate) dateFilter.gte = new Date(fromDate + 'T00:00:00')
  if (toDate) dateFilter.lte = new Date(toDate + 'T23:59:59')
  if (yearFilter && monthFilter) {
    const lastDay = new Date(Number(yearFilter), Number(monthFilter), 0).getDate()
    dateFilter.gte = new Date(Number(yearFilter), Number(monthFilter) - 1, 1, 0, 0, 0)
    dateFilter.lte = new Date(Number(yearFilter), Number(monthFilter) - 1, lastDay, 23, 59, 59)
  } else if (yearFilter) {
    dateFilter.gte = new Date(Number(yearFilter), 0, 1, 0, 0, 0)
    dateFilter.lte = new Date(Number(yearFilter), 11, 31, 23, 59, 59)
  }
  const hasDateFilter = Object.keys(dateFilter).length > 0

  // Build where for transactions
  const txWhere: any = {}
  if (search) {
    txWhere.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  if (status === 'DP' || status === 'LUNAS') txWhere.paymentStatus = status
  if (hasDateFilter) txWhere.transactionDate = dateFilter

  // Build where for OTS orders
  const otsWhere: any = {}
  if (search) {
    otsWhere.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { namaCustomer: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (hasDateFilter) otsWhere.orderDate = dateFilter

  // Build where for bookings
  const bookingWhere: any = { dpAmount: { gt: 0 }, status: { not: undefined } }
  if (search) {
    bookingWhere.OR = [
      { bookingNumber: { contains: search, mode: 'insensitive' } },
      { namaCustomer: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (hasDateFilter) bookingWhere.createdAt = dateFilter

  const typeFilter = searchParams.get('type') || ''

  // ── OPTIMASI PERFORMA ──
  // Untuk menampilkan halaman ke-N (sort desc gabungan), cukup ambil
  // (page*limit) teratas dari TIAP sumber — bukan SEMUA baris.
  // Worst case: semua data halaman berasal dari 1 sumber → page*limit cukup.
  // + buffer kecil untuk aman. Hindari tarik ribuan row tiap request.
  const fetchCap = page * limit + limit  // buffer 1 halaman

  // Hitung total per sumber (cepat, hanya COUNT — pakai index) untuk pagination akurat.
  const [txCount, otsCount, bookCount] = await Promise.all([
    typeFilter && typeFilter !== 'PAKET' ? Promise.resolve(0) : prisma.transaction.count({ where: txWhere }),
    typeFilter && typeFilter !== 'OTS' ? Promise.resolve(0) : (status === 'DP' || status === 'LUNAS' ? Promise.resolve(0) : prisma.otsOrder.count({ where: otsWhere })),
    typeFilter && typeFilter !== 'BOOKING' ? Promise.resolve(0) : prisma.booking.count({ where: bookingWhere }),
  ])

  const [transactions, otsOrders, bookings] = await Promise.all([
    typeFilter && typeFilter !== 'PAKET' ? Promise.resolve([]) :
    prisma.transaction.findMany({
      where: txWhere,
      include: {
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        fotografer: true,
        metodePembayaran: true,
        promoCode: true,
        items: { include: { package: true, addons: { include: { addon: true } } } },
        biayaOps: true,
      },
      orderBy: { createdAt: 'desc' },
      take: fetchCap,
    }),
    typeFilter && typeFilter !== 'OTS' ? Promise.resolve([]) :
    (status === 'DP' || status === 'LUNAS' ? Promise.resolve([]) :
    prisma.otsOrder.findMany({
      where: otsWhere,
      include: {
        user: { select: { id: true, name: true, email: true } },
        metodePembayaran: true,
        status: true,
        items: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: fetchCap,
    })),
    typeFilter && typeFilter !== 'BOOKING' ? Promise.resolve([]) :
    prisma.booking.findMany({
      where: bookingWhere,
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: fetchCap,
    }),
  ])

  // Normalize OTS orders to transaction-like objects
  const normalizedOts = otsOrders.map((o: any) => ({
    id: o.id,
    invoiceNumber: o.orderNumber,
    type: 'OTS',
    jenis: o.jenis,
    customerId: o.customerId,
    customer: o.customer || { id: '', name: o.namaCustomer, whatsapp: o.whatsapp },
    namaCustomer: o.namaCustomer,
    user: o.user,
    fotografer: null,
    metodePembayaran: o.metodePembayaran,
    subtotal: o.total,
    discount: 0,
    grandTotal: o.total,
    dpAmount: o.total,
    remainingPayment: 0,
    paymentStatus: 'LUNAS' as const,
    syncStatus: o.syncStatus,
    syncSheet: o.syncSheet,
    transactionDate: o.orderDate,
    createdAt: o.createdAt,
    notes: o.notes,
    items: o.items.map((item: any) => ({
      id: item.id,
      package: { name: item.deskripsi },
      price: item.harga * item.jumlah,
      jumlahOrang: item.jumlah > 1 ? item.jumlah : null,
      addons: [],
      ukuran: item.ukuran,
    })),
    otsStatus: o.status,
  }))

  // Normalize bookings
  const normalizedBookings = (bookings as any[]).map((b: any) => {
    const isRefund = b.status === 'REFUND'
    const nominal = isRefund ? -b.dpAmount : b.dpAmount
    return {
      id: b.id,
      invoiceNumber: b.bookingNumber,
      type: 'BOOKING',
      customer: b.customer || { id: '', name: b.namaCustomer, whatsapp: b.whatsapp },
      namaCustomer: b.namaCustomer,
      user: null,
      fotografer: null,
      metodePembayaran: null,
      subtotal: nominal,
      discount: 0,
      grandTotal: nominal,
      dpAmount: nominal,
      remainingPayment: 0,
      paymentStatus: 'DP' as const,
      syncStatus: b.syncStatus || 'PENDING',
      syncSheet: b.syncSheet || null,
      transactionDate: b.tanggalSesi || b.createdAt,
      createdAt: b.createdAt,
      notes: b.catatan,
      keperluan: b.keperluan,
      bookingStatus: b.status,
      items: [{ id: b.id, package: { name: b.keperluan || 'DP' }, price: nominal, addons: [] }],
    }
  })

  // Normalize transactions
  const normalizedTx = (transactions as any[]).map((t: any) => ({ ...t, type: 'PAKET' }))

  // Combine and sort by date
  const combined = [...normalizedTx, ...normalizedOts, ...normalizedBookings]
    .sort((a, b) => sortOrder === 'asc'
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Total akurat dari COUNT semua sumber (bukan dari data yang ter-cap)
  const total = txCount + otsCount + bookCount
  const paginated = combined.slice((page - 1) * limit, page * limit)

  return NextResponse.json({ transactions: paginated, total, page, limit, pages: Math.ceil(total / limit) })
}
