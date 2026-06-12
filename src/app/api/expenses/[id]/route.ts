import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.expense.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expense = await prisma.expense.findUnique({ where: { id: params.id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(expense)
}
