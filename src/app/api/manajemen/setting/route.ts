import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let data = await prisma.manajemenSetting.findFirst()
  if (!data) data = await prisma.manajemenSetting.create({ data: {} })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  let data = await prisma.manajemenSetting.findFirst()
  if (!data) {
    data = await prisma.manajemenSetting.create({ data: body })
  } else {
    data = await prisma.manajemenSetting.update({ where: { id: data.id }, data: body })
  }
  return NextResponse.json(data)
}
