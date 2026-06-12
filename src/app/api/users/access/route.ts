import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const DEFAULT_ACCESS: Record<string, Record<string, boolean>> = {
  SUPERADMIN: {
    dashboard: true, kasir: true, booking: true, ots: true, transaksi: true,
    customers: true, pengeluaran: true, laporan: true, sheets: true, admin: true, settings: true, manajemen: true, generate: true, manajemen: true, generate: true, manajemen: true, generate: true,
  },
  ADMIN: {
    dashboard: false, kasir: true, booking: true, ots: true, transaksi: true,
    customers: true, pengeluaran: true, laporan: false, sheets: false, admin: true, settings: false, manajemen: false, generate: false, manajemen: false, generate: false, manajemen: false, generate: false,
  },
  CASHIER: {
    dashboard: false, kasir: true, booking: true, ots: true, transaksi: true,
    customers: true, pengeluaran: false, laporan: false, sheets: false, admin: false, settings: false, manajemen: false, generate: false, manajemen: false, generate: false, manajemen: false, generate: false,
  },
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') as string | null

  if (role) {
    const access = await prisma.roleAccess.findMany({ where: { role: role as any } })
    if (access.length === 0) return NextResponse.json(DEFAULT_ACCESS[role] || {})
    const result: Record<string, boolean> = {}
    access.forEach(a => { result[a.menu] = a.canAccess })
    return NextResponse.json(result)
  }

  const allAccess = await prisma.roleAccess.findMany()
  return NextResponse.json(allAccess)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { role, access } = body

  // Upsert all menu access for this role
  for (const [menu, canAccess] of Object.entries(access)) {
    await prisma.roleAccess.upsert({
      where: { role_menu: { role, menu } },
      update: { canAccess: canAccess as boolean },
      create: { role, menu, canAccess: canAccess as boolean },
    })
  }

  return NextResponse.json({ ok: true })
}
