// api/jadwal/users — daftar karyawan aktif untuk dropdown jadwal
// (akses semua user login, data minimal)
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, nickname: true, role: true, branchId: true, warna: true },
  })
  return NextResponse.json(users)
}
