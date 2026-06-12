// ============================================================
// api/karyawan — kelola user/karyawan (SUPERADMIN only)
// Role dinamis (tabel Role) + assign branch
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().min(2),
  branchId: z.string().nullable().optional(),
  warna: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

async function requireSuperadmin() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'SUPERADMIN') return null
  return session
}

export async function GET() {
  const session = await requireSuperadmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
      googleId: true, branchId: true, warna: true, createdAt: true,
      branch: { select: { slug: true, nama: true } },
      fotograferProfile: { select: { fotografer: { select: { id: true, name: true } } } },
    },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await requireSuperadmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validasi gagal', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { name, email, password, role, branchId, warna } = parsed.data

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })

  const roleRow = await prisma.role.findUnique({ where: { slug: role } })
  if (!roleRow || !roleRow.isActive) return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })

  const user = await prisma.user.create({
    data: {
      name, email, role,
      password: await bcrypt.hash(password, 10),
      branchId: branchId || null,
      warna: warna || null,
      isActive: true,
    },
    select: { id: true, name: true, email: true, role: true, branchId: true },
  })
  return NextResponse.json(user, { status: 201 })
}
