// ============================================================
// api/jadwal/template — template generator jadwal per studio
// tipe POLA  : pola mingguan tetap (Explora) — rotasi fotografer harian
// tipe ROTASI: fulltime/parttime + penyeimbang (Yours)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const branchId = new URL(req.url).searchParams.get('branchId')
  if (!branchId) return NextResponse.json({ error: 'branchId wajib' }, { status: 400 })
  const t = await prisma.jadwalTemplate.findUnique({ where: { branchId } })
  return NextResponse.json(t ? { ...t, config: JSON.parse(t.config || '{}') } : null)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  if (!body?.branchId || !body?.tipe || !body?.config) {
    return NextResponse.json({ error: 'branchId, tipe, config wajib' }, { status: 400 })
  }
  const data = { tipe: body.tipe, config: JSON.stringify(body.config) }
  const t = await prisma.jadwalTemplate.upsert({
    where: { branchId: body.branchId },
    update: data,
    create: { branchId: body.branchId, ...data },
  })
  return NextResponse.json({ ...t, config: JSON.parse(t.config) })
}
