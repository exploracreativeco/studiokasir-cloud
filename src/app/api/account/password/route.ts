// ============================================================
// api/account/password — user ubah/buat password SENDIRI
// Auto-deteksi: punya password → wajib password lama;
//               belum (user Google) → langsung buat (Tafsir B).
// userId diambil dari sesi (bukan input) → aman.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { password: true } })
  return NextResponse.json({ hasPassword: !!(user?.password && user.password.length > 0) })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const { oldPassword, newPassword } = await req.json().catch(() => ({}))
  if (!newPassword || String(newPassword).length < 6) {
    return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const hasPassword = !!(user.password && user.password.length > 0)
  if (hasPassword) {
    if (!oldPassword) return NextResponse.json({ error: 'Password lama wajib diisi' }, { status: 400 })
    const valid = await bcrypt.compare(oldPassword, user.password)
    if (!valid) return NextResponse.json({ error: 'Password lama salah' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 10) } })
  return NextResponse.json({ ok: true, created: !hasPassword })
}
