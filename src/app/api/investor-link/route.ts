// api/investor-link — daftar investor + status link (SUPERADMIN)
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const investors = await prisma.investor.findMany({
    where: { aktif: true },
    orderBy: { nama: 'asc' },
    select: { id: true, nama: true, publicToken: true, lastAccessAt: true },
  })
  return NextResponse.json(investors)
}
