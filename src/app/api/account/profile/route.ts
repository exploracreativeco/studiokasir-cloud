// api/account/profile — user ubah data dirinya (nama, nickname, whatsapp, warna)
// Email/role/branch TIDAK bisa diubah sendiri (hak admin).
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      id: true, name: true, nickname: true, email: true, whatsapp: true,
      role: true, warna: true, googleId: true,
      branch: { select: { nama: true } },
    },
  })
  const roleRow = user ? await prisma.role.findUnique({ where: { slug: user.role } }) : null
  return NextResponse.json({ ...user, roleLabel: roleRow?.label || user?.role, studioNama: user?.branch?.nama || 'Semua Studio' })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const data: any = {}
  if (typeof body.name === 'string' && body.name.trim().length >= 2) data.name = body.name.trim()
  if (typeof body.nickname === 'string') data.nickname = body.nickname.trim() || null
  if (typeof body.whatsapp === 'string') data.whatsapp = body.whatsapp.trim() || null
  if (typeof body.warna === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.warna)) data.warna = body.warna
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })
  const updated = await prisma.user.update({
    where: { id: (session.user as any).id }, data,
    select: { id: true, name: true, nickname: true, whatsapp: true, warna: true },
  })
  return NextResponse.json(updated)
}
