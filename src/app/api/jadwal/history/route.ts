// api/jadwal/history — riwayat perubahan jadwal (siapa ubah apa kapan)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branchId') || undefined

  const logs = await prisma.shiftChangeLog.findMany({
    where: branchId ? { shift: { branchId } } : {},
    include: {
      changedBy: { select: { name: true } },
      shift: { select: { tanggal: true, jamMulai: true, jamSelesai: true, user: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  return NextResponse.json(logs)
}
