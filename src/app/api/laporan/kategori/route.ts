import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // format: YYYY-MM

  let dateFilter: any = {}
  if (month) {
    const [year, m] = month.split('-').map(Number)
    const start = new Date(year, m - 1, 1)
    const end = new Date(year, m, 1)
    dateFilter = { transactionDate: { gte: start, lt: end } }
  }

  const transactions = await prisma.transaction.findMany({
    where: dateFilter,
    select: { diterimaSaatIni: true, grandTotal: true, transactionDate: true, items: { include: { package: true } } }
  })

  // Group by category
  const categoryMap: Record<string, { name: string; jumlahOrder: number; omzet: number }> = {}

  for (const tx of transactions) {
    for (const item of tx.items) {
      const catName = String(item.package?.category || 'Lainnya')
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, jumlahOrder: 0, omzet: 0 }
      }
      categoryMap[catName].jumlahOrder += 1
      categoryMap[catName].omzet += item.price || 0
    }
  }

  const result = Object.values(categoryMap).sort((a, b) => b.omzet - a.omzet)
  const totalOrder = result.reduce((s, c) => s + c.jumlahOrder, 0)
  const totalOmzet = result.reduce((s, c) => s + c.omzet, 0)

  return NextResponse.json({ categories: result, totalOrder, totalOmzet })
}
