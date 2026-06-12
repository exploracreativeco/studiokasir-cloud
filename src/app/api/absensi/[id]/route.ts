// api/absensi/[id] — approval entri menyusul (SUPERADMIN/ADMIN)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || !['SUPERADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  if (!['DITERIMA', 'DITOLAK'].includes(body.status)) {
    return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
  }
  const entry = await prisma.absenEntry.update({
    where: { id },
    data: { status: body.status, approvedById: (session.user as any).id },
  })
  return NextResponse.json(entry)
}
