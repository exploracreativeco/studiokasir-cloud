import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getMonthSheetName } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().min(0),
  date: z.string(),
  notes: z.string().optional(),
})

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: 'Listrik', PROPERTY: 'Properti', PRINT: 'Print',
  TRANSPORT: 'Transport', MAINTENANCE: 'Perawatan', MARKETING: 'Marketing',
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: any = {}
  if (month) {
    const [year, mon] = month.split('-').map(Number)
    where.date = { gte: new Date(year, mon - 1, 1), lt: new Date(year, mon, 1) }
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { date: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.expense.count({ where }),
  ])

  const summary = await prisma.expense.aggregate({ where, _sum: { amount: true } })
  return NextResponse.json({ expenses, total, totalAmount: summary._sum.amount || 0 })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const expense = await prisma.expense.create({
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  })

  // Auto sync to sheets
  const settings = await prisma.setting.findFirst()
  if (settings?.webhookUrl) {
    const sheetName = getMonthSheetName(expense.date)
    const payload = {
      type: 'expense',
      date: expense.date.toLocaleDateString('id-ID'),
      title: expense.title,
      category: CATEGORY_LABELS[expense.category] || expense.category,
      amount: expense.amount,
      notes: expense.notes || '',
    }
    try {
      const res = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        await prisma.expense.update({ where: { id: expense.id }, data: { syncStatus: 'SYNCED', syncSheet: sheetName, syncedAt: new Date() } })
      } else {
        await prisma.expense.update({ where: { id: expense.id }, data: { syncStatus: 'QUEUED' } })
      }
    } catch {
      await prisma.expense.update({ where: { id: expense.id }, data: { syncStatus: 'QUEUED' } })
    }
  }

  return NextResponse.json(expense, { status: 201 })
}
