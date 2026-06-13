// ============================================================
// api/account/password — user ubah/buat password SENDIRI
// Cari user by session id ATAU email (fallback) — robust untuk user Google.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function currentUser() {
  const session = await auth()
  if (!session?.user) return null
  const id = (session.user as any).id
  const email = session.user.email
  // Utamakan id; kalau tak ada/ tak ketemu, cari by email
  let user = id ? await prisma.user.findUnique({ where: { id } }).catch(() => null) : null
  if (!user && email) user = await prisma.user.findUnique({ where: { email } }).catch(() => null)
  return user
}

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ hasPassword: !!(user.password && user.password.length > 0) })
}

export async function PATCH(req: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Sesi tidak valid, silakan login ulang' }, { status: 401 })

  const { oldPassword, newPassword } = await req.json().catch(() => ({}))
  if (!newPassword || String(newPassword).length < 6) {
    return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 })
  }

  const hasPassword = !!(user.password && user.password.length > 0)
  if (hasPassword) {
    if (!oldPassword) return NextResponse.json({ error: 'Password lama wajib diisi' }, { status: 400 })
    const valid = await bcrypt.compare(oldPassword, user.password)
    if (!valid) return NextResponse.json({ error: 'Password lama salah' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } })
  return NextResponse.json({ ok: true, created: !hasPassword })
}
