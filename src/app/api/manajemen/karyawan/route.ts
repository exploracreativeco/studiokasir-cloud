import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await prisma.karyawanGaji.findMany({
    include: { jobTambahan: true },
    orderBy: { nama: 'asc' }
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { jobTambahan, ...karyawan } = body
  const data = await prisma.karyawanGaji.create({
    data: {
      ...karyawan,
      jobTambahan: { create: (jobTambahan || []).map((j: any) => ({ namaJob: j.namaJob, nominal: j.nominal })) }
    },
    include: { jobTambahan: true }
  })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, jobTambahan, ...rest } = body
  // Hapus job tambahan lama, buat ulang
  await prisma.jobTambahanDefault.deleteMany({ where: { karyawanId: id } })
  const data = await prisma.karyawanGaji.update({
    where: { id },
    data: {
      ...rest,
      jobTambahan: { create: (jobTambahan || []).map((j: any) => ({ namaJob: j.namaJob, nominal: j.nominal })) }
    },
    include: { jobTambahan: true }
  })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await prisma.karyawanGaji.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
