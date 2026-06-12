// ============================================================
// services/transaction.service.ts — Logika bisnis transaksi
// Dipakai oleh: api/transactions (POST/GET), nanti juga import-data.
// ============================================================
import { prisma } from '@/lib/prisma'
import { hitungTransaksi } from '@/lib/money'
import { buildDateFilter } from '@/lib/dates'

// ---------- TYPES ----------
export interface CreateTransactionInput {
  customerId: string
  userId: string
  branchId?: string | null
  packages: Array<{
    packageId: string
    price: number
    jumlahOrang?: number | null
    hargaPerOrang?: number | null
    customItemName?: string | null
    discount?: number
    promoCodeId?: string | null
  }>
  addonIds: string[]
  promoCodeId?: string | null
  discount: number
  dpAmount: number
  metodePembayaranId?: string | null
  fotograferId?: string | null
  notes?: string | null
  transactionDate?: string
  biayaOpsTotal: number
  biayaOps: Array<{ ukuran: string; jenis: string; jumlah: number; hargaSatuan: number; total: number }>
  bookingId?: string | null
  tanggalFoto?: string | null
}

// ---------- INVOICE NUMBER ----------
/**
 * Generate nomor invoice: INV-YYMMDD-NNNN
 * Berdasarkan SEQUENCE TERTINGGI hari ini (bukan count) — anti duplikat
 * setelah hapus transaksi. (Fix bug P2002 yang lama.)
 */
export async function generateInvoiceNumber(now = new Date()): Promise<string> {
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const todayPrefix = `INV-${yy}${mm}${dd}-`
  const lastToday = await prisma.transaction.findFirst({
    where: { invoiceNumber: { startsWith: todayPrefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })
  const lastSeq = lastToday ? parseInt(lastToday.invoiceNumber.replace(todayPrefix, '')) || 0 : 0
  return `${todayPrefix}${String(lastSeq + 1).padStart(4, '0')}`
}

// ---------- INCLUDE STANDAR ----------
export const TRANSACTION_INCLUDE = {
  customer: true,
  user: { select: { id: true, name: true, email: true } },
  fotografer: true,
  metodePembayaran: true,
  promoCode: true,
  items: { include: { package: true, addons: { include: { addon: true } } } },
  biayaOps: true,
} as const

// ---------- CREATE ----------
export async function createTransaction(input: CreateTransactionInput) {
  // 1. Ambil addons
  const addons = input.addonIds.length > 0
    ? await prisma.addon.findMany({ where: { id: { in: input.addonIds } } })
    : []

  // 2. Hitung uang — rumus dari lib/money.ts (single source of truth)
  const packagesTotal = input.packages.reduce((sum, p) => sum + p.price, 0)
  const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0)
  const dpAmount = input.dpAmount || 0
  const { subtotal, grandTotal, diterimaSaatIni, remainingPayment } = hitungTransaksi({
    packagesTotal, addonsTotal, discount: input.discount, dpAmount,
  })

  // 3. Invoice number anti-duplikat
  const invoiceNumber = await generateInvoiceNumber()

  // 4. Create
  const tx = await prisma.transaction.create({
    data: {
      invoiceNumber,
      customerId: input.customerId,
      userId: input.userId,
      branchId: input.branchId || null,
      promoCodeId: input.promoCodeId || null,
      fotograferId: input.fotograferId || null,
      metodePembayaranId: input.metodePembayaranId || null,
      subtotal,
      discount: input.discount,
      grandTotal,
      dpAmount,
      diterimaSaatIni,
      remainingPayment,
      paymentStatus: 'LUNAS',
      notes: input.notes || null,
      transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
      biayaOpsTotal: input.biayaOpsTotal || 0,
      bookingId: input.bookingId || null,
      tanggalFoto: input.tanggalFoto ? new Date(input.tanggalFoto) : null,
      syncStatus: 'PENDING',
      items: {
        create: input.packages.map(pkg => ({
          packageId: pkg.packageId,
          quantity: 1,
          price: pkg.price,
          jumlahOrang: pkg.jumlahOrang || null,
          hargaPerOrang: pkg.hargaPerOrang || null,
          customItemName: pkg.customItemName || null,
          discount: pkg.discount || 0,
          promoCodeId: pkg.promoCodeId || null,
          addons: {
            create: addons.map(a => ({ addonId: a.id, quantity: 1, price: a.price })),
          },
        })),
      },
      biayaOps: input.biayaOps.length > 0 ? {
        create: input.biayaOps.map(b => ({
          ukuran: b.ukuran, jenis: b.jenis as any, jumlah: b.jumlah,
          hargaSatuan: b.hargaSatuan, total: b.total,
        })),
      } : undefined,
    },
    include: TRANSACTION_INCLUDE,
  })

  // 5. Auto-update booking status jika linked
  if (input.bookingId) {
    await updateLinkedBookingStatus(input.bookingId, tx.grandTotal)
  }

  return tx
}

/** Update status booking → LUNAS jika total bayar sudah mencukupi */
async function updateLinkedBookingStatus(bookingId: string, txGrandTotal: number) {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) return
    const linkedTx = await prisma.transaction.findMany({
      where: { bookingId },
      select: { diterimaSaatIni: true, grandTotal: true },
    })
    const totalDibayar = booking.dpAmount + linkedTx.reduce((s, t) => s + (t.diterimaSaatIni || t.grandTotal || 0), 0)
    if (totalDibayar >= txGrandTotal || totalDibayar >= booking.dpAmount) {
      await prisma.booking.update({ where: { id: bookingId }, data: { status: 'LUNAS' } })
    }
  } catch {
    // Non-fatal: transaksi tetap sukses walau update booking gagal
  }
}

// ---------- LIST (dengan filter & pagination) ----------
export interface ListTransactionsParams {
  page: number
  limit: number
  branchId?: string | null
  search?: string
  status?: string
  from?: string
  to?: string
}

export async function listTransactions(params: ListTransactionsParams) {
  const where: any = {}
  if (params.branchId) where.branchId = params.branchId
  if (params.search) {
    where.OR = [
      { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
      { customer: { name: { contains: params.search, mode: 'insensitive' } } },
    ]
  }
  if (params.status) where.paymentStatus = params.status
  const dateFilter = buildDateFilter({ from: params.from, to: params.to })
  if (dateFilter) where.transactionDate = dateFilter

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: TRANSACTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return {
    transactions,
    total,
    page: params.page,
    limit: params.limit,
    pages: Math.ceil(total / params.limit),
  }
}
