// api/oprec/pelamar — daftar pelamar (SUPERADMIN)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const s = await auth()
  if (!s || (s.user as any).role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const lowonganId = searchParams.get('lowonganId') || undefined
  const status = searchParams.get('status') || undefined
  const rows = await prisma.pelamar.findMany({
    where: { ...(lowonganId ? { lowonganId } : {}), ...(status ? { status } : {}) },
    include: { lowongan: { select: { judul: true, posisi: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(rows.map(r => ({ ...r, jawaban: JSON.parse(r.jawaban || '{}') })))
}
