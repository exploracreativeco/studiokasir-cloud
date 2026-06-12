// ============================================================
// api/transactions/route.ts — route TIPIS
// Logika bisnis ada di services/transaction.service.ts
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { createTransaction, listTransactions } from '@/services/transaction.service'
import { getBranchIdFromRequest } from '@/services/branch.service'

const packageItemSchema = z.object({
  packageId: z.string(),
  jumlahOrang: z.number().optional().nullable(),
  hargaPerOrang: z.number().optional().nullable(),
  price: z.number(),
  customItemName: z.string().optional().nullable(),
  discount: z.number().optional().default(0),
  promoCodeId: z.string().optional().nullable(),
})

const createSchema = z.object({
  customerId: z.string(),
  packages: z.array(packageItemSchema).min(1),
  addonIds: z.array(z.string()).default([]),
  promoCodeId: z.string().optional().nullable(),
  discount: z.number().default(0),
  dpAmount: z.number().default(0),
  metodePembayaranId: z.string().optional().nullable(),
  fotograferId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  transactionDate: z.string().optional(),
  biayaOpsTotal: z.number().default(0),
  biayaOps: z.array(z.object({
    ukuran: z.string(),
    jenis: z.string(),
    jumlah: z.number(),
    hargaSatuan: z.number(),
    total: z.number(),
  })).default([]),
  bookingId: z.string().optional().nullable(),
  tanggalFoto: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const branchId = await getBranchIdFromRequest(req)
  const result = await listTransactions({
    branchId,
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 })
  }

  const branchId = await getBranchIdFromRequest(req)
  const tx = await createTransaction({ ...parsed.data, userId: session.user.id, branchId })
  return NextResponse.json(tx, { status: 201 })
}
