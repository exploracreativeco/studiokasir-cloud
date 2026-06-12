// api/branches — daftar branch aktif (untuk dropdown)
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { nama: 'asc' },
    select: { id: true, slug: true, nama: true },
  })
  return NextResponse.json(branches)
}
