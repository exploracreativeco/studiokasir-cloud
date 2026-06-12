// api/karir — daftar lowongan aktif (PUBLIK, tanpa login)
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 300

export async function GET() {
  const lowongan = await prisma.lowongan.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    select: { slug: true, judul: true, posisi: true, deskripsi: true, branchId: true },
  })
  return NextResponse.json(lowongan)
}
