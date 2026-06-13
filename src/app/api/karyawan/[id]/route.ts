// ============================================================
// api/karyawan/[id] — update/hapus user (SUPERADMIN only)
// Proteksi: tidak bisa hapus diri sendiri / superadmin terakhir
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.string().min(2).optional(),
  branchId: z.string().nullable().optional(),
  isActive: z.boolean().optional(), // approve user Google pending
  warna: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
})

async function requireSuperadmin() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperadmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { password, role, ...rest } = parsed.data

  // Proteksi: jangan sampai superadmin terakhir kehilangan role/aktif
  if (target.role === 'SUPERADMIN' && ((role && role !== 'SUPERADMIN') || rest.isActive === false)) {
    const superCount = await prisma.user.count({ where: { role: 'SUPERADMIN', isActive: true } })
    if (superCount <= 1) {
      return NextResponse.json({ error: 'Tidak bisa — ini SUPERADMIN aktif terakhir' }, { status: 400 })
    }
  }
  if (role) {
    const roleRow = await prisma.role.findUnique({ where: { slug: role } })
    if (!roleRow || !roleRow.isActive) return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
  }

  const data: any = { ...rest }
  if (role) data.role = role
  if (password) data.password = await bcrypt.hash(password, 10)

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, branchId: true, isActive: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperadmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (id === (session.user as any).id) {
    return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
  }
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  if (target.role === 'SUPERADMIN') {
    const superCount = await prisma.user.count({ where: { role: 'SUPERADMIN', isActive: true } })
    if (superCount <= 1) return NextResponse.json({ error: 'SUPERADMIN terakhir tidak bisa dihapus' }, { status: 400 })
  }

  // User dengan riwayat transaksi: nonaktifkan saja (jaga relasi historis)
  const txCount = await prisma.transaction.count({ where: { userId: id } })
  if (txCount > 0) {
    await prisma.user.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true, deactivated: true, info: `User punya ${txCount} transaksi — dinonaktifkan, bukan dihapus` })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
