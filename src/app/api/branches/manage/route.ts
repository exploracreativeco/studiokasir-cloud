// ============================================================
// api/branches/manage — kelola data studio/cabang (SUPERADMIN)
// GET: semua cabang (termasuk nonaktif) · PUT: update info
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function guard() {
  const s = await auth()
  return s && (s.user as any).role === 'SUPERADMIN'
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const branches = await prisma.branch.findMany({ orderBy: { nama: 'asc' } })
  return NextResponse.json(branches)
}

export async function PUT(req: NextRequest) {
  if (!(await guard())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  const data: any = {}
  for (const k of ['nama', 'alamat', 'whatsapp', 'isActive']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  const b = await prisma.branch.update({ where: { id: body.id }, data })
  return NextResponse.json(b)
}
