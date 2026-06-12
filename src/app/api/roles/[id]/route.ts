// ============================================================
// api/roles/[id] — update/hapus role (SUPERADMIN only)
// Role isSystem (SUPERADMIN): tidak bisa dihapus/diubah slug-nya
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  label: z.string().min(2).optional(),
  defaultLanding: z.string().startsWith('/').optional(),
  isActive: z.boolean().optional(),
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
  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })

  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Validasi gagal' }, { status: 400 })

  // SUPERADMIN tidak boleh dinonaktifkan
  if (role.isSystem && parsed.data.isActive === false) {
    return NextResponse.json({ error: 'Role sistem tidak bisa dinonaktifkan' }, { status: 400 })
  }

  const updated = await prisma.role.update({ where: { id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperadmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })
  if (role.isSystem) return NextResponse.json({ error: 'Role sistem tidak bisa dihapus' }, { status: 400 })

  const userCount = await prisma.user.count({ where: { role: role.slug } })
  if (userCount > 0) {
    return NextResponse.json(
      { error: `Masih ada ${userCount} user dengan role ini. Pindahkan dulu user-nya.` },
      { status: 400 }
    )
  }

  await prisma.$transaction([
    prisma.roleAccess.deleteMany({ where: { role: role.slug } }),
    prisma.role.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
