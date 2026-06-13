import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const s = await auth()
  if (!s || (s.user as any).role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.kerjasamaPengajuan.findMany({
    orderBy: { createdAt: 'desc' },
    include: { program: { select: { judul: true, kategori: true } } },
  })
  return NextResponse.json(rows.map(r => ({ ...r, jawaban: JSON.parse(r.jawaban || '{}') })))
}
